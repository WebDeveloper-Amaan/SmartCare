/**
 * Booking Routes
 * Handles booking creation, management, and status updates
 */
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
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
            address,
            coordinates
        } = req.body;
        // Get babysitter details
        const babysitter = await User.findById(babysitterId);
        if (!babysitter || babysitter.role !== 'babysitter') {
            return res.status(404).json({ error: 'Babysitter not found' });
        }
        if (!babysitter.verified) {
            return res.status(400).json({ error: 'Babysitter is not verified yet' });
        }
        // Tiered pricing: 1-2hrs = full rate, 3-4hrs = 10% off, 5+hrs = 20% off
        const discountRate = duration >= 5 ? 0.20 : duration >= 3 ? 0.10 : 0
        const effectiveRate = Math.round(babysitter.hourlyRate * (1 - discountRate))
        const totalAmount = Math.round(duration * effectiveRate)
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
            coordinates: coordinates || undefined,
            hourlyRate: babysitter.hourlyRate,
            totalAmount,
            discountPercent: discountRate * 100,
            effectiveHourlyRate: effectiveRate
        });
        // Notify babysitter via socket + email
        try {
            const io = req.app.get('io')
            if (io) {
                io.to(babysitterId.toString()).emit('receive_message', {
                    _id: booking._id,
                    from: req.user.id,
                    to: babysitterId.toString(),
                    text: `📅 New booking request from ${req.user.name} on ${new Date(date).toLocaleDateString('en-IN')} (${startTime}–${endTime}). ₹${totalAmount} total.`,
                    senderName: req.user.name,
                    createdAt: new Date()
                })
            }
            if (babysitter.email) {
                sendEmail({
                    to: babysitter.email,
                    subject: `📅 New Booking Request from ${req.user.name}`,
                    html: `<p>Hi ${babysitter.name},</p><p><strong>${req.user.name}</strong> has sent you a booking request.</p><ul><li><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-IN')}</li><li><strong>Time:</strong> ${startTime}–${endTime}</li><li><strong>Duration:</strong> ${duration} hrs</li><li><strong>Amount:</strong> ₹${totalAmount}</li></ul><p>Log in to SmartCare to accept or decline.</p><p>— SmartCare</p>`
                }).catch(() => {})
            }
        } catch (e) { console.error('Booking notify error:', e.message) }
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
        // Notify the other party via socket + email
        try {
            const io = req.app.get('io')
            const otherPartyId = isParent ? booking.babysitter.toString() : booking.parent.toString()
            const otherPartyName = isParent ? booking.babysitterName : booking.parentName
            let notifyText = ''
            let emailSubject = ''
            let emailHtml = ''
            if (status === 'confirmed') {
                notifyText = `✅ ${req.user.name} accepted your booking on ${new Date(booking.date).toLocaleDateString('en-IN')} (${booking.startTime}–${booking.endTime}).`
                emailSubject = `✅ Booking Confirmed by ${req.user.name}`
                emailHtml = `<p>Hi,</p><p><strong>${req.user.name}</strong> has <strong>accepted</strong> your booking request.</p><p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString('en-IN')}<br><strong>Time:</strong> ${booking.startTime}–${booking.endTime}</p><p>— SmartCare</p>`
            } else if (status === 'cancelled') {
                notifyText = `❌ ${req.user.name} cancelled the booking on ${new Date(booking.date).toLocaleDateString('en-IN')}.${cancellationReason ? ' Reason: ' + cancellationReason : ''}`
                emailSubject = `❌ Booking Cancelled by ${req.user.name}`
                emailHtml = `<p>Hi,</p><p><strong>${req.user.name}</strong> has <strong>cancelled</strong> the booking on ${new Date(booking.date).toLocaleDateString('en-IN')}.</p>${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}<p>— SmartCare</p>`
            } else if (status === 'in-progress') {
                notifyText = `🟢 ${req.user.name} has started the session. Live GPS tracking is now active.`
                emailSubject = `🟢 Session Started by ${req.user.name}`
                emailHtml = `<p>Hi,</p><p><strong>${req.user.name}</strong> has started the babysitting session. Live GPS tracking is now active in your dashboard.</p><p>— SmartCare</p>`
            } else if (status === 'completed') {
                notifyText = `🏁 Session completed by ${req.user.name}. Please leave a review!`
                emailSubject = `🏁 Session Completed`
                emailHtml = `<p>Hi,</p><p>The babysitting session has been marked as <strong>completed</strong>. Log in to SmartCare to leave a review.</p><p>— SmartCare</p>`
            }
            if (notifyText && io) {
                io.to(otherPartyId).emit('receive_message', {
                    _id: booking._id + '_' + status,
                    from: req.user.id,
                    to: otherPartyId,
                    text: notifyText,
                    senderName: req.user.name,
                    createdAt: new Date()
                })
            }
            if (emailSubject) {
                const otherUser = await User.findById(otherPartyId).select('email').lean()
                if (otherUser?.email) sendEmail({ to: otherUser.email, subject: emailSubject, html: emailHtml }).catch(() => {})
            }
        } catch (e) { console.error('Status notify error:', e.message) }
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
// ============================================
// @route   POST /api/bookings/:id/sos
// @desc    Log an SOS alert for a booking
// @access  Private (babysitter of that booking)
// ============================================
router.post('/:id/sos', protect, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
        if (!booking) return res.status(404).json({ error: 'Booking not found' })
        if (booking.babysitter.toString() !== req.user.id)
            return res.status(403).json({ error: 'Not authorized' })
        // Store SOS event in booking for audit trail
        if (!booking.sosAlerts) booking.sosAlerts = []
        booking.sosAlerts.push({
            triggeredAt: new Date(),
            lat: req.body.lat,
            lng: req.body.lng,
            message: req.body.message || 'Emergency alert'
        })
        await booking.save()
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: 'Failed to log SOS' })
    }
})

module.exports = router;
