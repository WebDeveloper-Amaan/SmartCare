/**
 * Review Model
 * Handles two-way reviews (Parent ↔ Babysitter)
 */
const mongoose = require('mongoose');
const reviewSchema = new mongoose.Schema({
    // Who wrote the review
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewerName: {
        type: String,
        required: true
    },
    reviewerRole: {
        type: String,
        enum: ['parent', 'babysitter'],
        required: true
    },
    // Who is being reviewed
    reviewee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    revieweeName: {
        type: String,
        required: true
    },
    // Associated booking
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    // Review content
    rating: {
        type: Number,
        required: [true, 'Please provide a rating'],
        min: 1,
        max: 5
    },
    title: {
        type: String,
        maxlength: 100
    },
    text: {
        type: String,
        required: [true, 'Please provide review text'],
        maxlength: 1000
    },
    // Specific ratings (optional)
    subRatings: {
        punctuality: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        childCare: { type: Number, min: 1, max: 5 },
        professionalism: { type: Number, min: 1, max: 5 }
    },
    // Response from reviewee
    response: {
        text: String,
        respondedAt: Date
    },
    // Moderation
    isPublic: {
        type: Boolean,
        default: true
    },
    isReported: {
        type: Boolean,
        default: false
    },
    reportReason: String,
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    moderatedAt: Date,
    // Helpful votes
    helpfulVotes: {
        type: Number,
        default: 0
    },
    votedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});
// Indexes
reviewSchema.index({ reviewee: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ booking: 1 });
reviewSchema.index({ rating: -1 });
// Prevent duplicate reviews
reviewSchema.index({ reviewer: 1, booking: 1 }, { unique: true });
// Static method to calculate average rating
reviewSchema.statics.calculateAverageRating = async function(userId) {
    const stats = await this.aggregate([
        { $match: { reviewee: userId, isPublic: true } },
        {
            $group: {
                _id: '$reviewee',
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
            }
        }
    ]);
    if (stats.length > 0) {
        await mongoose.model('User').findByIdAndUpdate(userId, {
            rating: Math.round(stats[0].averageRating * 10) / 10,
            reviewCount: stats[0].reviewCount
        });
    } else {
        await mongoose.model('User').findByIdAndUpdate(userId, {
            rating: 0,
            reviewCount: 0
        });
    }
};
// Update user rating after save
reviewSchema.post('save', function() {
    this.constructor.calculateAverageRating(this.reviewee);
});
// Update user rating after remove
reviewSchema.post('remove', function() {
    this.constructor.calculateAverageRating(this.reviewee);
});
module.exports = mongoose.model('Review', reviewSchema);