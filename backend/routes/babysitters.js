/**
 * Babysitter Routes
 * Handles babysitter listing, search, filtering
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
// ============================================
// @route   GET /api/babysitters
// @desc    Get all babysitters with filters
// @access  Public
// ============================================
// ============================================
// @route   GET /api/babysitters/public-stats
// @desc    Get public platform stats for landing page
// @access  Public
// ============================================
router.get('/public-stats', async (req, res) => {
    try {
        const User = require('../models/User');
        const Review = require('../models/Review');
        const [totalBabysitters, verifiedBabysitters, totalParents, ratingStats] = await Promise.all([
            User.countDocuments({ role: 'babysitter', isActive: true }),
            User.countDocuments({ role: 'babysitter', verified: true, isActive: true }),
            User.countDocuments({ role: 'parent', isActive: true }),
            User.aggregate([
                { $match: { role: 'babysitter', rating: { $gt: 0 } } },
                { $group: { _id: null, avgRating: { $avg: '$rating' } } }
            ])
        ]);
        res.json({
            success: true,
            stats: {
                totalBabysitters,
                verifiedBabysitters,
                totalParents,
                avgRating: ratingStats[0] ? ratingStats[0].avgRating.toFixed(1) : '5.0',
                localities: 15
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { 
            location, 
            minRating, 
            maxRate, 
            minExperience, 
            ageGroup,
            verifiedOnly,
            sortBy,
            page = 1,
            limit = 10
        } = req.query;
        // Build query
        let query = { role: 'babysitter', isActive: true, isBlocked: false, verified: true };
        if (location && location !== 'all') {
            query.location = { $regex: location, $options: 'i' };
        }
        if (minRating) {
            query.rating = { $gte: parseFloat(minRating) };
        }
        if (maxRate) {
            query.hourlyRate = { $lte: parseInt(maxRate) };
        }
        if (minExperience) {
            query.experience = { $gte: parseInt(minExperience) };
        }
        if (ageGroup && ageGroup !== 'all') {
            query.ageGroups = { $in: [new RegExp(ageGroup, 'i')] };
        }
        if (verifiedOnly === 'true') {
            query.verified = true;
        }
        // Sort options
        let sort = {};
        switch (sortBy) {
            case 'rating':
                sort = { rating: -1 };
                break;
            case 'price-low':
                sort = { hourlyRate: 1 };
                break;
            case 'price-high':
                sort = { hourlyRate: -1 };
                break;
            case 'experience':
                sort = { experience: -1 };
                break;
            case 'reviews':
                sort = { reviewCount: -1 };
                break;
            default:
                sort = { rating: -1 };
        }
        // Execute query with pagination
        const babysitters = await User.find(query)
            .select('-password -otp -otpExpire -kycData')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await User.countDocuments(query);
        res.json({
            success: true,
            count: babysitters.length,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            babysitters
        });
    } catch (error) {
        console.error('Get babysitters error:', error);
        res.status(500).json({ error: 'Failed to fetch babysitters' });
    }
});
// ============================================
// @route   GET /api/babysitters/nearby
// @desc    Get babysitters near a location
// @access  Public
// ============================================
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, maxDistance = 10000 } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }
        const babysitters = await User.find({
            role: 'babysitter',
            isActive: true,
            isBlocked: false,
            verified: true,
            coordinates: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(maxDistance)
                }
            }
        }).select('-password -otp -otpExpire -kycData');
        res.json({
            success: true,
            count: babysitters.length,
            babysitters
        });
    } catch (error) {
        console.error('Get nearby babysitters error:', error);
        res.status(500).json({ error: 'Failed to fetch nearby babysitters' });
    }
});
// ============================================
// @route   GET /api/babysitters/:id
// @desc    Get babysitter by ID
// @access  Public
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const babysitter = await User.findOne({
            _id: req.params.id,
            role: 'babysitter'
        }).select('-password -otp -otpExpire -kycData');
        if (!babysitter) {
            return res.status(404).json({ error: 'Babysitter not found' });
        }
        res.json({ success: true, babysitter });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch babysitter' });
    }
});
// ============================================
// @route   PUT /api/babysitters/availability
// @desc    Update availability
// @access  Private (Babysitters only)
// ============================================
router.put('/availability', protect, authorize('babysitter'), async (req, res) => {
    try {
        const { availability } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { availability },
            { new: true }
        );
        res.json({ success: true, availability: user.availability });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update availability' });
    }
});
// ============================================
// @route   PUT /api/babysitters/location
// @desc    Set babysitter map location (locked after KYC verified)
// @access  Private (Babysitters only)
// ============================================
router.put('/location', protect, authorize('babysitter'), async (req, res) => {
    try {
        const babysitter = await User.findById(req.user.id);
        if (babysitter.verified) {
            return res.status(403).json({ error: 'Location is locked after KYC verification' });
        }
        const { lat, lng } = req.body;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'lat and lng are required' });
        }
        const lat_n = parseFloat(lat);
        const lng_n = parseFloat(lng);
        if (isNaN(lat_n) || isNaN(lng_n) || lat_n < -90 || lat_n > 90 || lng_n < -180 || lng_n > 180) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }
        babysitter.coordinates = { type: 'Point', coordinates: [lng_n, lat_n] };
        await babysitter.save();
        res.json({ success: true, coordinates: babysitter.coordinates });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update location' });
    }
});
module.exports = router;
