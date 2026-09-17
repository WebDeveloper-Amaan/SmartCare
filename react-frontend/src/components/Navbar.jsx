import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import api from '../services/api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const isLanding = location.pathname === '/'
  const isTransparent = isLanding && !scrolled

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false); setDropdownOpen(false) }, [location.pathname])

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    api.get('/chat/unread/count')
      .then(r => setUnreadCount(r.data.unreadCount || 0))
      .catch(() => {})
    const interval = setInterval(() => {
      api.get('/chat/unread/count')
        .then(r => setUnreadCount(r.data.unreadCount || 0))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [user])

  const dashboardLink = () => {
    if (!user) return '/login'
    if (user.role === 'admin') return '/admin'
    if (user.role === 'babysitter') return '/babysitter-dashboard'
    return '/parent-dashboard'
  }

  const navStyle = isTransparent
    ? { background: 'linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, transparent 100%)' }
    : { background: 'linear-gradient(to right, rgba(110,193,228,0.25) 0%, rgba(255,255,255,0.92) 50%, rgba(249,202,218,0.35) 100%)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(110,193,228,0.2)' }

  const textColor = isTransparent ? 'text-white' : 'text-gray-700'
  const hoverColor = isTransparent ? 'hover:text-white/70' : 'hover:text-[#6EC1E4]'
  const linkClass = `text-[15px] font-medium transition-colors ${textColor} ${hoverColor}`

  const avatarUrl = user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6EC1E4&color=fff&size=80`

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={navStyle}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-md">
              <i className="fas fa-baby text-white"></i>
            </div>
            <span className={`text-xl font-bold ${isTransparent ? 'text-white' : 'gradient-text'}`}>
              SmartCare
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {!user && (
              <>
                <a href="/#how-it-works" className={linkClass}>How It Works</a>
                <a href="/#features" className={linkClass}>Features</a>
              </>
            )}
            <NavLink to="/search" className={({ isActive }) =>
              `text-[15px] font-medium transition-colors ${isActive
                ? (isTransparent ? 'text-white underline underline-offset-4' : 'text-[#6EC1E4]')
                : `${textColor} ${hoverColor}`}`
            }>
              Find Sitters
            </NavLink>
            <NavLink to="/smart-match" className={({ isActive }) =>
              `text-[15px] font-medium transition-colors flex items-center gap-1.5 ${isActive
                ? (isTransparent ? 'text-white underline underline-offset-4' : 'text-[#6EC1E4]')
                : `${textColor} ${hoverColor}`}`
            }>
              <i className="fas fa-robot text-xs"></i> AI Match
            </NavLink>

            {user && (
              <NavLink to="/chat" className={({ isActive }) =>
                `relative text-[15px] font-medium transition-colors ${isActive
                  ? (isTransparent ? 'text-white underline underline-offset-4' : 'text-[#6EC1E4]')
                  : `${textColor} ${hoverColor}`}`
              }>
                Messages
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-3 w-4 h-4 gradient-bg text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            )}

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className={`flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full transition ${isTransparent ? 'hover:bg-white/20' : 'hover:bg-[#F9CADA]/40'}`}
                >
                  <img
                    src={avatarUrl}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-white/60 shadow-sm"
                  />
                  <span className={`text-[15px] font-medium ${isTransparent ? 'text-white' : 'text-gray-700'}`}>
                    {user.name?.split(' ')[0]}
                  </span>
                  <i className={`fas fa-chevron-down text-xs transition-transform duration-200 ${isTransparent ? 'text-white/70' : 'text-gray-400'} ${dropdownOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#F9CADA]/60 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-xs bg-[#6EC1E4]/10 text-[#6EC1E4] px-2 py-0.5 rounded-full font-medium capitalize">
                        {user.role}
                      </span>
                    </div>
                    <div className="py-1">
                      <Link to={dashboardLink()} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-[#6EC1E4] transition">
                        <i className="fas fa-th-large w-4 text-center text-gray-400"></i> Dashboard
                      </Link>
                      <Link to="/search" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-[#6EC1E4] transition">
                        <i className="fas fa-search w-4 text-center text-gray-400"></i> Find Sitters
                      </Link>
                      <Link to="/smart-match" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-[#6EC1E4] transition">
                        <i className="fas fa-robot w-4 text-center text-gray-400"></i> AI Match
                      </Link>
                      <Link to="/chat" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-[#6EC1E4] transition">
                        <i className="fas fa-comments w-4 text-center text-gray-400"></i> Messages
                        {unreadCount > 0 && (
                          <span className="ml-auto w-5 h-5 gradient-bg text-white text-xs rounded-full flex items-center justify-center font-semibold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition w-full text-left"
                      >
                        <i className="fas fa-sign-out-alt w-4 text-center"></i> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className={`text-[15px] font-medium transition-colors ${textColor} ${hoverColor}`}>
                  Login
                </Link>
                <Link to="/signup" className="gradient-bg text-white text-sm px-5 py-2.5 rounded-full font-semibold hover:opacity-90 transition shadow-md">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className={`md:hidden text-2xl ${isTransparent ? 'text-white' : 'text-gray-700'}`}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#6EC1E4]/20 shadow-lg" style={{ background: 'linear-gradient(to right, rgba(110,193,228,0.18) 0%, rgba(255,255,255,0.97) 50%, rgba(249,202,218,0.28) 100%)' }}>
          <div className="px-4 py-3 space-y-1">
            {user && (
              <div className="flex items-center gap-3 px-2 py-3 mb-2 border-b border-[#F9CADA]/60">
                <img src={avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#6EC1E4]/40" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
              </div>
            )}
            <Link to="/search" className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:text-[#6EC1E4] font-medium rounded-lg hover:bg-[#F9CADA]/30">
              <i className="fas fa-search w-4 text-center text-gray-400"></i> Find Sitters
            </Link>
            <Link to="/smart-match" className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:text-[#6EC1E4] font-medium rounded-lg hover:bg-[#F9CADA]/30">
              <i className="fas fa-robot w-4 text-center text-gray-400"></i> AI Match
            </Link>
            {user && (
              <Link to="/chat" className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:text-[#6EC1E4] font-medium rounded-lg hover:bg-[#F9CADA]/30">
                <i className="fas fa-comments w-4 text-center text-gray-400"></i> Messages
                {unreadCount > 0 && (
                  <span className="ml-auto w-5 h-5 gradient-bg text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            {!user && (
              <>
                <a href="/#how-it-works" className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:text-[#6EC1E4] font-medium rounded-lg hover:bg-[#F9CADA]/30">
                  <i className="fas fa-info-circle w-4 text-center text-gray-400"></i> How It Works
                </a>
                <a href="/#features" className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:text-[#6EC1E4] font-medium rounded-lg hover:bg-[#F9CADA]/30">
                  <i className="fas fa-star w-4 text-center text-gray-400"></i> Features
                </a>
              </>
            )}
            {user ? (
              <>
                <Link to={dashboardLink()} className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:text-[#6EC1E4] font-medium rounded-lg hover:bg-[#F9CADA]/30">
                  <i className="fas fa-th-large w-4 text-center text-gray-400"></i> Dashboard
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-2 py-2 text-sm text-red-500 font-medium rounded-lg hover:bg-red-50 w-full text-left">
                  <i className="fas fa-sign-out-alt w-4 text-center"></i> Logout
                </button>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <Link to="/login" className="text-center py-2 text-sm text-gray-700 font-medium border border-[#F9CADA] rounded-xl hover:border-[#6EC1E4] hover:text-[#6EC1E4] transition">Login</Link>
                <Link to="/signup" className="text-center py-2 text-sm gradient-bg text-white font-medium rounded-xl">Get Started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
