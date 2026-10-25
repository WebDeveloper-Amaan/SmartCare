import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useEffect, useState } from 'react'

const words = ['Trusted', 'Verified', 'Loving', 'Expert']

function PhotoCollage() {
  return (
    <div className="relative w-full h-[540px] select-none">

      {/* Soft glow blobs */}
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(110,193,228,0.35) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <div className="absolute bottom-10 left-10 w-60 h-60 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(249,202,218,0.45) 0%, transparent 70%)', filter: 'blur(45px)' }} />

      {/* ── Main large photo (babysitter + baby) ── */}
      <div className="absolute top-0 left-8 w-64 h-80 rounded-3xl overflow-hidden shadow-2xl"
        style={{ boxShadow: '0 24px 60px rgba(110,193,228,0.25), 0 8px 24px rgba(0,0,0,0.1)', animation: 'float-card 5s ease-in-out infinite' }}>
        <img
          src="https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=500&fit=crop&crop=faces"
          alt="Babysitter with baby"
          className="w-full h-full object-cover"
        />
        {/* Verified badge on photo */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-md">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-[11px] font-bold text-gray-800">KYC Verified</span>
        </div>
        {/* Name tag at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
          <p className="text-white font-bold text-sm">Priya Sharma</p>
          <div className="flex items-center gap-1 mt-0.5">
            {[...Array(5)].map((_, i) => <i key={i} className="fas fa-star text-yellow-400 text-[10px]" />)}
            <span className="text-white/80 text-[10px] ml-1">4.9</span>
          </div>
        </div>
      </div>

      {/* ── Top-right: baby playing ── */}
      <div className="absolute top-4 right-0 w-44 h-44 rounded-3xl overflow-hidden shadow-xl"
        style={{ boxShadow: '0 16px 40px rgba(249,202,218,0.4)', animation: 'float-card 4s ease-in-out infinite 1s' }}>
        <img
          src="https://images.unsplash.com/photo-1519689680058-324335c77eba?w=300&h=300&fit=crop&crop=faces"
          alt="Baby playing"
          className="w-full h-full object-cover"
        />
        {/* Cute emoji overlay */}
        <div className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-base">
          🧸
        </div>
      </div>

      {/* ── Bottom-right: kids playing ── */}
      <div className="absolute bottom-8 right-4 w-52 h-52 rounded-3xl overflow-hidden shadow-xl"
        style={{ boxShadow: '0 16px 40px rgba(110,193,228,0.3)', animation: 'float-card 6s ease-in-out infinite 2s' }}>
        <img
          src="https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=350&h=350&fit=crop&crop=faces"
          alt="Kids playing"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-base">
          🎨
        </div>
      </div>

      {/* ── Bottom-left: sitter reading to child ── */}
      <div className="absolute bottom-0 left-0 w-40 h-40 rounded-3xl overflow-hidden shadow-xl"
        style={{ boxShadow: '0 12px 32px rgba(249,202,218,0.35)', animation: 'float-card 4.5s ease-in-out infinite 0.5s' }}>
        <img
          src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=280&h=280&fit=crop&crop=faces"
          alt="Sitter reading to child"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-base">
          📚
        </div>
      </div>

      {/* ── Floating card: Rating ── */}
      <div className="absolute top-1/2 -left-2 -translate-y-1/2 bg-white rounded-2xl px-3.5 py-3 shadow-xl border border-gray-100"
        style={{ animation: 'float-card 3.8s ease-in-out infinite 1.2s' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center">
            <i className="fas fa-star text-yellow-400" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-900">4.8 ★</p>
            <p className="text-[10px] text-gray-400">500+ reviews</p>
          </div>
        </div>
      </div>

      {/* ── Floating card: Families ── */}
      <div className="absolute top-52 right-[-12px] bg-white rounded-2xl px-3.5 py-3 shadow-xl border border-gray-100"
        style={{ animation: 'float-card 4.2s ease-in-out infinite 0.3s' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex -space-x-2">
            {[20, 33, 45].map(n => (
              <img key={n} src={`https://i.pravatar.cc/32?img=${n}`}
                className="w-6 h-6 rounded-full border-2 border-white" alt="" />
            ))}
          </div>
          <div>
            <p className="text-xs font-black text-gray-900">500+ Families</p>
            <p className="text-[10px] text-gray-400">Trust SmartCare</p>
          </div>
        </div>
      </div>

      {/* ── Floating card: Live session ── */}
      <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 bg-white rounded-2xl px-3.5 py-3 shadow-xl border border-gray-100 whitespace-nowrap"
        style={{ animation: 'float-card 5s ease-in-out infinite 1.8s' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-bold text-gray-900">Live Session Active</span>
          <i className="fas fa-video text-[#6EC1E4] text-xs" />
        </div>
      </div>

    </div>
  )
}

export default function Hero() {
  const { user } = useAuth()
  const [wordIdx, setWordIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const target = words[wordIdx]
    let timeout
    if (!deleting && displayed.length < target.length) {
      timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 90)
    } else if (!deleting && displayed.length === target.length) {
      timeout = setTimeout(() => setDeleting(true), 1800)
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 55)
    } else {
      setDeleting(false)
      setWordIdx(i => (i + 1) % words.length)
    }
    return () => clearTimeout(timeout)
  }, [displayed, deleting, wordIdx])

  const firstName = user?.name?.split(' ')[0]
  const dashLink = user?.role === 'parent' ? '/parent-dashboard'
    : user?.role === 'babysitter' ? '/babysitter-dashboard' : '/admin'

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">

      {/* ── Background ── */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #fdf4ff 45%, #fff5f7 100%)' }} />
      <div className="blob w-[560px] h-[560px] opacity-20 -top-40 -left-56"
        style={{ background: 'radial-gradient(circle, #6EC1E4, #a8d8ea)' }} />
      <div className="blob w-[440px] h-[440px] opacity-18 -bottom-28 -right-40"
        style={{ background: 'radial-gradient(circle, #F9CADA, #f48fb1)', animationDelay: '3s' }} />
      <div className="blob w-[280px] h-[280px] opacity-12 top-1/3 left-1/2"
        style={{ background: 'radial-gradient(circle, #c4b5fd, #a78bfa)', animationDelay: '6s' }} />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #6EC1E4 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: copy ── */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur border border-green-200 px-4 py-2 rounded-full shadow-sm pulse-badge">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-700">
                {user ? `Welcome back, ${firstName}! 👋` : 'Now Live in Delhi NCR 🇮🇳'}
              </span>
            </div>

            {user ? (
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 leading-[1.1]">
                {user.role === 'parent'
                  ? <>Your Child's<br /><span className="gradient-text">Safety</span><br />Is Our Priority</>
                  : user.role === 'babysitter'
                  ? <>Manage &<br /><span className="gradient-text">Grow</span><br />Your Career</>
                  : <><span className="gradient-text">Admin</span><br />Dashboard</>}
              </h1>
            ) : (
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 leading-[1.1]">
                Find{' '}
                <span className="gradient-text">
                  {displayed}<span className="text-[#6EC1E4]">|</span>
                </span>
                <br />Babysitters<br />
                <span className="text-gray-400 text-3xl lg:text-4xl font-semibold">Near You in Delhi</span>
              </h1>
            )}

            <p className="text-base text-gray-500 nunito leading-relaxed max-w-lg">
              {user?.role === 'parent'
                ? 'Browse verified babysitters, track your bookings, and monitor sessions live — all from your dashboard.'
                : user?.role === 'babysitter'
                ? 'View upcoming sessions, manage your availability, and track your earnings easily.'
                : 'Connect with KYC-verified babysitters, monitor your child live, and pay securely — all in one place.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {user ? (
                <>
                  <Link to={dashLink}
                    className="gradient-bg text-white px-7 py-3.5 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[#6EC1E4]/30 flex items-center justify-center gap-2 text-sm hover:scale-105 active:scale-95">
                    <i className="fas fa-th-large" /> Go to Dashboard
                  </Link>
                  {user.role === 'parent' && (
                    <Link to="/search"
                      className="bg-white border-2 border-[#6EC1E4]/30 text-gray-700 px-7 py-3.5 rounded-2xl font-bold hover:border-[#6EC1E4] hover:text-[#6EC1E4] transition-all flex items-center justify-center gap-2 text-sm shadow-sm hover:scale-105 active:scale-95">
                      <i className="fas fa-search text-[#6EC1E4]" /> Find Sitters
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link to="/search"
                    className="gradient-bg text-white px-7 py-3.5 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[#6EC1E4]/30 flex items-center justify-center gap-2 text-sm hover:scale-105 active:scale-95">
                    <i className="fas fa-search" /> Find Babysitters
                  </Link>
                  <Link to="/signup"
                    className="bg-white border-2 border-[#F9CADA] text-gray-700 px-7 py-3.5 rounded-2xl font-bold hover:border-pink-400 hover:text-pink-500 transition-all flex items-center justify-center gap-2 text-sm shadow-sm hover:scale-105 active:scale-95">
                    <span className="text-pink-400">♥</span> Become a Sitter
                  </Link>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { icon: 'fa-shield-alt', color: 'text-green-500', bg: 'bg-green-50 border-green-100', label: 'KYC Verified' },
                { icon: 'fa-lock', color: 'text-[#6EC1E4]', bg: 'bg-blue-50 border-blue-100', label: 'Secure Payments' },
                { icon: 'fa-video', color: 'text-pink-500', bg: 'bg-pink-50 border-pink-100', label: 'Live Monitoring' },
                { icon: 'fa-star', color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-100', label: '4.8★ Rated' },
              ].map(b => (
                <div key={b.label} className={`flex items-center gap-1.5 ${b.bg} border px-3 py-1.5 rounded-full`}>
                  <i className={`fas ${b.icon} ${b.color} text-xs`} />
                  <span className="text-xs font-semibold text-gray-700">{b.label}</span>
                </div>
              ))}
            </div>

            {!user && (
              <div className="flex items-center gap-4 pt-1">
                <div className="flex -space-x-2">
                  {[20, 33, 45, 12].map(n => (
                    <img key={n} src={`https://i.pravatar.cc/48?img=${n}`}
                      className="w-9 h-9 rounded-full border-2 border-white shadow-sm" alt="" />
                  ))}
                  <div className="w-9 h-9 rounded-full border-2 border-white gradient-bg flex items-center justify-center text-white font-bold text-xs shadow-sm">+50</div>
                </div>
                <div>
                  <div className="flex text-yellow-400 text-xs gap-0.5">
                    {[...Array(5)].map((_, i) => <i key={i} className="fas fa-star" />)}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Trusted by <strong className="text-gray-700">500+ parents</strong> in Delhi</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: photo collage ── */}
          <div className="hidden lg:block relative h-[540px]">
            <PhotoCollage />
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none" className="w-full h-14">
          <path d="M0 60 L0 35 Q360 0 720 30 Q1080 60 1440 25 L1440 60 Z" fill="white" />
        </svg>
      </div>
    </section>
  )
}
