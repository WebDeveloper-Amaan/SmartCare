import { Link } from 'react-router-dom'
import { useRef, useEffect, useState } from 'react'

export default function CTA() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} className="py-28 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 animate-gradient"
        style={{ background: 'linear-gradient(135deg, #6EC1E4, #a78bfa, #f06292, #6EC1E4)', backgroundSize: '300% 300%' }}></div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/10"></div>

      {/* Dot pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}></div>

      {/* Blobs */}
      <div className="blob w-96 h-96 bg-white/10 -top-20 -right-20"></div>
      <div className="blob w-64 h-64 bg-white/10 bottom-0 left-10" style={{ animationDelay: '3s' }}></div>

      {/* Ripple rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white/20 animate-ripple"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white/15 animate-ripple" style={{ animationDelay: '0.7s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white/10 animate-ripple" style={{ animationDelay: '1.4s' }}></div>

      <div className={`relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-2 rounded-full mb-8 border border-white/30">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          <span className="text-white text-sm font-semibold">Join 500+ families in Delhi NCR</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
          Ready to Find the<br />
          <span className="text-white/90">Perfect Babysitter?</span>
        </h2>
        <p className="text-white/80 text-base mb-12 nunito max-w-xl mx-auto leading-relaxed">
          Thousands of parents trust SmartCare for safe, verified childcare. Get started for free today — no credit card required.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link to="/signup"
            className="bg-white text-[#6EC1E4] px-9 py-4 rounded-2xl font-black hover:bg-gray-50 transition-all shadow-2xl flex items-center justify-center gap-2 text-sm hover:scale-105 active:scale-95">
            <i className="fas fa-user-plus"></i> Sign Up as Parent
          </Link>
          <Link to="/signup"
            className="bg-white/15 backdrop-blur-sm border-2 border-white/40 text-white px-9 py-4 rounded-2xl font-black hover:bg-white/25 transition-all flex items-center justify-center gap-2 text-sm hover:scale-105 active:scale-95">
            <span>♥</span> Become a Babysitter
          </Link>
        </div>

        {/* Trust row */}
        <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
          {[
            { icon: 'fa-check-circle', text: 'Free to join' },
            { icon: 'fa-shield-alt', text: 'KYC verified sitters' },
            { icon: 'fa-lock', text: 'Secure payments' },
            { icon: 'fa-headset', text: '24/7 support' },
            { icon: 'fa-robot', text: 'AI-powered matching' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2">
              <i className={`fas ${item.icon} text-white`}></i>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
