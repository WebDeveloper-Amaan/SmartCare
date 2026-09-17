/**
 * SmartCare AI Matching Engine
 * backend/ai/matchEngine.js
 *
 * Scores babysitters against parent requirements across 8 dimensions.
 * Returns a score (0-100), per-dimension breakdown, and raw data
 * for Gemini to generate a personalised explanation.
 */

// ─── Weight config (must sum to 100) ───────────────────────────────────────
const WEIGHTS = {
  budget:       20,   // hourly rate vs parent's max budget
  rating:       20,   // sitter's rating & review count
  experience:   15,   // years of experience
  skills:       15,   // skill overlap with parent needs
  ageGroup:     10,   // child age group match
  availability: 10,   // day overlap
  languages:     5,   // language match
  verified:      5,   // KYC verified bonus
}

// ─── Individual dimension scorers (each returns 0-1) ───────────────────────

function scoreBudget(sitter, prefs) {
  if (!prefs.maxBudget) return 0.7 // neutral if not specified
  const rate = sitter.hourlyRate || 0
  if (rate > prefs.maxBudget) return 0
  // Closer to budget ceiling = better value signal
  return 0.5 + 0.5 * (rate / prefs.maxBudget)
}

function scoreRating(sitter) {
  const r = sitter.rating || 0
  const reviews = sitter.reviewCount || 0
  // Confidence weight: more reviews = more reliable rating
  const confidence = Math.min(reviews / 10, 1)
  return (r / 5) * (0.6 + 0.4 * confidence)
}

function scoreExperience(sitter, prefs) {
  const exp = sitter.experience || 0
  const minExp = prefs.minExperience || 0
  if (exp < minExp) return Math.max(0, exp / minExp * 0.5)
  return Math.min(exp / 8, 1) // 8+ years = full score
}

function scoreSkills(sitter, prefs) {
  const needed = prefs.requiredSkills?.length ? prefs.requiredSkills
    : prefs.skills?.length ? prefs.skills : null
  if (!needed) return 0.6
  if (!sitter.skills?.length) return 0
  const matched = needed.filter(need =>
    sitter.skills.some(s => s.toLowerCase().includes(need.toLowerCase()))
  ).length
  return matched / needed.length
}

function scoreAgeGroup(sitter, prefs) {
  if (!prefs.childAgeGroup) return 0.6
  if (!sitter.ageGroups?.length) return 0.3
  const match = sitter.ageGroups.some(ag =>
    ag.toLowerCase().includes(prefs.childAgeGroup.toLowerCase()) ||
    prefs.childAgeGroup.toLowerCase().includes(ag.split('(')[0].trim().toLowerCase())
  )
  return match ? 1 : 0.1
}

function scoreAvailability(sitter, prefs) {
  if (!prefs.requiredDays?.length) return 0.6
  if (!sitter.availability?.length) return 0.3
  const matched = prefs.requiredDays.filter(d =>
    sitter.availability.includes(d)
  ).length
  return matched / prefs.requiredDays.length
}

function scoreLanguages(sitter, prefs) {
  if (!prefs.preferredLanguages?.length) return 0.7
  if (!sitter.languages?.length) return 0.4
  const matched = prefs.preferredLanguages.filter(l =>
    sitter.languages.some(sl => sl.toLowerCase().includes(l.toLowerCase()))
  ).length
  return matched > 0 ? Math.min(matched / prefs.preferredLanguages.length, 1) : 0.2
}

function scoreVerified(sitter) {
  return sitter.verified ? 1 : 0
}

// ─── Main scorer ────────────────────────────────────────────────────────────

function scoreSitter(sitter, parentPrefs) {
  const dimensions = {
    budget:       scoreBudget(sitter, parentPrefs),
    rating:       scoreRating(sitter),
    experience:   scoreExperience(sitter, parentPrefs),
    skills:       scoreSkills(sitter, parentPrefs),
    ageGroup:     scoreAgeGroup(sitter, parentPrefs),
    availability: scoreAvailability(sitter, parentPrefs),
    languages:    scoreLanguages(sitter, parentPrefs),
    verified:     scoreVerified(sitter),
  }

  // Weighted total
  let total = 0
  for (const [key, raw] of Object.entries(dimensions)) {
    total += raw * WEIGHTS[key]
  }
  const finalScore = Math.round(Math.min(total, 100))

  // Human-readable breakdown (percentage per dimension)
  const breakdown = {}
  for (const [key, raw] of Object.entries(dimensions)) {
    breakdown[key] = {
      score: Math.round(raw * 100),
      weight: WEIGHTS[key],
      contribution: Math.round(raw * WEIGHTS[key])
    }
  }

  // Reliability score = rating + verified + experience combined
  const reliability = Math.round(
    (dimensions.rating * 0.5 + dimensions.verified * 0.3 + dimensions.experience * 0.2) * 100
  )

  // Strengths & gaps for Gemini prompt
  const strengths = Object.entries(dimensions)
    .filter(([, v]) => v >= 0.8)
    .map(([k]) => k)

  const gaps = Object.entries(dimensions)
    .filter(([, v]) => v < 0.4)
    .map(([k]) => k)

  return { finalScore, breakdown, reliability, strengths, gaps }
}

module.exports = { scoreSitter, WEIGHTS }
