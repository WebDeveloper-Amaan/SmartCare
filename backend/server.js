require('dotenv').config();

// Validate critical env vars on startup
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];
requiredEnv.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
});
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].forEach(key => {
    if (!process.env[key] || process.env[key].includes('xxx')) {
      console.error(`❌ Missing required env var for production: ${key}`);
      process.exit(1);
    }
  });
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');

const authRoutes = require('./routes/auth');
const babysitterRoutes = require('./routes/babysitters');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const chatRoutes = require('./routes/chat');
const reviewRoutes = require('./routes/review');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const smartMatchRoutes = require('./routes/smartmatch');
const setupSocketHandlers = require('./socket/chat');

const app = express();
const server = http.createServer(app);

// ============================================
// Socket.io
// ============================================
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .concat(['http://localhost:3000', 'http://localhost:5500']);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true }
});

// ============================================
// Security Middleware
// ============================================
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", ...allowedOrigins]
  }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new AppError('Not allowed by CORS', 403));
  },
  credentials: true
}));

// Prevent NoSQL injection
app.use(mongoSanitize());

// Prevent HTTP parameter pollution
app.use(hpp());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (process.env.NODE_ENV !== 'production') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
} else {
  const morgan = require('morgan');
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}

// ============================================
// Rate Limiting
// ============================================
const isDev = process.env.NODE_ENV !== 'production'

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' }
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/send-otp', authLimiter);

// ============================================
// Database
// ============================================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection failed', error);
    process.exit(1);
  }
};

// ============================================
// Routes
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/babysitters', babysitterRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/smartmatch', smartMatchRoutes);

setupSocketHandlers(io);

// ============================================
// Error Handling
// ============================================
app.use((req, res, next) => next(new AppError('Route not found', 404)));

app.use((err, req, res, next) => {
  // Log all errors
  if (err.statusCode >= 500 || !err.isOperational) {
    logger.error(err);
  } else {
    logger.warn(`${err.statusCode} - ${err.message} - ${req.originalUrl}`);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `${field} already exists` });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired, please login again' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.isOperational ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ============================================
// Start Server
// ============================================
const PORT = process.env.PORT || 5000

const startServer = async () => {
  await connectDB()
  server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}] PID:${process.pid}`)
  })

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
    transporter.verify(err => {
      if (err) logger.warn(`📧 SMTP FAILED: ${err.message}`)
      else logger.info('📧 SMTP ready')
    })
  } else {
    logger.warn('📧 SMTP not configured')
  }
}

startServer()

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err)
  server.close(() => process.exit(1))
})

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  process.exit(1)
})

module.exports = { app, io }
