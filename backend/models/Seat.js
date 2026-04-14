// models/Seat.js
// Seat model - individual seat records per show

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Seat = sequelize.define('Seat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  showId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'shows', key: 'id' }
  },
  seatNumber: {
    type: DataTypes.STRING(10), // e.g., A1, B5, C12
    allowNull: false
  },
  row: {
    type: DataTypes.STRING(5), // e.g., A, B, C
    allowNull: false
  },
  seatType: {
    type: DataTypes.ENUM('regular', 'premium', 'vip'),
    defaultValue: 'regular'
  },
  status: {
    type: DataTypes.ENUM('available', 'booked', 'reserved', 'blocked'),
    defaultValue: 'available'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 250.00
  }
}, {
  tableName: 'seats',
  indexes: [
    {
      unique: true,
      fields: ['showId', 'seatNumber'] // Ensure no duplicate seats per show
    }
  ]
});

module.exports = Seat;