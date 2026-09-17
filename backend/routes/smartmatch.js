/**
 * Smart Match Routes — SmartCare
 * backend/routes/smartmatch.js
 *
 * POST /api/smartmatch/preferences   — save/update parent preferences
 * GET  /api/smartmatch/preferences   — get saved preferences
 * POST /api/smartmatch/run           — run full AI match + get explanations
 */
const express = require('express')
const router = express.Router()
const User = require('../models/User')
const ParentPreference = require('../models/ParentPreference')
const { protect } = require('../middleware/auth')
const { scoreSitter } = require('../ai/matchEngine')
const { explainTopMatches } = require('../ai/explainMatch')

// ── Save / update parent preferences ────────────────────────────────────────
// @route  POST /api/smartmatch/preferences
// @access Private (parents)
router.post('/preferences', protect, async (req, res) => {
  try {
    const {
      childAgeGroup, numberOfChildren, maxBudget, minExperience,
      requiredSkills, requiredDays, preferredLanguages,
      specialNeeds, specialNeedsDetails, additionalNotes
    } = req.body

    const prefs = await ParentPreference.findOneAndUpdate(
      { parent: req.user._id },
      {
        parent: req.user._id,
        childAgeGroup, numberOfChildren, maxBudget, minExperience,
        requiredSkills, requiredDays, preferredLanguages,
        specialNeeds, specialNeedsDetails, additionalNotes
      },
      { upsert: true, new: true, runValidators: true }
    )

    res.json({ success: true, preferences: prefs })
  } catch (err) {
    console.error('Save preferences error:', err)
    res.status(500).json({ error: 'Failed to save preferences' })
  }
})

// ── Get saved preferences ────────────────────────────────────────────────────
// @route  GET /api/smartmatch/preferences
// @access Private
router.get('/preferences', protect, async (req, res) => {
  try {
    const prefs = await ParentPreference.findOne({ parent: req.user._id })
    res.json({ success: true, preferences: prefs || null })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch preferences' })
  }
})

// ── Run AI Smart Match ───────────────────────────────────────────────────────
// @route  POST /api/smartmatch/run
// @access Public (guests can run with inline prefs, logged-in users can use saved)
router.post('/run', async (req, res) => {
  try {
    // Accept inline prefs OR load saved ones for logged-in users
    let parentPrefs = req.body.preferences || {}

    // If user is logged in and no inline prefs, load saved
    if (!Object.keys(parentPrefs).length && req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken')
        const token = req.headers.authorization.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const saved = await ParentPreference.findOne({ parent: decoded.id })
        if (saved) parentPrefs = saved.toObject()
      } catch { /* guest — use empty prefs */ }
    }

    // Build DB query from prefs
    const query = { role: 'babysitter', isActive: true, isBlocked: false, verified: true }
    if (parentPrefs.maxBudget) query.hourlyRate = { $lte: parseInt(parentPrefs.maxBudget) }
    if (parentPrefs.minExperience) query.experience = { $gte: parseInt(parentPrefs.minExperience) }

    const allSitters = await User.find(query)
      .select('-password -otp -otpExpire -kycData -resetPasswordToken')
      .limit(100)

    // ── No results handling ──────────────────────────────────────────────────
    if (allSitters.length === 0) {
      return res.json({
        success: true,
        noResults: true,
        message: "We couldn't find babysitters matching your exact requirements in your area right now.",
        suggestions: buildSuggestions(parentPrefs),
        babysitters: []
      })
    }

    // ── Score every sitter ───────────────────────────────────────────────────
    const scoreMap = {}
    const scored = allSitters.map(sitter => {
      const scoreData = scoreSitter(sitter, parentPrefs)
      scoreMap[sitter._id] = scoreData
      return { ...sitter.toObject(), ...scoreData }
    })

    // Sort by finalScore descending
    scored.sort((a, b) => b.finalScore - a.finalScore)

    // Filter out very poor matches (< 20%) unless we'd have no results
    const goodMatches = scored.filter(s => s.finalScore >= 20)
    const finalList = goodMatches.length >= 3 ? goodMatches : scored
    const top10 = finalList.slice(0, 10)

    // ── Generate AI explanations ─────────────────────────────────────────────
    const explanations = await explainTopMatches(
      top10.map(s => allSitters.find(a => a._id.toString() === s._id.toString())),
      parentPrefs,
      scoreMap
    )

    // Attach explanations to results
    const results = top10.map(s => ({
      ...s,
      aiExplanation: explanations[s._id] || '',
      matchLabel: getMatchLabel(s.finalScore)
    }))

    res.json({
      success: true,
      noResults: false,
      totalScored: allSitters.length,
      preferences: parentPrefs,
      babysitters: results
    })
  } catch (err) {
    console.error('Smart match error:', err)
    res.status(500).json({ error: 'Smart match failed. Please try again.' })
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMatchLabel(score) {
  if (score >= 85) return { text: 'Excellent Match', color: '#22c55e' }
  if (score >= 70) return { text: 'Great Match', color: '#6EC1E4' }
  if (score >= 55) return { text: 'Good Match', color: '#f59e0b' }
  return { text: 'Partial Match', color: '#F9CADA' }
}

function buildSuggestions(prefs) {
  const tips = []
  if (prefs.maxBudget && prefs.maxBudget < 300)
    tips.push('Try increasing your budget to ₹300-400/hr to see more options')
  if (prefs.minExperience > 3)
    tips.push('Lowering the minimum experience requirement may reveal more sitters')
  if (prefs.requiredDays?.length > 4)
    tips.push('Reducing required days may help find available sitters')
  if (!tips.length)
    tips.push('We are actively onboarding babysitters in your area — check back soon!')
  tips.push('You can also post your requirement and let sitters reach out to you')
  return tips
}

module.exports = router
