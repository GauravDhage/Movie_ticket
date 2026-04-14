// models/Movie.js
// Movie model - stores movie information

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Movie = sequelize.define('Movie', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in minutes
    allowNull: false,
    validate: {
      min: 1
    }
  },
  rating: {
    type: DataTypes.DECIMAL(3, 1), // e.g., 8.5
    allowNull: true,
    validate: {
      min: 0,
      max: 10
    }
  },
  genre: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(50),
    defaultValue: 'English'
  },
  posterUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  trailerUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  releaseDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  cast: {
    type: DataTypes.TEXT, // Store as JSON string
    allowNull: true,
    get() {
      const val = this.getDataValue('cast');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('cast', JSON.stringify(val));
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  ticketPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 250.00
  }
}, {
  tableName: 'movies'
});

module.exports = Movie;