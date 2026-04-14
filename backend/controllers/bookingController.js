// controllers/bookingController.js
// Handles seat booking with MySQL transactions to prevent double-booking (race conditions)

const { Booking, BookingSeat, Seat, Show, Movie, Payment, User } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { sendBookingReceipt } = require('../utils/emailService');
const { createPaymentOrder, verifyPaymentSignature, fetchPaymentDetails } = require('../utils/razorpay');

// @desc    Initiate a booking - lock seats, create pending booking
// @route   POST /api/bookings/initiate
// @access  Private (logged in users)
const initiateBooking = async (req, res, next) => {
  // Start a database transaction
  const transaction = await sequelize.transaction();

  try {
    const { showId, seatIds } = req.body;
    const userId = req.user.id;

    if (!showId || !seatIds || seatIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'showId and seatIds are required.' });
    }

    if (seatIds.length > 8) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Maximum 8 seats can be booked at once.' });
    }

    // ⚡ CRITICAL: Lock the seat rows using SELECT ... FOR UPDATE
    // This prevents two users from booking the same seat simultaneously
    const seats = await Seat.findAll({
      where: {
        id: { [Op.in]: seatIds },
        showId,
        status: 'available'
      },
      lock: transaction.LOCK.UPDATE, // Row-level locking
      transaction
    });

    // Check if all requested seats are available
    if (seats.length !== seatIds.length) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'One or more selected seats are no longer available. Please re-select.'
      });
    }

    // Calculate total price
    const totalPrice = seats.reduce((sum, seat) => sum + parseFloat(seat.price), 0);

    // Mark seats as 'reserved' (temporarily held during payment)
    await Seat.update(
      { status: 'reserved' },
      { where: { id: { [Op.in]: seatIds } }, transaction }
    );

    // Create the booking in 'pending' state
    const booking = await Booking.create({
      userId,
      showId,
      totalPrice,
      bookingStatus: 'pending',
      numberOfSeats: seatIds.length
    }, { transaction });

    // Create BookingSeat junction records
    const bookingSeatData = seatIds.map(seatId => ({
      bookingId: booking.id,
      seatId
    }));
    await BookingSeat.bulkCreate(bookingSeatData, { transaction });

    // Update available seats count on the show
    const show = await Show.findByPk(showId, { transaction, lock: transaction.LOCK.UPDATE });
    await show.update(
      { availableSeats: show.availableSeats - seatIds.length },
      { transaction }
    );

    // Commit the transaction
    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Seats reserved! Please complete payment within 10 minutes.',
      data: {
        bookingId: booking.bookingId,
        bookingDbId: booking.id,
        totalPrice,
        seats: seats.map(s => ({ id: s.id, seatNumber: s.seatNumber, type: s.seatType, price: s.price })),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc    Process payment and confirm booking
// @route   POST /api/bookings/:bookingDbId/pay
// @access  Private
const processPayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { bookingDbId } = req.params;
    const { paymentMethod = 'upi', cardNumber, cardHolder, upiRef, simulateFailure = false } = req.body;
    const userId = req.user.id;

    // Validate UPI reference/UTR number
    if (paymentMethod === 'upi' && upiRef) {
      // UTR must be 12 digits (NEFT/RTGS standard in India)
      const utrRegex = /^\d{12}$/;
      if (!utrRegex.test(upiRef.trim())) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid UTR format. UPI Reference must be exactly 12 digits.' 
        });
      }
    } else if (!upiRef && paymentMethod === 'upi') {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'UPI Reference/UTR number is required for payment.' 
      });
    }

    // Find the pending booking belonging to this user
    const booking = await Booking.findOne({
      where: { id: bookingDbId, userId, bookingStatus: 'pending' },
      include: [
        { model: Show, as: 'show', include: [{ model: Movie, as: 'movie' }] },
        { model: Seat, as: 'seats' }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found or already processed.' });
    }

    // Payment processing: only succeeds if UPI ref is valid (12 digits) and simulateFailure is not checked
    // In production, you'd verify this with your payment gateway API
    const paymentSuccess = !simulateFailure && (paymentMethod === 'upi' ? /^\d{12}$/.test(upiRef) : true);

    // Create payment record
    const txnId = 'TXN' + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase();
    const payment = await Payment.create({
      bookingId:     booking.id,
      transactionId: txnId,
      amount:        parseFloat(booking.totalPrice),
      paymentMethod: paymentMethod || 'upi',
      status:        paymentSuccess ? 'success' : 'failed',
      paymentDetails: JSON.stringify({
        upiRef:     upiRef || null,
        cardLast4:  cardNumber ? cardNumber.slice(-4) : '****',
        cardHolder: cardHolder || 'UPI Payment',
        method:     paymentMethod,
        verifiedAt: paymentSuccess ? new Date().toISOString() : null
      })
    }, { transaction });

    if (paymentSuccess) {
      // Payment successful: confirm booking and mark seats as 'booked'
      await booking.update({ bookingStatus: 'confirmed' }, { transaction });

      await Seat.update(
        { status: 'booked' },
        { where: { id: { [Op.in]: booking.seats.map(s => s.id) } }, transaction }
      );

      await transaction.commit();

      // ── Send booking receipt email (non-blocking) ──────────
      try {
        const user = await User.findByPk(booking.userId);
        await sendBookingReceipt({
          to:            user.email,
          name:          user.name,
          bookingId:     booking.bookingId,
          transactionId: payment.transactionId,
          movieTitle:    booking.show.movie.title,
          date:          booking.show.date,
          time:          booking.show.showTime,
          hall:          booking.show.hall,
          seats:         booking.seats.map(s => s.seatNumber),
          amount:        booking.totalPrice,
          paymentMethod
        });
      } catch (mailErr) {
        console.error('Receipt email error (non-fatal):', mailErr.message);
      }

      res.json({
        success: true,
        message: '🎉 Booking confirmed! Enjoy your movie!',
        data: {
          bookingId: booking.bookingId,
          transactionId: payment.transactionId,
          movieTitle: booking.show.movie.title,
          showDate: booking.show.date,
          showTime: booking.show.showTime,
          seats: booking.seats.map(s => s.seatNumber),
          totalPaid: booking.totalPrice,
          paymentMethod
        }
      });
    } else {
      // Payment failed: cancel booking, release reserved seats
      await booking.update({ bookingStatus: 'failed' }, { transaction });

      await Seat.update(
        { status: 'available' },
        { where: { id: { [Op.in]: booking.seats.map(s => s.id) } }, transaction }
      );

      // Restore seat count on show
      const show = await Show.findByPk(booking.showId, { transaction });
      await show.update(
        { availableSeats: show.availableSeats + booking.numberOfSeats },
        { transaction }
      );

      await transaction.commit();

      res.status(402).json({
        success: false,
        message: 'Payment failed. Seats have been released.',
        transactionId: payment.transactionId
      });
    }
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc    Cancel a confirmed booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, userId: req.user.id, bookingStatus: 'confirmed' },
      include: [{ model: Seat, as: 'seats' }],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Confirmed booking not found.' });
    }

    // Release seats back to available
    await Seat.update(
      { status: 'available' },
      { where: { id: { [Op.in]: booking.seats.map(s => s.id) } }, transaction }
    );

    // Restore available seats count
    const show = await Show.findByPk(booking.showId, { transaction });
    await show.update(
      { availableSeats: show.availableSeats + booking.numberOfSeats },
      { transaction }
    );

    // Update booking status
    await booking.update({ bookingStatus: 'cancelled' }, { transaction });

    // Update payment status to refunded
    await Payment.update(
      { status: 'refunded' },
      { where: { bookingId: booking.id }, transaction }
    );

    await transaction.commit();

    res.json({ success: true, message: 'Booking cancelled. Refund will be processed in 3-5 days.' });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc    Get user's booking history
// @route   GET /api/bookings/my
// @access  Private
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Show, as: 'show',
          include: [{ model: Movie, as: 'movie', attributes: ['title', 'posterUrl', 'duration'] }]
        },
        { model: Seat, as: 'seats', attributes: ['seatNumber', 'seatType', 'price'] },
        { model: Payment, as: 'payment', attributes: ['status', 'transactionId', 'paymentMethod'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking details
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      where: {
        [Op.or]: [{ id: req.params.id }, { bookingId: req.params.id }],
        userId: req.user.id
      },
      include: [
        {
          model: Show, as: 'show',
          include: [{ model: Movie, as: 'movie' }]
        },
        { model: Seat, as: 'seats' },
        { model: Payment, as: 'payment' }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings (Admin)
// @route   GET /api/admin/bookings
// @access  Admin
const getAllBookingsAdmin = async (req, res, next) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        {
          model: Show, as: 'show',
          include: [{ model: Movie, as: 'movie', attributes: ['title'] }]
        },
        { model: Payment, as: 'payment', attributes: ['status', 'transactionId'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Razorpay payment order (for real payments via UPI)
// @route   POST /api/bookings/:bookingDbId/create-order
// @access  Private
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { bookingDbId } = req.params;
    const userId = req.user.id;

    // Find the pending booking
    const booking = await Booking.findOne({
      where: { id: bookingDbId, userId, bookingStatus: 'pending' },
      include: [{ model: Show, as: 'show', include: [{ model: Movie, as: 'movie' }] }]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or already processed.' });
    }

    // Create Razorpay order
    const orderResult = await createPaymentOrder(booking.bookingId, booking.totalPrice);

    if (!orderResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: orderResult.message 
      });
    }

    res.json({
      success: true,
      message: 'Payment order created. Complete payment via UPI.',
      data: {
        orderId: orderResult.orderId,
        amount: orderResult.amount,
        currency: orderResult.currency,
        bookingId: booking.bookingId,
        movieTitle: booking.show.movie.title,
        totalSeats: booking.numberOfSeats,
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID' // Frontend needs this for Razorpay checkout
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment and confirm booking
// @route   POST /api/bookings/:bookingDbId/verify-payment
// @access  Private
const verifyPayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { bookingDbId } = req.params;
    const { orderId, paymentId, signature } = req.body;
    const userId = req.user.id;

    if (!orderId || !paymentId || !signature) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Missing payment details: orderId, paymentId, or signature' 
      });
    }

    // Verify payment signature (CRITICAL SECURITY CHECK)
    const isSignatureValid = verifyPaymentSignature(orderId, paymentId, signature);
    if (!isSignatureValid) {
      await transaction.rollback();
      return res.status(401).json({ 
        success: false, 
        message: 'Payment verification failed. Invalid signature. This could be a fraudulent payment attempt.' 
      });
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await fetchPaymentDetails(paymentId);
    if (!paymentDetails.success) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to fetch payment details from payment gateway' 
      });
    }

    // Find the booking
    const booking = await Booking.findOne({
      where: { id: bookingDbId, userId, bookingStatus: 'pending' },
      include: [
        { model: Show, as: 'show', include: [{ model: Movie, as: 'movie' }] },
        { model: Seat, as: 'seats' }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found or already processed.' });
    }

    // Validate payment amount matches exactly (CRITICAL - prevents overpayment/underpayment abuse)
    if (Math.abs(paymentDetails.amount - booking.totalPrice) > 0.01) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Payment amount mismatch. Expected ₹${booking.totalPrice}, received ₹${paymentDetails.amount}`
      });
    }

    // Validate payment status
    if (paymentDetails.status !== 'captured') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Payment status is ${paymentDetails.status}. Please try again.`
      });
    }

    // ✅ PAYMENT VERIFIED - Create payment record and confirm booking
    const payment = await Payment.create({
      bookingId: booking.id,
      transactionId: paymentId,
      amount: booking.totalPrice,
      paymentMethod: paymentDetails.method || 'upi',
      status: 'success',
      paymentDetails: JSON.stringify({
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        utr: paymentDetails.utr,
        method: paymentDetails.method,
        email: paymentDetails.email,
        contact: paymentDetails.contact,
        verifiedAt: new Date().toISOString(),
        verificationStatus: 'verified'
      })
    }, { transaction });

    // Confirm booking and mark seats as booked
    await booking.update({ bookingStatus: 'confirmed' }, { transaction });

    await Seat.update(
      { status: 'booked' },
      { where: { id: { [Op.in]: booking.seats.map(s => s.id) } }, transaction }
    );

    await transaction.commit();

    // ── Send booking receipt email (non-blocking) ──────────
    try {
      const user = await User.findByPk(booking.userId);
      await sendBookingReceipt({
        to: user.email,
        name: user.name,
        bookingId: booking.bookingId,
        transactionId: payment.transactionId,
        movieTitle: booking.show.movie.title,
        date: booking.show.date,
        time: booking.show.showTime,
        hall: booking.show.hall,
        seats: booking.seats.map(s => s.seatNumber),
        amount: booking.totalPrice,
        paymentMethod: paymentDetails.method,
        utr: paymentDetails.utr
      });
    } catch (mailErr) {
      console.error('Receipt email error (non-fatal):', mailErr.message);
    }

    res.json({
      success: true,
      message: '🎉 Booking confirmed! Receipt sent to your email.',
      data: {
        bookingId: booking.bookingId,
        transactionId: payment.transactionId,
        utr: paymentDetails.utr,
        movieTitle: booking.show.movie.title,
        showDate: booking.show.date,
        showTime: booking.show.showTime,
        seats: booking.seats.map(s => s.seatNumber),
        totalPaid: booking.totalPrice,
        paymentMethod: paymentDetails.method,
        verifiedAt: payment.paymentDetails
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc    Download booking receipt as PDF
// @route   GET /api/bookings/:id/receipt-pdf
// @access  Private
const downloadReceiptPDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Fetch booking with all details
    const booking = await Booking.findOne({
      where: {
        bookingId: id,  // Search by bookingId (the string ID like 'MB-2026-CVADCW'), not numeric id
        userId
      },
      include: [
        {
          model: Show,
          as: 'show',
          include: [{ model: Movie, as: 'movie' }]
        },
        {
          model: Seat,
          as: 'seats',
          through: { attributes: [] }  // Don't include BookingSeat attributes
        },
        { model: Payment, as: 'payment' }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Get user info
    const user = await User.findByPk(userId);

    // Generate PDF (returns PDFDocument directly)
    const { generateReceiptPDF } = require('../utils/pdfService');
    const pdfDoc = generateReceiptPDF(
      booking,
      user,
      booking.show,
      booking.show.movie,
      booking.payment,
      booking.seats
    );

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MovieBook-Receipt-${booking.bookingId}.pdf"`);

    // Pipe PDF to response and end
    pdfDoc.pipe(res);
    pdfDoc.on('end', () => {
      res.end();
    });
    pdfDoc.on('error', (err) => {
      console.error('PDF streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
      }
    });
    pdfDoc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF receipt' });
    }
    next(error);
  }
};

module.exports = { 
  initiateBooking, 
  processPayment, 
  createRazorpayOrder, 
  verifyPayment, 
  cancelBooking, 
  getMyBookings, 
  getBookingById, 
  getAllBookingsAdmin,
  downloadReceiptPDF
};