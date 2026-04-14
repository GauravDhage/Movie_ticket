// utils/razorpay.js
// Razorpay payment gateway integration

const Razorpay = require('razorpay');

// Initialize Razorpay with API credentials
// Get these from: https://dashboard.razorpay.com/app/keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET'
});

// Create a payment order
// Returns: { id, amount, currency, created_at }
const createPaymentOrder = async (bookingId, amount) => {
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise (1 INR = 100 paise)
      currency: 'INR',
      receipt: `booking_${bookingId}_${Date.now()}`,
      notes: {
        bookingId: bookingId
      }
    });

    return {
      success: true,
      orderId: order.id,
      amount: order.amount / 100,
      currency: order.currency
    };
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    return {
      success: false,
      message: 'Failed to create payment order'
    };
  }
};

// Verify payment signature (ensures payment is real and from Razorpay)
// This is CRITICAL for security - prevents fake payments
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const crypto = require('crypto');
    
    // Expected signature format: HMAC-SHA256(order_id|payment_id, key_secret)
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
    hmac.update(`${orderId}|${paymentId}`);
    const expectedSignature = hmac.digest('hex');

    // Compare signatures (use timing-safe comparison to prevent timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    return isValid;
  } catch (error) {
    console.error('Payment Signature Verification Error:', error);
    return false;
  }
};

// Fetch payment details from Razorpay (to get UTR and confirm amount)
const fetchPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);

    return {
      success: true,
      id: payment.id,
      orderId: payment.order_id,
      amount: payment.amount / 100, // Convert from paise to INR
      currency: payment.currency,
      status: payment.status, // 'captured', 'authorized', 'failed', etc.
      method: payment.method, // 'upi', 'card', 'netbanking', etc.
      utr: payment.vpa || payment.acquirer_data?.upi_transaction_id || payment.id, // UTR for UPI payments
      email: payment.email,
      contact: payment.contact,
      createdAt: new Date(payment.created_at * 1000)
    };
  } catch (error) {
    console.error('Razorpay Payment Fetch Error:', error);
    return {
      success: false,
      message: 'Failed to fetch payment details'
    };
  }
};

module.exports = {
  razorpay,
  createPaymentOrder,
  verifyPaymentSignature,
  fetchPaymentDetails
};
