// models/Booking.js
// Booking model - stores ticket booking records

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bookingId: {
    type: DataTypes.STRING(20),
    unique: true,
    // Auto-generate a unique booking ID like MB-2024-XXXXXX
    defaultValue: () => {
      const year = new Date().getFullYear();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `MB-${year}-${random}`;
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  showId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'shows', key: 'id' }
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  bookingStatus: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'failed'),
    defaultValue: 'pending'
  },
  numberOfSeats: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'bookings'
});

module.exports = Booking;