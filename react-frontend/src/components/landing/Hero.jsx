import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

const trustBadges = [
  { icon: 'fa-shield-alt', color: 'text-green-500', bg: 'bg-green-50', label: 'KYC Verified' },
  { icon: 'fa-lock', color: 'text-[#6EC1E4]', bg: 'bg-blue-50', label: 'Secure Payments' },
  { icon: 'fa-video', color: 'text-pink-500', bg: 'bg-pink-50', label: 'Live Monitoring' },
  { icon: 'fa-star', color: 'text-yellow-500', bg: 'bg-yellow-50', label: '4.8★ Rated' },
]

function GuestHero() {
  return (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full pulse-badge">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
        <span className="text-xs font-medium text-green-700">Now Live in Delhi NCR</span>
      </div>

      <div>
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-[1.15] mb-4">
          Find <span className="gradient-text">Trusted</span><br />
          Babysitters<br />
          <span className="gradient-text">Near You</span>
        </h1>
        <p className="text-base text-gray-500 nunito leading-relaxed max-w-lg">
          Connect with KYC-verified babysitters, monitor your child live, and pay securely — all in one place.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/search"
          className="gradient-bg text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg shadow-[#6EC1E4]/30 flex items-center justify-center gap-2 text-sm">
          <i className="fas fa-search"></i> Find Babysitters
        </Link>
        <Link to="/signup"
          className="bg-white border-2 border-[#F9CADA] text-gray-700 px-6 py-3 rounded-xl font-semibold hover:border-pink-400 hover:text-pink-500 transition flex items-center justify-center gap-2 text-sm shadow-sm">
          <i className="fas fa-heart text-pink-400"></i> Become a Sitter
        </Link>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        {trustBadges.map(b => (
          <div key={b.label} className={`flex items-center gap-1.5 ${b.bg} px-3 py-1.5 rounded-full`}>
            <i className={`fas ${b.icon} ${b.color} text-xs`}></i>
            <span className="text-xs font-medium text-gray-700">{b.label}</span>
          </div>
        ))}
      </div>

      {/* Social proof */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex -space-x-2">
          {[20, 33, 45, 12].map(n => (
            <img key={n} src={`https://i.pravatar.cc/48?img=${n}`}
              className="w-9 h-9 rounded-full border-2 border-white shadow-sm" alt="" />
          ))}
          <div className="w-9 h-9 rounded-full border-2 border-white gradient-bg flex items-center justify-center text-white font-bold text-xs shadow-sm">
            +50
          </div>
        </div>
        <div>
          <div className="flex text-yellow-400 text-xs gap-0.5">
            {[...Array(5)].map((_, i) => <i key={i} className="fas fa-star"></i>)}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Trusted by <strong className="text-gray-700">500+ parents</strong> in Delhi</p>
        </div>
      </div>
    </div>
  )
}

function LoggedInHero({ user }) {
  const isParent = user.role === 'parent'
  const isBabysitter = user.role === 'babysitter'
  const dashLink = isParent ? '/parent-dashboard' : isBabysitter ? '/babysitter-dashboard' : '/admin'
  const firstName = user.name?.split(' ')[0]

  return (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
        <span className="text-xs font-medium text-green-700">Welcome back, {firstName}!</span>
      </div>

      <div>
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-[1.15] mb-4">
          {isParent ? (
            <>Your Child's <span className="gradient-text">Safety</span><br />Is Our Priority</>
          ) : isBabysitter ? (
            <>Manage Your<br /><span className="gradient-text">Bookings</span> & Earn</>
          ) : (
            <>Admin <span className="gradient-text">Dashboard</span></>
          )}
        </h1>
        <p className="text-base text-gray-500 nunito leading-relaxed max-w-lg">
          {isParent
            ? 'Browse verified babysitters, track your bookings, and monitor sessions live — all from your dashboard.'
            : isBabysitter
            ? 'View your upcoming sessions, manage your availability, and track your earnings easily.'
            : 'Manage users, KYC requests, bookings and platform analytics.'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link to={dashLink}
          className="gradient-bg text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg shadow-[#6EC1E4]/30 flex items-center justify-center gap-2 text-sm">
          <i className="fas fa-th-large"></i> Go to Dashboard
        </Link>
        {isParent && (
          <Link to="/search"
            className="bg-white border-2 border-[#6EC1E4]/30 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:border-[#6EC1E4] hover:text-[#6EC1E4] transition flex items-center justify-center gap-2 text-sm shadow-sm">
            <i className="fas fa-search text-[#6EC1E4]"></i> Find Sitters
          </Link>
        )}
        {isBabysitter && (
          <Link to="/chat"
            className="bg-white border-2 border-[#F9CADA] text-gray-700 px-6 py-3 rounded-xl font-semibold hover:border-pink-400 hover:text-pink-500 transition flex items-center justify-center gap-2 text-sm shadow-sm">
            <i className="fas fa-comments text-pink-400"></i> Messages
          </Link>
        )}
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        {trustBadges.map(b => (
          <div key={b.label} className={`flex items-center gap-1.5 ${b.bg} px-3 py-1.5 rounded-full`}>
            <i className={`fas ${b.icon} ${b.color} text-xs`}></i>
            <span className="text-xs font-medium text-gray-700">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Hero() {
  const { user } = useAuth()

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden pb-0" style={{ background: 'linear-gradient(to right, rgba(110,193,228,0.22) 0%, rgba(255,255,255,1) 50%, rgba(249,202,218,0.28) 100%)' }}>
      {/* Background blobs */}
      <div className="blob w-[600px] h-[600px] bg-[#6EC1E4] opacity-15 -top-40 -left-56"></div>
      <div className="blob w-[450px] h-[450px] bg-[#F9CADA] opacity-25 bottom-0 -right-36"></div>
      <div className="blob w-[300px] h-[300px] bg-[#6EC1E4] opacity-10 bottom-20 left-1/3"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          {user ? <LoggedInHero user={user} /> : <GuestHero />}

          {/* Right — image + floating cards */}
          <div className="relative hidden lg:block">
            {/* Decorative ring */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#6EC1E4]/20 to-[#F9CADA]/20 scale-105 -z-10"></div>

            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&h=680&fit=crop"
                alt="Babysitter with child"
                className="w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>

            {/* Floating card — verified */}
            <div className="absolute -left-10 top-16 bg-white rounded-2xl shadow-xl shadow-green-100 p-4 flex items-center gap-3 animate-float border border-green-50">
              <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fas fa-shield-alt text-green-500 text-lg"></i>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">100% Verified</p>
                <p className="text-gray-400 text-xs">KYC Approved</p>
              </div>
            </div>

            {/* Floating card — monitoring */}
            <div className="absolute -right-10 bottom-28 bg-white rounded-2xl shadow-xl shadow-pink-100 p-4 flex items-center gap-3 animate-float-delay border border-pink-50">
              <div className="w-11 h-11 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fas fa-video text-pink-500 text-lg"></i>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Live Monitoring</p>
                <p className="text-gray-400 text-xs">Real-time feed</p>
              </div>
            </div>

            {/* Floating card — payment */}
            <div className="absolute right-10 top-8 bg-white rounded-2xl shadow-xl shadow-blue-100 p-4 flex items-center gap-3 animate-float border border-blue-50">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fas fa-rupee-sign text-[#6EC1E4] text-lg"></i>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Secure Pay</p>
                <p className="text-gray-400 text-xs">Via Razorpay</p>
              </div>
            </div>

            {/* Bottom stat pill */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-5 bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 border border-gray-100 whitespace-nowrap">
              <div className="flex -space-x-2">
                {[20, 33, 45].map(n => (
                  <img key={n} src={`https://i.pravatar.cc/40?img=${n}`} className="w-7 h-7 rounded-full border-2 border-white" alt="" />
                ))}
              </div>
              <div className="text-xs">
                <span className="font-bold text-gray-900">500+ families</span>
                <span className="text-gray-400"> trust us daily</span>
              </div>
              <div className="flex text-yellow-400 text-xs gap-0.5">
                {[...Array(5)].map((_, i) => <i key={i} className="fas fa-star"></i>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
