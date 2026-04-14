// server.js
// Main entry point for the MovieBook Express API server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/database');
const { sequelize } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import all models to register associations
require('./models/index');

const app = express();
const PORT = process.env.PORT || 5000;

// ===========================
//  MIDDLEWARE
// ===========================
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ===========================
//  ROUTES
// ===========================
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/movies',   require('./routes/movieRoutes'));
app.use('/api/shows',    require('./routes/showRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'MovieBook API is running 🎬', timestamp: new Date() });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });
}

// ===========================
//  ERROR HANDLING
// ===========================
app.use(notFound);
app.use(errorHandler);

// ===========================
//  START SERVER
// ===========================
const startServer = async () => {
  // Connect to database
  await connectDB();

  // Sync models without dropping tables (use { force: true } only for seeder)
  await sequelize.sync({ alter: false });
  console.log('✅ Database models synced');

  app.listen(PORT, () => {
    console.log(`\n🚀 MovieBook API running on http://localhost:${PORT}`);
    console.log(`📖 Health check: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();