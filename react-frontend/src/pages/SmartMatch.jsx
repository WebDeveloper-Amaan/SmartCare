import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/useAuth'

const SKILLS = ['Cooking (Nutrition)', 'Special Needs Care', 'Newborn Care', 'Arts & Crafts', 'Music', 'Tutoring', 'Language Learning']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const LANGUAGES = ['Hindi', 'English', 'Punjabi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati']
const AGE_GROUPS = [
  { label: 'Infant', sub: '0–1 yr', icon: '🍼', val: 'Infant (0-1)' },
  { label: 'Toddler', sub: '1–3 yrs', icon: '🧸', val: 'Toddler (1-3)' },
  { label: 'Preschool', sub: '3–5 yrs', icon: '🎨', val: 'Preschool (3-5)' },
  { label: 'School Age', sub: '5+ yrs', icon: '📚', val: 'School Age (5+)' },
]

const DIM_META = {
  budget:       { icon: 'fa-wallet',        label: 'Budget Fit',     color: '#6EC1E4' },
  rating:       { icon: 'fa-star',          label: 'Rating',         color: '#f59e0b' },
  experience:   { icon: 'fa-briefcase',     label: 'Experience',     color: '#8b5cf6' },
  skills:       { icon: 'fa-tools',         label: 'Skills Match',   color: '#22c55e' },
  ageGroup:     { icon: 'fa-baby',          label: 'Age Group',      color: '#F9CADA' },
  availability: { icon: 'fa-calendar-alt', label: 'Availability',   color: '#6EC1E4' },
  languages:    { icon: 'fa-language',      label: 'Languages',      color: '#ec4899' },
  verified:     { icon: 'fa-shield-alt',    label: 'Verified',       color: '#22c55e' },
  specialNeeds: { icon: 'fa-heart',         label: 'Special Needs',  color: '#ef4444' },
}

// ── Animated score ring ──────────────────────────────────────────────────────
function ScoreRing({ score, color, size = 72 }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  )
}

// ── Chip toggle ──────────────────────────────────────────────────────────────
function Chip({ label, selected, onClick, icon }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-semibold border-2 transition-all duration-200 ${
        selected
          ? 'border-[#6EC1E4] bg-[#6EC1E4] text-white shadow-md shadow-[#6EC1E4]/30 scale-105'
          : 'border-gray-200 text-gray-600 hover:border-[#6EC1E4]/60 hover:text-[#6EC1E4] bg-white'
      }`}>
      {icon && <span>{icon}</span>}
      {label}
    </button>
  )
}

// ── Loading animation ────────────────────────────────────────────────────────
function AILoader() {
  const msgs = [
    'Scanning 100+ verified babysitters…',
    'Analysing budget compatibility…',
    'Checking skill alignment…',
    'Evaluating experience & ratings…',
    'Generating AI explanations…',
    'Ranking your top matches…',
  ]
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % msgs.length), 1800)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="relative w-28 h-28 mb-8">
        <div className="absolute inset-0 rounded-full gradient-bg opacity-20 animate-ping" />
        <div className="absolute inset-2 rounded-full gradient-bg opacity-30 animate-ping" style={{ animationDelay: '0.3s' }} />
        <div className="absolute inset-0 rounded-full gradient-bg flex items-center justify-center shadow-2xl">
          <i className="fas fa-robot text-white text-4xl" />
        </div>
      </div>
      <h3 className="text-xl font-black text-gray-900 mb-3">AI is working its magic</h3>
      <p className="text-[#6EC1E4] font-semibold text-sm animate-pulse text-center max-w-xs">{msgs[idx]}</p>
      <div className="flex gap-1.5 mt-6">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-[#6EC1E4]"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

// ── Match card ───────────────────────────────────────────────────────────────
function MatchCard({ sitter, rank, compareList, onToggleCompare }) {
  const [expanded, setExpanded] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const label = sitter.matchLabel || { text: 'Match', color: '#6EC1E4' }
  const isComparing = compareList.includes(sitter._id)

  const rankColors = ['#f59e0b', '#9ca3af', '#cd7c2f']
  const rankLabels = ['🥇', '🥈', '🥉']

  return (
    <div className={`bg-white rounded-3xl shadow-md border-2 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${isComparing ? 'border-[#6EC1E4]' : 'border-gray-100'}`}>
      {/* Score color bar */}
      <div className="h-1.5" style={{ background: `linear-gradient(to right, ${label.color}, ${label.color}88)` }} />

      <div className="p-5">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={sitter.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(sitter.name)}&size=80&background=6EC1E4&color=fff`}
              alt={sitter.name}
              className="w-16 h-16 rounded-2xl object-cover shadow-sm"
            />
            {rank <= 3 && (
              <div className="absolute -top-2 -left-2 text-lg leading-none">{rankLabels[rank - 1]}</div>
            )}
            {sitter.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <i className="fas fa-check text-white" style={{ fontSize: 7 }} />
              </div>
            )}
          </div>

          {/* Info + score ring */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-black text-gray-900 text-base truncate">{sitter.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  <i className="fas fa-map-marker-alt mr-1 text-[#6EC1E4]" />{sitter.location}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[#6EC1E4] font-bold text-sm">₹{sitter.hourlyRate}/hr</span>
                  <span className="text-xs text-gray-500">
                    <i className="fas fa-star text-yellow-400 mr-0.5" />{sitter.rating} ({sitter.reviewCount})
                  </span>
                  <span className="text-xs text-gray-500">
                    <i className="fas fa-briefcase text-gray-300 mr-0.5" />{sitter.experience}yr
                  </span>
                </div>
              </div>
              {/* Score ring */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="relative">
                  <ScoreRing score={sitter.finalScore} color={label.color} size={64} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black leading-none" style={{ color: label.color }}>{sitter.finalScore}</span>
                    <span className="text-[8px] text-gray-400 font-semibold">/ 100</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold mt-0.5 text-center leading-tight" style={{ color: label.color }}>{label.text}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths chips */}
        {sitter.strengths?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {sitter.strengths.slice(0, 4).map(s => (
              <span key={s} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                <i className={`fas ${DIM_META[s]?.icon || 'fa-check'}`} style={{ fontSize: 8 }} />
                {DIM_META[s]?.label || s}
              </span>
            ))}
            {sitter.gaps?.length > 0 && sitter.gaps.slice(0, 1).map(g => (
              <span key={g} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                <i className="fas fa-exclamation" style={{ fontSize: 8 }} />
                {DIM_META[g]?.label || g}
              </span>
            ))}
          </div>
        )}

        {/* AI explanation */}
        {sitter.aiExplanation && (
          <div className="mt-3 p-3 rounded-2xl text-sm text-gray-600 leading-relaxed border-l-4 bg-gradient-to-r from-[#6EC1E4]/6 to-transparent" style={{ borderColor: '#6EC1E4' }}>
            <i className="fas fa-robot text-[#6EC1E4] mr-1.5 text-xs" />
            {sitter.aiExplanation}
          </div>
        )}

        {/* Reliability bar */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-400 w-20 flex-shrink-0">Reliability</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${sitter.reliability}%`, background: sitter.reliability >= 80 ? '#22c55e' : sitter.reliability >= 60 ? '#6EC1E4' : '#f59e0b' }} />
          </div>
          <span className="text-xs font-bold text-gray-600 w-8 text-right">{sitter.reliability}%</span>
        </div>

        {/* Expand breakdown */}
        <button onClick={() => setExpanded(e => !e)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-[#6EC1E4] transition py-1.5 border-t border-gray-50">
          <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-[10px]`} />
          {expanded ? 'Hide' : 'Show'} full score breakdown
        </button>

        {expanded && sitter.breakdown && (
          <div className="mt-2 space-y-2 pt-2">
            {Object.entries(sitter.breakdown).map(([key, val]) => {
              const meta = DIM_META[key] || { icon: 'fa-circle', label: key, color: '#6EC1E4' }
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.color + '20' }}>
                    <i className={`fas ${meta.icon} text-[9px]`} style={{ color: meta.color }} />
                  </div>
                  <span className="text-xs text-gray-500 w-24 flex-shrink-0">{meta.label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${val.score}%`, background: val.score >= 80 ? '#22c55e' : val.score >= 50 ? meta.color : '#f59e0b' }} />
                  </div>
                  <span className="text-xs font-bold w-8 text-right text-gray-600">{val.score}%</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Link to={`/profile/${sitter._id}`}
            className="flex-1 gradient-bg text-white text-center py-2.5 rounded-2xl text-sm font-bold hover:opacity-90 transition shadow-sm">
            View & Book
          </Link>
          {user && (
            <button onClick={() => navigate(`/chat/${sitter._id}`)}
              className="border-2 border-[#6EC1E4] text-[#6EC1E4] px-3.5 py-2.5 rounded-2xl text-sm hover:bg-[#6EC1E4]/10 transition">
              <i className="fas fa-comment-dots" />
            </button>
          )}
          <button
            onClick={() => onToggleCompare(sitter._id)}
            className={`px-3.5 py-2.5 rounded-2xl text-sm border-2 transition ${isComparing ? 'border-purple-400 bg-purple-50 text-purple-600' : 'border-gray-200 text-gray-400 hover:border-purple-300'}`}
            title="Compare">
            <i className="fas fa-balance-scale" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Compare panel ────────────────────────────────────────────────────────────
function ComparePanel({ sitters, ids, onClose }) {
  const selected = sitters.filter(s => ids.includes(s._id)).slice(0, 3)
  if (selected.length < 2) return null
  const dims = Object.keys(DIM_META)
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between rounded-t-3xl">
          <h3 className="font-black text-gray-900">Side-by-Side Comparison</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <i className="fas fa-times text-sm" />
          </button>
        </div>
        <div className="p-6">
          {/* Headers */}
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `140px repeat(${selected.length}, 1fr)` }}>
            <div />
            {selected.map(s => (
              <div key={s._id} className="text-center">
                <img src={s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&size=60&background=6EC1E4&color=fff`}
                  alt="" className="w-12 h-12 rounded-xl object-cover mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-800 truncate">{s.name.split(' ')[0]}</p>
                <p className="text-lg font-black" style={{ color: s.matchLabel?.color }}>{s.finalScore}</p>
              </div>
            ))}
          </div>
          {/* Rows */}
          {dims.map(dim => {
            const meta = DIM_META[dim]
            return (
              <div key={dim} className="grid gap-3 py-2 border-t border-gray-50 items-center" style={{ gridTemplateColumns: `140px repeat(${selected.length}, 1fr)` }}>
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <i className={`fas ${meta.icon} text-[10px]`} style={{ color: meta.color }} />{meta.label}
                </span>
                {selected.map(s => {
                  const val = s.breakdown?.[dim]?.score ?? 0
                  return (
                    <div key={s._id} className="flex flex-col items-center gap-1">
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${val}%`, background: val >= 80 ? '#22c55e' : val >= 50 ? meta.color : '#f59e0b' }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600">{val}%</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
          {/* CTA row */}
          <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: `140px repeat(${selected.length}, 1fr)` }}>
            <div />
            {selected.map(s => (
              <Link key={s._id} to={`/profile/${s._id}`}
                className="gradient-bg text-white text-center py-2 rounded-xl text-xs font-bold hover:opacity-90 transition">
                Book
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Step indicators ──────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${
          i < current ? 'w-6 h-2 bg-[#6EC1E4]' :
          i === current ? 'w-8 h-2 bg-[#6EC1E4] shadow-md shadow-[#6EC1E4]/40' :
          'w-2 h-2 bg-gray-200'
        }`} />
      ))}
    </div>
  )
}

// ── Live preview counter ─────────────────────────────────────────────────────
function LiveCounter({ prefs }) {
  const [count, setCount] = useState(null)
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ role: 'babysitter', verified: true })
        if (prefs.maxBudget) params.set('maxRate', prefs.maxBudget)
        if (prefs.minExperience) params.set('minExperience', prefs.minExperience)
        const res = await api.get(`/babysitters?${params}&limit=1`)
        setCount(res.data.total ?? res.data.count ?? '?')
      } catch { setCount(null) }
    }, 400)
    return () => clearTimeout(t)
  }, [prefs.maxBudget, prefs.minExperience])

  if (count === null) return null
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#6EC1E4]/10 border border-[#6EC1E4]/20 text-sm font-semibold text-[#6EC1E4]">
      <span className="w-2 h-2 rounded-full bg-[#6EC1E4] animate-pulse" />
      {count} sitters available
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function SmartMatch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)   // 0=intro, 1-4=wizard, 5=results
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [compareList, setCompareList] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const resultsRef = useRef(null)

  const [prefs, setPrefs] = useState({
    childAgeGroup: '',
    numberOfChildren: 1,
    maxBudget: '',
    minExperience: '',
    requiredSkills: [],
    requiredDays: [],
    preferredLanguages: [],
    specialNeeds: false,
    specialNeedsDetails: '',
    additionalNotes: '',
  })

  const set = (key, val) => setPrefs(p => ({ ...p, [key]: val }))
  const toggle = (key, val) => setPrefs(p => ({
    ...p,
    [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val]
  }))

  // Load saved prefs on mount
  useEffect(() => {
    if (!user) return
    api.get('/smartmatch/preferences').then(r => {
      if (r.data.preferences) {
        const p = r.data.preferences
        setPrefs(prev => ({ ...prev, ...p }))
      }
    }).catch(() => {})
  }, [user])

  // Load cached results
  useEffect(() => {
    const cached = localStorage.getItem('smartmatch_results')
    if (cached) {
      try { setResults(JSON.parse(cached)); setStep(5) } catch {}
    }
  }, [])

  async function runMatch() {
    setLoading(true)
    setStep(5)
    try {
      if (user) {
        await api.post('/smartmatch/preferences', prefs).catch(() => {})
      }
      const res = await api.post('/smartmatch/run', { preferences: prefs })
      const data = res.data
      setResults(data)
      localStorage.setItem('smartmatch_results', JSON.stringify(data))
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch {
      toast.error('Match failed — please try again')
      setStep(4)
    } finally {
      setLoading(false)
    }
  }

  function restart() {
    setStep(0)
    setResults(null)
    setCompareList([])
    localStorage.removeItem('smartmatch_results')
  }

  function toggleCompare(id) {
    setCompareList(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) :
      prev.length < 3 ? [...prev, id] : prev
    )
  }

  // ── Wizard step content ────────────────────────────────────────────────────
  const TOTAL_STEPS = 4

  const stepContent = [
    // Step 1 — child info
    <div key="s1" className="space-y-6">
      <div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Child's Age Group</p>
        <div className="grid grid-cols-2 gap-3">
          {AGE_GROUPS.map(ag => (
            <button key={ag.val} type="button"
              onClick={() => set('childAgeGroup', ag.val)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                prefs.childAgeGroup === ag.val
                  ? 'border-[#6EC1E4] bg-[#6EC1E4]/8 shadow-md shadow-[#6EC1E4]/20'
                  : 'border-gray-100 hover:border-[#6EC1E4]/40 bg-white'
              }`}>
              <span className="text-2xl">{ag.icon}</span>
              <div>
                <p className="font-bold text-gray-800 text-sm">{ag.label}</p>
                <p className="text-xs text-gray-400">{ag.sub}</p>
              </div>
              {prefs.childAgeGroup === ag.val && (
                <i className="fas fa-check-circle text-[#6EC1E4] ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Number of Children</p>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => set('numberOfChildren', Math.max(1, prefs.numberOfChildren - 1))}
            className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#6EC1E4] hover:text-[#6EC1E4] transition font-bold text-lg">−</button>
          <span className="text-3xl font-black text-gray-900 w-8 text-center">{prefs.numberOfChildren}</span>
          <button type="button" onClick={() => set('numberOfChildren', Math.min(5, prefs.numberOfChildren + 1))}
            className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#6EC1E4] hover:text-[#6EC1E4] transition font-bold text-lg">+</button>
          <span className="text-sm text-gray-400 ml-2">{prefs.numberOfChildren === 1 ? 'child' : 'children'}</span>
        </div>
      </div>
    </div>,

    // Step 2 — budget & experience
    <div key="s2" className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Max Budget</p>
          <LiveCounter prefs={prefs} />
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
          <input type="number" placeholder="e.g. 400" value={prefs.maxBudget}
            onChange={e => set('maxBudget', e.target.value)}
            className="w-full pl-8 pr-16 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none text-gray-800 font-semibold transition" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/hr</span>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {[200, 300, 400, 600].map(v => (
            <button key={v} type="button" onClick={() => set('maxBudget', v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                Number(prefs.maxBudget) === v ? 'border-[#6EC1E4] bg-[#6EC1E4] text-white' : 'border-gray-200 text-gray-500 hover:border-[#6EC1E4]/50'
              }`}>₹{v}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Min. Experience</p>
        <div className="relative">
          <input type="number" placeholder="e.g. 2" value={prefs.minExperience}
            onChange={e => set('minExperience', e.target.value)}
            className="w-full pr-16 pl-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none text-gray-800 font-semibold transition" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">years</span>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {[0, 1, 2, 3, 5].map(v => (
            <button key={v} type="button" onClick={() => set('minExperience', v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                Number(prefs.minExperience) === v ? 'border-[#6EC1E4] bg-[#6EC1E4] text-white' : 'border-gray-200 text-gray-500 hover:border-[#6EC1E4]/50'
              }`}>{v === 0 ? 'Any' : `${v}+ yr`}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-100 bg-gray-50">
        <button type="button" onClick={() => set('specialNeeds', !prefs.specialNeeds)}
          className={`w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${prefs.specialNeeds ? 'bg-[#6EC1E4]' : 'bg-gray-300'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${prefs.specialNeeds ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
        <div>
          <p className="text-sm font-bold text-gray-700">Special Needs Care</p>
          <p className="text-xs text-gray-400">Sitter experienced with special needs children</p>
        </div>
      </div>
    </div>,

    // Step 3 — skills & days
    <div key="s3" className="space-y-6">
      <div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Required Skills</p>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map(s => (
            <Chip key={s} label={s} selected={prefs.requiredSkills.includes(s)}
              onClick={() => toggle('requiredSkills', s)} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Required Days</p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(d => (
            <Chip key={d} label={d.slice(0, 3)} selected={prefs.requiredDays.includes(d)}
              onClick={() => toggle('requiredDays', d)} />
          ))}
        </div>
      </div>
    </div>,

    // Step 4 — languages & notes
    <div key="s4" className="space-y-6">
      <div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Preferred Languages</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(l => (
            <Chip key={l} label={l} selected={prefs.preferredLanguages.includes(l)}
              onClick={() => toggle('preferredLanguages', l)} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Additional Notes <span className="text-gray-300 font-normal normal-case">(optional)</span></p>
        <textarea rows={3} placeholder="e.g. Must be comfortable with pets, vegetarian household…"
          value={prefs.additionalNotes} onChange={e => set('additionalNotes', e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none text-gray-700 text-sm resize-none transition" />
      </div>
      {/* Summary chips */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#6EC1E4]/8 to-[#F9CADA]/8 border border-[#6EC1E4]/15">
        <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Your preferences summary</p>
        <div className="flex flex-wrap gap-1.5">
          {prefs.childAgeGroup && <span className="text-xs px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 font-semibold">{prefs.childAgeGroup}</span>}
          {prefs.maxBudget && <span className="text-xs px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 font-semibold">≤ ₹{prefs.maxBudget}/hr</span>}
          {prefs.minExperience > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600 font-semibold">{prefs.minExperience}+ yrs exp</span>}
          {prefs.requiredSkills.map(s => <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-[#6EC1E4]/15 text-[#6EC1E4] font-semibold">{s}</span>)}
          {prefs.requiredDays.map(d => <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 font-semibold">{d.slice(0,3)}</span>)}
          {prefs.specialNeeds && <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-500 font-semibold">Special Needs</span>}
        </div>
      </div>
    </div>,
  ]

  const stepTitles = [
    { title: "Tell us about your child", sub: "We'll find sitters experienced with their age group" },
    { title: "Budget & experience", sub: "Set your comfort zone — we'll match within it" },
    { title: "Skills & schedule", sub: "Pick what matters most for your family" },
    { title: "Languages & final touches", sub: "Almost there — review your preferences" },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Intro screen ── */}
      {step === 0 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
          {/* Animated blobs */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="blob absolute top-10 -left-20 w-96 h-96 bg-[#6EC1E4]/15 rounded-full" />
            <div className="blob absolute bottom-10 -right-20 w-80 h-80 bg-[#F9CADA]/20 rounded-full" style={{ animationDelay: '2s' }} />
          </div>

          <div className="max-w-lg w-full text-center">
            {/* Icon */}
            <div className="relative inline-flex mb-8">
              <div className="w-24 h-24 rounded-3xl gradient-bg flex items-center justify-center shadow-2xl shadow-[#6EC1E4]/30">
                <i className="fas fa-robot text-white text-4xl" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                <i className="fas fa-bolt text-white text-sm" />
              </div>
            </div>

            <h1 className="text-4xl font-black text-gray-900 mb-3 leading-tight">
              AI Smart Match
            </h1>
            <p className="text-gray-500 text-lg mb-8 leading-relaxed">
              Answer 4 quick questions and our AI will score every verified babysitter in Delhi-NCR — then explain exactly why each one fits your family.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {[
                { icon: 'fa-brain', text: '9-dimension AI scoring' },
                { icon: 'fa-shield-alt', text: 'KYC-verified only' },
                { icon: 'fa-comment-dots', text: 'Gemini explanations' },
                { icon: 'fa-balance-scale', text: 'Side-by-side compare' },
              ].map(f => (
                <span key={f.text} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-600 font-semibold shadow-sm">
                  <i className={`fas ${f.icon} text-[#6EC1E4] text-xs`} />
                  {f.text}
                </span>
              ))}
            </div>

            <button onClick={() => setStep(1)}
              className="gradient-bg text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-[#6EC1E4]/30 hover:opacity-90 hover:scale-105 transition-all duration-200 w-full max-w-xs">
              Find My Perfect Sitter
              <i className="fas fa-arrow-right ml-2" />
            </button>

            {results && (
              <button onClick={() => setStep(5)}
                className="mt-3 text-sm text-[#6EC1E4] font-semibold hover:underline block mx-auto">
                View previous results →
              </button>
            )}

            {!user && (
              <p className="mt-6 text-xs text-gray-400">
                <Link to="/login" className="text-[#6EC1E4] font-semibold hover:underline">Sign in</Link> to save your preferences for next time
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Wizard ── */}
      {step >= 1 && step <= 4 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
          <div className="w-full max-w-lg">
            {/* Progress */}
            <div className="mb-8 text-center">
              <StepDots current={step - 1} total={TOTAL_STEPS} />
              <p className="text-xs text-gray-400 mt-2 font-semibold">Step {step} of {TOTAL_STEPS}</p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="h-1 gradient-bg" style={{ width: `${(step / TOTAL_STEPS) * 100}%`, transition: 'width 0.4s ease' }} />
              <div className="p-6 sm:p-8">
                <h2 className="text-xl font-black text-gray-900 mb-1">{stepTitles[step - 1].title}</h2>
                <p className="text-sm text-gray-400 mb-6">{stepTitles[step - 1].sub}</p>
                {stepContent[step - 1]}
              </div>
            </div>

            {/* Nav buttons */}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:border-gray-300 transition">
                <i className="fas fa-arrow-left mr-2 text-sm" />Back
              </button>
              {step < TOTAL_STEPS ? (
                <button onClick={() => setStep(s => s + 1)}
                  className="flex-2 flex-grow-[2] gradient-bg text-white py-3.5 rounded-2xl font-bold hover:opacity-90 transition shadow-lg shadow-[#6EC1E4]/20">
                  Continue <i className="fas fa-arrow-right ml-2 text-sm" />
                </button>
              ) : (
                <button onClick={runMatch}
                  className="flex-2 flex-grow-[2] gradient-bg text-white py-3.5 rounded-2xl font-bold hover:opacity-90 transition shadow-lg shadow-[#6EC1E4]/20">
                  <i className="fas fa-robot mr-2" />Find My Matches
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {step === 5 && (
        <div ref={resultsRef} className="max-w-2xl mx-auto px-4 py-8 pb-24">
          {loading ? (
            <AILoader />
          ) : results ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-bold mb-4">
                  <i className="fas fa-check-circle" />
                  Analysis complete
                </div>
                <h2 className="text-2xl font-black text-gray-900">
                  {results.noResults ? 'No exact matches found' : `Your Top ${results.babysitters?.length} Matches`}
                </h2>
                {!results.noResults && (
                  <p className="text-gray-400 text-sm mt-1">
                    Scored {results.totalScored} verified sitters · ranked by AI compatibility
                  </p>
                )}
              </div>

              {/* No results */}
              {results.noResults && (
                <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-100 text-center mb-6">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-gray-600 mb-4">{results.message}</p>
                  <ul className="text-sm text-gray-500 space-y-2 text-left max-w-xs mx-auto">
                    {results.suggestions?.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <i className="fas fa-lightbulb text-yellow-400 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Compare bar */}
              {compareList.length >= 2 && (
                <div className="sticky top-16 z-30 mb-4">
                  <button onClick={() => setShowCompare(true)}
                    className="w-full gradient-bg text-white py-3 rounded-2xl font-bold shadow-lg shadow-[#6EC1E4]/30 flex items-center justify-center gap-2 hover:opacity-90 transition">
                    <i className="fas fa-balance-scale" />
                    Compare {compareList.length} sitters
                  </button>
                </div>
              )}

              {/* Cards */}
              <div className="space-y-4">
                {results.babysitters?.map((s, i) => (
                  <MatchCard key={s._id} sitter={s} rank={i + 1}
                    compareList={compareList} onToggleCompare={toggleCompare} />
                ))}
              </div>

              {/* Bottom actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button onClick={restart}
                  className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:border-[#6EC1E4]/50 transition">
                  <i className="fas fa-redo mr-2 text-sm" />Refine Search
                </button>
                <Link to="/search"
                  className="flex-1 text-center py-3.5 rounded-2xl border-2 border-[#6EC1E4] text-[#6EC1E4] font-bold hover:bg-[#6EC1E4]/8 transition">
                  Browse All Sitters
                </Link>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Compare modal */}
      {showCompare && (
        <ComparePanel sitters={results?.babysitters || []} ids={compareList}
          onClose={() => setShowCompare(false)} />
      )}
    </div>
  )
}
