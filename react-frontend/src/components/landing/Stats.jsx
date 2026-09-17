import { useEffect, useState, useRef } from 'react'
import api from '../../services/api'

const fallback = [
  { value: '500+', label: 'Happy Parents', icon: 'fa-users', color: 'text-[#6EC1E4]', bg: 'bg-blue-50' },
  { value: '200+', label: 'Verified Sitters', icon: 'fa-user-check', color: 'text-green-500', bg: 'bg-green-50' },
  { value: '15+', label: 'Delhi Localities', icon: 'fa-map-marker-alt', color: 'text-pink-500', bg: 'bg-pink-50' },
  { value: '4.8★', label: 'Average Rating', icon: 'fa-star', color: 'text-yellow-500', bg: 'bg-yellow-50' },
]

export default function Stats() {
  const [stats, setStats] = useState(null)
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    api.get('/babysitters/public-stats')
      .then(r => setStats(r.data.stats))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.2 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const items = stats ? [
    { value: `${stats.totalParents}+`, label: 'Happy Parents', icon: 'fa-users', color: 'text-[#6EC1E4]', bg: 'bg-blue-50' },
    { value: `${stats.verifiedBabysitters}+`, label: 'Verified Sitters', icon: 'fa-user-check', color: 'text-green-500', bg: 'bg-green-50' },
    { value: `${stats.localities}+`, label: 'Delhi Localities', icon: 'fa-map-marker-alt', color: 'text-pink-500', bg: 'bg-pink-50' },
    { value: `${stats.avgRating}★`, label: 'Average Rating', icon: 'fa-star', color: 'text-yellow-500', bg: 'bg-yellow-50' },
  ] : fallback

  return (
    <section ref={ref} className="pt-8 pb-16 relative overflow-hidden" style={{ background: 'transparent' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((s, i) => (
            <div key={s.label}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-sm border border-white transition-all duration-700 card-hover ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                <i className={`fas ${s.icon} ${s.color} text-lg`}></i>
              </div>
              <div className="text-2xl md:text-3xl font-bold gradient-text mb-1">{s.value}</div>
              <p className="text-gray-500 text-xs nunito">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
