import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/useAuth'
import api from '../services/api'
import toast from 'react-hot-toast'

function Stars({ rating }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  return (
    <span className="text-yellow-400">
      {[...Array(full)].map((_, i) => <i key={i} className="fas fa-star" />)}
      {half && <i className="fas fa-star-half-alt" />}
      {[...Array(5 - full - (half ? 1 : 0))].map((_, i) => <i key={i} className="far fa-star" />)}
    </span>
  )
}

const STEPS = ['When', 'Children', 'Location', 'Confirm']

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

function calcDuration(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? +(diff / 60).toFixed(1) : 0
}

export default function Profile() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profileUser, setProfileUser] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [booking, setBooking] = useState({
    date: '', startTime: '', endTime: '',
    childrenCount: 1, childrenAges: [],
    address: '', specialInstructions: ''
  })
  const [homeCoords, setHomeCoords] = useState(null)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [booked, setBooked] = useState(false)

  const duration = calcDuration(booking.startTime, booking.endTime)
  const discountRate = duration >= 5 ? 0.20 : duration >= 3 ? 0.10 : 0
  const effectiveRate = profileUser ? Math.round(profileUser.hourlyRate * (1 - discountRate)) : 0
  const total = profileUser ? Math.round(effectiveRate * duration) : 0

  const detectMyLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setHomeCoords({ lat: coords.latitude, lng: coords.longitude })
        setDetectingLocation(false)
        toast.success('Location pinned!')
      },
      () => { toast.error('Location access denied'); setDetectingLocation(false) },
      { timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        let userData = null
        try {
          const res = await api.get(`/babysitters/${id}`)
          userData = res.data.babysitter
        } catch {
          const res = await api.get(`/auth/user/${id}`)
          userData = res.data.user
        }
        setProfileUser(userData)
        if (userData?.role === 'babysitter') {
          try {
            const r = await api.get(`/reviews/${id}`)
            setReviews(r.data.reviews || [])
          } catch { /* optional */ }
        }
      } catch {
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleBook = async () => {
    setBookingLoading(true)
    try {
      await api.post('/bookings', {
        ...booking,
        babysitterId: id,
        duration,
        childrenAges: booking.childrenAges,
        coordinates: homeCoords || undefined
      })
      setBooked(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed')
    } finally {
      setBookingLoading(false)
    }
  }

  const setAge = (idx, val) => {
    const ages = [...booking.childrenAges]
    ages[idx] = val
    setBooking({ ...booking, childrenAges: ages })
  }

  const setChildCount = (n) => {
    const ages = Array.from({ length: n }, (_, i) => booking.childrenAges[i] || '')
    setBooking({ ...booking, childrenCount: n, childrenAges: ages })
  }

  const canNext = [
    booking.date && booking.startTime && booking.endTime && duration > 0,
    booking.childrenCount >= 1,
    booking.address.trim().length > 3,
    true
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6EC1E4]" />
    </div>
  )

  if (!profileUser) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      <div className="text-center"><div className="text-5xl mb-4">😕</div><p>User not found</p></div>
    </div>
  )

  const isBabysitter = profileUser.role === 'babysitter'
  const myId = user?._id || user?.id
  const firstName = profileUser.name.split(' ')[0]


  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className={`max-w-6xl mx-auto px-4 py-8 ${isBabysitter ? 'grid md:grid-cols-5 gap-8' : 'max-w-2xl'}`}>

        {/* ── LEFT: Profile Info ── */}
        <div className={`space-y-5 ${isBabysitter ? 'md:col-span-3' : ''}`}>

          {/* Hero card */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            {/* Gradient banner */}
            <div className="h-24 gradient-bg relative">
              <div className="absolute -bottom-10 left-6">
                <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white">
                  <img
                    src={profileUser.photo || `https://i.pravatar.cc/200?u=${profileUser._id}`}
                    alt={profileUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="pt-12 px-6 pb-6">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900">{profileUser.name}</h1>
                    {profileUser.verified && (
                      <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                        <i className="fas fa-check-circle" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 mt-1 text-sm">
                    <i className="fas fa-map-marker-alt mr-1 text-[#6EC1E4]" />{profileUser.location}
                  </p>
                  {isBabysitter && (
                    <div className="flex items-center gap-2 mt-2">
                      <Stars rating={profileUser.rating || 0} />
                      <span className="text-gray-500 text-sm">{(profileUser.rating || 0).toFixed(1)} · {profileUser.reviewCount || 0} reviews</span>
                    </div>
                  )}
                </div>
                {isBabysitter && (
                  <div className="text-right">
                    <p className="text-3xl font-black text-[#6EC1E4]">₹{profileUser.hourlyRate}</p>
                    <p className="text-gray-400 text-xs">per hour</p>
                  </div>
                )}
              </div>

              {profileUser.bio && (
                <p className="text-gray-600 mt-4 leading-relaxed text-sm border-t border-gray-100 pt-4">{profileUser.bio}</p>
              )}

              {user && myId !== id && (
                <Link to={`/chat/${id}`}
                  className="inline-flex items-center gap-2 mt-4 border-2 border-[#6EC1E4] text-[#6EC1E4] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#6EC1E4]/10 transition">
                  <i className="fas fa-comment-dots" /> Message {firstName}
                </Link>
              )}
            </div>
          </div>

          {/* Quick stats */}
          {isBabysitter && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: 'fa-briefcase', val: `${profileUser.experience}y`, label: 'Experience' },
                { icon: 'fa-star', val: (profileUser.rating || 0).toFixed(1), label: 'Rating' },
                { icon: 'fa-calendar-check', val: profileUser.reviewCount || 0, label: 'Jobs Done' },
                { icon: 'fa-rupee-sign', val: `₹${profileUser.hourlyRate}`, label: 'Per Hour' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <div className="w-9 h-9 rounded-xl bg-[#6EC1E4]/10 flex items-center justify-center mx-auto mb-2">
                    <i className={`fas ${s.icon} text-[#6EC1E4] text-sm`} />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{s.val}</p>
                  <p className="text-gray-400 text-[10px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Details */}
          {isBabysitter && (
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">About & Skills</h2>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                {[
                  ['Education', profileUser.education || 'N/A'],
                  ['Languages', (profileUser.languages || []).join(', ') || 'N/A'],
                  ['Age Groups', (profileUser.ageGroups || []).join(', ') || 'N/A'],
                  ['Availability', (profileUser.availability || []).slice(0,3).join(', ') || 'N/A'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <span className="text-gray-400 text-xs uppercase tracking-wide">{label}</span>
                    <p className="font-semibold text-gray-800 mt-0.5 text-xs leading-snug">{val}</p>
                  </div>
                ))}
              </div>
              {profileUser.skills?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profileUser.skills.map(s => (
                    <span key={s} className="bg-[#6EC1E4]/10 text-[#6EC1E4] text-xs px-3 py-1.5 rounded-full font-medium">{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reviews */}
          {isBabysitter && (
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Reviews ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <i className="fas fa-star text-3xl mb-2 block text-gray-200" />
                  <p className="text-sm">No reviews yet. Be the first to book!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r._id} className="flex gap-3 border-b border-gray-50 pb-4 last:border-0">
                      <img src={r.reviewer?.photo || `https://i.pravatar.cc/50?u=${r._id}`} alt=""
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-800">{r.reviewer?.name}</span>
                          <Stars rating={r.rating} />
                          <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                        <p className="text-gray-600 text-sm mt-1">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>


        {/* ── RIGHT: Booking Wizard ── */}
        {isBabysitter && user?.role === 'parent' && (
          <div className="md:col-span-2">
            <div className="sticky top-24">

              {booked ? (
                /* ── Success State ── */
                <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-check-circle text-green-500 text-4xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
                  <p className="text-gray-500 text-sm mb-1">{firstName} has been notified.</p>
                  <p className="text-gray-400 text-xs mb-6">Check your dashboard for updates.</p>
                  <div className="bg-gray-50 rounded-2xl p-4 text-sm text-left mb-6 space-y-2">
                    <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold">{new Date(booking.date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-semibold">{booking.startTime} – {booking.endTime}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-[#6EC1E4]">₹{total}</span></div>
                  </div>
                  <button onClick={() => navigate('/parent-dashboard')}
                    className="w-full gradient-bg text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition">
                    Go to Dashboard
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-lg overflow-hidden">

                  {/* Sitter mini-header */}
                  <div className="gradient-bg px-6 py-5 flex items-center gap-4">
                    <img src={profileUser.photo || `https://i.pravatar.cc/80?u=${profileUser._id}`}
                      alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-white/40" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">Book {firstName}</p>
                      <p className="text-white/80 text-xs">₹{profileUser.hourlyRate}/hr · {profileUser.location}</p>
                    </div>
                    {duration > 0 && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-white font-black text-xl">₹{total}</p>
                        <p className="text-white/70 text-xs">{duration}h total</p>
                      </div>
                    )}
                  </div>

                  {/* Step progress */}
                  <div className="px-6 pt-5 pb-2">
                    <div className="flex items-center gap-1">
                      {STEPS.map((s, i) => (
                        <div key={s} className="flex items-center flex-1">
                          <button
                            onClick={() => i < step && setStep(i)}
                            className={`flex items-center gap-1.5 text-xs font-semibold transition ${i === step ? 'text-[#6EC1E4]' : i < step ? 'text-green-500 cursor-pointer' : 'text-gray-300 cursor-default'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 transition ${i === step ? 'bg-[#6EC1E4] text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                              {i < step ? <i className="fas fa-check" /> : i + 1}
                            </div>
                            <span className="hidden sm:block">{s}</span>
                          </button>
                          {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 rounded transition ${i < step ? 'bg-green-400' : 'bg-gray-100'}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-4">

                    {/* ── Step 0: When ── */}
                    {step === 0 && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <i className="fas fa-calendar mr-2 text-[#6EC1E4]" />Select Date
                          </label>
                          <input type="date" required value={booking.date}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setBooking({ ...booking, date: e.target.value })}
                            className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#6EC1E4] focus:bg-white transition" />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <i className="fas fa-clock mr-2 text-[#6EC1E4]" />Start Time
                          </label>
                          <div className="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto pr-1">
                            {TIME_SLOTS.slice(0, 23).map(t => (
                              <button key={t} type="button"
                                onClick={() => setBooking({ ...booking, startTime: t, endTime: '' })}
                                className={`py-2 rounded-xl text-xs font-semibold border-2 transition ${booking.startTime === t ? 'border-[#6EC1E4] bg-[#6EC1E4] text-white' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-[#6EC1E4]/50'}`}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <i className="fas fa-hourglass-end mr-2 text-[#6EC1E4]" />End Time
                            <span className="text-gray-400 font-normal text-xs ml-1">(min. 1 hour after start)</span>
                          </label>
                          {!booking.startTime ? (
                            <p className="text-xs text-gray-400 bg-gray-50 rounded-2xl px-4 py-3">Select a start time first</p>
                          ) : (() => {
                            const [sh] = booking.startTime.split(':').map(Number)
                            const validEnds = TIME_SLOTS.filter(t => t.split(':').map(Number)[0] >= sh + 1)
                            return validEnds.length === 0 ? (
                              <p className="text-xs text-orange-500 bg-orange-50 rounded-2xl px-4 py-3">No valid end times — please pick an earlier start time</p>
                            ) : (
                              <div className="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto pr-1">
                                {validEnds.map(t => (
                                  <button key={t} type="button"
                                    onClick={() => setBooking({ ...booking, endTime: t })}
                                    className={`py-2 rounded-xl text-xs font-semibold border-2 transition ${booking.endTime === t ? 'border-[#6EC1E4] bg-[#6EC1E4] text-white' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-[#6EC1E4]/50'}`}>
                                    {t}
                                  </button>
                                ))}
                              </div>
                            )
                          })()}
                        </div>

                        {duration > 0 && (
                          <div className="flex items-center gap-3 bg-[#6EC1E4]/8 border border-[#6EC1E4]/20 rounded-2xl px-4 py-3">
                            <i className="fas fa-clock text-[#6EC1E4]" />
                            <span className="text-sm text-gray-700">{duration} hour{duration !== 1 ? 's' : ''}</span>
                            {discountRate > 0 && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                {discountRate * 100}% off
                              </span>
                            )}
                            <span className="ml-auto font-black text-[#6EC1E4] text-lg">₹{total}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Step 1: Children ── */}
                    {step === 1 && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            <i className="fas fa-child mr-2 text-[#6EC1E4]" />How many children?
                          </label>
                          <div className="flex items-center justify-center gap-6 bg-gray-50 rounded-2xl py-5">
                            <button type="button"
                              onClick={() => booking.childrenCount > 1 && setChildCount(booking.childrenCount - 1)}
                              className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#6EC1E4] hover:text-[#6EC1E4] transition text-lg font-bold disabled:opacity-30"
                              disabled={booking.childrenCount <= 1}>−</button>
                            <span className="text-4xl font-black text-gray-900 w-12 text-center">{booking.childrenCount}</span>
                            <button type="button"
                              onClick={() => booking.childrenCount < 5 && setChildCount(booking.childrenCount + 1)}
                              className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#6EC1E4] hover:text-[#6EC1E4] transition text-lg font-bold disabled:opacity-30"
                              disabled={booking.childrenCount >= 5}>+</button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            <i className="fas fa-birthday-cake mr-2 text-[#6EC1E4]" />Age of each child
                          </label>
                          <div className="space-y-2">
                            {Array.from({ length: booking.childrenCount }).map((_, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 w-16 flex-shrink-0">Child {i + 1}</span>
                                <div className="flex gap-2 flex-wrap">
                                  {['0-1', '1-2', '2-4', '4-6', '6-10', '10+'].map(age => (
                                    <button key={age} type="button"
                                      onClick={() => setAge(i, age)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${booking.childrenAges[i] === age ? 'border-[#6EC1E4] bg-[#6EC1E4] text-white' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-[#6EC1E4]/50'}`}>
                                      {age}y
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <i className="fas fa-sticky-note mr-2 text-[#6EC1E4]" />Special instructions <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <textarea rows="3" placeholder="Allergies, nap schedule, emergency contacts..."
                            value={booking.specialInstructions}
                            onChange={e => setBooking({ ...booking, specialInstructions: e.target.value })}
                            className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#6EC1E4] focus:bg-white transition resize-none" />
                        </div>
                      </div>
                    )}

                    {/* ── Step 2: Location ── */}
                    {step === 2 && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <i className="fas fa-home mr-2 text-[#6EC1E4]" />Home address
                          </label>
                          <input type="text" required placeholder="e.g. B-42, Sector 15, Noida"
                            value={booking.address}
                            onChange={e => setBooking({ ...booking, address: e.target.value })}
                            className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#6EC1E4] focus:bg-white transition" />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-gray-700">
                              <i className="fas fa-map-marker-alt mr-2 text-[#6EC1E4]" />Pin on map
                            </label>
                            {homeCoords && (
                              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2.5 py-1 rounded-full">
                                <i className="fas fa-check-circle mr-1" />Pinned
                              </span>
                            )}
                          </div>

                          <button type="button" onClick={detectMyLocation} disabled={detectingLocation}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-[#6EC1E4] text-[#6EC1E4] rounded-2xl text-sm font-semibold hover:bg-[#6EC1E4]/8 transition disabled:opacity-50 mb-3">
                            {detectingLocation
                              ? <><i className="fas fa-spinner fa-spin" /> Detecting location...</>
                              : <><i className="fas fa-location-arrow" /> Use My Current Location</>}
                          </button>

                          <div className="rounded-2xl overflow-hidden border-2 border-gray-100" style={{ height: 200 }}>
                            <Map
                              mapId="booking-location-picker"
                              defaultCenter={homeCoords || { lat: 28.6139, lng: 77.2090 }}
                              center={homeCoords || undefined}
                              defaultZoom={13}
                              gestureHandling="greedy"
                              disableDefaultUI
                              style={{ width: '100%', height: '100%' }}
                              onClick={e => { if (e.detail?.latLng) setHomeCoords({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng }) }}
                            >
                              {homeCoords && (
                                <AdvancedMarker position={homeCoords}>
                                  <div className="w-8 h-8 gradient-bg rounded-full border-2 border-white shadow-xl flex items-center justify-center">
                                    <i className="fas fa-home text-white text-xs" />
                                  </div>
                                </AdvancedMarker>
                              )}
                            </Map>
                          </div>
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <i className="fas fa-satellite-dish text-[#6EC1E4]" />
                            Enables live GPS tracking so you can see {firstName} arrive in real time
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── Step 3: Confirm ── */}
                    {step === 3 && (
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                          {[
                            { icon: 'fa-calendar', label: 'Date', val: booking.date ? new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : '—' },
                            { icon: 'fa-clock', label: 'Time', val: `${booking.startTime} – ${booking.endTime} (${duration}h)` },
                            { icon: 'fa-child', label: 'Children', val: `${booking.childrenCount} child${booking.childrenCount > 1 ? 'ren' : ''}${booking.childrenAges.filter(Boolean).length ? ' · ' + booking.childrenAges.filter(Boolean).join(', ') + 'y' : ''}` },
                            { icon: 'fa-map-marker-alt', label: 'Address', val: booking.address },
                            { icon: 'fa-satellite-dish', label: 'GPS Tracking', val: homeCoords ? 'Enabled ✓' : 'Not pinned (optional)' },
                          ].map(row => (
                            <div key={row.label} className="flex items-start gap-3 px-4 py-3">
                              <div className="w-7 h-7 rounded-lg bg-[#6EC1E4]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <i className={`fas ${row.icon} text-[#6EC1E4] text-xs`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400">{row.label}</p>
                                <p className="text-sm font-semibold text-gray-800 truncate">{row.val}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {booking.specialInstructions && (
                          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl px-4 py-3 text-sm text-gray-700">
                            <p className="text-xs text-yellow-600 font-semibold mb-1"><i className="fas fa-sticky-note mr-1" />Special Instructions</p>
                            {booking.specialInstructions}
                          </div>
                        )}

                        {/* Price breakdown */}
                        <div className="bg-[#6EC1E4]/8 border border-[#6EC1E4]/20 rounded-2xl p-4 space-y-2">
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>₹{profileUser.hourlyRate} × {duration} hours</span>
                            <span className={discountRate > 0 ? 'line-through text-gray-400' : ''}>₹{profileUser.hourlyRate * duration}</span>
                          </div>
                          {discountRate > 0 && (
                            <div className="flex justify-between text-sm text-green-600 font-semibold">
                              <span className="flex items-center gap-1">
                                <i className="fas fa-tag text-xs" />
                                {discountRate * 100}% long-session discount
                              </span>
                              <span>−₹{Math.round(profileUser.hourlyRate * duration) - total}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Platform fee (15%)</span>
                            <span>₹{Math.round(total * 0.15)}</span>
                          </div>
                          <div className="border-t border-[#6EC1E4]/20 pt-2 flex justify-between font-black text-gray-900">
                            <span>Total</span>
                            <span className="text-[#6EC1E4] text-xl">₹{total}</span>
                          </div>
                        </div>

                        {/* Trust badges */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[
                            { icon: 'fa-shield-alt', text: 'KYC Verified Sitter' },
                            { icon: 'fa-undo', text: 'Free Cancellation' },
                            { icon: 'fa-lock', text: 'Secure Booking' },
                          ].map(b => (
                            <div key={b.text} className="bg-gray-50 rounded-xl p-2.5">
                              <i className={`fas ${b.icon} text-green-500 text-sm mb-1 block`} />
                              <p className="text-[10px] text-gray-500 font-medium leading-tight">{b.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Navigation buttons */}
                    <div className={`flex gap-3 mt-6 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
                      {step > 0 && (
                        <button type="button" onClick={() => setStep(s => s - 1)}
                          className="flex items-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-600 rounded-2xl text-sm font-semibold hover:border-gray-300 transition">
                          <i className="fas fa-arrow-left" /> Back
                        </button>
                      )}
                      {step < STEPS.length - 1 ? (
                        <button type="button"
                          onClick={() => canNext[step] && setStep(s => s + 1)}
                          disabled={!canNext[step]}
                          className="flex-1 flex items-center justify-center gap-2 py-3 gradient-bg text-white rounded-2xl text-sm font-bold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#6EC1E4]/30">
                          Continue <i className="fas fa-arrow-right" />
                        </button>
                      ) : (
                        <button type="button" onClick={handleBook} disabled={bookingLoading}
                          className="flex-1 flex items-center justify-center gap-2 py-3.5 gradient-bg text-white rounded-2xl font-bold hover:opacity-90 transition disabled:opacity-50 shadow-lg shadow-[#6EC1E4]/30 text-base">
                          {bookingLoading
                            ? <><i className="fas fa-spinner fa-spin" /> Confirming...</>
                            : <><i className="fas fa-calendar-check" /> Confirm Booking · ₹{total}</>}
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
