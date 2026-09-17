/**
 * Review Routes
 * Handles babysitter reviews and ratings
 */
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { protect } = require('../middleware/auth');

// ============================================
// @route   POST /api/reviews
// @desc    Add a review
// @access  Private
// ============================================
router.post('/', protect, async (req, res) => {
    try {
        const { babysitterId, bookingId, rating, comment } = req.body;

        // Check if booking exists and is completed
        const booking = await Booking.findById(bookingId);
        if (!booking || booking.status !== 'completed') {
            return res.status(400).json({ error: 'Can only review completed bookings' });
        }

        // Check if already reviewed
        const existingReview = await Review.findOne({ booking: bookingId, reviewer: req.user.id });
        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this booking' });
        }

        // Create review
        const review = await Review.create({
            babysitter: babysitterId,
            reviewer: req.user.id,
            booking: bookingId,
            rating,
            comment
        });

        // Update babysitter rating
        await updateBabysitterRating(babysitterId);

        res.status(201).json({ success: true, review });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ error: 'Failed to add review' });
    }
});

// ============================================
// @route   GET /api/reviews/:userId
// @desc    Get reviews for a user
// @access  Public
// ============================================
router.get('/:userId', async (req, res) => {
    try {
        const reviews = await Review.find({ babysitter: req.params.userId })
            .populate('reviewer', 'name photo')
            .sort({ createdAt: -1 });

        res.json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Helper function to update babysitter rating
async function updateBabysitterRating(babysitterId) {
    const reviews = await Review.find({ babysitter: babysitterId });
    if (reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await User.findByIdAndUpdate(babysitterId, {
            rating: Math.round(avgRating * 10) / 10,
            reviewCount: reviews.length
        });
    }
}

module.exports = router;
