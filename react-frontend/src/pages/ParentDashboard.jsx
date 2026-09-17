import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import api from '../services/api'
import toast from 'react-hot-toast'
import PhotoUpload from '../components/PhotoUpload'

const STATUS = {
  pending: { cls: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  confirmed: { cls: 'bg-blue-100 text-blue-700', label: 'Confirmed' },
  'in-progress': { cls: 'bg-green-100 text-green-700', label: 'In Progress' },
  completed: { cls: 'bg-gray-100 text-gray-700', label: 'Completed' },
  cancelled: { cls: 'bg-red-100 text-red-700', label: 'Cancelled' },
}

const SECTIONS = [
  { key: 'overview', icon: 'fa-home', label: 'Overview' },
  { key: 'bookings', icon: 'fa-calendar-alt', label: 'My Bookings' },
  { key: 'payments', icon: 'fa-credit-card', label: 'Payments' },
  { key: 'profile', icon: 'fa-user', label: 'My Profile' },
]

export default function ParentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('overview')
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState({ name: '', phone: '', location: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/bookings'),
      api.get('/bookings/user/stats')
    ]).then(([b, s]) => {
      setBookings(b.data.bookings || [])
      setStats(s.data.stats)
      if (user) setProfile({ name: user.name || '', phone: user.phone || '', location: user.location || '' })
    }).catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  const cancelBooking = async id => {
    if (!confirm('Cancel this booking?')) return
    if (!id || !/^[a-f\d]{24}$/i.test(id)) { toast.error('Invalid booking'); return }
    const safeId = String(id).replace(/[^a-f0-9]/gi, '')
    try {
      await api.put(`/bookings/${safeId}/status`, { status: 'cancelled', cancellationReason: 'Cancelled by parent' })
      setBookings(prev => prev.map(b => b._id === safeId ? { ...b, status: 'cancelled' } : b))
      toast.success('Booking cancelled')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel')
    }
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

  const handleLogout = () => { logout(); navigate('/login') }

  const BookingCard = ({ b }) => (
    <div className="border rounded-xl p-4 mb-4 hover:shadow-md transition">
      <div className="flex gap-4">
        {b.babysitter?.photo
          ? <img src={b.babysitter.photo} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
          : <div className="w-16 h-16 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-xl flex-shrink-0">{b.babysitterName?.charAt(0) || '?'}</div>
        }
        <div className="flex-1">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <h4 className="font-semibold text-gray-900">{b.babysitterName}</h4>
              <p className="text-sm text-gray-500">
                <i className="fas fa-calendar mr-1"></i>{new Date(b.date).toLocaleDateString('en-IN')}
                <i className="fas fa-clock ml-3 mr-1"></i>{b.startTime} – {b.endTime}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${STATUS[b.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
              {STATUS[b.status]?.label || b.status}
            </span>
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="font-bold text-[#6EC1E4]">₹{b.totalAmount}</span>
            <div className="flex items-center gap-3">
              {b.babysitter?._id && (
                <Link
                  to={`/chat/${b.babysitter._id}`}
                  className="text-sm text-[#6EC1E4] font-medium flex items-center gap-1 hover:underline"
                >
                  <i className="fas fa-comment-dots"></i> Message
                </Link>
              )}
              {['pending', 'confirmed'].includes(b.status) && (
                <button onClick={() => cancelBooking(b._id)} className="text-sm text-red-500 hover:underline">Cancel</button>
              )}
            </div>
          </div>
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
            <span className="text-xl font-bold gradient-text">SmartCare</span>
          </Link>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {SECTIONS.map(s => (
              <li key={s.key}>
                <button onClick={() => { setSection(s.key); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition text-left ${section === s.key ? 'gradient-bg !text-white' : ''}`}>
                  <i className={`fas ${s.icon} w-5`}></i> {s.label}
                </button>
              </li>
            ))}
            <li>
              <Link to="/search" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition">
                <i className="fas fa-search w-5"></i> Find Babysitters
              </Link>
            </li>
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
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex justify-between items-center px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-gray-600">
                <i className="fas fa-bars text-xl"></i>
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                {{ overview: 'Overview', bookings: 'My Bookings', payments: 'Payments', profile: 'My Profile' }[section]}
              </h1>
            </div>
            <div className="flex items-center gap-3">
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
                      { label: 'Total Bookings', val: stats?.totalBookings || 0, icon: 'fa-calendar-check', color: 'bg-blue-100 text-[#6EC1E4]' },
                      { label: 'Completed', val: stats?.completedBookings || 0, icon: 'fa-check-circle', color: 'bg-green-100 text-green-500' },
                      { label: 'Pending', val: stats?.pendingBookings || 0, icon: 'fa-clock', color: 'bg-yellow-100 text-yellow-500' },
                      { label: 'Total Spent', val: `₹${stats?.totalAmount || 0}`, icon: 'fa-rupee-sign', color: 'bg-purple-100 text-purple-500' },
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

                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Link to="/search" className="gradient-bg rounded-2xl p-6 text-white hover:opacity-90 transition">
                      <i className="fas fa-search text-3xl mb-4 block"></i>
                      <h3 className="text-xl font-bold mb-2">Find a Babysitter</h3>
                      <p className="text-white/80">Search verified babysitters near you</p>
                    </Link>
                    <div onClick={() => setSection('bookings')} className="bg-white rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition">
                      <i className="fas fa-calendar-alt text-3xl text-[#6EC1E4] mb-4 block"></i>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">View Bookings</h3>
                      <p className="text-gray-500">Check your upcoming sessions</p>
                    </div>
                    <div onClick={() => setSection('profile')} className="bg-white rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition">
                      <i className="fas fa-user-edit text-3xl text-[#6EC1E4] mb-4 block"></i>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Update Profile</h3>
                      <p className="text-gray-500">Keep your info up to date</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
                      <button onClick={() => setSection('bookings')} className="text-[#6EC1E4] font-medium hover:underline">View All</button>
                    </div>
                    {bookings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-calendar-times text-4xl text-gray-300 mb-4 block"></i>
                        <p>No bookings yet</p>
                        <Link to="/search" className="text-[#6EC1E4] font-medium hover:underline">Find a babysitter</Link>
                      </div>
                    ) : bookings.slice(0, 3).map(b => <BookingCard key={b._id} b={b} />)}
                  </div>
                </>
              )}
            </>
          )}

          {/* Bookings */}
          {section === 'bookings' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h2 className="text-xl font-bold text-gray-900">My Bookings</h2>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'pending', 'confirmed', 'in-progress', 'completed', 'cancelled'].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${filter === s ? 'bg-[#6EC1E4] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6EC1E4]"></div></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <i className="fas fa-calendar-times text-5xl text-gray-300 mb-4 block"></i>
                  <p>No bookings found</p>
                </div>
              ) : filtered.map(b => <BookingCard key={b._id} b={b} />)}
            </div>
          )}

          {/* Payments */}
          {section === 'payments' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Payment History</h2>
              {bookings.filter(b => b.paymentStatus === 'paid').length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <i className="fas fa-receipt text-5xl text-gray-300 mb-4 block"></i>
                  <p>No payment history</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-500 text-sm border-b">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Babysitter</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.filter(b => b.paymentStatus === 'paid').map(b => (
                        <tr key={b._id} className="border-b">
                          <td className="py-4">{new Date(b.date).toLocaleDateString('en-IN')}</td>
                          <td className="py-4">{b.babysitterName}</td>
                          <td className="py-4 font-semibold">₹{b.totalAmount}</td>
                          <td className="py-4"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">Paid</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
                  <div className="mb-6">
                    <label aria-label="Location" className="block text-gray-700 font-medium mb-2">Location</label>
                    <select value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none">
                      {['South Delhi', 'North Delhi', 'East Delhi', 'West Delhi', 'Dwarka', 'Noida', 'Gurgaon'].map(l => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={saving} className="gradient-bg text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  )
}
