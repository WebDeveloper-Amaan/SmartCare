import { Link } from 'react-router-dom'
import { useRef, useEffect, useState } from 'react'

const parentItems = [
  { icon: 'fa-search', text: 'Browse KYC-verified babysitters with detailed profiles' },
  { icon: 'fa-robot', text: 'AI Smart Match finds your perfect sitter in seconds' },
  { icon: 'fa-calendar-check', text: 'Book sessions for specific dates and flexible time slots' },
  { icon: 'fa-video', text: 'Live video monitoring during every babysitting session' },
  { icon: 'fa-lock', text: 'Secure escrow payments released only after session ends' },
]

const sitterItems = [
  { icon: 'fa-id-card', text: 'Create a verified profile with skills and experience' },
  { icon: 'fa-clock', text: 'Set your own hourly rates and weekly availability' },
  { icon: 'fa-bell', text: 'Receive booking requests from verified parents only' },
  { icon: 'fa-rupee-sign', text: 'Get paid directly to your account after each session' },
  { icon: 'fa-star', text: 'Build your reputation with two-way reviews' },
]

export default function ForWho() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #f8faff 0%, #fff 100%)' }}>
      <div className="blob w-80 h-80 opacity-[0.08] -top-20 -right-20" style={{ background: '#6EC1E4' }}></div>
      <div className="blob w-64 h-64 opacity-[0.08] -bottom-10 -left-16" style={{ background: '#F9CADA', animationDelay: '3s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 bg-pink-50 border border-pink-100 text-pink-500 font-semibold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full">
            <i className="fas fa-users text-xs"></i> Who It's For
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-4 mb-3">
            Built for <span className="gradient-text">Both Sides</span>
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto nunito">Whether you're a parent seeking trusted care or a sitter seeking flexible work</p>
        </div>

        <div ref={ref} className="grid lg:grid-cols-2 gap-8">
          {/* Parents card */}
          <div className={`relative rounded-3xl overflow-hidden border border-blue-100 shadow-xl transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#6EC1E4]/8 via-white to-cyan-50/50"></div>
            {/* Top accent */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #6EC1E4, #a8d8ea)' }}></div>

            <div className="relative p-8">
              {/* Header */}
              <div className="flex items-center gap-4 mb-7">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #6EC1E4, #4aa8d8)' }}>
                  <i className="fas fa-user-friends text-white text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">For Parents</h3>
                  <p className="text-gray-400 text-sm">Find trusted care for your child</p>
                </div>
                <div className="ml-auto">
                  <span className="bg-blue-50 text-[#6EC1E4] text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100">Free to join</span>
                </div>
              </div>

              {/* Items */}
              <ul className="space-y-3.5 mb-8">
                {parentItems.map((item, i) => (
                  <li key={item.text}
                    className={`flex items-center gap-3 transition-all duration-500 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
                    style={{ transitionDelay: `${200 + i * 80}ms` }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(110,193,228,0.15)' }}>
                      <i className={`fas ${item.icon} text-[#6EC1E4] text-xs`}></i>
                    </div>
                    <p className="text-gray-600 nunito text-sm">{item.text}</p>
                  </li>
                ))}
              </ul>

              <Link to="/signup"
                className="inline-flex items-center gap-2 text-white px-7 py-3.5 rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-lg hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #6EC1E4, #4aa8d8)', boxShadow: '0 8px 24px rgba(110,193,228,0.35)' }}>
                Join as Parent <i className="fas fa-arrow-right text-xs"></i>
              </Link>
            </div>
          </div>

          {/* Babysitters card */}
          <div className={`relative rounded-3xl overflow-hidden border border-pink-100 shadow-xl transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}
            style={{ transitionDelay: '150ms' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50/60 via-white to-rose-50/40"></div>
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #F9CADA, #f06292)' }}></div>

            <div className="relative p-8">
              <div className="flex items-center gap-4 mb-7">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #f06292, #ec407a)' }}>
                  <i className="fas fa-heart text-white text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">For Babysitters</h3>
                  <p className="text-gray-400 text-sm">Earn flexibly doing what you love</p>
                </div>
                <div className="ml-auto">
                  <span className="bg-pink-50 text-pink-500 text-xs font-bold px-3 py-1.5 rounded-full border border-pink-100">₹200+/hr</span>
                </div>
              </div>

              <ul className="space-y-3.5 mb-8">
                {sitterItems.map((item, i) => (
                  <li key={item.text}
                    className={`flex items-center gap-3 transition-all duration-500 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`}
                    style={{ transitionDelay: `${350 + i * 80}ms` }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-pink-50">
                      <i className={`fas ${item.icon} text-pink-400 text-xs`}></i>
                    </div>
                    <p className="text-gray-600 nunito text-sm">{item.text}</p>
                  </li>
                ))}
              </ul>

              <Link to="/signup"
                className="inline-flex items-center gap-2 text-white px-7 py-3.5 rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-lg hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #f06292, #ec407a)', boxShadow: '0 8px 24px rgba(240,98,146,0.35)' }}>
                Join as Babysitter <i className="fas fa-arrow-right text-xs"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
