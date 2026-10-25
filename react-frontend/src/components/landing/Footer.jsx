import { Link } from 'react-router-dom'
import { useState } from 'react'

const quickLinks = [
  ['Find Babysitters', '/search'],
  ['AI Smart Match', '/smart-match'],
  ['Sign Up', '/signup'],
  ['Login', '/login'],
]

const support = [
  'Help Center', 'Safety Guidelines',
  'Terms of Service', 'Privacy Policy', 'Contact Us',
]

const areas = [
  'South Delhi', 'North Delhi', 'Gurgaon',
  'Noida', 'Dwarka', 'Faridabad', 'Rohini', 'Vasant Kunj',
]

const socials = [
  { icon: 'fa-facebook-f', href: '#', color: '#1877f2' },
  { icon: 'fa-instagram', href: '#', color: '#e1306c' },
  { icon: 'fa-twitter', href: '#', color: '#1da1f2' },
  { icon: 'fa-linkedin-in', href: '#', color: '#0a66c2' },
]

const badges = [
  { icon: 'fa-shield-alt', label: 'KYC Verified', color: '#22c55e' },
  { icon: 'fa-lock', label: 'SSL Secured', color: '#6EC1E4' },
  { icon: 'fa-robot', label: 'AI Powered', color: '#8b5cf6' },
  { icon: 'fa-rupee-sign', label: 'Razorpay', color: '#f59e0b' },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  function handleSubscribe(e) {
    e.preventDefault()
    if (email) { setSubscribed(true); setEmail('') }
  }

  return (
    <footer className="bg-gray-950 text-white relative overflow-hidden">
      {/* Top gradient accent */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6EC1E4, #a78bfa, #f06292)' }}></div>

      {/* Background blobs */}
      <div className="blob w-96 h-96 opacity-[0.04] -top-20 -left-20" style={{ background: '#6EC1E4' }}></div>
      <div className="blob w-72 h-72 opacity-[0.04] bottom-0 right-0" style={{ background: '#F9CADA', animationDelay: '5s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 relative z-10">

        {/* Newsletter banner */}
        <div className="rounded-3xl p-8 mb-14 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(110,193,228,0.15), rgba(167,139,250,0.1), rgba(249,202,218,0.15))' }}>
          <div className="absolute inset-0 border border-white/10 rounded-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Stay in the loop 📬</h3>
              <p className="text-gray-400 text-sm nunito">Get tips on child safety, new features and platform updates.</p>
            </div>
            {subscribed ? (
              <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 px-5 py-3 rounded-2xl">
                <i className="fas fa-check-circle text-green-400"></i>
                <span className="text-green-300 text-sm font-semibold">You're subscribed!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-white/10 border border-white/20 text-white placeholder-gray-500 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-[#6EC1E4] transition w-full md:w-64"
                />
                <button type="submit"
                  className="gradient-bg text-white px-5 py-3 rounded-2xl text-sm font-bold hover:opacity-90 transition whitespace-nowrap hover:scale-105 active:scale-95">
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-[#6EC1E4]/30">
                <i className="fas fa-baby text-white text-lg"></i>
              </div>
              <span className="text-xl font-black">SmartCare</span>
            </Link>
            <p className="text-gray-400 nunito text-sm leading-relaxed mb-6">
              India's most trusted platform connecting parents with KYC-verified babysitters across Delhi NCR.
            </p>

            {/* Social icons */}
            <div className="flex gap-2.5 mb-6">
              {socials.map(s => (
                <a key={s.icon} href={s.href}
                  className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 text-sm hover:scale-110 hover:-translate-y-0.5"
                  style={{ '--hover-bg': s.color }}
                  onMouseEnter={e => e.currentTarget.style.background = s.color}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <i className={`fab ${s.icon}`}></i>
                </a>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2">
              {badges.map(b => (
                <div key={b.label} className="flex items-center gap-1.5 bg-gray-800/60 border border-gray-700 px-2.5 py-1.5 rounded-xl">
                  <i className={`fas ${b.icon} text-xs`} style={{ color: b.color }}></i>
                  <span className="text-gray-400 text-[11px] font-medium">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-5">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map(([label, to]) => (
                <li key={label}>
                  <Link to={to}
                    className="text-gray-400 hover:text-white transition-all text-sm nunito flex items-center gap-2 group">
                    <i className="fas fa-chevron-right text-xs text-[#6EC1E4] group-hover:translate-x-1 transition-transform"></i>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-5">Support</h4>
            <ul className="space-y-3">
              {support.map(item => (
                <li key={item}>
                  <a href="#"
                    className="text-gray-400 hover:text-white transition-all text-sm nunito flex items-center gap-2 group">
                    <i className="fas fa-chevron-right text-xs text-[#6EC1E4] group-hover:translate-x-1 transition-transform"></i>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Service Areas */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-5">Service Areas</h4>
            <ul className="space-y-3">
              {areas.map(area => (
                <li key={area}>
                  <a href="#"
                    className="text-gray-400 hover:text-white transition-all text-sm nunito flex items-center gap-2 group">
                    <i className="fas fa-map-marker-alt text-xs text-pink-400 group-hover:scale-125 transition-transform"></i>
                    {area}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact bar */}
        <div className="border-t border-gray-800 pt-8 mb-6">
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            {[
              { icon: 'fa-envelope', text: 'support@smartcare.in', color: '#6EC1E4' },
              { icon: 'fa-phone', text: '+91 98765 43210', color: '#22c55e' },
              { icon: 'fa-map-marker-alt', text: 'Delhi NCR, India', color: '#ec4899' },
            ].map(c => (
              <div key={c.text} className="flex items-center gap-2 text-gray-400 text-sm hover:text-white transition-colors cursor-pointer">
                <i className={`fas ${c.icon} text-xs`} style={{ color: c.color }}></i>
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} SmartCare. All rights reserved. Made with ❤️ for parents in India 🇮🇳
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-gray-500 text-xs">All systems operational</span>
            </div>
            <span className="text-gray-700 text-xs">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
