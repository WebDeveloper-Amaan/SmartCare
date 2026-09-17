/**
 * Booking Model
 * Handles babysitting session bookings
 */
const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
    // Parent who made the booking
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    parentName: {
        type: String,
        required: true
    },
    parentPhone: {
        type: String,
        required: true
    },
    // Babysitter being booked
    babysitter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    babysitterName: {
        type: String,
        required: true
    },
    // Booking details
    date: {
        type: Date,
        required: [true, 'Please provide booking date']
    },
    startTime: {
        type: String,
        required: [true, 'Please provide start time']
    },
    endTime: {
        type: String,
        required: [true, 'Please provide end time']
    },
    duration: {
        type: Number, // in hours
        required: true
    },
    // Children info
    childrenCount: {
        type: Number,
        default: 1,
        min: 1,
        max: 5
    },
    childrenAges: [{
        type: String
    }],
    specialInstructions: {
        type: String,
        maxlength: 500
    },
    // Location
    address: {
        type: String,
        required: [true, 'Please provide address']
    },
    coordinates: {
        lat: Number,
        lng: Number
    },
    // Pricing
    hourlyRate: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    platformFee: {
        type: Number,
        default: 0
    },
    babysitterEarnings: {
        type: Number
    },
    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'disputed'],
        default: 'pending'
    },
    cancelledBy: {
        type: String,
        enum: ['parent', 'babysitter', 'admin', null],
        default: null
    },
    cancellationReason: {
        type: String
    },
    // Payment
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'refunded', 'failed'],
        default: 'unpaid'
    },
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'cash', 'wallet'],
        default: 'razorpay'
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paidAt: Date,
    // Live monitoring
    monitoringEnabled: {
        type: Boolean,
        default: false
    },
    streamId: String,
    streamStartedAt: Date,
    streamEndedAt: Date,
    // Session tracking
    checkInTime: Date,
    checkOutTime: Date,
    actualDuration: Number,
    // Reviews
    parentReviewGiven: {
        type: Boolean,
        default: false
    },
    babysitterReviewGiven: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
// Indexes
bookingSchema.index({ parent: 1, createdAt: -1 });
bookingSchema.index({ babysitter: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ date: 1 });
// Calculate babysitter earnings before save
bookingSchema.pre('save', function(next) {
    if (this.totalAmount && !this.babysitterEarnings) {
        this.platformFee = Math.round(this.totalAmount * 0.15); // 15% platform fee
        this.babysitterEarnings = this.totalAmount - this.platformFee;
    }
    next();
});
// Virtual for formatted date
bookingSchema.virtual('formattedDate').get(function() {
    return this.date.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});
module.exports = mongoose.model('Booking', bookingSchema);