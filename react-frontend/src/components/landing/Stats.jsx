import { useEffect, useState, useRef } from 'react'
import api from '../../services/api'

function useCountUp(target, duration = 1800, active = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    const num = parseInt(target) || 0
    if (!num) return
    let start = 0
    const step = Math.ceil(num / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= num) { setCount(num); clearInterval(timer) }
      else setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [target, active])
  return count
}

const statConfig = [
  { key: 'parents', icon: 'fa-users', color: '#6EC1E4', bg: 'from-blue-50 to-cyan-50', border: 'border-blue-100', shadow: 'shadow-blue-100', label: 'Happy Parents', suffix: '+' },
  { key: 'sitters', icon: 'fa-user-check', color: '#22c55e', bg: 'from-green-50 to-emerald-50', border: 'border-green-100', shadow: 'shadow-green-100', label: 'Verified Sitters', suffix: '+' },
  { key: 'localities', icon: 'fa-map-marker-alt', color: '#ec4899', bg: 'from-pink-50 to-rose-50', border: 'border-pink-100', shadow: 'shadow-pink-100', label: 'Delhi Localities', suffix: '+' },
  { key: 'rating', icon: 'fa-star', color: '#f59e0b', bg: 'from-yellow-50 to-amber-50', border: 'border-yellow-100', shadow: 'shadow-yellow-100', label: 'Average Rating', suffix: '★' },
]

function StatCard({ icon, color, bg, border, shadow, label, suffix, rawValue, visible, delay }) {
  const num = parseInt(rawValue) || 0
  const count = useCountUp(num, 1600, visible)
  const isRating = suffix === '★'

  return (
    <div
      className={`relative bg-gradient-to-br ${bg} rounded-3xl p-6 border ${border} shadow-lg ${shadow} overflow-hidden group hover:-translate-y-2 hover:shadow-xl transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Glow orb */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${color}, transparent)` }}></div>

      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
        style={{ background: `${color}20` }}>
        <i className={`fas ${icon} text-2xl`} style={{ color }}></i>
      </div>

      {/* Value */}
      <div className="text-3xl md:text-4xl font-black mb-1" style={{ color }}>
        {isRating ? rawValue : `${count}${suffix}`}
      </div>

      <p className="text-gray-500 text-sm font-medium nunito">{label}</p>

      {/* Bottom shimmer bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}></div>
    </div>
  )
}

export default function Stats() {
  const [data, setData] = useState(null)
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    api.get('/babysitters/public-stats').then(r => setData(r.data.stats)).catch(() => {})
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.2 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const values = {
    parents: data?.totalParents ?? 500,
    sitters: data?.verifiedBabysitters ?? 200,
    localities: data?.localities ?? 15,
    rating: data?.avgRating ?? '4.8',
  }

  return (
    <section ref={ref} className="py-16 bg-white relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #6EC1E4 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-[#6EC1E4] font-semibold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full">
            <i className="fas fa-chart-line text-xs"></i> Platform Stats
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-3">Numbers That Speak</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {statConfig.map((s, i) => (
            <StatCard
              key={s.key}
              {...s}
              rawValue={values[s.key]}
              visible={visible}
              delay={i * 120}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
