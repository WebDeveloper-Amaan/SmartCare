import { useState, useEffect, Component } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MapView from '../components/MapView'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/useAuth'

class MapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false } }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) return (
      <div className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200" style={{ background: 'rgba(255,255,255,0.7)' }}>
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <i className="fas fa-map text-gray-300 text-3xl"></i>
        </div>
        <p className="font-bold text-gray-500 text-base">Map temporarily unavailable</p>
        <p className="text-xs text-gray-400 text-center max-w-xs">Google Maps API quota reached. Browse babysitters from the list on the left.</p>
      </div>
    )
    return this.props.children
  }
}

function Stars({ rating }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  return (
    <span className="text-yellow-400 text-sm">
      {[...Array(full)].map((_, i) => <i key={i} className="fas fa-star"></i>)}
      {half && <i className="fas fa-star-half-alt"></i>}
      {[...Array(5 - full - (half ? 1 : 0))].map((_, i) => <i key={i} className="far fa-star"></i>)}
    </span>
  )
}

function MatchBadge({ score }) {
  if (!score) return null
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#6EC1E4' : '#F9CADA'
  const textColor = score >= 60 ? 'white' : '#c06080'
  return (
    <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: color, color: textColor }}>
      <i className="fas fa-robot" style={{ fontSize: '9px' }}></i> {score}% match
    </span>
  )
}

export default function Search() {
  const [babysitters, setBabysitters] = useState([])
  const [loading, setLoading] = useState(false)
  const [aiMode, setAiMode] = useState(false)
  const [filters, setFilters] = useState({ location: '', maxRate: '', minRating: '', verifiedOnly: false, sortBy: 'rating' })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState('map')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const fetchBabysitters = async (p = 1, useAI = aiMode) => {
    setLoading(true)
    try {
      if (useAI) {
        const { data } = await api.post('/ai/match', {
          location: filters.location || undefined,
          maxRate: filters.maxRate ? parseInt(filters.maxRate) : undefined,
          minRating: filters.minRating ? parseFloat(filters.minRating) : undefined,
          limit: 9
        })
        setBabysitters(data.babysitters)
        setTotalPages(1)
        setPage(1)
      } else {
        const params = { page: p, limit: 9, ...filters }
        if (filters.verifiedOnly) params.verifiedOnly = 'true'
        const { data } = await api.get('/babysitters', { params })
        setBabysitters(data.babysitters)
        setTotalPages(data.pages)
        setPage(p)
      }
    } catch {
      toast.error('Failed to load babysitters')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBabysitters() }, [])

  const handleSearch = e => { e.preventDefault(); fetchBabysitters(1); setFiltersOpen(false) }

  const toggleAI = () => {
    const next = !aiMode
    setAiMode(next)
    fetchBabysitters(1, next)
  }

  const handleNearbySearch = (nearbySitters) => {
    setBabysitters(nearbySitters)
    setTotalPages(1)
    setPage(1)
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to right, rgba(110,193,228,0.12) 0%, rgba(255,255,255,1) 50%, rgba(249,202,218,0.15) 100%)' }}>
      <Navbar />

      {/* ── Compact Search Header ── */}
      <div className="pt-20 pb-6 px-4" style={{ background: 'linear-gradient(135deg, rgba(110,193,228,0.18) 0%, rgba(249,202,218,0.15) 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: '#3a8fb5' }}>Find a Babysitter</h1>
              <p className="text-sm mt-0.5" style={{ color: '#6EC1E4' }}>Verified, trusted care near you</p>
            </div>
          </div>

          {/* Quick search bar */}
          <form onSubmit={handleSearch}>
            <div className="flex gap-2 items-center bg-white rounded-2xl px-4 py-3 shadow-xl">
              <i className="fas fa-map-marker-alt text-[#6EC1E4] text-base"></i>
              <input
                type="text"
                placeholder="Search by city or area..."
                value={filters.location}
                onChange={e => setFilters({ ...filters, location: e.target.value })}
                className="flex-1 outline-none text-gray-700 placeholder-gray-400 text-sm bg-transparent"
              />
              <button
                type="button"
                onClick={() => setFiltersOpen(o => !o)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition border ${filtersOpen ? 'bg-[#6EC1E4]/10 border-[#6EC1E4] text-[#6EC1E4]' : 'border-gray-200 text-gray-500 hover:border-[#6EC1E4] hover:text-[#6EC1E4]'}`}
              >
                <i className="fas fa-sliders-h"></i> Filters
                {(filters.maxRate || filters.minRating || filters.verifiedOnly) && (
                  <span className="w-1.5 h-1.5 bg-[#6EC1E4] rounded-full"></span>
                )}
              </button>
              <button type="submit" className="gradient-bg text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-sm flex items-center gap-1.5">
                <i className="fas fa-search"></i> Search
              </button>
            </div>

            {/* Expandable filters */}
            {filtersOpen && (
              <div className="bg-white rounded-2xl mt-2 px-5 py-4 shadow-xl flex flex-wrap gap-4 items-end">
                <div className="min-w-[130px]">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Max Rate (₹/hr)</label>
                  <input
                    type="number" placeholder="e.g. 500"
                    value={filters.maxRate}
                    onChange={e => setFilters({ ...filters, maxRate: e.target.value })}
                    className="w-full border-b-2 border-gray-200 py-1.5 mt-1 focus:border-[#6EC1E4] outline-none transition bg-transparent text-sm"
                  />
                </div>
                <div className="min-w-[130px]">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Min Rating</label>
                  <select
                    value={filters.minRating}
                    onChange={e => setFilters({ ...filters, minRating: e.target.value })}
                    className="w-full border-b-2 border-gray-200 py-1.5 mt-1 focus:border-[#6EC1E4] outline-none transition bg-transparent text-sm"
                  >
                    <option value="">Any</option>
                    {[3, 3.5, 4, 4.5].map(r => <option key={r} value={r}>{r}+</option>)}
                  </select>
                </div>
                <div className="min-w-[130px]">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={e => setFilters({ ...filters, sortBy: e.target.value })}
                    className="w-full border-b-2 border-gray-200 py-1.5 mt-1 focus:border-[#6EC1E4] outline-none transition bg-transparent text-sm"
                  >
                    <option value="rating">Top Rated</option>
                    <option value="price-low">Price: Low → High</option>
                    <option value="price-high">Price: High → Low</option>
                    <option value="experience">Experience</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer pb-1.5">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={e => setFilters({ ...filters, verifiedOnly: e.target.checked })}
                    className="w-4 h-4 accent-[#6EC1E4]"
                  />
                  Verified Only
                </label>
                <button type="submit" className="gradient-bg text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-sm ml-auto">
                  Apply Filters
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-gray-500 text-sm">
            {loading ? 'Searching...' : <><span className="font-semibold text-gray-700">{babysitters.length}</span> babysitters found</>}
          </p>
          {aiMode && <span className="text-xs bg-gradient-to-r from-[#6EC1E4] to-[#F9CADA] text-white px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><i className="fas fa-robot"></i> AI Ranked</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* AI Match toggle */}
          <button
            onClick={toggleAI}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition ${
              aiMode ? 'gradient-bg text-white border-transparent shadow-md' : 'border-[#6EC1E4] text-[#6EC1E4] hover:bg-[#6EC1E4]/10'
            }`}
          >
            <i className="fas fa-robot"></i>
            {aiMode ? 'AI On' : 'AI Match'}
          </button>
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${viewMode === 'map' ? 'gradient-bg text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <i className="fas fa-map-marked-alt"></i> Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${viewMode === 'list' ? 'gradient-bg text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <i className="fas fa-th-large"></i> List
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 pb-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6EC1E4]"></div>
          </div>
        ) : babysitters.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-lg font-semibold text-gray-600">No babysitters found</p>
            <p className="text-sm mt-1">Try adjusting your filters or a different location</p>
          </div>
        ) : viewMode === 'map' ? (
          /* ── MAP + SIDEBAR LAYOUT ── */
          <div className="flex gap-4" style={{ height: '72vh' }}>
            {/* Sidebar list */}
            <div className="w-80 flex-shrink-0 overflow-y-auto space-y-3 pr-1">
              {babysitters.map(sitter => (
                <div key={sitter._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-[#6EC1E4]/40 transition cursor-pointer group">
                  <div className="flex gap-3 p-3">
                    <div className="relative flex-shrink-0">
                      {sitter.photo ? (
                        <img src={sitter.photo} alt={sitter.name} className="w-14 h-14 rounded-xl object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-xl">{sitter.name?.charAt(0) || '?'}</div>
                      )}
                      {sitter.verified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                          <i className="fas fa-check text-white" style={{ fontSize: '8px' }}></i>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{sitter.name}</p>
                      <p className="text-xs text-gray-400 truncate"><i className="fas fa-map-marker-alt mr-1 text-[#6EC1E4]"></i>{sitter.location}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Stars rating={sitter.rating || 0} />
                        <span className="text-xs text-gray-400">({sitter.reviewCount || 0})</span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[#6EC1E4] font-bold text-sm">₹{sitter.hourlyRate}<span className="text-gray-400 text-xs font-normal">/hr</span></span>
                        <div className="flex flex-col items-end gap-1">
                          {aiMode && <MatchBadge score={sitter.matchScore} />}
                          <div className="flex gap-1.5">
                          {user && (
                            <button
                              onClick={() => navigate(`/chat/${sitter._id}`)}
                              className="w-7 h-7 rounded-lg border border-[#6EC1E4] text-[#6EC1E4] flex items-center justify-center hover:bg-[#6EC1E4]/10 transition text-xs"
                            >
                              <i className="fas fa-comment-dots"></i>
                            </button>
                          )}
                          <Link
                            to={`/profile/${sitter._id}`}
                            className="gradient-bg text-white px-2.5 py-1 rounded-lg text-xs font-semibold hover:opacity-90 transition"
                          >
                            View
                          </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {(sitter.skills || []).length > 0 && (
                    <div className="px-3 pb-2.5 flex flex-wrap gap-1">
                      {sitter.skills.slice(0, 3).map(s => (
                        <span key={s} className="text-xs bg-[#6EC1E4]/10 text-[#6EC1E4] px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Map */}
            <MapErrorBoundary>
              <div className="flex-1 rounded-2xl overflow-hidden shadow-lg">
                <MapView babysitters={babysitters} onNearbySearch={handleNearbySearch} fullHeight />
              </div>
            </MapErrorBoundary>
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {babysitters.map(sitter => (
                <div key={sitter._id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 card-hover">
                  <div className="relative">
                    <img
                      src={sitter.photo || `https://i.pravatar.cc/400?u=${sitter._id}`}
                      alt={sitter.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                    {sitter.verified && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <i className="fas fa-check-circle"></i> Verified
                      </div>
                    )}
                    {aiMode && sitter.matchScore && (
                      <div className="absolute top-3 left-3">
                        <MatchBadge score={sitter.matchScore} />
                      </div>
                    )}
                    <button
                      onClick={() => setViewMode('map')}
                      className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-[#6EC1E4] px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 hover:bg-white transition shadow-sm"
                    >
                      <i className="fas fa-map-marker-alt"></i> Map
                    </button>
                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm">
                      ₹{sitter.hourlyRate}/hr
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{sitter.name}</h3>
                        <p className="text-gray-400 text-xs mt-0.5"><i className="fas fa-map-marker-alt mr-1 text-[#6EC1E4]"></i>{sitter.location}</p>
                      </div>
                      <div className="text-right">
                        <Stars rating={sitter.rating || 0} />
                        <p className="text-gray-400 text-xs mt-0.5">{sitter.rating} · {sitter.reviewCount} reviews</p>
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mb-3 line-clamp-2 nunito">{sitter.bio || 'Experienced and caring babysitter.'}</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {(sitter.skills || []).slice(0, 3).map(s => (
                        <span key={s} className="text-xs bg-[#6EC1E4]/10 text-[#6EC1E4] px-2 py-0.5 rounded-full font-medium">{s}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      {user && (
                        <button
                          onClick={() => navigate(`/chat/${sitter._id}`)}
                          className="border-2 border-[#6EC1E4] text-[#6EC1E4] px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[#6EC1E4]/10 transition"
                          title="Send Message"
                        >
                          <i className="fas fa-comment-dots"></i>
                        </button>
                      )}
                      <Link
                        to={`/profile/${sitter._id}`}
                        className="flex-1 gradient-bg text-white text-center py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button
                  onClick={() => fetchBabysitters(page - 1)}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-xl font-semibold transition bg-white text-gray-600 hover:bg-[#6EC1E4]/10 disabled:opacity-30 border border-gray-200"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => fetchBabysitters(p)}
                    className={`w-10 h-10 rounded-xl font-semibold transition border ${p === page ? 'gradient-bg text-white border-transparent' : 'bg-white text-gray-600 hover:bg-[#6EC1E4]/10 border-gray-200'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => fetchBabysitters(page + 1)}
                  disabled={page === totalPages}
                  className="w-10 h-10 rounded-xl font-semibold transition bg-white text-gray-600 hover:bg-[#6EC1E4]/10 disabled:opacity-30 border border-gray-200"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
