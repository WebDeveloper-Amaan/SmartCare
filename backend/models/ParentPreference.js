/**
 * ParentPreference Model
 * Stores what a parent is looking for in a babysitter
 */
const mongoose = require('mongoose')

const parentPreferenceSchema = new mongoose.Schema({
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  childAgeGroup: {
    type: String,
    enum: ['Infant (0-1)', 'Toddler (1-3)', 'Preschool (3-5)', 'School Age (5+)'],
  },
  numberOfChildren: { type: Number, default: 1, min: 1, max: 10 },
  maxBudget: { type: Number },           // ₹/hr
  minExperience: { type: Number, default: 0 }, // years
  requiredSkills: [String],              // e.g. ['First Aid', 'Homework Help']
  requiredDays: [String],               // e.g. ['Monday', 'Wednesday']
  preferredLanguages: [String],         // e.g. ['Hindi', 'English']
  specialNeeds: { type: Boolean, default: false },
  specialNeedsDetails: String,
  additionalNotes: String,
}, { timestamps: true })

module.exports = mongoose.model('ParentPreference', parentPreferenceSchema)
