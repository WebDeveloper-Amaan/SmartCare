const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return next(new AppError('Not authorized to access this route', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return next(new AppError('User not found', 401));
    if (user.isBlocked) return next(new AppError('Your account has been blocked', 403));

    req.user = user;
    next();
  } catch (error) {
    logger.warn('Auth middleware error:', error.message);
    next(error); // JWT errors (JsonWebTokenError, TokenExpiredError) handled in global error handler
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError(`Role '${req.user.role}' is not authorized to access this route`, 403));
  }
  next();
};

exports.requireVerified = (req, res, next) => {
  if (req.user.role === 'babysitter' && !req.user.verified) {
    return next(new AppError('Please complete KYC verification to access this feature', 403));
  }
  next();
};

exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return next(new AppError('Admin access required', 403));
  next();
};
