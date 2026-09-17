import { useRef, useEffect, useState } from 'react'

const features = [
  { icon: 'fa-id-card', bg: 'bg-green-50', color: 'text-green-500', glow: 'hover:shadow-green-100', border: 'hover:border-green-200', title: 'KYC Verified Profiles', desc: 'Every babysitter undergoes strict ID verification and background checks before being approved on the platform.' },
  { icon: 'fa-video', bg: 'bg-blue-50', color: 'text-[#6EC1E4]', glow: 'hover:shadow-blue-100', border: 'hover:border-blue-200', title: 'Live Video Monitoring', desc: 'Watch your child in real-time through secure video streaming during every babysitting session.' },
  { icon: 'fa-star', bg: 'bg-yellow-50', color: 'text-yellow-500', glow: 'hover:shadow-yellow-100', border: 'hover:border-yellow-200', title: 'Two-Way Reviews', desc: 'Transparent rating system where both parents and sitters can rate each other after every session.' },
  { icon: 'fa-credit-card', bg: 'bg-purple-50', color: 'text-purple-500', glow: 'hover:shadow-purple-100', border: 'hover:border-purple-200', title: 'Secure Payments', desc: 'Safe transactions through Razorpay with money held in escrow until the session ends successfully.' },
  { icon: 'fa-map-marker-alt', bg: 'bg-pink-50', color: 'text-pink-500', glow: 'hover:shadow-pink-100', border: 'hover:border-pink-200', title: 'Location-Based Search', desc: 'Find trusted babysitters in your exact locality across Delhi NCR with distance-based filtering.' },
  { icon: 'fa-bell', bg: 'bg-orange-50', color: 'text-orange-500', glow: 'hover:shadow-orange-100', border: 'hover:border-orange-200', title: 'Instant Notifications', desc: 'Real-time alerts for bookings, payments, session updates and important platform announcements.' },
]

export default function Features() {
  const refs = useRef([])
  const [visible, setVisible] = useState([])

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) setVisible(v => [...v, i])
      }, { threshold: 0.15 })
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])

  return (
    <section id="features" className="py-20" style={{ background: 'linear-gradient(to right, rgba(110,193,228,0.18) 0%, rgba(255,255,255,0.95) 50%, rgba(249,202,218,0.22) 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-[#6EC1E4] font-semibold text-xs uppercase tracking-widest">Why Choose Us</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 mb-3">Everything You Need for Peace of Mind</h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto nunito">Built specifically for Indian parents who want safety, transparency and convenience</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={f.title}
              ref={el => refs.current[i] = el}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white ${f.border} ${f.glow} transition-all duration-500 hover:-translate-y-1 hover:shadow-lg ${visible.includes(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                <i className={`fas ${f.icon} ${f.color} text-xl`}></i>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 nunito text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
