/**
 * SmartCare AI Explanation Generator v2
 * Uses Gemini 1.5 Flash to generate warm, specific match explanations.
 */

let geminiModel = null

function getModel() {
  if (!geminiModel) {
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' })
  }
  return geminiModel
}

async function explainSitterMatch(sitter, parentPrefs, scoreData) {
  const hasKey = process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'

  if (!hasKey) return generateFallbackExplanation(sitter, parentPrefs, scoreData)

  const firstName = sitter.name.split(' ')[0]
  const prompt = [
    'You are SmartCare AI, helping Indian parents find trusted babysitters.',
    'Write exactly 2 warm, confident sentences (max 55 words total) explaining why this sitter fits this parent.',
    '',
    'PARENT NEEDS:',
    'Budget: Rs.' + (parentPrefs.maxBudget || 'flexible') + '/hr',
    'Child age: ' + (parentPrefs.childAgeGroup || 'any'),
    'Skills needed: ' + (parentPrefs.requiredSkills?.join(', ') || 'general care'),
    'Days: ' + (parentPrefs.requiredDays?.join(', ') || 'flexible'),
    'Languages: ' + (parentPrefs.preferredLanguages?.join(', ') || 'any'),
    'Special needs: ' + (parentPrefs.specialNeeds ? 'yes' : 'no'),
    '',
    'SITTER PROFILE:',
    'Name: ' + sitter.name,
    'Rate: Rs.' + sitter.hourlyRate + '/hr',
    'Experience: ' + sitter.experience + ' years',
    'Rating: ' + sitter.rating + '/5 (' + sitter.reviewCount + ' reviews)',
    'Skills: ' + (sitter.skills?.join(', ') || 'general'),
    'Age groups: ' + (sitter.ageGroups?.join(', ') || 'general'),
    'KYC verified: ' + (sitter.verified ? 'yes' : 'no'),
    'Languages: ' + (sitter.languages?.join(', ') || 'not listed'),
    '',
    'MATCH DATA:',
    'Score: ' + scoreData.finalScore + '/100',
    'Reliability: ' + scoreData.reliability + '/100',
    'Strengths: ' + (scoreData.strengths.join(', ') || 'general fit'),
    'Gaps: ' + (scoreData.gaps.join(', ') || 'none'),
    '',
    'RULES:',
    '- Start with ' + firstName + ' by name',
    '- Cite real numbers (rate, rating, experience)',
    '- Mention top strength first',
    '- If gaps exist, note gently in sentence 2',
    '- No bullet points, no "This babysitter"',
    '- Sound human and warm, not robotic'
  ].join('\n')

  try {
    const result = await getModel().generateContent(prompt)
    return result.response.text().trim()
  } catch {
    return generateFallbackExplanation(sitter, parentPrefs, scoreData)
  }
}

async function explainTopMatches(sitters, parentPrefs, scoreMap) {
  const top = sitters.slice(0, 5)
  const rest = sitters.slice(5)

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

function generateFallbackExplanation(sitter, parentPrefs, scoreData) {
  const parts = []
  const firstName = sitter.name.split(' ')[0]

  if (scoreData.finalScore >= 85) {
    parts.push(firstName + ' is an excellent match for your family')
  } else if (scoreData.finalScore >= 65) {
    parts.push(firstName + ' is a strong fit for your needs')
  } else {
    parts.push(firstName + ' could be a good option for your requirements')
  }

  if (sitter.rating >= 4.5) {
    parts.push('with an outstanding ' + sitter.rating + '/5 rating from ' + sitter.reviewCount + ' parents')
  } else if (sitter.rating >= 4) {
    parts.push('with a solid ' + sitter.rating + '/5 rating')
  }

  if (sitter.verified) parts.push('and is KYC-verified for your peace of mind')

  if (parentPrefs.maxBudget && sitter.hourlyRate <= parentPrefs.maxBudget) {
    parts.push('At Rs.' + sitter.hourlyRate + '/hr they fit within your Rs.' + parentPrefs.maxBudget + '/hr budget')
  }

  if (scoreData.strengths.includes('skills') && sitter.skills?.length) {
    parts.push('Their skills in ' + sitter.skills.slice(0, 2).join(' and ') + ' align well with what you need')
  }

  if (scoreData.gaps.length > 0) {
    const gapLabels = { availability: 'availability', languages: 'language preference', ageGroup: 'age group experience', budget: 'budget' }
    const gapText = scoreData.gaps.map(g => gapLabels[g] || g).join(' and ')
    parts.push('Note: there may be a partial mismatch on ' + gapText)
  }

  return parts.join('. ') + '.'
}

module.exports = { explainTopMatches, explainSitterMatch }
