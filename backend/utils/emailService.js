// utils/emailService.js
// Email receipt service — sends a beautiful HTML booking receipt

const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransporter({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// @param {Object} opts
// opts.to            — recipient email
// opts.name          — recipient name
// opts.bookingId     — human-readable booking ID (MB-2026-XXXXX)
// opts.transactionId — payment transaction ID
// opts.movieTitle
// opts.date          — show date string (YYYY-MM-DD)
// opts.time          — show time string (HH:MM:SS)
// opts.hall
// opts.seats         — array of seat number strings e.g. ['A1','A2']
// opts.amount        — total amount (number)
// opts.paymentMethod — 'card' | 'upi' | 'netbanking' | 'wallet'
const sendBookingReceipt = async (opts) => {
  const { to, name, bookingId, transactionId, movieTitle, date, time, hall, seats, amount, paymentMethod } = opts;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`📧 [EMAIL SKIPPED — not configured] Receipt for ${bookingId} → ${to}`);
    return;
  }

  // Format date nicely
  const showDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Format time nicely
  const [hh, mm] = (time || '00:00').split(':');
  const hour = parseInt(hh);
  const showTime = `${hour % 12 || 12}:${mm} ${hour < 12 ? 'AM' : 'PM'}`;

  const seatsStr    = (seats || []).join(', ');
  const methodLabel = { card: '💳 Credit/Debit Card', upi: '📱 UPI', netbanking: '🏦 Net Banking', wallet: '👛 Wallet' }[paymentMethod] || paymentMethod;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Booking Receipt — ${bookingId}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#e0e0e8;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr>
    <td style="background:linear-gradient(135deg,#e63946,#9b1c27);border-radius:16px 16px 0 0;padding:32px 36px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🎬</div>
      <h1 style="margin:0;color:#fff;font-size:28px;letter-spacing:3px;font-weight:900;">MOVIEBOOK</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;letter-spacing:1px;">BOOKING CONFIRMED</p>
    </td>
  </tr>

  <!-- GREETING -->
  <tr>
    <td style="background:#13131a;padding:28px 36px 0;border-left:1px solid #2a2a3e;border-right:1px solid #2a2a3e;">
      <p style="margin:0;font-size:16px;">Hi <strong style="color:#fff;">${name}</strong>, your tickets are confirmed! 🎉</p>
      <p style="margin:8px 0 0;color:#888;font-size:13px;">Here is your booking receipt. Please save this email for your records.</p>
    </td>
  </tr>

  <!-- MOVIE TITLE BANNER -->
  <tr>
    <td style="background:#13131a;padding:20px 36px;border-left:1px solid #2a2a3e;border-right:1px solid #2a2a3e;">
      <div style="background:linear-gradient(135deg,#1c1c2e,#16162a);border:1px solid #2a2a3e;border-radius:12px;padding:20px 24px;border-left:4px solid #e63946;">
        <div style="font-size:11px;letter-spacing:2px;color:#e63946;text-transform:uppercase;margin-bottom:6px;">Now Showing</div>
        <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px;">${movieTitle}</div>
        <div style="font-size:13px;color:#888;">${showDate} &nbsp;·&nbsp; ${showTime} &nbsp;·&nbsp; ${hall || 'Main Hall'}</div>
      </div>
    </td>
  </tr>

  <!-- TICKET DETAILS -->
  <tr>
    <td style="background:#13131a;padding:0 36px 8px;border-left:1px solid #2a2a3e;border-right:1px solid #2a2a3e;">
      <table width="100%" cellpadding="0" cellspacing="0">

        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1e1e2e;font-size:13px;color:#888;width:45%;">Booking ID</td>
          <td style="padding:12px 0;border-bottom:1px solid #1e1e2e;font-size:14px;font-weight:700;color:#f4a843;font-family:monospace;text-align:right;">${bookingId}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1e1e2e;font-size:13px;color:#888;">Seats</td>
          <td style="padding:12px 0;border-bottom:1px solid #1e1e2e;font-size:14px;font-weight:600;color:#fff;text-align:right;">${seatsStr}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1e1e2e;font-size:13px;color:#888;">Total Paid</td>
          <td style="padding:12px 0;border-bottom:1px solid #1e1e2e;font-size:18px;font-weight:700;color:#f4a843;text-align:right;">₹${parseFloat(amount).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1e1e2e;font-size:13px;color:#888;">Payment Method</td>
          <td style="padding:12px 0;border-bottom:1px solid #1e1e2e;font-size:13px;color:#fff;text-align:right;">${methodLabel}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;font-size:13px;color:#888;">Transaction ID</td>
          <td style="padding:12px 0;font-size:12px;color:#aaa;font-family:monospace;text-align:right;">${transactionId}</td>
        </tr>

      </table>
    </td>
  </tr>

  <!-- DIVIDER (ticket tear) -->
  <tr>
    <td style="background:#13131a;padding:0 36px;border-left:1px solid #2a2a3e;border-right:1px solid #2a2a3e;">
      <div style="border-top:2px dashed #2a2a3e;margin:8px 0;position:relative;">
        <div style="position:absolute;left:-48px;top:-10px;width:20px;height:20px;background:#0a0a0f;border-radius:50%;"></div>
        <div style="position:absolute;right:-48px;top:-10px;width:20px;height:20px;background:#0a0a0f;border-radius:50%;"></div>
      </div>
    </td>
  </tr>

  <!-- INSTRUCTIONS -->
  <tr>
    <td style="background:#13131a;padding:20px 36px;border-left:1px solid #2a2a3e;border-right:1px solid #2a2a3e;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding:0 8px 0 0;font-size:12px;color:#666;vertical-align:top;">
            📍 <strong style="color:#888;">Arrive early</strong><br>
            Please be at the cinema at least 15 minutes before showtime.
          </td>
          <td width="50%" style="padding:0 0 0 8px;font-size:12px;color:#666;vertical-align:top;">
            🪪 <strong style="color:#888;">Carry valid ID</strong><br>
            Show this email or your Booking ID at the counter.
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#0f0f18;border:1px solid #2a2a3e;border-top:none;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#444;">© 2026 MovieBook &nbsp;·&nbsp; All rights reserved</p>
      <p style="margin:6px 0 0;font-size:11px;color:#333;">This is an automated receipt. Please do not reply to this email.</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || '"MovieBook" <noreply@moviebook.com>',
      to,
      subject: `🎬 Your Tickets — ${movieTitle} [${bookingId}]`,
      html
    });
    console.log(`✅ Receipt emailed to ${to} for booking ${bookingId}`);
  } catch (err) {
    console.error('⚠️  Email receipt failed (non-fatal):', err.message);
  }
};

module.exports = { sendBookingReceipt };