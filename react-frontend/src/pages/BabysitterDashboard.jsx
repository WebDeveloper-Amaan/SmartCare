import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import api from '../services/api'
import toast from 'react-hot-toast'
import PhotoUpload, { InitialsAvatar } from '../components/PhotoUpload'

const STATUS = {
  pending: { cls: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  confirmed: { cls: 'bg-blue-100 text-blue-700', label: 'Confirmed' },
  'in-progress': { cls: 'bg-green-100 text-green-700', label: 'In Progress' },
  completed: { cls: 'bg-gray-100 text-gray-700', label: 'Completed' },
  cancelled: { cls: 'bg-red-100 text-red-700', label: 'Cancelled' },
}

const SECTIONS = [
  { key: 'overview', icon: 'fa-home', label: 'Overview' },
  { key: 'requests', icon: 'fa-inbox', label: 'Job Requests' },
  { key: 'schedule', icon: 'fa-calendar-alt', label: 'My Schedule' },
  { key: 'earnings', icon: 'fa-wallet', label: 'Earnings' },
  { key: 'profile', icon: 'fa-user', label: 'My Profile' },
  { key: 'kyc', icon: 'fa-id-card', label: 'KYC Verification' },
]

export default function BabysitterDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('overview')
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState({ name: '', phone: '', location: '', hourlyRate: 200, bio: '', experience: 0 })
  const [saving, setSaving] = useState(false)
  const [kycForm, setKycForm] = useState({ idType: 'aadhaar', idNumber: '', documentUrl: '' })
  const [submittingKyc, setSubmittingKyc] = useState(false)
  const [locationCoords, setLocationCoords] = useState(null)
  const [savingLocation, setSavingLocation] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/bookings'),
      api.get('/bookings/user/stats')
    ]).then(([b, s]) => {
      setBookings(b.data.bookings || [])
      setStats(s.data.stats)
      if (user) setProfile({
        name: user.name || '', phone: user.phone || '', location: user.location || '',
        hourlyRate: user.hourlyRate || 200, bio: user.bio || '', experience: user.experience || 0
      })
    }).catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  // Init location coords from user data
  useEffect(() => {
    if (user?.coordinates?.coordinates) {
      const [lng, lat] = user.coordinates.coordinates
      setLocationCoords({ lat, lng })
    }
  }, [user])

  const detectMyLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationCoords({ lat: coords.latitude, lng: coords.longitude })
        setDetectingLocation(false)
        toast.success('Location detected!')
      },
      () => { toast.error('Location access denied'); setDetectingLocation(false) },
      { timeout: 8000 }
    )
  }, [])

  const saveLocation = useCallback(async () => {
    if (!locationCoords) return
    setSavingLocation(true)
    try {
      await api.put('/babysitters/location', { lat: locationCoords.lat, lng: locationCoords.lng })
      toast.success('Location saved! You will appear on the map after KYC verification.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save location')
    } finally {
      setSavingLocation(false)
    }
  }, [locationCoords])

  const pending = bookings.filter(b => b.status === 'pending')
  const confirmed = bookings.filter(b => ['confirmed', 'in-progress'].includes(b.status))
  const completed = bookings.filter(b => b.status === 'completed')
  const totalEarned = bookings.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + b.totalAmount, 0)

  const updateStatus = async (id, status) => {
    if (!id || !/^[a-f\d]{24}$/i.test(id)) { toast.error('Invalid booking'); return }
    try {
      await api.put(`/bookings/${id}/status`, { status })
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status } : b))
      toast.success(status === 'confirmed' ? 'Job accepted!' : 'Job declined')
    } catch { toast.error('Failed to update') }
  }

  const saveProfile = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/auth/update-profile', profile)
      toast.success('Profile updated!')
    } catch { toast.error('Failed to update') }
    finally { setSaving(false) }
  }

  const submitKYC = async e => {
    e.preventDefault()
    setSubmittingKyc(true)
    try {
      await api.post('/auth/submit-kyc', kycForm)
      toast.success('KYC submitted for review!')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to submit') }
    finally { setSubmittingKyc(false) }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const verificationBadge = user?.verified
    ? <span className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100"><i className="fas fa-check-circle text-green-500"></i><span className="text-green-700">Verified</span></span>
    : user?.kycStatus === 'submitted'
      ? <span className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-yellow-100"><i className="fas fa-clock text-yellow-500"></i><span className="text-yellow-700">Pending</span></span>
      : <span className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-red-100"><i className="fas fa-exclamation-circle text-red-500"></i><span className="text-red-700">Unverified</span></span>

  const JobCard = ({ b }) => (
    <div className="border rounded-xl p-4 mb-4">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h4 className="font-semibold text-gray-900">{b.parentName}</h4>
          <p className="text-sm text-gray-500">
            <i className="fas fa-calendar mr-1"></i>{new Date(b.date).toLocaleDateString('en-IN')}
            <i className="fas fa-clock ml-3 mr-1"></i>{b.startTime} – {b.endTime}
          </p>
          {b.address && <p className="text-sm text-gray-500 mt-1"><i className="fas fa-map-marker-alt mr-1"></i>{b.address}</p>}
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded-full text-sm ${STATUS[b.status]?.cls || 'bg-gray-100 text-gray-600'}`}>{STATUS[b.status]?.label || b.status}</span>
          <p className="text-lg font-bold text-[#6EC1E4] mt-2">₹{b.totalAmount}</p>
          {b.parent?._id && (
            <Link
              to={`/chat/${b.parent._id}`}
              className="inline-flex items-center gap-1 mt-2 text-sm text-[#6EC1E4] font-medium hover:underline"
            >
              <i className="fas fa-comment-dots"></i> Message Parent
            </Link>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`w-64 bg-white shadow-lg fixed h-full z-40 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
              <i className="fas fa-baby text-white text-lg"></i>
            </div>
            <span className="text-xl font-bold gradient-text">BabyCare</span>
          </Link>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {SECTIONS.map(s => (
              <li key={s.key}>
                <button onClick={() => { setSection(s.key); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition text-left ${section === s.key ? 'gradient-bg !text-white' : ''}`}>
                  <i className={`fas ${s.icon} w-5`}></i>
                  {s.label}
                  {s.key === 'requests' && pending.length > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pending.length}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64">
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex justify-between items-center px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-gray-600">
                <i className="fas fa-bars text-xl"></i>
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                {SECTIONS.find(s => s.key === section)?.label || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {verificationBadge}
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {user?.photo
                  ? <img src={user.photo} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full gradient-bg flex items-center justify-center text-white font-bold text-sm">{user?.name?.charAt(0).toUpperCase()}</div>
                }
              </div>
              <span className="hidden md:block text-gray-700 font-medium">{user?.name}</span>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Overview */}
          {section === 'overview' && (
            <>
              {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6EC1E4]"></div></div>
              ) : (
                <>
                  <div className="grid md:grid-cols-4 gap-6 mb-8">
                    {[
                      { label: 'Total Jobs', val: bookings.length, icon: 'fa-briefcase', color: 'bg-blue-100 text-[#6EC1E4]' },
                      { label: 'Completed', val: completed.length, icon: 'fa-check-circle', color: 'bg-green-100 text-green-500' },
                      { label: 'Pending', val: pending.length, icon: 'fa-clock', color: 'bg-yellow-100 text-yellow-500' },
                      { label: 'Total Earned', val: `₹${totalEarned}`, icon: 'fa-rupee-sign', color: 'bg-purple-100 text-purple-500' },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-500 text-sm">{s.label}</p>
                            <p className="text-3xl font-bold text-gray-900">{s.val}</p>
                          </div>
                          <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center`}>
                            <i className={`fas ${s.icon} text-xl`}></i>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!user?.verified && user?.kycStatus !== 'submitted' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                          <i className="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">Complete Your KYC Verification</h3>
                          <p className="text-gray-600 text-sm">Get verified to start receiving job requests from parents</p>
                        </div>
                        <button onClick={() => setSection('kyc')} className="gradient-bg text-white px-6 py-2 rounded-xl font-medium hover:opacity-90 transition">
                          Verify Now
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Prompt to set location if default Delhi coords */}
                  {!user?.verified && user?.coordinates?.coordinates?.[0] === 77.2090 && user?.coordinates?.coordinates?.[1] === 28.6139 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <i className="fas fa-map-marker-alt text-blue-500 text-xl"></i>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">Set Your Map Location</h3>
                          <p className="text-gray-600 text-sm">Pin your location so parents can find you on the map. Must be done before KYC verification.</p>
                        </div>
                        <button onClick={() => setSection('profile')} className="bg-blue-500 text-white px-6 py-2 rounded-xl font-medium hover:opacity-90 transition">
                          Set Location
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div onClick={() => setSection('requests')} className="bg-white rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition">
                      <i className="fas fa-inbox text-3xl text-[#6EC1E4] mb-4 block"></i>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Job Requests</h3>
                      <p className="text-gray-500">View and respond to booking requests</p>
                    </div>
                    <div onClick={() => setSection('profile')} className="bg-white rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition">
                      <i className="fas fa-user-edit text-3xl text-[#6EC1E4] mb-4 block"></i>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Update Profile</h3>
                      <p className="text-gray-500">Enhance your profile to attract more parents</p>
                    </div>
                    <div onClick={() => setSection('earnings')} className="bg-white rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition">
                      <i className="fas fa-chart-line text-3xl text-[#6EC1E4] mb-4 block"></i>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">View Earnings</h3>
                      <p className="text-gray-500">Track your income and payments</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Upcoming Jobs</h2>
                    {confirmed.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-calendar-times text-4xl text-gray-300 mb-4 block"></i>
                        <p>No upcoming jobs</p>
                      </div>
                    ) : confirmed.slice(0, 3).map(b => <JobCard key={b._id} b={b} />)}
                  </div>
                </>
              )}
            </>
          )}

          {/* Job Requests */}
          {section === 'requests' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Pending Job Requests</h2>
              {pending.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <i className="fas fa-inbox text-5xl text-gray-300 mb-4 block"></i>
                  <p>No pending requests</p>
                </div>
              ) : pending.map(b => (
                <div key={b._id} className="border rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{b.parentName}</h4>
                      <p className="text-sm text-gray-500">
                        <i className="fas fa-calendar mr-1"></i>{new Date(b.date).toLocaleDateString('en-IN')}
                        <i className="fas fa-clock ml-3 mr-1"></i>{b.startTime} – {b.endTime}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        <i className="fas fa-child mr-1"></i>{b.childrenCount} child(ren)
                        {b.address && <><i className="fas fa-map-marker-alt ml-3 mr-1"></i>{b.address}</>}
                      </p>
                    </div>
                    <span className="text-xl font-bold text-[#6EC1E4]">₹{b.totalAmount}</span>
                  </div>
                  {b.specialInstructions && (
                    <p className="text-gray-600 text-sm mb-4 bg-gray-50 p-3 rounded-lg">
                      <i className="fas fa-sticky-note mr-2"></i>{b.specialInstructions}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => updateStatus(b._id, 'confirmed')}
                      className="flex-1 gradient-bg text-white py-2 rounded-lg font-medium hover:opacity-90 transition">
                      <i className="fas fa-check mr-2"></i>Accept
                    </button>
                    <button onClick={() => updateStatus(b._id, 'cancelled')}
                      className="flex-1 border-2 border-red-500 text-red-500 py-2 rounded-lg font-medium hover:bg-red-50 transition">
                      <i className="fas fa-times mr-2"></i>Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Schedule */}
          {section === 'schedule' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">My Schedule</h2>
              {[...confirmed, ...completed].length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <i className="fas fa-calendar text-5xl text-gray-300 mb-4 block"></i>
                  <p>No scheduled jobs yet</p>
                </div>
              ) : [...confirmed, ...completed].map(b => <JobCard key={b._id} b={b} />)}
            </div>
          )}

          {/* Earnings */}
          {section === 'earnings' && (
            <>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="gradient-bg rounded-2xl p-6 text-white">
                  <p className="text-white/80 mb-2">Total Earnings</p>
                  <p className="text-4xl font-bold">₹{totalEarned}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <p className="text-gray-500 mb-2">Completed Jobs</p>
                  <p className="text-4xl font-bold text-gray-900">{completed.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Payment History</h2>
                {bookings.filter(b => b.paymentStatus === 'paid').length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-wallet text-5xl text-gray-300 mb-4 block"></i>
                    <p>No earnings yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-500 text-sm border-b">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Parent</th>
                          <th className="pb-3">Duration</th>
                          <th className="pb-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.filter(b => b.paymentStatus === 'paid').map(b => (
                          <tr key={b._id} className="border-b">
                            <td className="py-4">{new Date(b.date).toLocaleDateString('en-IN')}</td>
                            <td className="py-4">{b.parentName}</td>
                            <td className="py-4">{b.duration || '—'} hrs</td>
                            <td className="py-4 font-semibold text-green-600">+₹{b.totalAmount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Profile */}
          {section === 'profile' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
                <PhotoUpload />
                <form onSubmit={saveProfile}>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label aria-label="Full Name" className="block text-gray-700 font-medium mb-2">Full Name</label>
                      <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none" />
                    </div>
                    <div>
                      <label aria-label="Phone" className="block text-gray-700 font-medium mb-2">Phone</label>
                      <input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label aria-label="Email" className="block text-gray-700 font-medium mb-2">Email</label>
                    <input type="email" value={user?.email || ''} readOnly className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 outline-none" />
                  </div>
                  <div className="mb-4">
                    <label aria-label="Location" className="block text-gray-700 font-medium mb-2">Location</label>
                    <select value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none">
                      {['South Delhi', 'North Delhi', 'East Delhi', 'West Delhi', 'Dwarka', 'Noida', 'Gurgaon'].map(l => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label aria-label="Hourly Rate" className="block text-gray-700 font-medium mb-2">Hourly Rate (₹)</label>
                    <input type="number" min="100" max="1000" value={profile.hourlyRate} onChange={e => setProfile({ ...profile, hourlyRate: +e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none" />
                  </div>
                  <div className="mb-4">
                    <label aria-label="Bio" className="block text-gray-700 font-medium mb-2">Bio</label>
                    <textarea rows="4" value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Tell parents about yourself..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none resize-none" />
                  </div>
                  <div className="mb-6">
                    <label aria-label="Years of Experience" className="block text-gray-700 font-medium mb-2">Years of Experience</label>
                    <input type="number" min="0" max="30" value={profile.experience} onChange={e => setProfile({ ...profile, experience: +e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none" />
                  </div>

                  {/* ── Map Location Picker ── */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-gray-700 font-medium">
                        Your Location on Map
                      </label>
                      {user?.verified
                        ? <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                            <i className="fas fa-lock"></i> Locked after KYC
                          </span>
                        : <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-medium">
                            Set before KYC verification
                          </span>
                      }
                    </div>

                    {user?.verified ? (
                      // Locked state — read-only map
                      <div className="rounded-xl overflow-hidden border-2 border-green-200" style={{ height: 220 }}>
                        <Map
                          mapId="sitter-location-locked"
                          defaultCenter={locationCoords || { lat: 28.6139, lng: 77.2090 }}
                          defaultZoom={14}
                          gestureHandling="none"
                          disableDefaultUI
                          style={{ width: '100%', height: '100%' }}
                        >
                          {locationCoords && (
                            <AdvancedMarker position={locationCoords}>
                              <div className="w-5 h-5 bg-[#6EC1E4] rounded-full border-2 border-white shadow-lg" />
                            </AdvancedMarker>
                          )}
                        </Map>
                      </div>
                    ) : (
                      // Editable state — click to move pin
                      <>
                        <p className="text-xs text-gray-400 mb-2">
                          <i className="fas fa-info-circle mr-1"></i>
                          Click anywhere on the map to place your pin, or use the button below.
                        </p>
                        <div className="rounded-xl overflow-hidden border-2 border-[#6EC1E4]/40" style={{ height: 260 }}>
                          <Map
                            mapId="sitter-location-picker"
                            defaultCenter={locationCoords || { lat: 28.6139, lng: 77.2090 }}
                            defaultZoom={13}
                            gestureHandling="greedy"
                            disableDefaultUI={false}
                            style={{ width: '100%', height: '100%' }}
                            onClick={e => {
                              if (e.detail?.latLng) {
                                setLocationCoords({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng })
                              }
                            }}
                          >
                            {locationCoords && (
                              <AdvancedMarker position={locationCoords}>
                                <div className="relative">
                                  <div className="w-6 h-6 gradient-bg rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                                    <i className="fas fa-home text-white text-xs"></i>
                                  </div>
                                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-pink-400" />
                                </div>
                              </AdvancedMarker>
                            )}
                          </Map>
                        </div>

                        {locationCoords && (
                          <p className="text-xs text-gray-400 mt-1.5">
                            <i className="fas fa-map-marker-alt mr-1 text-[#6EC1E4]"></i>
                            {locationCoords.lat.toFixed(5)}, {locationCoords.lng.toFixed(5)}
                          </p>
                        )}

                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            onClick={detectMyLocation}
                            disabled={detectingLocation}
                            className="flex items-center gap-2 px-4 py-2 border-2 border-[#6EC1E4] text-[#6EC1E4] rounded-xl text-sm font-semibold hover:bg-[#6EC1E4]/10 transition disabled:opacity-50"
                          >
                            {detectingLocation
                              ? <><i className="fas fa-spinner fa-spin"></i> Detecting...</>
                              : <><i className="fas fa-location-arrow"></i> Use My Location</>
                            }
                          </button>
                          <button
                            type="button"
                            onClick={saveLocation}
                            disabled={savingLocation || !locationCoords}
                            className="flex items-center gap-2 px-4 py-2 gradient-bg text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                          >
                            {savingLocation
                              ? <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                              : <><i className="fas fa-map-pin"></i> Save Location</>
                            }
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button type="submit" disabled={saving} className="gradient-bg text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* KYC */}
          {section === 'kyc' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">KYC Verification</h2>
                {user?.verified || user?.kycStatus === 'approved' ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-check-circle text-green-500 text-4xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Complete!</h3>
                    <p className="text-gray-600">Your KYC has been verified. You can now receive job requests.</p>
                  </div>
                ) : user?.kycStatus === 'submitted' ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-clock text-yellow-500 text-4xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Pending</h3>
                    <p className="text-gray-600">Your documents are being reviewed. This usually takes 24–48 hours.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 mb-6">Submit your ID documents to get verified and start receiving job requests.</p>
                    <form onSubmit={submitKYC}>
                      <div className="mb-4">
                        <label aria-label="ID Type" className="block text-gray-700 font-medium mb-2">ID Type</label>
                        <select value={kycForm.idType} onChange={e => setKycForm({ ...kycForm, idType: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none">
                          <option value="aadhaar">Aadhaar Card</option>
                          <option value="pan">PAN Card</option>
                          <option value="voter">Voter ID</option>
                          <option value="driving">Driving License</option>
                        </select>
                      </div>
                      <div className="mb-4">
                        <label aria-label="ID Number" className="block text-gray-700 font-medium mb-2">ID Number</label>
                        <input type="text" required value={kycForm.idNumber} onChange={e => setKycForm({ ...kycForm, idNumber: e.target.value })}
                          placeholder="Enter your ID number"
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none" />
                      </div>
                      <div className="mb-6">
                        <label aria-label="Document URL" className="block text-gray-700 font-medium mb-2">Document URL</label>
                        <input type="url" required value={kycForm.documentUrl} onChange={e => setKycForm({ ...kycForm, documentUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none" />
                      </div>
                      <button type="submit" disabled={submittingKyc} className="w-full gradient-bg text-white py-4 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
                        <i className="fas fa-paper-plane mr-2"></i>{submittingKyc ? 'Submitting...' : 'Submit for Verification'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  )
}
