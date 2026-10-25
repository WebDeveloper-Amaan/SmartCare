import { useRef, useEffect, useState } from 'react'

const features = [
  {
    icon: 'fa-id-card', color: '#22c55e', bg: 'from-green-50 to-emerald-50', border: 'border-green-100',
    title: 'KYC Verified Profiles',
    desc: 'Every babysitter undergoes strict Aadhaar/PAN verification and background checks before approval.',
    tag: 'Safety First', tagColor: 'text-green-600 bg-green-100',
    size: 'md:col-span-2',
    extra: (
      <div className="flex gap-2 mt-4 flex-wrap">
        {['Aadhaar Verified', 'PAN Checked', 'Background Clear', 'Admin Approved'].map(t => (
          <span key={t} className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">{t}</span>
        ))}
      </div>
    )
  },
  {
    icon: 'fa-robot', color: '#8b5cf6', bg: 'from-purple-50 to-violet-50', border: 'border-purple-100',
    title: 'AI Smart Match',
    desc: 'Gemini-powered matching scores sitters across 8 dimensions for your exact needs.',
    tag: 'Gemini AI', tagColor: 'text-purple-600 bg-purple-100',
    size: '',
  },
  {
    icon: 'fa-video', color: '#6EC1E4', bg: 'from-blue-50 to-cyan-50', border: 'border-blue-100',
    title: 'Live Monitoring',
    desc: 'Watch your child in real-time through secure video streaming during every session.',
    tag: 'Real-time', tagColor: 'text-blue-600 bg-blue-100',
    size: '',
  },
  {
    icon: 'fa-map-marker-alt', color: '#ec4899', bg: 'from-pink-50 to-rose-50', border: 'border-pink-100',
    title: 'Location-Based Search',
    desc: 'Find trusted babysitters in your exact locality across Delhi NCR with live map view.',
    tag: 'Google Maps', tagColor: 'text-pink-600 bg-pink-100',
    size: '',
  },
  {
    icon: 'fa-credit-card', color: '#f59e0b', bg: 'from-yellow-50 to-amber-50', border: 'border-yellow-100',
    title: 'Secure Payments',
    desc: 'Safe transactions through Razorpay with money held in escrow until session ends.',
    tag: 'Razorpay', tagColor: 'text-yellow-700 bg-yellow-100',
    size: '',
  },
  {
    icon: 'fa-comments', color: '#14b8a6', bg: 'from-teal-50 to-cyan-50', border: 'border-teal-100',
    title: 'Real-time Chat',
    desc: 'Instant messaging between parents and sitters with read receipts and media sharing.',
    tag: 'Socket.IO', tagColor: 'text-teal-600 bg-teal-100',
    size: 'md:col-span-2',
    extra: (
      <div className="mt-4 bg-white/60 rounded-2xl p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#6EC1E4] flex items-center justify-center text-white text-[10px] font-bold">P</div>
          <div className="bg-white rounded-xl px-3 py-1.5 text-xs text-gray-700 shadow-sm">Is Priya available tomorrow at 3pm?</div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <div className="bg-[#6EC1E4] rounded-xl px-3 py-1.5 text-xs text-white shadow-sm">Yes! I'm free from 2–7pm 😊</div>
          <div className="w-6 h-6 rounded-full bg-pink-400 flex items-center justify-center text-white text-[10px] font-bold">S</div>
        </div>
      </div>
    )
  },
]

export default function Features() {
  const refs = useRef([])
  const [visible, setVisible] = useState([])

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) setVisible(v => [...new Set([...v, i])])
      }, { threshold: 0.1 })
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])

  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden">
      <div className="blob w-72 h-72 opacity-[0.07] top-0 right-0" style={{ background: '#6EC1E4' }}></div>
      <div className="blob w-56 h-56 opacity-[0.07] bottom-0 left-0" style={{ background: '#F9CADA', animationDelay: '5s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-[#6EC1E4] font-semibold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full">
            <i className="fas fa-sparkles text-xs"></i> Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-4 mb-3">
            Everything for <span className="gradient-text">Peace of Mind</span>
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto nunito">Built specifically for Indian parents who want safety, transparency and convenience</p>
        </div>

        {/* Bento grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              ref={el => refs.current[i] = el}
              className={`${f.size || ''} bg-gradient-to-br ${f.bg} rounded-3xl p-6 border ${f.border} shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden ${visible.includes(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Glow */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${f.color}, transparent)` }}></div>

              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ background: `${f.color}20` }}>
                  <i className={`fas ${f.icon} text-xl`} style={{ color: f.color }}></i>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${f.tagColor}`}>{f.tag}</span>
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-2 relative z-10">{f.title}</h3>
              <p className="text-gray-500 nunito text-sm leading-relaxed relative z-10">{f.desc}</p>
              {f.extra && <div className="relative z-10">{f.extra}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
