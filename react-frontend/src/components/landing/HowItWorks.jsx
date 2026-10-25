import { useRef, useEffect, useState } from 'react'

const steps = [
  {
    num: '01', icon: 'fa-user-plus', emoji: '👤',
    title: 'Create Account',
    desc: 'Sign up as a parent or babysitter in under 2 minutes. Email verified instantly.',
    color: '#6EC1E4', bg: 'from-blue-50 to-cyan-50', border: 'border-blue-100',
    tag: 'Free forever',
  },
  {
    num: '02', icon: 'fa-robot', emoji: '🤖',
    title: 'AI Smart Match',
    desc: 'Our AI scores 8 dimensions — budget, skills, age group, availability and more.',
    color: '#8b5cf6', bg: 'from-purple-50 to-violet-50', border: 'border-purple-100',
    tag: 'Powered by Gemini',
  },
  {
    num: '03', icon: 'fa-calendar-check', emoji: '📅',
    title: 'Book & Pay',
    desc: 'Schedule sessions and pay securely through Razorpay. Money held in escrow.',
    color: '#22c55e', bg: 'from-green-50 to-emerald-50', border: 'border-green-100',
    tag: 'Razorpay secured',
  },
  {
    num: '04', icon: 'fa-video', emoji: '📹',
    title: 'Monitor Live',
    desc: 'Watch real-time feeds during sessions and leave honest reviews after.',
    color: '#ec4899', bg: 'from-pink-50 to-rose-50', border: 'border-pink-100',
    tag: 'Real-time feed',
  },
]

export default function HowItWorks() {
  const refs = useRef([])
  const [visible, setVisible] = useState([])
  const lineRef = useRef(null)
  const [lineVisible, setLineVisible] = useState(false)

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) setVisible(v => [...new Set([...v, i])])
      }, { threshold: 0.2 })
      obs.observe(el)
      return obs
    })
    const lineObs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setLineVisible(true) }, { threshold: 0.1 })
    if (lineRef.current) lineObs.observe(lineRef.current)
    return () => { observers.forEach(o => o?.disconnect()); lineObs.disconnect() }
  }, [])

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #fff 0%, #f8faff 50%, #fff 100%)' }}>
      {/* Decorative blobs */}
      <div className="blob w-64 h-64 opacity-10 top-10 -left-20" style={{ background: '#6EC1E4' }}></div>
      <div className="blob w-48 h-48 opacity-10 bottom-10 -right-16" style={{ background: '#F9CADA', animationDelay: '4s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 text-purple-600 font-semibold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full">
            <i className="fas fa-route text-xs"></i> Simple Process
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-4 mb-3">
            How <span className="gradient-text">SmartCare</span> Works
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto nunito">Get started in 4 simple steps and find the perfect babysitter for your child</p>
        </div>

        {/* Steps */}
        <div ref={lineRef} className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 z-0">
            <div className={`h-full transition-all duration-1500 ease-out rounded-full`}
              style={{
                background: 'linear-gradient(90deg, #6EC1E4, #8b5cf6, #22c55e, #ec4899)',
                width: lineVisible ? '100%' : '0%',
                transition: 'width 1.5s ease'
              }}></div>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative z-10">
            {steps.map((s, i) => (
              <div
                key={s.num}
                ref={el => refs.current[i] = el}
                className={`transition-all duration-700 ${visible.includes(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 180}ms` }}
              >
                <div className={`bg-gradient-to-br ${s.bg} rounded-3xl p-6 border ${s.border} shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center group relative overflow-hidden`}>
                  {/* Glow on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${s.color}15, transparent 70%)` }}></div>

                  {/* Step number bubble */}
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md relative z-10"
                    style={{ background: s.color }}>
                    <i className={`fas ${s.icon} text-white text-xl`}></i>
                  </div>

                  {/* Step number */}
                  <div className="text-xs font-black tracking-widest mb-2 relative z-10" style={{ color: s.color }}>{s.num}</div>

                  <h3 className="text-base font-bold text-gray-900 mb-2 relative z-10">{s.title}</h3>
                  <p className="text-gray-500 nunito text-sm leading-relaxed mb-4 relative z-10">{s.desc}</p>

                  {/* Tag */}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full relative z-10"
                    style={{ background: `${s.color}15`, color: s.color }}>
                    <i className="fas fa-check-circle text-[10px]"></i> {s.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
