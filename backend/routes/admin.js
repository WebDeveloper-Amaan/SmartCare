/**
 * Admin Routes
 * Handles admin dashboard operations
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Message = require('../models/Message');
const { protect, authorize } = require('../middleware/auth');
// All routes require admin access
router.use(protect);
router.use(authorize('admin'));
// ============================================
// @route   GET /api/admin/stats
// @desc    Get platform statistics
// @access  Admin
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const [
            totalUsers,
            totalParents,
            totalBabysitters,
            verifiedBabysitters,
            pendingKYC,
            totalBookings,
            completedBookings,
            cancelledBookings,
            revenueStats
        ] = await Promise.all([
            User.countDocuments({ role: { $ne: 'admin' } }),
            User.countDocuments({ role: 'parent' }),
            User.countDocuments({ role: 'babysitter' }),
            User.countDocuments({ role: 'babysitter', verified: true }),
            User.countDocuments({ role: 'babysitter', kycStatus: 'submitted' }),
            Booking.countDocuments(),
            Booking.countDocuments({ status: 'completed' }),
            Booking.countDocuments({ status: 'cancelled' }),
            Booking.aggregate([
                { $match: { paymentStatus: 'paid' } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$totalAmount' },
                        platformEarnings: { $sum: '$platformFee' },
                        babysitterPayouts: { $sum: '$babysitterEarnings' }
                    }
                }
            ])
        ]);
        res.json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    parents: totalParents,
                    babysitters: totalBabysitters,
                    verifiedBabysitters,
                    pendingKYC
                },
                bookings: {
                    total: totalBookings,
                    completed: completedBookings,
                    cancelled: cancelledBookings,
                    completionRate: totalBookings > 0 
                        ? ((completedBookings / totalBookings) * 100).toFixed(1) 
                        : 0
                },
                revenue: revenueStats[0] || {
                    totalRevenue: 0,
                    platformEarnings: 0,
                    babysitterPayouts: 0
                }
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});
// ============================================
// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Admin
// ============================================
router.get('/users', async (req, res) => {
    try {
        const { 
            role, 
            verified, 
            blocked, 
            search,
            page = 1, 
            limit = 20 
        } = req.query;
        let query = { role: { $ne: 'admin' } };
        if (role) query.role = role;
        if (verified !== undefined) query.verified = verified === 'true';
        if (blocked !== undefined) query.isBlocked = blocked === 'true';
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        const users = await User.find(query)
            .select('-password -otp -otpExpire')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await User.countDocuments(query);
        res.json({
            success: true,
            count: users.length,
            total,
            pages: Math.ceil(total / limit),
            users
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// ============================================
// @route   GET /api/admin/users/:id
// @desc    Get user details
// @access  Admin
// ============================================
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -otp -otpExpire');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Get user's booking stats
        const bookingStats = await Booking.aggregate([
            {
                $match: {
                    $or: [
                        { parent: user._id },
                        { babysitter: user._id }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalBookings: { $sum: 1 },
                    completedBookings: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    totalSpent: {
                        $sum: { $cond: [{ $eq: ['$parent', user._id] }, '$totalAmount', 0] }
                    },
                    totalEarned: {
                        $sum: { $cond: [{ $eq: ['$babysitter', user._id] }, '$babysitterEarnings', 0] }
                    }
                }
            }
        ]);
        res.json({
            success: true,
            user,
            stats: bookingStats[0] || {
                totalBookings: 0,
                completedBookings: 0,
                totalSpent: 0,
                totalEarned: 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});
// ============================================
// @route   PUT /api/admin/users/:id/verify
// @desc    Verify/unverify a babysitter
// @access  Admin
// ============================================
router.put('/users/:id/verify', async (req, res) => {
    try {
        const { verified } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.role !== 'babysitter') {
            return res.status(400).json({ error: 'Can only verify babysitters' });
        }
        user.verified = verified;
        user.kycStatus = verified ? 'approved' : 'rejected';
        
        if (user.kycData) {
            user.kycData.reviewedAt = new Date();
            user.kycData.reviewedBy = req.user.id;
        }
        await user.save();
        // TODO: Send notification to babysitter
        res.json({
            success: true,
            message: verified ? 'Babysitter verified' : 'Babysitter verification revoked',
            user
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update verification' });
    }
});
// ============================================
// @route   PUT /api/admin/users/:id/block
// @desc    Block/unblock a user
// @access  Admin
// ============================================
router.put('/users/:id/block', async (req, res) => {
    try {
        const { blocked, reason } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { 
                isBlocked: blocked,
                blockReason: reason 
            },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            success: true,
            message: blocked ? 'User blocked' : 'User unblocked',
            user
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user status' });
    }
});
// ============================================
// @route   GET /api/admin/kyc-requests
// @desc    Get pending KYC requests
// @access  Admin
// ============================================
router.get('/kyc-requests', async (req, res) => {
    try {
        const requests = await User.find({
            role: 'babysitter',
            kycStatus: 'submitted'
        })
            .select('name email phone location photo kycData createdAt')
            .sort({ 'kycData.submittedAt': 1 });
        res.json({
            success: true,
            count: requests.length,
            requests
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch KYC requests' });
    }
});
// ============================================
// @route   GET /api/admin/bookings
// @desc    Get all bookings
// @access  Admin
// ============================================
router.get('/bookings', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        const bookings = await Booking.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('parent', 'name phone')
            .populate('babysitter', 'name phone');
        const total = await Booking.countDocuments(query);
        res.json({
            success: true,
            count: bookings.length,
            total,
            pages: Math.ceil(total / limit),
            bookings
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
// ============================================
// @route   GET /api/admin/reviews
// @desc    Get all reviews (including reported)
// @access  Admin
// ============================================
router.get('/reviews', async (req, res) => {
    try {
        const { reported, page = 1, limit = 20 } = req.query;
        let query = {};
        if (reported === 'true') {
            query.isReported = true;
        }
        const reviews = await Review.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('reviewer', 'name')
            .populate('reviewee', 'name');
        const total = await Review.countDocuments(query);
        res.json({
            success: true,
            count: reviews.length,
            total,
            pages: Math.ceil(total / limit),
            reviews
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});
// ============================================
// @route   PUT /api/admin/reviews/:id/moderate
// @desc    Moderate a review
// @access  Admin
// ============================================
router.put('/reviews/:id/moderate', async (req, res) => {
    try {
        const { action } = req.body; // 'approve', 'hide', 'delete'
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        if (action === 'approve') {
            review.isReported = false;
            review.reportReason = null;
        } else if (action === 'hide') {
            review.isPublic = false;
        } else if (action === 'delete') {
            await review.remove();
            return res.json({ success: true, message: 'Review deleted' });
        }
        review.moderatedBy = req.user.id;
        review.moderatedAt = new Date();
        await review.save();
        res.json({
            success: true,
            message: `Review ${action}d`,
            review
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to moderate review' });
    }
});
// ============================================
// @route   GET /api/admin/analytics
// @desc    Get platform analytics
// @access  Admin
// ============================================
router.get('/analytics', async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        let dateFilter = {};
        const now = new Date();
        if (period === 'week') {
            dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
        } else if (period === 'month') {
            dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
        } else if (period === 'year') {
            dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
        }
        // Bookings over time
        const bookingsOverTime = await Booking.aggregate([
            { $match: { createdAt: dateFilter } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        // User signups over time
        const signupsOverTime = await User.aggregate([
            { $match: { createdAt: dateFilter, role: { $ne: 'admin' } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        role: '$role'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);
        // Top locations
        const topLocations = await User.aggregate([
            { $match: { role: 'babysitter' } },
            { $group: { _id: '$location', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        // Top babysitters
        const topBabysitters = await User.find({ role: 'babysitter', verified: true })
            .sort({ rating: -1, reviewCount: -1 })
            .limit(10)
            .select('name photo rating reviewCount location');
        res.json({
            success: true,
            analytics: {
                bookingsOverTime,
                signupsOverTime,
                topLocations,
                topBabysitters
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
module.exports = router;