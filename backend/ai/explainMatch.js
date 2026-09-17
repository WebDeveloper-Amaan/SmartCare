/**
 * SmartCare AI Explanation Generator
 * backend/ai/explainMatch.js
 *
 * Uses Gemini to generate a unique, personalised explanation
 * for why a babysitter is (or isn't) a good match for a parent.
 */

let geminiModel = null

function getModel() {
  if (!geminiModel) {
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })
  }
  return geminiModel
}

/**
 * Generate a personalised explanation for a single sitter match.
 * Returns a plain string (2-3 sentences max).
 */
async function explainSitterMatch(sitter, parentPrefs, scoreData) {
  const hasKey = process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'

  if (!hasKey) return generateFallbackExplanation(sitter, parentPrefs, scoreData)

  const prompt = `You are SmartCare's AI matching engine. Write a SHORT (2-3 sentences, max 60 words), warm, specific explanation for why this babysitter matches this parent's needs.

Parent needs:
- Budget: ₹${parentPrefs.maxBudget || 'flexible'}/hr
- Child age: ${parentPrefs.childAgeGroup || 'not specified'}
- Required skills: ${parentPrefs.requiredSkills?.join(', ') || 'none specified'}
- Available days: ${parentPrefs.requiredDays?.join(', ') || 'flexible'}
- Languages: ${parentPrefs.preferredLanguages?.join(', ') || 'any'}
- Min experience: ${parentPrefs.minExperience || 0} years

Babysitter profile:
- Name: ${sitter.name}
- Rating: ${sitter.rating}/5 (${sitter.reviewCount} reviews)
- Experience: ${sitter.experience} years
- Hourly rate: ₹${sitter.hourlyRate}/hr
- Skills: ${sitter.skills?.join(', ') || 'not listed'}
- Age groups: ${sitter.ageGroups?.join(', ') || 'not listed'}
- Verified: ${sitter.verified ? 'Yes (KYC verified)' : 'No'}
- Languages: ${sitter.languages?.join(', ') || 'not listed'}

Match score: ${scoreData.finalScore}/100
Reliability score: ${scoreData.reliability}/100
Strengths: ${scoreData.strengths.join(', ') || 'general fit'}
Gaps: ${scoreData.gaps.join(', ') || 'none'}

Rules:
- Be specific, mention actual numbers/facts from the profile
- Start with the strongest reason this sitter fits
- If there are gaps, mention them gently at the end
- Do NOT use bullet points, just flowing sentences
- Do NOT start with "This babysitter" — use their name`

  try {
    const result = await getModel().generateContent(prompt)
    return result.response.text().trim()
  } catch {
    return generateFallbackExplanation(sitter, parentPrefs, scoreData)
  }
}

/**
 * Generate explanations for top N sitters in parallel (with rate limit protection).
 * Only generates for top 5 to stay within free tier limits.
 */
async function explainTopMatches(sitters, parentPrefs, scoreMap) {
  const top = sitters.slice(0, 5)
  const rest = sitters.slice(5)

  // Parallel for top 5, fallback for rest
  const topExplained = await Promise.all(
    top.map(s => explainSitterMatch(s, parentPrefs, scoreMap[s._id]))
  )

  const allExplanations = {}
  top.forEach((s, i) => { allExplanations[s._id] = topExplained[i] })
  rest.forEach(s => {
    allExplanations[s._id] = generateFallbackExplanation(s, parentPrefs, scoreMap[s._id])
  })

  return allExplanations
}

// ─── Fallback when no Gemini key ────────────────────────────────────────────

function generateFallbackExplanation(sitter, parentPrefs, scoreData) {
  const parts = []

  // Lead with strongest signal
  if (scoreData.finalScore >= 85) {
    parts.push(`${sitter.name} is an excellent match for your needs`)
  } else if (scoreData.finalScore >= 65) {
    parts.push(`${sitter.name} is a strong match for your family`)
  } else {
    parts.push(`${sitter.name} could work for your requirements`)
  }

  // Specific facts
  if (sitter.rating >= 4.5) parts.push(`with an outstanding ${sitter.rating}/5 rating from ${sitter.reviewCount} parents`)
  else if (sitter.rating >= 4) parts.push(`with a solid ${sitter.rating}/5 rating`)

  if (sitter.verified) parts.push(`and is KYC-verified for your peace of mind`)

  if (parentPrefs.maxBudget && sitter.hourlyRate <= parentPrefs.maxBudget) {
    parts.push(`At ₹${sitter.hourlyRate}/hr, they fit comfortably within your ₹${parentPrefs.maxBudget}/hr budget`)
  }

  if (scoreData.strengths.includes('skills') && sitter.skills?.length) {
    parts.push(`Their skills in ${sitter.skills.slice(0, 2).join(' and ')} align well with what you need`)
  }

  if (scoreData.gaps.length > 0) {
    const gapLabels = { availability: 'availability', languages: 'language preference', ageGroup: 'age group experience' }
    const gapText = scoreData.gaps.map(g => gapLabels[g] || g).join(' and ')
    parts.push(`Note: there may be a partial mismatch on ${gapText}`)
  }

  return parts.join('. ') + '.'
}

module.exports = { explainTopMatches, explainSitterMatch }
