import { useRef, useEffect, useState } from 'react'

const steps = [
  { num: '01', icon: 'fa-user-plus', title: 'Sign Up Free', desc: 'Create your account as a parent or babysitter in under 2 minutes', color: 'bg-blue-50 text-[#6EC1E4]', numColor: 'text-[#6EC1E4]' },
  { num: '02', icon: 'fa-search', title: 'Search & Filter', desc: 'Browse KYC-verified babysitters by location, experience and ratings', color: 'bg-green-50 text-green-500', numColor: 'text-green-500' },
  { num: '03', icon: 'fa-calendar-check', title: 'Book & Pay', desc: 'Schedule sessions and pay securely through Razorpay', color: 'bg-purple-50 text-purple-500', numColor: 'text-purple-500' },
  { num: '04', icon: 'fa-video', title: 'Monitor & Review', desc: 'Watch live feeds during sessions and leave honest reviews after', color: 'bg-pink-50 text-pink-500', numColor: 'text-pink-500' },
]

export default function HowItWorks() {
  const refs = useRef([])
  const [visible, setVisible] = useState([])

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) setVisible(v => [...v, i])
      }, { threshold: 0.2 })
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])

  return (
    <section id="how-it-works" className="py-20" style={{ background: 'linear-gradient(to right, rgba(249,202,218,0.18) 0%, rgba(255,255,255,0.95) 50%, rgba(110,193,228,0.18) 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-[#6EC1E4] font-semibold text-xs uppercase tracking-widest">Simple Process</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 mb-3">How FindBabysitter Works</h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto nunito">Get started in 4 simple steps and find the perfect babysitter for your child</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[#6EC1E4] via-purple-300 to-pink-400 z-0 opacity-40"></div>

          {steps.map((s, i) => (
            <div key={s.num}
              ref={el => refs.current[i] = el}
              className={`relative z-10 transition-all duration-700 ${visible.includes(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 150}ms` }}>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center">
                <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <i className={`fas ${s.icon} text-lg`}></i>
                </div>
                <div className={`text-xs font-bold ${s.numColor} mb-1 tracking-widest`}>{s.num}</div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 nunito text-xs leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
