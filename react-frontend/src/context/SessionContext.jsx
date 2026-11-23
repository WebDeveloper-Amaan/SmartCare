/**
 * SessionContext — Babysitter GPS engine
 *
 * Lives at app root, never unmounts. Runs GPS + socket in the background
 * regardless of which dashboard section the babysitter is viewing.
 * SessionTracker is just a UI skin that reads from this context.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io as socketIO } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuth } from './useAuth'
import api from '../services/api'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
const ARRIVAL_RADIUS_M = 200
const TRACK_INTERVAL_MS = 5000

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const SessionContext = createContext(null)
export const useSession = () => useContext(SessionContext)

export function SessionProvider({ children }) {
  const { user } = useAuth()

  // Active booking being tracked (set when babysitter has a confirmed/in-progress booking)
  const [activeBooking, setActiveBooking] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | approaching | tracking | ended
  const [distanceM, setDistanceM] = useState(null)
  const [currentPos, setCurrentPos] = useState(null)
  const [sosTriggered, setSosTriggered] = useState(false)

  const socketRef   = useRef(null)
  const watchRef    = useRef(null)
  const intervalRef = useRef(null)
  const phaseRef    = useRef('idle')
  const bookingRef  = useRef(null)

  // Keep bookingRef in sync
  useEffect(() => { bookingRef.current = activeBooking }, [activeBooking])

  // Only active for babysitters
  const isBabysitter = user?.role === 'babysitter'

  // ── Socket (singleton, lives as long as user is logged in) ────────
  useEffect(() => {
    if (!isBabysitter) return
    const token = localStorage.getItem('token')
    if (!token) return
    const socket = socketIO(SOCKET_URL, { auth: { token }, transports: ['websocket'] })
    socketRef.current = socket
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isBabysitter])

  // ── Load active booking on mount / user change ────────────────────
  useEffect(() => {
    if (!isBabysitter) return
    api.get('/bookings').then(({ data }) => {
      const active = (data.bookings || []).find(b =>
        ['confirmed', 'in-progress'].includes(b.status)
      )
      setActiveBooking(active || null)
    }).catch(() => {})
  }, [isBabysitter])

  // ── startTracking ─────────────────────────────────────────────────
  const startTracking = useCallback((pos) => {
    if (phaseRef.current === 'tracking') return
    phaseRef.current = 'tracking'
    setPhase('tracking')
    toast.success('📍 Arrived! Live GPS tracking started for parent.', { duration: 4000 })

    const b = bookingRef.current
    const bookingId = b?._id
    const parentId  = b?.parent?._id || b?.parent

    socketRef.current?.emit('session:start', { bookingId, parentId, lat: pos.lat, lng: pos.lng })

    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const p = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }
          setCurrentPos(p)
          socketRef.current?.emit('session:location', {
            bookingId, parentId, lat: p.lat, lng: p.lng, accuracy: p.accuracy
          })
        },
        null,
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }, TRACK_INTERVAL_MS)
  }, [])

  // ── watchPosition — starts when there's an active booking ─────────
  useEffect(() => {
    if (!isBabysitter) return
    if (!activeBooking) return
    if (!['confirmed', 'in-progress'].includes(activeBooking.status)) return
    if (!navigator.geolocation) return

    // Reset phase when booking changes
    if (phaseRef.current === 'ended') {
      phaseRef.current = 'idle'
      setPhase('idle')
      setSosTriggered(false)
    }

    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }
        setCurrentPos(pos)

        const b = bookingRef.current
        const dLat = b?.coordinates?.lat
        const dLng = b?.coordinates?.lng

        if (dLat && dLng) {
          const dist = Math.round(haversine(pos.lat, pos.lng, dLat, dLng))
          setDistanceM(dist)
          if (phaseRef.current === 'idle') {
            phaseRef.current = 'approaching'
            setPhase('approaching')
          }
          if (dist <= ARRIVAL_RADIUS_M && phaseRef.current === 'approaching') {
            startTracking(pos)
          }
        } else {
          // No destination coords — auto-start on first fix
          if (phaseRef.current === 'idle') {
            startTracking(pos)
          }
        }
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )

    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
      clearInterval(intervalRef.current)
    }
  }, [isBabysitter, activeBooking?._id, activeBooking?.status, startTracking])

  // ── Auto-end when booking completes/cancels ───────────────────────
  useEffect(() => {
    if (['completed', 'cancelled'].includes(activeBooking?.status) && phaseRef.current === 'tracking') {
      stopTracking()
    }
  }, [activeBooking?.status])

  // ── stopTracking ──────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    clearInterval(intervalRef.current)
    const b = bookingRef.current
    socketRef.current?.emit('session:end', {
      bookingId: b?._id,
      parentId: b?.parent?._id || b?.parent
    })
    phaseRef.current = 'ended'
    setPhase('ended')
    toast('🔒 GPS tracking stopped. Your location is private again.', { icon: '🔒', duration: 4000 })
  }, [])

  // ── SOS ───────────────────────────────────────────────────────────
  const triggerSOS = useCallback(() => {
    if (sosTriggered) return
    const b = bookingRef.current
    const bookingId = b?._id
    const parentId  = b?.parent?._id || b?.parent
    const pos = currentPos

    socketRef.current?.emit('session:sos', {
      bookingId, parentId,
      lat: pos?.lat, lng: pos?.lng,
      message: 'Emergency! Babysitter needs help immediately.'
    })
    api.post(`/bookings/${bookingId}/sos`, {
      lat: pos?.lat, lng: pos?.lng,
      message: 'Emergency! Babysitter needs help immediately.'
    }).catch(() => {})

    setSosTriggered(true)
    toast.error('🚨 SOS sent to parent!', { duration: 6000 })
  }, [sosTriggered, currentPos])

  return (
    <SessionContext.Provider value={{
      activeBooking, setActiveBooking,
      phase, distanceM, currentPos, sosTriggered,
      stopTracking, triggerSOS
    }}>
      {children}
    </SessionContext.Provider>
  )
}
