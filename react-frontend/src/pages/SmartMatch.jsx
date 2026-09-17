import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/useAuth'

const SKILLS_OPTIONS = ['First Aid', 'Homework Help', 'Cooking', 'Swimming', 'Special Needs Care', 'Newborn Care', 'Arts & Crafts', 'Music', 'Tutoring', 'Outdoor Activities']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const LANGUAGES = ['Hindi', 'English', 'Punjabi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati']
const AGE_GROUPS = ['Infant (0-1)', 'Toddler (1-3)', 'Preschool (3-5)', 'School Age (5+)']

function StepIndicator({ step, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i + 1 <= step ? 'gradient-bg text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
            {i + 1 < step ? <i className="fas fa-check text-xs"></i> : i + 1}
          </div>
          {i < total - 1 && <div className={`w-8 h-0.5 ${i + 1 < step ? 'bg-[#6EC1E4]' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

function ToggleChip({ label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition ${selected ? 'gradient-bg text-white border-transparent shadow-sm' : 'border-gray-200 text-gray-600 hover:border-[#6EC1E4] hover:text-[#6EC1E4]'}`}>
      {label}
    </button>
  )
}

// ── Score breakdown bar ──────────────────────────────────────────────────────
function ScoreBar({ label, score, icon }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#6EC1E4' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-500 text-xs w-24 flex-shrink-0 flex items-center gap-1.5">
        <i className={`fas ${icon} text-[#6EC1E4]`} style={{ fontSize: '10px' }}></i>{label}
      </span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{score}%</span>
    </div>
  )
}

// ── Single result card ───────────────────────────────────────────────────────
function MatchCard({ sitter, rank }) {
  const [expanded, setExpanded] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const label = sitter.matchLabel || { text: 'Match', color: '#6EC1E4' }

  const dimIcons = { budget: 'fa-wallet', rating: 'fa-star', experience: 'fa-briefcase', skills: 'fa-tools', ageGroup: 'fa-baby', availability: 'fa-calendar', languages: 'fa-language', verified: 'fa-shield-alt' }

  return (
    <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Top banner */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${label.color}, #F9CADA)` }} />

      <div className="p-5">
        <div className="flex gap-4">
          {/* Avatar + rank */}
          <div className="relative flex-shrink-0">
            <img
              src={sitter.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(sitter.name)}&size=80&background=6EC1E4&color=fff`}
              alt={sitter.name}
              className="w-16 h-16 rounded-2xl object-cover shadow-sm"
            />
            {rank <= 3 && (
              <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shadow"
                style={{ background: rank === 1 ? '#f59e0b' : rank === 2 ? '#9ca3af' : '#cd7c2f' }}>
                {rank}
              </div>
            )}
            {sitter.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <i className="fas fa-check text-white" style={{ fontSize: '7px' }}></i>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{sitter.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5"><i className="fas fa-map-marker-alt mr-1 text-[#6EC1E4]"></i>{sitter.location}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-black" style={{ color: label.color }}>{sitter.finalScore}</div>
                <div className="text-xs font-semibold" style={{ color: label.color }}>{label.text}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-[#6EC1E4] font-bold text-sm">₹{sitter.hourlyRate}/hr</span>
              <span className="text-xs text-gray-500"><i className="fas fa-star text-yellow-400 mr-1"></i>{sitter.rating} ({sitter.reviewCount})</span>
              <span className="text-xs text-gray-500"><i className="fas fa-briefcase text-gray-300 mr-1"></i>{sitter.experience}yr exp</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${label.color}20`, color: label.color }}>
                Reliability {sitter.reliability}%
              </span>
            </div>
          </div>
        </div>

        {/* AI Explanation */}
        {sitter.aiExplanation && (
          <div className="mt-4 p-3 rounded-2xl text-sm text-gray-600 leading-relaxed border-l-4" style={{ background: 'rgba(110,193,228,0.06)', borderColor: '#6EC1E4' }}>
            <i className="fas fa-robot text-[#6EC1E4] mr-2 text-xs"></i>
            {sitter.aiExplanation}
          </div>
        )}

        {/* Expand breakdown */}
        <button onClick={() => setExpanded(e => !e)}
          className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-[#6EC1E4] transition py-1">
          <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}></i>
          {expanded ? 'Hide' : 'Show'} score breakdown
        </button>

        {expanded && sitter.breakdown && (
          <div className="mt-3 space-y-2 pt-3 border-t border-gray-100">
            {Object.entries(sitter.breakdown).map(([key, val]) => (
              <ScoreBar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} score={val.score} icon={dimIcons[key] || 'fa-circle'} />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Link to={`/profile/${sitter._id}`} className="flex-1 gradient-bg text-white text-center py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition">
            View Profile
          </Link>
          {user && (
            <button onClick={() => navigate(`/chat/${sitter._id}`)}
              className="border-2 border-[#6EC1E4] text-[#6EC1E4] px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#6EC1E4]/10 transition">
              <i className="fas fa-comment-dots"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── No results screen ────────────────────────────────────────────────────────
function NoResults({ suggestions, onRetry }) {
  return (
    <div className="max-w-lg mx-auto text-center py-16 px-4">
      <div className="w-24 h-24 rounded-3xl gradient-bg flex items-center justify-center mx-auto mb-6 shadow-xl">
        <i className="fas fa-search text-white text-4xl"></i>
      </div>
      <h2 className="text-2xl font-black text-gray-800 mb-2">No matches found yet</h2>
      <p className="text-gray-500 mb-6">We're actively growing our network of verified babysitters. Please revisit our website — we're working on bringing trusted care to your area!</p>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-left mb-6 space-y-3">
        <p className="text-sm font-bold text-gray-700 mb-2"><i className="fas fa-lightbulb text-[#6EC1E4] mr-2"></i>Suggestions to find more results:</p>
        {suggestions?.map((s, i) => (
          <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full gradient-bg text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            {s}
          </p>
        ))}
      </div>
      <div className="flex gap-3 justify-center">
        <button onClick={onRetry} className="gradient-bg text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition">
          Adjust Requirements
        </button>
        <Link to="/search" className="border-2 border-[#6EC1E4] text-[#6EC1E4] px-6 py-2.5 rounded-xl font-semibold hover:bg-[#6EC1E4]/10 transition">
          Browse All
        </Link>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function SmartMatch() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const { user } = useAuth()

  const [prefs, setPrefs] = useState({
    childAgeGroup: '',
    numberOfChildren: 1,
    maxBudget: '',
    minExperience: 0,
    requiredSkills: [],
    requiredDays: [],
    preferredLanguages: [],
    specialNeeds: false,
    additionalNotes: ''
  })

  const toggle = (field, val) => setPrefs(p => ({
    ...p,
    [field]: p[field].includes(val) ? p[field].filter(x => x !== val) : [...p[field], val]
  }))

  const runMatch = async () => {
    setLoading(true)
    try {
      if (user) {
        await api.post('/smartmatch/preferences', prefs)
      }
      const { data } = await api.post('/smartmatch/run', { preferences: prefs })
      setResults(data)
      setStep(4)
      // Save to localStorage so Search map can display AI-matched sitters
      if (!data.noResults && data.babysitters?.length) {
        const sitters = data.babysitters.map(s => ({ ...s, matchScore: s.finalScore }))
        localStorage.setItem('smartmatch_results', JSON.stringify(sitters))
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setResults(null); setStep(1) }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to right, rgba(110,193,228,0.12) 0%, rgba(255,255,255,1) 50%, rgba(249,202,218,0.15) 100%)' }}>
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          {step < 4 && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 gradient-bg text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-4 shadow-md">
                <i className="fas fa-robot"></i> AI Smart Match
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">Find Your Perfect Babysitter</h1>
              <p className="text-gray-500">Answer a few questions and our AI will rank the best matches for your family</p>
            </div>
          )}

          {step < 4 && <StepIndicator step={step} total={3} />}

          {/* ── Step 1: Child info ── */}
          {step === 1 && (
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 gradient-bg rounded-xl flex items-center justify-center text-white text-sm">1</span>
                Tell us about your child
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-3 block">Child's age group</label>
                  <div className="flex flex-wrap gap-2">
                    {AGE_GROUPS.map(ag => (
                      <ToggleChip key={ag} label={ag} selected={prefs.childAgeGroup === ag}
                        onClick={() => setPrefs(p => ({ ...p, childAgeGroup: p.childAgeGroup === ag ? '' : ag }))} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Number of children</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setPrefs(p => ({ ...p, numberOfChildren: Math.max(1, p.numberOfChildren - 1) }))}
                      className="w-9 h-9 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:border-[#6EC1E4] transition">−</button>
                    <span className="text-2xl font-black text-gray-800 w-8 text-center">{prefs.numberOfChildren}</span>
                    <button type="button" onClick={() => setPrefs(p => ({ ...p, numberOfChildren: Math.min(10, p.numberOfChildren + 1) }))}
                      className="w-9 h-9 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:border-[#6EC1E4] transition">+</button>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={prefs.specialNeeds} onChange={e => setPrefs(p => ({ ...p, specialNeeds: e.target.checked }))}
                      className="w-5 h-5 accent-[#6EC1E4]" />
                    <span className="text-sm font-semibold text-gray-600">My child has special needs</span>
                  </label>
                  {prefs.specialNeeds && (
                    <textarea value={prefs.specialNeedsDetails || ''} onChange={e => setPrefs(p => ({ ...p, specialNeedsDetails: e.target.value }))}
                      placeholder="Please describe briefly..." rows={2}
                      className="mt-3 w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#6EC1E4] outline-none resize-none" />
                  )}
                </div>
              </div>
              <button onClick={() => setStep(2)} className="mt-8 w-full gradient-bg text-white py-3.5 rounded-2xl font-bold text-base hover:opacity-90 transition shadow-md">
                Continue <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          )}

          {/* ── Step 2: Requirements ── */}
          {step === 2 && (
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 gradient-bg rounded-xl flex items-center justify-center text-white text-sm">2</span>
                Your requirements
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Max budget (₹/hr)</label>
                    <input type="number" placeholder="e.g. 500" value={prefs.maxBudget}
                      onChange={e => setPrefs(p => ({ ...p, maxBudget: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#6EC1E4] outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Min experience (years)</label>
                    <input type="number" placeholder="e.g. 2" value={prefs.minExperience}
                      onChange={e => setPrefs(p => ({ ...p, minExperience: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#6EC1E4] outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-3 block">Required skills</label>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS_OPTIONS.map(s => (
                      <ToggleChip key={s} label={s} selected={prefs.requiredSkills.includes(s)} onClick={() => toggle('requiredSkills', s)} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-3 block">Days needed</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(d => (
                      <ToggleChip key={d} label={d.slice(0, 3)} selected={prefs.requiredDays.includes(d)} onClick={() => toggle('requiredDays', d)} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(1)} className="px-6 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:border-[#6EC1E4] transition">
                  <i className="fas fa-arrow-left mr-2"></i>Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 gradient-bg text-white py-3.5 rounded-2xl font-bold hover:opacity-90 transition shadow-md">
                  Continue <i className="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Preferences ── */}
          {step === 3 && (
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 gradient-bg rounded-xl flex items-center justify-center text-white text-sm">3</span>
                Final preferences
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-3 block">Preferred languages</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(l => (
                      <ToggleChip key={l} label={l} selected={prefs.preferredLanguages.includes(l)} onClick={() => toggle('preferredLanguages', l)} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Anything else? (optional)</label>
                  <textarea value={prefs.additionalNotes} onChange={e => setPrefs(p => ({ ...p, additionalNotes: e.target.value }))}
                    placeholder="e.g. Must be comfortable with pets, non-smoker preferred..." rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#6EC1E4] outline-none resize-none" />
                </div>
                {/* Summary */}
                <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 space-y-1.5">
                  <p className="font-bold text-gray-700 mb-2">Your requirements summary:</p>
                  {prefs.childAgeGroup && <p><i className="fas fa-baby text-[#6EC1E4] mr-2"></i>{prefs.childAgeGroup} · {prefs.numberOfChildren} child{prefs.numberOfChildren > 1 ? 'ren' : ''}</p>}
                  {prefs.maxBudget && <p><i className="fas fa-wallet text-[#6EC1E4] mr-2"></i>Up to ₹{prefs.maxBudget}/hr</p>}
                  {prefs.requiredSkills.length > 0 && <p><i className="fas fa-tools text-[#6EC1E4] mr-2"></i>{prefs.requiredSkills.join(', ')}</p>}
                  {prefs.requiredDays.length > 0 && <p><i className="fas fa-calendar text-[#6EC1E4] mr-2"></i>{prefs.requiredDays.join(', ')}</p>}
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(2)} className="px-6 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:border-[#6EC1E4] transition">
                  <i className="fas fa-arrow-left mr-2"></i>Back
                </button>
                <button onClick={runMatch} disabled={loading}
                  className="flex-1 gradient-bg text-white py-3.5 rounded-2xl font-bold hover:opacity-90 transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <><i className="fas fa-spinner fa-spin"></i> Finding your matches...</> : <><i className="fas fa-robot"></i> Find My Best Matches</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Results ── */}
          {step === 4 && results && (
            <div>
              {results.noResults ? (
                <NoResults suggestions={results.suggestions} onRetry={reset} />
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 gradient-bg text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-4 shadow-md">
                      <i className="fas fa-robot"></i> AI Results
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-1">Your Top Matches</h2>
                    <p className="text-gray-500 text-sm">Ranked by AI across 8 dimensions · {results.totalScored} sitters analysed</p>
                    <button onClick={reset} className="mt-3 text-sm text-[#6EC1E4] hover:underline font-medium">
                      <i className="fas fa-redo-alt mr-1"></i>Refine requirements
                    </button>
                  </div>
                  <div className="space-y-5">
                    {results.babysitters.map((s, i) => (
                      <MatchCard key={s._id} sitter={s} rank={i + 1} />
                    ))}
                  </div>
                  <div className="mt-8 text-center flex flex-col items-center gap-3">
                    <Link
                      to="/search"
                      className="inline-flex items-center gap-2 gradient-bg text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition shadow-md"
                    >
                      <i className="fas fa-map-marked-alt"></i> View Matches on Map
                    </Link>
                    <Link to="/search" className="text-sm text-gray-400 hover:text-[#6EC1E4] transition">
                      <i className="fas fa-search mr-1"></i>Browse all babysitters instead
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
