import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

const reviews = [
  { stars: 5, text: 'SmartCare has been a lifesaver for our family. The live monitoring feature gives me complete peace of mind while I\'m at work.', name: 'Meera Kapoor', role: 'Working Mom, Gurgaon', img: 'https://i.pravatar.cc/100?img=20', color: 'border-blue-100' },
  { stars: 5, text: 'Finally a platform that understands Indian parents\' concerns. The verification process is thorough and the babysitters are truly professional.', name: 'Rahul Mehta', role: 'IT Professional, Delhi', img: 'https://i.pravatar.cc/100?img=33', color: 'border-green-100' },
  { stars: 5, text: 'As a college student, SmartCare helped me earn while studying. The flexible hours and direct payments make it perfect for me.', name: 'Sneha Rani', role: 'Babysitter, Noida', img: 'https://i.pravatar.cc/100?img=45', color: 'border-pink-100' },
  { stars: 5, text: 'The AI matching feature is incredible — it found me a sitter who speaks Punjabi and has experience with toddlers. Exactly what I needed!', name: 'Harpreet Singh', role: 'Parent, Dwarka', img: 'https://i.pravatar.cc/100?img=12', color: 'border-purple-100' },
  { stars: 5, text: 'Booking is so easy and the real-time chat with the sitter before the session really builds trust. Highly recommend SmartCare!', name: 'Ananya Sharma', role: 'Mom of 2, South Delhi', img: 'https://i.pravatar.cc/100?img=47', color: 'border-yellow-100' },
  { stars: 5, text: 'I love how transparent everything is — the KYC badge, the reviews, the live map. It\'s the most trustworthy platform I\'ve used.', name: 'Vikram Nair', role: 'Parent, Noida', img: 'https://i.pravatar.cc/100?img=52', color: 'border-teal-100' },
]

function ReviewCard({ r }) {
  return (
    <div className={`flex-shrink-0 w-80 bg-white rounded-3xl p-6 border ${r.color} shadow-md mx-3`}>
      <div className="flex text-yellow-400 text-sm gap-0.5 mb-3">
        {[...Array(r.stars)].map((_, j) => <i key={j} className="fas fa-star"></i>)}
      </div>
      <div className="w-8 h-8 gradient-bg rounded-xl flex items-center justify-center mb-3">
        <i className="fas fa-quote-left text-white text-xs"></i>
      </div>
      <p className="text-gray-600 nunito text-sm leading-relaxed mb-5 italic">"{r.text}"</p>
      <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
        <img src={r.img} className="w-10 h-10 rounded-full object-cover border-2 border-gray-100" alt={r.name} />
        <div>
          <p className="font-bold text-gray-900 text-sm">{r.name}</p>
          <p className="text-gray-400 text-xs">{r.role}</p>
        </div>
      </div>
    </div>
  )
}

export default function Testimonials() {
  const [topSitters, setTopSitters] = useState([])
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [paused, setPaused] = useState(false)

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

  const doubled = [...reviews, ...reviews]

  return (
    <section ref={ref} className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #fff 0%, #f8faff 100%)' }}>
      <div className="blob w-72 h-72 opacity-[0.07] top-0 left-0" style={{ background: '#6EC1E4' }}></div>
      <div className="blob w-56 h-56 opacity-[0.07] bottom-0 right-0" style={{ background: '#F9CADA', animationDelay: '4s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-100 text-yellow-600 font-semibold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full">
            <i className="fas fa-star text-xs"></i> Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-4 mb-3">
            What Our <span className="gradient-text">Community</span> Says
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto nunito">Real stories from parents and babysitters across Delhi NCR</p>
        </div>
      </div>

      {/* Marquee carousel — full width */}
      <div
        className="relative overflow-hidden mb-16"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #f8faff, transparent)' }}></div>
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(-90deg, #f8faff, transparent)' }}></div>

        <div
          className="flex py-4"
          style={{
            animation: paused ? 'none' : 'marquee 35s linear infinite',
            width: 'max-content',
          }}
        >
          {doubled.map((r, i) => <ReviewCard key={i} r={r} />)}
        </div>
      </div>

      {/* Top rated sitters */}
      {topSitters.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900">Top Rated Babysitters</h3>
            <p className="text-gray-500 text-sm mt-1 nunito">Highest rated on our platform right now</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {topSitters.map((s, i) => (
              <div key={s._id}
                className={`bg-white rounded-3xl p-5 shadow-md border border-gray-100 flex items-center gap-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 150}ms` }}>
                <div className="relative flex-shrink-0">
                  <img
                    src={s.photo || `https://i.pravatar.cc/80?u=${s._id}`}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-100"
                    alt={s.name}
                  />
                  {s.verified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                      <i className="fas fa-check text-white text-[8px]"></i>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 truncate">{s.name}</p>
                  <p className="text-gray-400 text-xs mb-2">{s.location} · {s.experience}yr exp</p>
                  <div className="flex items-center gap-1">
                    <i className="fas fa-star text-yellow-400 text-xs"></i>
                    <span className="text-sm font-bold text-gray-700">{s.rating}</span>
                    <span className="text-gray-400 text-xs">({s.reviewCount} reviews)</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[#6EC1E4] font-bold text-sm">₹{s.hourlyRate}</p>
                  <p className="text-gray-400 text-xs">/hour</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/search"
              className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#6EC1E4]/30 hover:scale-105 active:scale-95">
              <i className="fas fa-search"></i> Browse All Babysitters
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
