const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/sendEmail');
const { upload, uploadToCloudinary } = require('../middleware/upload');

const signupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[+]?[\d\s-]{10,15}$/).withMessage('Please provide a valid phone number'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('role').isIn(['parent', 'babysitter']).withMessage('Role must be parent or babysitter'),
  body('location').trim().notEmpty().withMessage('Location is required').escape()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/signup', signupValidation, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, phone, password, role, location } = req.body;

  if (await User.findOne({ email })) return next(new AppError('User already exists with this email', 400));
  if (await User.findOne({ phone })) return next(new AppError('User already exists with this phone number', 400));

  // Generate email verification OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await User.create({
    name, email, phone, password, role, location,
    emailVerified: false,
    emailVerificationOTP: otp,
    emailVerificationOTPExpire: new Date(Date.now() + 10 * 60 * 1000)
  });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb">
      <div style="text-align:center;margin-bottom:24px">
        <h2 style="color:#6EC1E4;margin:0">🍼 FindBabysitter</h2>
      </div>
      <h3 style="color:#111827">Verify Your Email</h3>
      <p style="color:#6b7280">Hi <strong>${name}</strong>, use the OTP below to verify your email. Expires in <strong>10 minutes</strong>.</p>
      <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px">If you didn't create an account, ignore this email.</p>
    </div>
  `;

  try {
    await sendEmail({ to: user.email, subject: 'FindBabysitter - Verify Your Email', html });
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    return next(new AppError('Failed to send verification email. Please try again.', 500));
  }

  res.status(201).json({
    success: true,
    needsVerification: true,
    email: user.email,
    message: 'Account created! Please verify your email.'
  });
}));

// ============================================
// @route   POST /api/auth/verify-email
// @desc    Verify email OTP after signup
// @access  Public
// ============================================
router.post('/verify-email', asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp) return next(new AppError('Email and OTP are required', 400));

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    emailVerificationOTP: otp,
    emailVerificationOTPExpire: { $gt: Date.now() }
  });

  if (!user) return next(new AppError('Invalid or expired OTP', 400));

  user.emailVerified = true;
  user.emailVerificationOTP = undefined;
  user.emailVerificationOTPExpire = undefined;
  await user.save();

  const token = user.getSignedJwtToken();
  res.json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, location: user.location, verified: user.verified, photo: user.photo }
  });
}));

router.post('/login', loginValidation, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError('Invalid credentials', 401));
  }
  if (user.isBlocked) return next(new AppError('Your account has been blocked. Contact support.', 403));
  if (!user.emailVerified) return next(new AppError('Please verify your email before logging in.', 403));

  const token = user.getSignedJwtToken();
  res.json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, location: user.location, verified: user.verified, photo: user.photo }
  });
}));

// ============================================
// @route   POST /api/auth/upload-photo
// @desc    Upload profile photo to Cloudinary
// @access  Private
// ============================================
router.post('/upload-photo', protect, upload.single('photo'), asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('No image file provided', 400));
  let url;
  try {
    url = await uploadToCloudinary(req.file.buffer, 'profile_photos');
  } catch (err) {
    return next(new AppError('Image upload failed. Please try again.', 502));
  }
  const user = await User.findByIdAndUpdate(req.user.id, { photo: url }, { new: true });
  res.json({ success: true, photo: user.photo });
}));

router.get('/me', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user });
}));

router.post('/send-otp', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  user.generateOTP();
  await user.save();
  // TODO: Send OTP via SMS (Twilio/MSG91)
  res.json({ success: true, message: 'OTP sent successfully' });
}));

router.post('/verify-otp', protect, asyncHandler(async (req, res, next) => {
  const { otp } = req.body;
  if (!otp) return next(new AppError('OTP is required', 400));

  const user = await User.findById(req.user.id);
  if (!user.verifyOTP(otp)) return next(new AppError('Invalid or expired OTP', 400));

  await user.save();
  res.json({ success: true, message: 'Phone verified successfully' });
}));

router.put('/update-profile', protect, asyncHandler(async (req, res) => {
  const allowedUpdates = ['name', 'phone', 'location', 'photo', 'bio', 'experience', 'hourlyRate', 'skills', 'availability', 'ageGroups', 'languages', 'education'];
  const updates = {};
  allowedUpdates.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
  res.json({ success: true, user });
}));

router.put('/change-password', protect, asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return next(new AppError('Both current and new password are required', 400));
  if (newPassword.length < 6) return next(new AppError('New password must be at least 6 characters', 400));

  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.matchPassword(currentPassword))) return next(new AppError('Current password is incorrect', 400));

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
}));

router.post('/submit-kyc', protect, asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'babysitter') return next(new AppError('Only babysitters can submit KYC', 403));

  const { idType, idNumber, documentUrl } = req.body;
  if (!idType || !idNumber || !documentUrl) return next(new AppError('idType, idNumber and documentUrl are required', 400));

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { kycStatus: 'submitted', kycData: { idType, idNumber, documentUrl, submittedAt: new Date() } },
    { new: true }
  );
  res.json({ success: true, message: 'KYC submitted for review', kycStatus: user.kycStatus });
}));

// ============================================
// @route   POST /api/auth/forgot-password
// @desc    Send OTP to email for password reset
// @access  Public
// ============================================
router.post('/forgot-password', asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Email is required', 400));

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  // Always return success to prevent email enumeration
  if (!user) return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await user.save();

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb">
      <div style="text-align:center;margin-bottom:24px">
        <h2 style="color:#6EC1E4;margin:0">🍼 FindBabysitter</h2>
      </div>
      <h3 style="color:#111827">Reset Your Password</h3>
      <p style="color:#6b7280">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
      <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  try {
    await sendEmail({ to: user.email, subject: 'FindBabysitter - Password Reset OTP', html });
  } catch (err) {
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    await user.save();
    return next(new AppError('Failed to send email. Please try again.', 500));
  }

  res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
}));

// ============================================
// @route   POST /api/auth/reset-password
// @desc    Verify OTP and set new password
// @access  Public
// ============================================
router.post('/reset-password', asyncHandler(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return next(new AppError('Email, OTP and new password are required', 400));
  if (newPassword.length < 8) return next(new AppError('Password must be at least 8 characters', 400));
  if (!/[A-Z]/.test(newPassword)) return next(new AppError('Password must contain at least one uppercase letter', 400));
  if (!/[0-9]/.test(newPassword)) return next(new AppError('Password must contain at least one number', 400));

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetPasswordOTP: otp,
    resetPasswordOTPExpire: { $gt: Date.now() }
  });

  if (!user) return next(new AppError('Invalid or expired OTP', 400));

  user.password = newPassword;
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpire = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. Please login.' });
}));

// ============================================
// @route   GET /api/auth/user/:id
// @desc    Get any user's public profile by ID
// @access  Private
// ============================================
router.get('/user/:id', protect, asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('name photo role location bio experience hourlyRate skills availability ageGroups languages education rating reviewCount verified isActive');
  if (!user) return next(new AppError('User not found', 404));
  res.json({ success: true, user });
}));

module.exports = router;
