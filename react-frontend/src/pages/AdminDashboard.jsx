import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import toast from 'react-hot-toast'

const TABS = ['Overview', 'Users', 'KYC Requests', 'Bookings', 'Analytics']

const STATUS_CLS = {
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
  confirmed: 'bg-blue-100 text-blue-600',
  pending: 'bg-yellow-100 text-yellow-600',
  'in-progress': 'bg-green-100 text-green-600',
}

function StatCard({ icon, label, val, color }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center mb-2`}>
        <i className={`fas ${icon} text-sm`}></i>
      </div>
      <div className="text-xl font-bold text-gray-900">{val}</div>
      <div className="text-gray-500 text-xs mt-0.5">{label}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [kycRequests, setKycRequests] = useState([])
  const [bookings, setBookings] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [analyticsPeriod, setAnalyticsPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data.stats))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'Users') {
      api.get('/admin/users', { params: { search: userSearch || undefined } })
        .then(r => setUsers(r.data.users))
        .catch(() => toast.error('Failed to load users'))
    } else if (tab === 'KYC Requests') {
      api.get('/admin/kyc-requests')
        .then(r => setKycRequests(r.data.requests))
        .catch(() => toast.error('Failed to load KYC requests'))
    } else if (tab === 'Bookings') {
      api.get('/admin/bookings')
        .then(r => setBookings(r.data.bookings))
        .catch(() => toast.error('Failed to load bookings'))
    } else if (tab === 'Analytics') {
      api.get('/admin/analytics', { params: { period: analyticsPeriod } })
        .then(r => setAnalytics(r.data.analytics))
        .catch(() => toast.error('Failed to load analytics'))
    }
  }, [tab, userSearch, analyticsPeriod])

  const verifyUser = async (id, verified) => {
    try {
      await api.put(`/admin/users/${id}/verify`, { verified })
      setKycRequests(prev => prev.filter(u => u._id !== id))
      setUsers(prev => prev.map(u => u._id === id ? { ...u, verified, kycStatus: verified ? 'approved' : 'rejected' } : u))
      toast.success(verified ? 'Babysitter verified!' : 'Verification rejected')
    } catch { toast.error('Failed to update') }
  }

  const blockUser = async (id, blocked) => {
    try {
      await api.put(`/admin/users/${id}/block`, { blocked })
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBlocked: blocked } : u))
      toast.success(blocked ? 'User blocked' : 'User unblocked')
    } catch { toast.error('Failed to update') }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 pt-20">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center">
            <i className="fas fa-shield-alt text-white text-sm"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-xs nunito">Manage users, KYC and bookings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b-2 border-gray-200 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 -mb-0.5 whitespace-nowrap ${tab === t ? 'border-[#6EC1E4] text-[#6EC1E4]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'Overview' && (
          loading
            ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6EC1E4]"></div></div>
            : stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard icon="fa-users" label="Total Users" val={stats.users.total} color="bg-blue-50 text-blue-600" />
                  <StatCard icon="fa-user-friends" label="Parents" val={stats.users.parents} color="bg-green-50 text-green-600" />
                  <StatCard icon="fa-baby" label="Babysitters" val={stats.users.babysitters} color="bg-purple-50 text-purple-600" />
                  <StatCard icon="fa-clock" label="Pending KYC" val={stats.users.pendingKYC} color="bg-yellow-50 text-yellow-600" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard icon="fa-calendar" label="Total Bookings" val={stats.bookings.total} color="bg-[#6EC1E4]/10 text-[#6EC1E4]" />
                  <StatCard icon="fa-check-circle" label="Completed" val={stats.bookings.completed} color="bg-green-50 text-green-600" />
                  <StatCard icon="fa-times-circle" label="Cancelled" val={stats.bookings.cancelled} color="bg-red-50 text-red-600" />
                  <StatCard icon="fa-chart-pie" label="Completion Rate" val={`${stats.bookings.completionRate}%`} color="bg-indigo-50 text-indigo-600" />
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <StatCard icon="fa-rupee-sign" label="Total Revenue" val={`₹${stats.revenue.totalRevenue || 0}`} color="bg-green-50 text-green-600" />
                  <StatCard icon="fa-building" label="Platform Earnings" val={`₹${stats.revenue.platformEarnings || 0}`} color="bg-blue-50 text-blue-600" />
                  <StatCard icon="fa-wallet" label="Babysitter Payouts" val={`₹${stats.revenue.babysitterPayouts || 0}`} color="bg-purple-50 text-purple-600" />
                </div>
              </div>
            )
        )}

        {/* Users */}
        {tab === 'Users' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input type="text" placeholder="Search by name, email, phone..."
                  value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 border-2 border-gray-200 rounded-xl py-2 text-xs focus:outline-none focus:border-[#6EC1E4] transition" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b-2 border-gray-100">
                    <th className="pb-2 font-semibold">User</th>
                    <th className="pb-2 font-semibold">Role</th>
                    <th className="pb-2 font-semibold">Location</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-gray-50 transition">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <img src={u.photo || `https://i.pravatar.cc/40?u=${u._id}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <p className="font-semibold text-gray-900">{u.name}</p>
                            <p className="text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${u.role === 'babysitter' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-500">{u.location || '—'}</td>
                      <td className="py-2.5">
                        {u.isBlocked
                          ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Blocked</span>
                          : u.verified
                            ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Verified</span>
                            : <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Active</span>}
                      </td>
                      <td className="py-2.5">
                        <button onClick={() => blockUser(u._id, !u.isBlocked)}
                          className={`px-3 py-1 rounded-lg font-semibold transition ${u.isBlocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                          {u.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <i className="fas fa-users text-3xl mb-2 block text-gray-200"></i>
                  <p className="text-sm">No users found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KYC Requests */}
        {tab === 'KYC Requests' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              Pending KYC Requests
              {kycRequests.length > 0 && (
                <span className="gradient-bg text-white text-xs px-2 py-0.5 rounded-full">{kycRequests.length}</span>
              )}
            </h2>
            {kycRequests.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <i className="fas fa-check-circle text-4xl mb-3 block text-green-200"></i>
                <p className="font-medium text-sm">No pending KYC requests 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {kycRequests.map(u => (
                  <div key={u._id} className="border-2 border-gray-100 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 hover:border-[#6EC1E4]/30 transition">
                    <div className="flex items-center gap-3">
                      <img src={u.photo || `https://i.pravatar.cc/50?u=${u._id}`} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                        <p className="text-gray-500 text-xs">{u.email} · {u.phone}</p>
                        <p className="text-gray-500 text-xs"><i className="fas fa-map-marker-alt mr-1 text-[#6EC1E4]"></i>{u.location}</p>
                        {u.kycData && (
                          <p className="text-gray-400 text-xs mt-0.5">
                            <i className="fas fa-id-card mr-1"></i>{u.kycData.idType} — {u.kycData.idNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => verifyUser(u._id, true)}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-600 transition flex items-center gap-1">
                        <i className="fas fa-check"></i> Approve
                      </button>
                      <button onClick={() => verifyUser(u._id, false)}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-600 transition flex items-center gap-1">
                        <i className="fas fa-times"></i> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookings */}
        {tab === 'Bookings' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4 text-sm">All Bookings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b-2 border-gray-100">
                    <th className="pb-2 font-semibold">Parent</th>
                    <th className="pb-2 font-semibold">Babysitter</th>
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Amount</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map(b => (
                    <tr key={b._id} className="hover:bg-gray-50 transition">
                      <td className="py-2.5 font-medium text-gray-900">{b.parentName}</td>
                      <td className="py-2.5 text-gray-600">{b.babysitterName}</td>
                      <td className="py-2.5 text-gray-500">{new Date(b.date).toLocaleDateString('en-IN')}</td>
                      <td className="py-2.5 font-semibold text-[#6EC1E4]">₹{b.totalAmount}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_CLS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <i className="fas fa-calendar text-3xl mb-2 block text-gray-200"></i>
                  <p className="text-sm">No bookings found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics */}
        {tab === 'Analytics' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Platform Analytics</h2>
              <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                {['week', 'month', 'year'].map(p => (
                  <button key={p} onClick={() => setAnalyticsPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${analyticsPeriod === p ? 'gradient-bg text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {!analytics ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6EC1E4]"></div>
              </div>
            ) : (
              <>
                {/* Top Babysitters */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                    <i className="fas fa-trophy text-yellow-500"></i> Top Rated Babysitters
                  </h3>
                  {analytics.topBabysitters?.length === 0 ? (
                    <p className="text-gray-400 text-xs text-center py-4">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.topBabysitters?.map((s, i) => (
                        <div key={s._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-600' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                            {i + 1}
                          </span>
                          <img src={s.photo || `https://i.pravatar.cc/40?u=${s._id}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-xs truncate">{s.name}</p>
                            <p className="text-gray-500 text-xs"><i className="fas fa-map-marker-alt mr-1 text-[#6EC1E4]"></i>{s.location}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-yellow-500 text-xs font-semibold">★ {s.rating}</p>
                            <p className="text-gray-400 text-xs">{s.reviewCount} reviews</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Locations */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                    <i className="fas fa-map-marker-alt text-[#6EC1E4]"></i> Top Service Locations
                  </h3>
                  {analytics.topLocations?.length === 0 ? (
                    <p className="text-gray-400 text-xs text-center py-4">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.topLocations?.map((loc, i) => {
                        const max = analytics.topLocations[0]?.count || 1
                        const pct = Math.round((loc.count / max) * 100)
                        return (
                          <div key={loc._id} className="flex items-center gap-3">
                            <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                            <span className="text-gray-700 text-xs font-medium w-28 truncate">{loc._id}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div className="gradient-bg h-2 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-gray-500 text-xs w-8 text-right">{loc.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Bookings Over Time */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
                    <i className="fas fa-chart-line text-[#6EC1E4]"></i> Bookings Over Time
                  </h3>
                  {analytics.bookingsOverTime?.length === 0 ? (
                    <p className="text-gray-400 text-xs text-center py-4">No booking data for this period</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-100">
                            <th className="pb-2 font-semibold">Date</th>
                            <th className="pb-2 font-semibold">Bookings</th>
                            <th className="pb-2 font-semibold">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {analytics.bookingsOverTime?.map(row => (
                            <tr key={row._id} className="hover:bg-gray-50">
                              <td className="py-2 text-gray-600">{row._id}</td>
                              <td className="py-2 font-semibold text-gray-900">{row.count}</td>
                              <td className="py-2 font-semibold text-[#6EC1E4]">₹{row.revenue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
