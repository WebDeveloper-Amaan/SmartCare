import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

const fallback = [
  { stars: 5, text: 'FindBabysitter has been a lifesaver for our family. The live monitoring feature gives me complete peace of mind while I\'m at work.', name: 'Meera Kapoor', role: 'Working Mom, Gurgaon', img: 'https://i.pravatar.cc/100?img=20' },
  { stars: 5, text: 'Finally a platform that understands Indian parents\' concerns. The verification process is thorough and the babysitters are truly professional.', name: 'Rahul Mehta', role: 'IT Professional, Delhi', img: 'https://i.pravatar.cc/100?img=33' },
  { stars: 5, text: 'As a college student, FindBabysitter helped me earn while studying. The flexible hours and direct payments make it perfect for me.', name: 'Sneha Rani', role: 'Babysitter, Noida', img: 'https://i.pravatar.cc/100?img=45' },
]

export default function Testimonials() {
  const [topSitters, setTopSitters] = useState([])
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    api.get('/babysitters?limit=3&sortBy=rating&verifiedOnly=true')
      .then(r => setTopSitters(r.data.babysitters || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="py-20" style={{ background: 'linear-gradient(to right, rgba(110,193,228,0.18) 0%, rgba(255,255,255,0.95) 50%, rgba(249,202,218,0.22) 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-[#6EC1E4] font-semibold text-xs uppercase tracking-widest">Testimonials</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 mb-3">What Our Community Says</h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto nunito">Real stories from parents and babysitters across Delhi NCR</p>
        </div>

        {/* Reviews */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {fallback.map((t, i) => (
            <div key={t.name}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white hover:shadow-md hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 150}ms` }}>
              {/* Quote icon */}
              <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-quote-left text-white text-xs"></i>
              </div>
              <div className="flex text-yellow-400 text-xs gap-0.5 mb-3">
                {[...Array(t.stars)].map((_, j) => <i key={j} className="fas fa-star"></i>)}
              </div>
              <p className="text-gray-600 nunito text-xs leading-relaxed mb-5 italic">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                <img src={t.img} className="w-10 h-10 rounded-full object-cover border-2 border-[#6EC1E4]/20" alt={t.name} />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top rated babysitters from real DB */}
        {topSitters.length > 0 && (
          <>
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-gray-900">Top Rated Babysitters</h3>
              <p className="text-gray-500 text-sm mt-1 nunito">Highest rated on our platform right now</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {topSitters.map((s, i) => (
                <div key={s._id}
                  className={`bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white flex items-center gap-4 hover:shadow-md hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${(i + 3) * 150}ms` }}>
                  <img
                    src={s.photo || `https://i.pravatar.cc/80?u=${s._id}`}
                    className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border-2 border-gray-100"
                    alt={s.name}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate">{s.name}</p>
                    <p className="text-gray-400 text-xs mb-2">{s.location} · {s.experience}yr exp</p>
                    <div className="flex items-center gap-1">
                      <i className="fas fa-star text-yellow-400 text-xs"></i>
                      <span className="text-sm font-semibold text-gray-700">{s.rating}</span>
                      <span className="text-gray-400 text-xs">({s.reviewCount})</span>
                    </div>
                  </div>
                  {s.verified && (
                    <span className="bg-green-50 text-green-600 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                      <i className="fas fa-check-circle text-xs"></i> KYC
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to="/search" className="inline-flex items-center gap-2 gradient-bg text-white px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition shadow-lg shadow-[#6EC1E4]/30">
                <i className="fas fa-search"></i> Browse All Babysitters
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
