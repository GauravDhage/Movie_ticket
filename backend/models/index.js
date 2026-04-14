// models/index.js
// Central file to import all models and define relationships (associations)

const User = require('./User');
const Movie = require('./Movie');
const Show = require('./Show');
const Seat = require('./Seat');
const Booking = require('./Booking');
const BookingSeat = require('./BookingSeat');
const Payment = require('./Payment');

// =============================================
// DEFINE ASSOCIATIONS (Foreign Key Relationships)
// =============================================

// Movie has many Shows
Movie.hasMany(Show, { foreignKey: 'movieId', as: 'shows', onDelete: 'CASCADE' });
Show.belongsTo(Movie, { foreignKey: 'movieId', as: 'movie' });

// Show has many Seats
Show.hasMany(Seat, { foreignKey: 'showId', as: 'seats', onDelete: 'CASCADE' });
Seat.belongsTo(Show, { foreignKey: 'showId', as: 'show' });

// User has many Bookings
User.hasMany(Booking, { foreignKey: 'userId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Show has many Bookings
Show.hasMany(Booking, { foreignKey: 'showId', as: 'bookings' });
Booking.belongsTo(Show, { foreignKey: 'showId', as: 'show' });

// Booking has many BookingSeats (junction)
Booking.hasMany(BookingSeat, { foreignKey: 'bookingId', as: 'bookingSeats', onDelete: 'CASCADE' });
BookingSeat.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

// Seat has many BookingSeats (junction)
Seat.hasMany(BookingSeat, { foreignKey: 'seatId', as: 'bookingSeats' });
BookingSeat.belongsTo(Seat, { foreignKey: 'seatId', as: 'seat' });

// Many-to-Many: Booking <-> Seat through BookingSeat
Booking.belongsToMany(Seat, {
  through: BookingSeat,
  foreignKey: 'bookingId',
  otherKey: 'seatId',
  as: 'seats'
});
Seat.belongsToMany(Booking, {
  through: BookingSeat,
  foreignKey: 'seatId',
  otherKey: 'bookingId',
  as: 'bookings'
});

// Booking has one Payment
Booking.hasOne(Payment, { foreignKey: 'bookingId', as: 'payment', onDelete: 'CASCADE' });
Payment.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

module.exports = { User, Movie, Show, Seat, Booking, BookingSeat, Payment };