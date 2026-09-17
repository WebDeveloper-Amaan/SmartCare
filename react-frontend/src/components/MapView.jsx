import { useState, useCallback, useEffect, useRef } from 'react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { io as socketIO } from 'socket.io-client'
import api from '../services/api'
import toast from 'react-hot-toast'

// Draws a route polyline from origin to destination using Directions API
function RouteRenderer({ origin, destination }) {
  const map = useMap()
  const polylineRef = useRef(null)

  useEffect(() => {
    if (!map || !origin || !destination || !window.google) return
    const directionsService = new window.google.maps.DirectionsService()
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#6EC1E4', strokeWeight: 5, strokeOpacity: 0.85 }
    })
    directionsRenderer.setMap(map)
    polylineRef.current = directionsRenderer
    directionsService.route(
      { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === 'OK') directionsRenderer.setDirections(result)
        else toast.error('Could not load route')
      }
    )
    return () => { directionsRenderer.setMap(null) }
  }, [map, origin, destination])

  return null
}

const DELHI_CENTER = { lat: 28.6139, lng: 77.2090 }
const NEARBY_RADIUS = 10000 // 10km in meters

// Haversine distance in meters between two lat/lng points
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

// Fits map to show parent location + all sitters
function FitBounds({ babysitters, userLocation }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (!map) return
    // Reset fit when data changes
    fitted.current = false
  }, [babysitters, userLocation])

  useEffect(() => {
    if (!map || fitted.current) return
    const points = []
    if (userLocation) points.push(userLocation)
    babysitters.forEach(s => {
      const [lng, lat] = s.coordinates?.coordinates || []
      if (lat && lng) points.push({ lat, lng })
    })
    if (points.length === 0) return
    if (points.length === 1) {
      map.setCenter(points[0])
      map.setZoom(13)
    } else {
      const bounds = new window.google.maps.LatLngBounds()
      points.forEach(p => bounds.extend(p))
      map.fitBounds(bounds, 80)
    }
    fitted.current = true
  }, [map, babysitters, userLocation])

  return null
}

export default function MapView({ babysitters, onNearbySearch, fullHeight = false }) {
  const [selected, setSelected] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [allSitters, setAllSitters] = useState(babysitters)
  const [showRoute, setShowRoute] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [mapError, setMapError] = useState(false)
  const socketRef = useRef(null)
  const watchIdRef = useRef(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  // ── Live location: connect socket + watchPosition ──
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || !navigator.geolocation) return

    const socket = socketIO(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket']
    })
    socketRef.current = socket

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude }
        setUserLocation(loc)
        setIsLive(true)
        socket.emit('location_update', loc)
      },
      () => setIsLive(false),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )

    // When a nearby user disconnects, their marker is no longer relevant
    socket.on('user_location_gone', ({ userId: goneId }) => {
      setSelected(prev => prev?._id === goneId ? null : prev)
    })

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
      socket.disconnect()
    }
  }, [])

  // Sort sitters: nearby first, then by distance
  const sortedSitters = userLocation
    ? [...allSitters].sort((a, b) => {
        const [lngA, latA] = a.coordinates?.coordinates || [77.2090, 28.6139]
        const [lngB, latB] = b.coordinates?.coordinates || [77.2090, 28.6139]
        return getDistance(userLocation.lat, userLocation.lng, latA, lngA)
          - getDistance(userLocation.lat, userLocation.lng, latB, lngB)
      })
    : allSitters

  // Auto-detect location when map opens
  useEffect(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude }
        setUserLocation(loc)
        setLocating(false)
        // Fetch nearby sitters and merge with existing list
        try {
          const { data } = await api.get('/babysitters/nearby', {
            params: { lat: coords.latitude, lng: coords.longitude, maxDistance: NEARBY_RADIUS }
          })
          // Merge: nearby first, then rest (deduplicated)
          const nearbyIds = new Set((data.babysitters || []).map(s => s._id))
          const others = babysitters.filter(s => !nearbyIds.has(s._id))
          const merged = [...(data.babysitters || []), ...others]
          setAllSitters(merged)
          onNearbySearch(merged, loc)
        } catch {
          setAllSitters(babysitters)
        }
      },
      () => {
        setLocationDenied(true)
        setLocating(false)
        setAllSitters(babysitters)
      },
      { timeout: 8000 }
    )
  }, []) // only on mount

  // Manual re-locate button
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude }
        setUserLocation(loc)
        setLocating(false)
        try {
          const { data } = await api.get('/babysitters/nearby', {
            params: { lat: coords.latitude, lng: coords.longitude, maxDistance: NEARBY_RADIUS }
          })
          const nearbyIds = new Set((data.babysitters || []).map(s => s._id))
          const others = babysitters.filter(s => !nearbyIds.has(s._id))
          const merged = [...(data.babysitters || []), ...others]
          setAllSitters(merged)
          onNearbySearch(merged, loc)
          toast.success(`Found ${data.babysitters.length} babysitters near you`)
        } catch {
          toast.error('Failed to fetch nearby babysitters')
        }
      },
      () => { toast.error('Location access denied'); setLocating(false) },
      { timeout: 8000 }
    )
  }, [babysitters, onNearbySearch])

  const handleMarkerClick = useCallback((sitter) => {
    setSelected(prev => {
      if (prev?._id === sitter._id) return null
      setShowRoute(false)
      return sitter
    })
  }, [])

  // Distance from user to selected sitter
  const selectedDistance = selected && userLocation
    ? (() => {
        const [lng, lat] = selected.coordinates?.coordinates || [77.2090, 28.6139]
        return getDistance(userLocation.lat, userLocation.lng, lat, lng)
      })()
    : null

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg" style={{ height: fullHeight ? '100%' : '620px', background: 'linear-gradient(135deg, rgba(110,193,228,0.13) 0%, #fff 50%, rgba(249,202,218,0.18) 100%)' }}>
      {mapError ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
            <i className="fas fa-map text-gray-300 text-4xl"></i>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-600 text-lg">Map temporarily unavailable</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">Google Maps API quota has been reached. You can still browse all babysitters from the list.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
            <i className="fas fa-info-circle text-[#6EC1E4]"></i>
            Quota resets daily at midnight Pacific Time
          </div>
        </div>
      ) : (
      <Map
        mapId="babysitter-map"
        defaultCenter={userLocation || DELHI_CENTER}
        defaultZoom={12}
        gestureHandling="greedy"
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelected(null)}
        onError={() => setMapError(true)}
      >
        <FitBounds babysitters={sortedSitters} userLocation={userLocation} />

        {/* ── Route renderer — must be inside <Map> to access useMap() ── */}
        {showRoute && selected && userLocation && (() => {
          const [lng, lat] = selected.coordinates?.coordinates || [77.2090, 28.6139]
          return <RouteRenderer origin={userLocation} destination={{ lat, lng }} />
        })()}

        {/* ── Parent / User location marker with profile pic ── */}
        {userLocation && (
          <AdvancedMarker position={userLocation} zIndex={20}>
            <div className="relative flex flex-col items-center">
              {/* Pulsing ring — green when live, brand blue when static */}
              <div className="absolute w-14 h-14 rounded-full animate-ping" style={{ background: isLive ? 'rgba(34,197,94,0.20)' : 'rgba(110,193,228,0.22)' }} />
              <div className="absolute w-10 h-10 rounded-full" style={{ background: isLive ? 'rgba(34,197,94,0.25)' : 'rgba(110,193,228,0.30)' }} />
              {/* Profile pic or fallback */}
              <div className="relative w-10 h-10 rounded-full shadow-xl overflow-hidden flex-shrink-0" style={{ border: isLive ? '3px solid #22c55e' : '3px solid white', background: 'linear-gradient(135deg,#6EC1E4,#F9CADA)' }}>
                {user?.photo
                  ? <img src={user.photo} alt="You" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <i className="fas fa-user text-white" style={{ fontSize: '14px' }}></i>
                    </div>
                }
                {/* Live badge */}
                {isLive && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              {/* You label */}
              <div className="mt-1 px-2 py-0.5 rounded-full text-white text-xs font-bold shadow-md whitespace-nowrap flex items-center gap-1" style={{ background: isLive ? '#22c55e' : 'linear-gradient(135deg,#6EC1E4,#F9CADA)', fontSize: '10px' }}>
                {isLive && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block"></span>}
                {isLive ? 'Live' : 'You'}
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* ── Babysitter markers ── */}
        {sortedSitters.map(sitter => {
          const [lng, lat] = sitter.coordinates?.coordinates || [77.2090, 28.6139]
          const isSelected = selected?._id === sitter._id
          const isNearby = userLocation
            ? getDistance(userLocation.lat, userLocation.lng, lat, lng) <= NEARBY_RADIUS
            : false

          return (
            <AdvancedMarker
              key={sitter._id}
              position={{ lat, lng }}
              onClick={() => handleMarkerClick(sitter)}
              zIndex={isSelected ? 15 : isNearby ? 5 : 1}
            >
              <div className={`relative cursor-pointer transition-all duration-200 ${isSelected ? 'scale-115' : 'hover:scale-105'}`}>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg text-white text-xs font-bold border-2 border-white
                  ${isSelected ? 'bg-pink-400' : isNearby ? 'bg-[#6EC1E4]' : 'bg-[#F9CADA]'}`} style={!isSelected && !isNearby ? { color: '#c06080' } : {}}>
                  <img
                    src={sitter.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(sitter.name)}&size=24&background=6EC1E4&color=fff`}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover border border-white/60"
                  />
                  ₹{sitter.hourlyRate}
                </div>
                {/* Green tick for nearby, nothing for further */}
                {isNearby && !isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                    <i className="fas fa-check text-white" style={{ fontSize: '7px' }}></i>
                  </div>
                )}
                {/* Triangle pointer */}
                <div className={`absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[7px] border-l-transparent border-r-transparent
                  ${isSelected ? 'border-t-pink-400' : isNearby ? 'border-t-[#6EC1E4]' : 'border-t-[#F9CADA]'}`} />
              </div>
            </AdvancedMarker>
          )
        })}
      </Map>

      )} {/* end mapError ternary */}

      {/* ── Bottom-left: Locate + Legend panel — shown even on error ── */}
      {!mapError && (
      <div className="absolute bottom-5 left-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleLocate}
          disabled={locating}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-lg border border-white/60 backdrop-blur-sm transition disabled:opacity-60 hover:scale-105"
          style={{ background: isLive ? '#22c55e' : 'linear-gradient(135deg,#6EC1E4,#F9CADA)', color: '#fff' }}
        >
          {isLive
            ? <><span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> Live</>
            : <><i className={`fas ${locating ? 'fa-spinner fa-spin' : userLocation ? 'fa-crosshairs' : 'fa-location-arrow'}`}></i>
               {locating ? 'Locating…' : userLocation ? 'My Location' : 'Near Me'}</>
          }
        </button>
        <div className="rounded-2xl px-3 py-2.5 shadow-lg border border-white/60 backdrop-blur-sm space-y-1.5" style={{ background: 'rgba(255,255,255,0.92)' }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1" style={{ fontSize: '9px' }}>Legend</p>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isLive ? '#22c55e' : 'linear-gradient(135deg,#6EC1E4,#F9CADA)' }}>
              <i className="fas fa-user text-white" style={{ fontSize: '8px' }}></i>
            </span>
            <span className="text-xs text-gray-600 font-medium">You {isLive && <span className="text-green-500 font-bold" style={{ fontSize: '9px' }}>● LIVE</span>}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[#6EC1E4] relative">
              <i className="fas fa-baby text-white" style={{ fontSize: '8px' }}></i>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border border-white flex items-center justify-center">
                <i className="fas fa-check text-white" style={{ fontSize: '6px' }}></i>
              </span>
            </span>
            <span className="text-xs text-gray-600 font-medium">Nearby &lt;10km</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,202,218,0.9)' }}>
              <i className="fas fa-baby text-pink-400" style={{ fontSize: '8px' }}></i>
            </span>
            <span className="text-xs text-gray-600 font-medium">Further away</span>
          </div>
          <div className="border-t border-gray-100 pt-1.5 mt-1 flex items-center gap-1.5">
            <i className="fas fa-map-marker-alt text-[#6EC1E4] text-xs"></i>
            <span className="text-xs font-bold text-gray-700">{sortedSitters.length} sitters</span>
          </div>
        </div>
      </div>
      )}

      {/* ── Location denied notice ── */}
      {locationDenied && !mapError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-sm text-yellow-700 flex items-center gap-2 shadow-md">
          <i className="fas fa-exclamation-triangle"></i>
          Location access denied — enable it in browser settings to see nearby sitters
        </div>
      )}

      {/* ── Sitter info popup card ── */}
      {selected && !mapError && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => { setSelected(null); setShowRoute(false) }}
            className="absolute top-3 right-3 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 transition text-xs z-10"
          >
            <i className="fas fa-times"></i>
          </button>

          <div className="flex gap-3 p-4">
            <img
              src={selected.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selected.name)}&size=80&background=6EC1E4&color=fff`}
              alt={selected.name}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 pr-6">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{selected.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    <i className="fas fa-map-marker-alt mr-1 text-[#6EC1E4]"></i>{selected.location}
                  </p>
                  {selectedDistance !== null && (
                    <p className={`text-xs font-semibold mt-0.5 ${selectedDistance <= NEARBY_RADIUS ? 'text-green-500' : 'text-gray-400'}`}>
                      <i className="fas fa-route mr-1"></i>
                      {formatDistance(selectedDistance)} away
                      {selectedDistance <= NEARBY_RADIUS && ' · Nearby'}
                    </p>
                  )}
                </div>
                {selected.verified && (
                  <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-400 text-xs">
                  {'★'.repeat(Math.round(selected.rating || 0))}
                  {'☆'.repeat(5 - Math.round(selected.rating || 0))}
                </span>
                <span className="text-xs text-gray-400">({selected.reviewCount || 0})</span>
              </div>
              <p className="text-[#6EC1E4] font-bold mt-0.5">
                ₹{selected.hourlyRate}<span className="text-gray-400 text-xs font-normal">/hr</span>
              </p>
            </div>
          </div>

          {selected.skills?.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1">
              {selected.skills.slice(0, 3).map(s => (
                <span key={s} className="text-xs bg-[#6EC1E4]/10 text-[#6EC1E4] px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          )}

          {userLocation && (
            <div className="px-4 pb-2">
              <button
                onClick={() => setShowRoute(r => !r)}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                  showRoute ? 'bg-[#6EC1E4] text-white border-[#6EC1E4]' : 'border-[#6EC1E4] text-[#6EC1E4] hover:bg-[#6EC1E4]/10'
                }`}
              >
                <i className={`fas ${showRoute ? 'fa-times' : 'fa-route'}`}></i>
                {showRoute ? 'Hide Route' : 'Show Route'}
                {selectedDistance !== null && !showRoute && (
                  <span className="text-xs opacity-75">· {formatDistance(selectedDistance)}</span>
                )}
              </button>
            </div>
          )}

          <div className="flex gap-2 px-4 pb-4">
            <Link
              to={`/profile/${selected._id}`}
              className="flex-1 gradient-bg text-white text-center py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition"
            >
              View Profile
            </Link>
            <button
              onClick={() => navigate(`/chat/${selected._id}`)}
              className="border-2 border-[#6EC1E4] text-[#6EC1E4] px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[#6EC1E4]/10 transition"
            >
              <i className="fas fa-comment-dots"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
