/**
 * AI Routes — SmartCare
 * 1. POST /api/ai/match      — Score & rank babysitters for a parent
 * 2. POST /api/ai/chat       — Conversational chatbot (OpenAI)
 */
const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { protect } = require('../middleware/auth')

// ── Lazy-init Gemini — recreate if key changes ──
let geminiModel = null
function getGemini() {
  if (!geminiModel) {
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })
  }
  return geminiModel
}

// ─────────────────────────────────────────────
// AI MATCHING SCORE  (no OpenAI needed)
// Scores each babysitter 0-100 based on parent prefs
// ─────────────────────────────────────────────
function scoreSitter(sitter, prefs) {
  let score = 0

  // Rating (0-25 pts)
  score += ((sitter.rating || 0) / 5) * 25

  // Review count — popularity (0-15 pts)
  score += Math.min((sitter.reviewCount || 0) / 20, 1) * 15

  // Budget match (0-20 pts) — closer to max budget = higher score
  if (prefs.maxRate) {
    const rate = sitter.hourlyRate || 0
    if (rate <= prefs.maxRate) {
      score += (1 - rate / prefs.maxRate) * 10 + 10 // within budget bonus
    }
  } else {
    score += 10 // neutral if no budget set
  }

  // Verified (0-15 pts)
  if (sitter.verified) score += 15

  // Skills match (0-10 pts)
  if (prefs.skills?.length && sitter.skills?.length) {
    const matched = prefs.skills.filter(s =>
      sitter.skills.some(ss => ss.toLowerCase().includes(s.toLowerCase()))
    ).length
    score += (matched / prefs.skills.length) * 10
  } else {
    score += 5
  }

  // Age group match (0-10 pts)
  if (prefs.ageGroup && sitter.ageGroups?.length) {
    const matches = sitter.ageGroups.some(ag =>
      ag.toLowerCase().includes(prefs.ageGroup.toLowerCase())
    )
    if (matches) score += 10
  } else {
    score += 5
  }

  // Experience (0-5 pts)
  score += Math.min((sitter.experience || 0) / 10, 1) * 5

  return Math.round(Math.min(score, 100))
}

// @route  POST /api/ai/match
// @desc   Return scored + ranked babysitters for a parent
// @access Public
router.post('/match', async (req, res) => {
  try {
    const { maxRate, minRating, skills, ageGroup, location, limit = 10 } = req.body

    const query = { role: 'babysitter', isActive: true, isBlocked: false, verified: true }
    if (location) query.location = { $regex: location, $options: 'i' }
    if (minRating) query.rating = { $gte: parseFloat(minRating) }
    if (maxRate) query.hourlyRate = { $lte: parseInt(maxRate) }

    const sitters = await User.find(query)
      .select('-password -otp -otpExpire -kycData -resetPasswordToken')
      .limit(50)

    const prefs = { maxRate, skills, ageGroup }
    const scored = sitters
      .map(s => ({ ...s.toObject(), matchScore: scoreSitter(s, prefs) }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, parseInt(limit))

    res.json({ success: true, babysitters: scored })
  } catch (err) {
    console.error('AI match error:', err)
    res.status(500).json({ error: 'Matching failed' })
  }
})

// ─────────────────────────────────────────────
// AI CHATBOT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are SmartCare Assistant, a friendly and helpful AI for the SmartCare babysitter platform in India.

You help parents:
- Find the right babysitter based on their needs
- Understand how the platform works
- Answer questions about bookings, payments, safety, and KYC verification
- Give childcare tips and advice

Platform facts:
- Babysitters are KYC-verified with ID checks
- Parents can book, pay securely via Razorpay, and chat with sitters
- Hourly rates typically range from ₹150 to ₹800/hr in Delhi NCR
- Parents can see sitter locations on a live map
- SmartCare uses AI to match parents with the best sitter for their needs

Rules:
- Always be warm, concise, and helpful
- If asked to find a sitter, ask for location, budget, and child's age
- Never make up specific sitter names or contact details
- If unsure, suggest the parent use the Search page or contact support
- Keep responses under 120 words unless a detailed explanation is needed
- Respond in the same language the user writes in (Hindi or English)`

// @route  POST /api/ai/chat
// @access Public (works for guests too, but rate-limited)
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'messages required' })

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('AQ.') || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.json({ reply: getFallbackReply(messages[messages.length - 1]?.content || '') })
    }

    const model = getGemini()

    // Build conversation history for Gemini
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const chat = model.startChat({
      history,
      systemInstruction: SYSTEM_PROMPT
    })

    const lastMsg = messages[messages.length - 1].content
    const result = await chat.sendMessage(lastMsg)
    const reply = result.response.text().trim()

    res.json({ reply })
  } catch (err) {
    console.error('AI chat error:', err.message)
    // Graceful fallback on API error
    res.json({ reply: getFallbackReply(req.body.messages?.slice(-1)[0]?.content || '') })
  }
})

// ── Fallback replies when OpenAI key not set ──
function getFallbackReply(userMsg) {
  const msg = userMsg.toLowerCase()
  if (msg.includes('find') || msg.includes('search') || msg.includes('sitter') || msg.includes('babysitter'))
    return "I'd love to help you find a sitter! 🌟 Head to the **Search** page and use filters for location, budget, and rating. Our AI matching will rank the best sitters for you automatically."
  if (msg.includes('price') || msg.includes('rate') || msg.includes('cost') || msg.includes('₹'))
    return "Babysitter rates on SmartCare range from **₹150 to ₹800/hr** depending on experience and location. You can filter by max hourly rate on the Search page."
  if (msg.includes('safe') || msg.includes('verify') || msg.includes('kyc') || msg.includes('trust'))
    return "All babysitters on SmartCare are **KYC-verified** with government ID checks ✅. You can also see their ratings, reviews, and live location on the map."
  if (msg.includes('book') || msg.includes('booking'))
    return "To book a sitter: go to their profile → click **Book Now** → choose date & time → pay securely via Razorpay. You'll get a confirmation instantly!"
  if (msg.includes('pay') || msg.includes('payment') || msg.includes('razorpay'))
    return "SmartCare uses **Razorpay** for secure payments. You can pay via UPI, card, or net banking. Payments are held safely until the booking is complete."
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('namaste'))
    return "Hello! 👋 I'm the SmartCare AI Assistant. I can help you find the perfect babysitter, answer questions about bookings, or give childcare tips. What do you need help with?"
  if (msg.includes('map') || msg.includes('location') || msg.includes('near'))
    return "Use the **Map view** on the Search page to see babysitters near you in real-time! Green markers show sitters within 10km. Click any marker to see their profile."
  return "I'm here to help! 😊 You can ask me about finding babysitters, pricing, bookings, safety, or how SmartCare works. What would you like to know?"
}

module.exports = router
