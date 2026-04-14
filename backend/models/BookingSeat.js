// models/BookingSeat.js
// Junction table linking bookings to specific seats

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BookingSeat = sequelize.define('BookingSeat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'bookings', key: 'id' }
  },
  seatId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'seats', key: 'id' }
  }
}, {
  tableName: 'booking_seats'
});

module.exports = BookingSeat;