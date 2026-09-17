/**
 * Booking Routes
 * Handles booking creation, management, and status updates
 */
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
// ============================================
// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private (Parents only)
// ============================================
router.post('/', protect, authorize('parent'), async (req, res) => {
    try {
        const {
            babysitterId,
            date,
            startTime,
            endTime,
            duration,
            childrenCount,
            childrenAges,
            specialInstructions,
            address
        } = req.body;
        // Get babysitter details
        const babysitter = await User.findById(babysitterId);
        if (!babysitter || babysitter.role !== 'babysitter') {
            return res.status(404).json({ error: 'Babysitter not found' });
        }
        if (!babysitter.verified) {
            return res.status(400).json({ error: 'Babysitter is not verified yet' });
        }
        // Calculate total amount
        const totalAmount = duration * babysitter.hourlyRate;
        // Create booking
        const booking = await Booking.create({
            parent: req.user.id,
            parentName: req.user.name,
            parentPhone: req.user.phone,
            babysitter: babysitterId,
            babysitterName: babysitter.name,
            date,
            startTime,
            endTime,
            duration,
            childrenCount,
            childrenAges,
            specialInstructions,
            address,
            hourlyRate: babysitter.hourlyRate,
            totalAmount
        });
        // TODO: Send notification to babysitter
        res.status(201).json({
            success: true,
            booking
        });
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});
// ============================================
// @route   GET /api/bookings
// @desc    Get bookings for current user
// @access  Private
// ============================================
router.get('/', protect, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        let query = {};
        // Filter by user role
        if (req.user.role === 'parent') {
            query.parent = req.user.id;
        } else if (req.user.role === 'babysitter') {
            query.babysitter = req.user.id;
        }
        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }
        const bookings = await Booking.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('parent', 'name phone photo')
            .populate('babysitter', 'name phone photo rating');
        const total = await Booking.countDocuments(query);
        res.json({
            success: true,
            count: bookings.length,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            bookings
        });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
// ============================================
// @route   GET /api/bookings/:id
// @desc    Get single booking
// @access  Private
// ============================================
router.get('/:id', protect, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('parent', 'name phone photo email')
            .populate('babysitter', 'name phone photo email rating');
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        // Check authorization
        if (
            booking.parent._id.toString() !== req.user.id &&
            booking.babysitter._id.toString() !== req.user.id &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({ error: 'Not authorized to view this booking' });
        }
        res.json({ success: true, booking });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});
// ============================================
// @route   PUT /api/bookings/:id/status
// @desc    Update booking status (accept/decline/cancel)
// @access  Private
// ============================================
router.put('/:id/status', protect, async (req, res) => {
    try {
        const { status, cancellationReason } = req.body;
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        // Validation based on role and current status
        const isParent = booking.parent.toString() === req.user.id;
        const isBabysitter = booking.babysitter.toString() === req.user.id;
        if (!isParent && !isBabysitter && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        // Status transition rules
        const allowedTransitions = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['in-progress', 'cancelled'],
            'in-progress': ['completed', 'disputed'],
            completed: [],
            cancelled: [],
            disputed: ['completed', 'cancelled']
        };
        if (!allowedTransitions[booking.status].includes(status)) {
            return res.status(400).json({ 
                error: `Cannot change status from ${booking.status} to ${status}` 
            });
        }
        // Update booking
        booking.status = status;
        if (status === 'cancelled') {
            booking.cancelledBy = req.user.role;
            booking.cancellationReason = cancellationReason;
        }
        if (status === 'in-progress') {
            booking.checkInTime = new Date();
        }
        if (status === 'completed') {
            booking.checkOutTime = new Date();
            if (booking.checkInTime) {
                booking.actualDuration = (booking.checkOutTime - booking.checkInTime) / (1000 * 60 * 60);
            }
        }
        await booking.save();
        // TODO: Send notifications
        res.json({ success: true, booking });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
});
// ============================================
// @route   PUT /api/bookings/:id/monitoring
// @desc    Start/stop live monitoring
// @access  Private
// ============================================
router.put('/:id/monitoring', protect, async (req, res) => {
    try {
        const { action, streamId } = req.body;
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (booking.status !== 'in-progress') {
            return res.status(400).json({ error: 'Monitoring only available during active sessions' });
        }
        if (action === 'start') {
            booking.monitoringEnabled = true;
            booking.streamId = streamId;
            booking.streamStartedAt = new Date();
        } else if (action === 'stop') {
            booking.monitoringEnabled = false;
            booking.streamEndedAt = new Date();
        }
        await booking.save();
        res.json({ success: true, booking });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update monitoring status' });
    }
});
// ============================================
// @route   GET /api/bookings/stats
// @desc    Get booking statistics
// @access  Private
// ============================================
router.get('/user/stats', protect, async (req, res) => {
    try {
        let matchQuery = {};
        if (req.user.role === 'parent') {
            matchQuery.parent = req.user._id;
        } else if (req.user.role === 'babysitter') {
            matchQuery.babysitter = req.user._id;
        }
        const stats = await Booking.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalBookings: { $sum: 1 },
                    completedBookings: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    pendingBookings: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    totalAmount: { $sum: '$totalAmount' },
                    totalEarnings: { $sum: '$babysitterEarnings' }
                }
            }
        ]);
        res.json({
            success: true,
            stats: stats[0] || {
                totalBookings: 0,
                completedBookings: 0,
                pendingBookings: 0,
                totalAmount: 0,
                totalEarnings: 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
module.exports = router;
