/**
 * Review Routes
 */
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { protect } = require('../middleware/auth');

// @route  POST /api/reviews
// @access Private
router.post('/', protect, async (req, res) => {
  try {
    const { babysitterId, bookingId, rating, comment } = req.body;

    if (!babysitterId || !bookingId || !rating || !comment) {
      return res.status(400).json({ error: 'babysitterId, bookingId, rating and comment are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }

    const existing = await Review.findOne({ booking: bookingId, reviewer: req.user.id });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this booking' });
    }

    const reviewer = await User.findById(req.user.id).select('name role');
    const reviewee = await User.findById(babysitterId).select('name');
    if (!reviewee) return res.status(404).json({ error: 'Babysitter not found' });

    const review = await Review.create({
      reviewer: req.user.id,
      reviewerName: reviewer.name,
      reviewerRole: reviewer.role,
      reviewee: babysitterId,
      revieweeName: reviewee.name,
      booking: bookingId,
      rating,
      text: comment,
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// @route  GET /api/reviews/:userId
// @access Public
router.get('/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId, isPublic: true })
      .populate('reviewer', 'name photo')
      .sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

module.exports = router;
