// controllers/adminController.js
// Admin-specific operations: dashboard stats, reports

const { User, Movie, Show, Booking, Payment, Seat } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// @desc    Get dashboard summary statistics
// @route   GET /api/admin/dashboard
// @access  Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Run all count queries in parallel for performance
    const [
      totalUsers,
      totalMovies,
      totalBookings,
      confirmedBookings,
      todayBookings,
      totalRevenue,
      recentBookings
    ] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      Movie.count({ where: { isActive: true } }),
      Booking.count(),
      Booking.count({ where: { bookingStatus: 'confirmed' } }),
      Booking.count({ where: { createdAt: { [Op.gte]: new Date(today) } } }),
      // Sum revenue from successful payments
      Payment.sum('amount', { where: { status: 'success' } }),
      // Last 10 bookings with user + movie info
      Booking.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [
          { model: User, as: 'user', attributes: ['name', 'email'] },
          {
            model: Show, as: 'show',
            include: [{ model: Movie, as: 'movie', attributes: ['title'] }]
          },
          { model: Payment, as: 'payment', attributes: ['status'] }
        ]
      })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalMovies,
          totalBookings,
          confirmedBookings,
          todayBookings,
          totalRevenue: totalRevenue || 0
        },
        recentBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };