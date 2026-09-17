const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post('/create-order', protect, authorize('parent'), asyncHandler(async (req, res, next) => {
  const { bookingId } = req.body;
  if (!bookingId) return next(new AppError('bookingId is required', 400));

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new AppError('Booking not found', 404));
  if (booking.parent.toString() !== req.user.id) return next(new AppError('Not authorized', 403));
  if (booking.paymentStatus === 'paid') return next(new AppError('Booking already paid', 400));

  const order = await razorpay.orders.create({
    amount: booking.totalAmount * 100,
    currency: 'INR',
    receipt: `booking_${booking._id}`,
    notes: { bookingId: booking._id.toString(), parentId: req.user.id, babysitterId: booking.babysitter.toString() }
  });

  booking.razorpayOrderId = order.id;
  await booking.save();

  res.json({
    success: true,
    order: { id: order.id, amount: order.amount, currency: order.currency },
    booking: { id: booking._id, totalAmount: booking.totalAmount },
    key: process.env.RAZORPAY_KEY_ID
  });
}));

router.post('/verify', protect, asyncHandler(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
    return next(new AppError('Missing required payment fields', 400));
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) return next(new AppError('Payment verification failed', 400));

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new AppError('Booking not found', 404));

  booking.paymentStatus = 'paid';
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.razorpaySignature = razorpay_signature;
  booking.paidAt = new Date();
  if (booking.status === 'pending') booking.status = 'confirmed';
  await booking.save();

  res.json({ success: true, message: 'Payment verified successfully', booking });
}));

router.post('/refund', protect, authorize('admin'), asyncHandler(async (req, res, next) => {
  const { bookingId, amount, reason } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new AppError('Booking not found', 404));
  if (booking.paymentStatus !== 'paid') return next(new AppError('Booking is not paid', 400));

  const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
    amount: (amount || booking.totalAmount) * 100,
    notes: { reason: reason || 'Booking cancelled' }
  });

  booking.paymentStatus = 'refunded';
  await booking.save();

  res.json({ success: true, message: 'Refund initiated successfully', refund });
}));

router.get('/history', protect, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const query = { paymentStatus: 'paid' };
  if (req.user.role === 'parent') query.parent = req.user.id;
  else if (req.user.role === 'babysitter') query.babysitter = req.user.id;

  const [payments, total, totals] = await Promise.all([
    Booking.find(query)
      .select('date totalAmount babysitterEarnings platformFee razorpayPaymentId paidAt')
      .sort({ paidAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    Booking.countDocuments(query),
    Booking.aggregate([
      { $match: query },
      { $group: { _id: null, totalPaid: { $sum: '$totalAmount' }, totalEarnings: { $sum: '$babysitterEarnings' }, totalFees: { $sum: '$platformFee' } } }
    ])
  ]);

  res.json({
    success: true,
    count: payments.length,
    total,
    pages: Math.ceil(total / limit),
    totals: totals[0] || { totalPaid: 0, totalEarnings: 0, totalFees: 0 },
    payments
  });
}));

router.get('/earnings', protect, authorize('babysitter'), asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  const now = new Date();
  const dateMap = { week: 7, month: 30, year: 365 };
  const days = dateMap[period] || 30;
  const dateFilter = { $gte: new Date(now.setDate(now.getDate() - days)) };

  const earnings = await Booking.aggregate([
    { $match: { babysitter: req.user._id, paymentStatus: 'paid', paidAt: dateFilter } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, dailyEarnings: { $sum: '$babysitterEarnings' }, bookingCount: { $sum: 1 } } },
    { $sort: { _id: -1 } }
  ]);

  res.json({
    success: true,
    period,
    totalEarnings: earnings.reduce((s, d) => s + d.dailyEarnings, 0),
    totalBookings: earnings.reduce((s, d) => s + d.bookingCount, 0),
    earnings
  });
}));

module.exports = router;
