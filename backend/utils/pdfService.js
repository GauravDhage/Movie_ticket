// utils/pdfService.js
// Generate professional PDF receipts for bookings

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate a professional PDF receipt
const generateReceiptPDF = (booking, user, show, movie, payment, seats) => {
  try {
    // Create PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    // Set up colors
    const primaryColor = '#e63946';  // Red
    const accentColor = '#f1faee';   // Light
    const darkColor = '#1d3557';     // Dark blue
    const goldColor = '#f4a843';     // Gold

    // ─── HEADER ─────────────────────────────────────
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fill(darkColor)
      .text('MOVIEBOOK', 50, 40);
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .fill('#666')
      .text('Cinema Booking Confirmation • Ticket Receipt', 50, 70);

    doc.moveTo(50, 90).lineTo(550, 90).stroke('#ddd');

      // ─── BOOKING ID & STATUS ────────────────────────
      doc
        .fontSize(9)
        .font('Helvetica')
        .fill('#666')
        .text('Booking ID', 50, 110);
      
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fill(goldColor)
        .text(booking.bookingId, 50, 125);

      // Status badge
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fill('#fff')
        .rect(450, 110, 100, 28)
        .fill(primaryColor)
        .text('✓ CONFIRMED', 450, 113);

      // ─── CUSTOMER INFO ──────────────────────────────
      doc.moveTo(50, 160).lineTo(550, 160).stroke('#ddd');
      
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text('Booking Details', 50, 175);

      let yPos = 195;
      const customerInfo = [
        ['Customer Name', user.name],
        ['Email', user.email],
        ['Booking Date', new Date(booking.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })]
      ];

      customerInfo.forEach(([label, value]) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fill('#999')
          .text(label + ':', 50, yPos);
        
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fill('#333')
          .text(value, 200, yPos);
        
        yPos += 20;
      });

      // ─── MOVIE & SHOW DETAILS ───────────────────────
      doc.moveTo(50, yPos + 10).lineTo(550, yPos + 10).stroke('#ddd');
      yPos += 30;

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text('Show Details', 50, yPos);

      yPos += 25;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fill('#999')
        .text('Movie Title:', 50, yPos);
      
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text(movie.title, 200, yPos);

      yPos += 25;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fill('#999')
        .text('Date & Time:', 50, yPos);
      
      const showDate = new Date(show.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const showTimeFormatted = formatShowTime(show.showTime);
      
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text(`${showDate} at ${showTimeFormatted}`, 200, yPos);

      yPos += 25;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fill('#999')
        .text('Hall / Theater:', 50, yPos);
      
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text(show.hall || 'Main Hall', 200, yPos);

      // ─── SEAT INFORMATION ───────────────────────────
      yPos += 40;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke('#ddd');
      yPos += 20;

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text('Seats Booked', 50, yPos);

      yPos += 25;

      const seatNumbers = seats.map(s => s.seatNumber).join(', ');
      doc
        .fontSize(9)
        .font('Helvetica')
        .fill('#999')
        .text('Seat Numbers:', 50, yPos);
      
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fill(primaryColor)
        .text(seatNumbers, 200, yPos);

      yPos += 30;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fill('#999')
        .text('Number of Seats:', 50, yPos);
      
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text(seats.length.toString(), 200, yPos);

      // ─── PRICE BREAKDOWN ────────────────────────────
      yPos += 40;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke('#ddd');
      yPos += 20;

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text('Payment Details', 50, yPos);

      yPos += 25;

      const seatBreakdown = seats.map(s => ({
        seat: s.seatNumber,
        type: s.seatType,
        price: s.price
      }));

      // Individual seat prices
      seatBreakdown.forEach((item, idx) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fill('#999')
          .text(`${item.seat} (${item.type.toUpperCase()})`, 50, yPos);
        
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fill('#333')
          .text(`₹${parseFloat(item.price).toLocaleString('en-IN')}`, 450, yPos, { align: 'right' });
        
        yPos += 18;
      });

      yPos += 5;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke('#ddd');
      yPos += 15;

      // Total
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text('Total Amount Paid:', 50, yPos);
      
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fill(goldColor)
        .text(`₹${parseFloat(booking.totalPrice).toLocaleString('en-IN')}`, 450, yPos - 3, { align: 'right' });

      // ─── PAYMENT INFO ───────────────────────────────
      yPos += 40;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke('#ddd');
      yPos += 20;

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text('Transaction Information', 50, yPos);

      yPos += 25;

      const paymentDetails = JSON.parse(payment?.paymentDetails || '{}');

      const paymentInfo = [
        ['Payment Method', (payment?.paymentMethod || 'UPI').toUpperCase()],
        ['Transaction ID', payment?.transactionId || 'N/A'],
        ['UTR/Reference', paymentDetails.upiRef || 'N/A'],
        ['Payment Status', (payment?.status || 'completed').toUpperCase()]
      ];

      paymentInfo.forEach(([label, value]) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fill('#999')
          .text(label + ':', 50, yPos);
        
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fill('#333')
          .text(value, 250, yPos);
        
        yPos += 18;
      });

      // ─── FOOTER / INSTRUCTIONS ──────────────────────
      const footerY = 750;
      doc.moveTo(50, footerY).lineTo(550, footerY).stroke('#ddd');

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fill(darkColor)
        .text('Important Instructions', 50, footerY + 15);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fill('#666')
        .text('✓ Arrive 15 minutes before showtime', 50, footerY + 35)
        .text('✓ Bring valid ID proof for verification', 50, footerY + 53)
        .text('✓ This ticket is valid for one person only', 50, footerY + 71)
        .text('✓ All sales are final unless show is cancelled', 50, footerY + 89);

      // ─── BOTTOM INFO ────────────────────────────────
      doc
        .fontSize(8)
        .font('Helvetica')
        .fill('#999')
        .text('Generated: ' + new Date().toLocaleString('en-IN'), 50, 770);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fill('#999')
        .text('© 2026 MovieBook • All Rights Reserved', 50, 780, { align: 'center' });

      // Return the PDF document for streaming
      return doc;
    } catch (err) {
      console.error('PDF generation error:', err);
      throw err;
    }
};

// Format time HH:MM:SS to readable format
function formatShowTime(timeStr) {
  if (!timeStr) return 'N/A';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const mm = minutes || '00';
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${mm} ${period}`;
}

module.exports = { generateReceiptPDF };
