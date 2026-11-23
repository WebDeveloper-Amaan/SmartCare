/**
 * SmartCare AI Matching Engine v2
 * 9-dimension weighted scorer (0-100) + strengths/gaps/reliability
 */

const WEIGHTS = {
  budget:       18,
  rating:       18,
  experience:   14,
  skills:       15,
  ageGroup:     10,
  availability: 10,
  languages:     5,
  verified:      5,
  specialNeeds:  5,
}

function scoreBudget(sitter, prefs) {
  if (!prefs.maxBudget) return 0.7
  const rate = sitter.hourlyRate || 0
  if (rate > prefs.maxBudget) return 0
  return 0.5 + 0.5 * (rate / prefs.maxBudget)
}

function scoreRating(sitter) {
  const r = sitter.rating || 0
  const reviews = sitter.reviewCount || 0
  const confidence = Math.min(reviews / 10, 1)
  return (r / 5) * (0.6 + 0.4 * confidence)
}

function scoreExperience(sitter, prefs) {
  const exp = sitter.experience || 0
  const minExp = prefs.minExperience || 0
  if (exp < minExp) return Math.max(0, exp / Math.max(minExp, 1) * 0.5)
  return Math.min(exp / 8, 1)
}

function scoreSkills(sitter, prefs) {
  const needed = prefs.requiredSkills?.length ? prefs.requiredSkills : null
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
  const matched = prefs.requiredDays.filter(d => sitter.availability.includes(d)).length
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

function scoreSpecialNeeds(sitter, prefs) {
  if (!prefs.specialNeeds) return 0.7 // not needed — neutral
  // If parent needs special needs care, check skills
  const hasSkill = sitter.skills?.some(s =>
    s.toLowerCase().includes('special') || s.toLowerCase().includes('disability')
  )
  return hasSkill ? 1 : 0.2
}

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
    specialNeeds: scoreSpecialNeeds(sitter, parentPrefs),
  }

  let total = 0
  for (const [key, raw] of Object.entries(dimensions)) {
    total += raw * WEIGHTS[key]
  }
  const finalScore = Math.round(Math.min(total, 100))

  const breakdown = {}
  for (const [key, raw] of Object.entries(dimensions)) {
    breakdown[key] = {
      score: Math.round(raw * 100),
      weight: WEIGHTS[key],
      contribution: Math.round(raw * WEIGHTS[key])
    }
  }

  const reliability = Math.round(
    (dimensions.rating * 0.5 + dimensions.verified * 0.3 + dimensions.experience * 0.2) * 100
  )

  const strengths = Object.entries(dimensions).filter(([, v]) => v >= 0.8).map(([k]) => k)
  const gaps = Object.entries(dimensions).filter(([, v]) => v < 0.4).map(([k]) => k)

  return { finalScore, breakdown, reliability, strengths, gaps }
}

module.exports = { scoreSitter, WEIGHTS }
