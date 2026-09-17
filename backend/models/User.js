/**
 * User Model
 * Handles both Parents and Babysitters
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Please provide a phone number'],
        match: [/^[+]?[\d\s-]{10,15}$/, 'Please provide a valid phone number']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['parent', 'babysitter', 'admin'],
        default: 'parent'
    },
    location: {
        type: String,
        required: true
    },
    coordinates: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [77.2090, 28.6139] // Default to Delhi
        }
    },
    photo: {
        type: String,
        // default: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'
         default: 'https://images.unsplash.com/photo-1659665210258-775c0fab6221?w=400&h=400&fit=crop'
    },
    
    // Babysitter-specific fields
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    experience: {
        type: Number,
        default: 0
    },
    hourlyRate: {
        type: Number,
        default: 200,
        min: [100, 'Hourly rate must be at least ₹100']
    },
    skills: [{
        type: String
    }],
    availability: [{
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    ageGroups: [{
        type: String,
        enum: ['Infant (0-1)', 'Toddler (1-3)', 'Preschool (3-5)', 'School Age (5+)']
    }],
    languages: [{
        type: String
    }],
    education: {
        type: String
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    // Verification
    verified: {
        type: Boolean,
        default: false
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    kycStatus: {
        type: String,
        enum: ['pending', 'submitted', 'approved', 'rejected'],
        default: 'pending'
    },
    kycData: {
        idType: String,
        idNumber: String,
        documentUrl: String,
        submittedAt: Date,
        reviewedAt: Date,
        reviewedBy: mongoose.Schema.Types.ObjectId
    },
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    // Password reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordOTP: String,
    resetPasswordOTPExpire: Date,
    // OTP verification
    otp: String,
    otpExpire: Date,
    // Email verification
    emailVerified: { type: Boolean, default: false },
    emailVerificationOTP: String,
    emailVerificationOTPExpire: Date
}, {
    timestamps: true
});
// Indexes for geospatial queries
userSchema.index({ coordinates: '2dsphere' });
userSchema.index({ role: 1, verified: 1 });
// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});
// Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};
// Generate JWT token
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};
// Generate OTP
userSchema.methods.generateOTP = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = otp;
    this.otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return otp;
};
// Verify OTP
userSchema.methods.verifyOTP = function(enteredOTP) {
    if (this.otp === enteredOTP && this.otpExpire > Date.now()) {
        this.otp = undefined;
        this.otpExpire = undefined;
        this.phoneVerified = true;
        return true;
    }
    return false;
};
module.exports = mongoose.model('User', userSchema);