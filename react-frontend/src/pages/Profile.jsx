import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/useAuth'
import api from '../services/api'
import toast from 'react-hot-toast'

function Stars({ rating }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  return (
    <span className="text-yellow-400">
      {[...Array(full)].map((_, i) => <i key={i} className="fas fa-star"></i>)}
      {half && <i className="fas fa-star-half-alt"></i>}
      {[...Array(5 - full - (half ? 1 : 0))].map((_, i) => <i key={i} className="far fa-star"></i>)}
    </span>
  )
}

export default function Profile() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profileUser, setProfileUser] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState({ date: '', startTime: '', endTime: '', duration: 2, childrenCount: 1, childrenAges: '', specialInstructions: '', address: '' })
  const [bookingLoading, setBookingLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        // Try babysitter endpoint first
        let userData = null
        try {
          const res = await api.get(`/babysitters/${id}`)
          userData = res.data.babysitter
        } catch {
          // Not a babysitter — fetch as generic user (parent)
          const res = await api.get(`/auth/user/${id}`)
          userData = res.data.user
        }
        setProfileUser(userData)

        // Only fetch reviews for babysitters
        if (userData?.role === 'babysitter') {
          try {
            const r = await api.get(`/reviews/${id}`)
            setReviews(r.data.reviews || [])
          } catch { /* reviews optional */ }
        }
      } catch {
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleBook = async e => {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    if (user.role !== 'parent') { toast.error('Only parents can book'); return }
    setBookingLoading(true)
    try {
      await api.post('/bookings', {
        ...booking,
        babysitterId: id,
        childrenAges: booking.childrenAges.split(',').map(a => a.trim()).filter(Boolean)
      })
      toast.success('Booking created! Check your dashboard.')
      navigate('/parent-dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed')
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6EC1E4]"></div>
    </div>
  )

  if (!profileUser) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      <div className="text-center"><div className="text-5xl mb-4">😕</div><p>User not found</p></div>
    </div>
  )

  const isBabysitter = profileUser.role === 'babysitter'
  const inputCls = "w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6EC1E4] transition"
  const myId = user?._id || user?.id

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className={`max-w-5xl mx-auto px-4 py-10 grid gap-8 ${isBabysitter ? 'md:grid-cols-3' : 'md:grid-cols-1 max-w-2xl'}`}>

        {/* Left / Main: Profile Info */}
        <div className={`space-y-6 ${isBabysitter ? 'md:col-span-2' : ''}`}>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-6">
              <img
                src={profileUser.photo || `https://i.pravatar.cc/200?u=${profileUser._id}`}
                alt={profileUser.name}
                className="w-24 h-24 rounded-2xl object-cover shadow-md"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{profileUser.name}</h1>
                  <span className="text-xs bg-[#6EC1E4]/10 text-[#6EC1E4] px-3 py-1 rounded-full font-semibold capitalize">
                    {profileUser.role}
                  </span>
                  {profileUser.verified && (
                    <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-semibold">
                      <i className="fas fa-check-circle mr-1"></i>KYC Verified
                    </span>
                  )}
                </div>
                <p className="text-gray-500 mt-1"><i className="fas fa-map-marker-alt mr-1 text-[#6EC1E4]"></i>{profileUser.location}</p>

                {isBabysitter && (
                  <>
                    <div className="flex items-center gap-2 mt-2">
                      <Stars rating={profileUser.rating || 0} />
                      <span className="text-gray-500 text-sm">{profileUser.rating} ({profileUser.reviewCount} reviews)</span>
                    </div>
                    <p className="text-[#6EC1E4] font-bold text-2xl mt-2">₹{profileUser.hourlyRate}<span className="text-gray-400 text-sm font-normal">/hour</span></p>
                  </>
                )}

                {/* Chat button — show to logged in users who aren't viewing their own profile */}
                {user && myId !== id && (
                  <Link
                    to={`/chat/${id}`}
                    className="inline-flex items-center gap-2 mt-3 gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition"
                  >
                    <i className="fas fa-comment-dots"></i> Send Message
                  </Link>
                )}
              </div>
            </div>
            {profileUser.bio && <p className="text-gray-600 mt-4 leading-relaxed nunito border-t border-gray-100 pt-4">{profileUser.bio}</p>}
          </div>

          {/* Details — only meaningful for babysitters */}
          {isBabysitter && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="font-bold text-gray-900 mb-4 text-lg">Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Experience', `${profileUser.experience} years`],
                  ['Education', profileUser.education || 'N/A'],
                  ['Languages', (profileUser.languages || []).join(', ') || 'N/A'],
                  ['Age Groups', (profileUser.ageGroups || []).join(', ') || 'N/A'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">{label}</span>
                    <p className="font-semibold text-gray-800 mt-1">{val}</p>
                  </div>
                ))}
              </div>
              {profileUser.skills?.length > 0 && (
                <div className="mt-4">
                  <span className="text-gray-500 text-sm font-medium">Skills</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileUser.skills.map(s => (
                      <span key={s} className="bg-[#6EC1E4]/10 text-[#6EC1E4] text-xs px-3 py-1 rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {profileUser.availability?.length > 0 && (
                <div className="mt-4">
                  <span className="text-gray-500 text-sm font-medium">Available Days</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileUser.availability.map(d => (
                      <span key={d} className="bg-green-50 text-green-600 text-xs px-3 py-1 rounded-full font-medium">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reviews — babysitters only */}
          {isBabysitter && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="font-bold text-gray-900 mb-4 text-lg">Reviews ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <i className="fas fa-star text-3xl mb-2 block"></i>
                  <p>No reviews yet. Be the first to book!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r._id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-center gap-3 mb-2">
                        <img src={r.reviewer?.photo || `https://i.pravatar.cc/50?u=${r._id}`} alt="" className="w-9 h-9 rounded-full object-cover" />
                        <div>
                          <span className="font-semibold text-sm text-gray-800">{r.reviewer?.name}</span>
                          <div className="flex items-center gap-1">
                            <Stars rating={r.rating} />
                            <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm nunito">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Booking Form — only shown to parents viewing a babysitter */}
        {isBabysitter && user?.role === 'parent' && (
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-lg sticky top-24">
              <h2 className="font-bold text-gray-900 mb-1 text-lg">Book {profileUser.name.split(' ')[0]}</h2>
              <p className="text-gray-500 text-sm mb-4">Fill in the details below</p>
              <form onSubmit={handleBook} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Date</label>
                  <input type="date" required value={booking.date}
                    onChange={e => setBooking({ ...booking, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Start Time</label>
                    <input type="time" required value={booking.startTime}
                      onChange={e => setBooking({ ...booking, startTime: e.target.value })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">End Time</label>
                    <input type="time" required value={booking.endTime}
                      onChange={e => setBooking({ ...booking, endTime: e.target.value })}
                      className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Duration (hrs)</label>
                    <input type="number" min="1" max="12" required value={booking.duration}
                      onChange={e => setBooking({ ...booking, duration: e.target.value })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Children</label>
                    <input type="number" min="1" max="5" required value={booking.childrenCount}
                      onChange={e => setBooking({ ...booking, childrenCount: e.target.value })}
                      className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Children Ages (comma separated)</label>
                  <input type="text" placeholder="2, 5" value={booking.childrenAges}
                    onChange={e => setBooking({ ...booking, childrenAges: e.target.value })}
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Address</label>
                  <input type="text" required placeholder="Your home address" value={booking.address}
                    onChange={e => setBooking({ ...booking, address: e.target.value })}
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Special Instructions</label>
                  <textarea rows="2" placeholder="Allergies, routines..." value={booking.specialInstructions}
                    onChange={e => setBooking({ ...booking, specialInstructions: e.target.value })}
                    className={`${inputCls} resize-none`} />
                </div>
                <div className="bg-[#6EC1E4]/10 rounded-xl p-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>₹{profileUser.hourlyRate} × {booking.duration}h</span>
                    <span className="font-bold text-[#6EC1E4]">₹{profileUser.hourlyRate * booking.duration}</span>
                  </div>
                </div>
                <button type="submit" disabled={bookingLoading}
                  className="w-full gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                  {bookingLoading ? <><i className="fas fa-spinner fa-spin"></i> Booking...</> : <><i className="fas fa-calendar-check"></i> Book Now</>}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
