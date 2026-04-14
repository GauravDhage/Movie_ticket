// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const {
  initiateBooking, processPayment, createRazorpayOrder, verifyPayment, cancelBooking, getMyBookings, getBookingById, downloadReceiptPDF
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

// All booking routes require authentication
router.use(protect);

// More specific routes FIRST
router.post('/initiate', initiateBooking);
router.get('/my', getMyBookings);                                        // Must come BEFORE /:id

// Then routes with sub-paths
router.post('/:bookingDbId/pay', processPayment);
router.post('/:bookingDbId/create-order', createRazorpayOrder);
router.post('/:bookingDbId/verify-payment', verifyPayment);
router.get('/:id/receipt-pdf', downloadReceiptPDF);                     // Download receipt as PDF
router.put('/:id/cancel', cancelBooking);

// Generic parameter routes LAST
router.get('/:id', getBookingById);

module.exports = router;