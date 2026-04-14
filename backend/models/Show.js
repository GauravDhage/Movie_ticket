// models/Show.js
// Show model - stores movie show timings

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Show = sequelize.define('Show', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  movieId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'movies', key: 'id' }
  },
  showTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  hall: {
    type: DataTypes.STRING(50),
    defaultValue: 'Hall 1'
  },
  totalSeats: {
    type: DataTypes.INTEGER,
    defaultValue: 60
  },
  availableSeats: {
    type: DataTypes.INTEGER,
    defaultValue: 60
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'shows'
});

module.exports = Show;