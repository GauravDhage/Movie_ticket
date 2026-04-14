// routes/adminRoutes.js
// All admin routes — protected by both JWT + admin role check
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getAllMoviesAdmin, createMovie, updateMovie, deleteMovie
} = require('../controllers/movieController');
const {
  getAllShowsAdmin, createShow, updateShow, deleteShow
} = require('../controllers/showController');
const { getAllBookingsAdmin } = require('../controllers/bookingController');
const { getDashboardStats } = require('../controllers/adminController');

// Apply auth + admin check to every admin route
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Movie management
router.get('/movies', getAllMoviesAdmin);
router.post('/movies', createMovie);
router.put('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

// Show management
router.get('/shows', getAllShowsAdmin);
router.post('/shows', createShow);
router.put('/shows/:id', updateShow);
router.delete('/shows/:id', deleteShow);

// Bookings view
router.get('/bookings', getAllBookingsAdmin);

module.exports = router;