// models/Payment.js
// Payment model - stores payment transaction records

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
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
  transactionId: {
    type: DataTypes.STRING(50),
    unique: true,
    defaultValue: () => {
      return 'TXN' + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('card', 'upi', 'netbanking', 'wallet'),
    defaultValue: 'card',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  paymentDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('paymentDetails');
      try { return val ? JSON.parse(val) : {}; } catch { return {}; }
    },
    set(val) {
      this.setDataValue('paymentDetails', val ? JSON.stringify(val) : null);
    }
  }
}, {
  tableName: 'payments',
  // Tell Sequelize the exact column names in the DB match the field names above
  underscored: false
});

module.exports = Payment;