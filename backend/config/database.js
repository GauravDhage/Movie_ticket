// config/database.js
// Sequelize ORM configuration for MySQL connection

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance with MySQL connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'movie_booking_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,       // Maximum number of connections
      min: 0,        // Minimum number of connections
      acquire: 30000, // Max time (ms) to wait for connection
      idle: 10000    // Time (ms) before idle connection is released
    },
    define: {
      timestamps: true,        // Add createdAt/updatedAt automatically
      underscored: false,      // Use camelCase column names
      freezeTableName: false   // Allow Sequelize to pluralize table names
    }
  }
);

// Test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1); // Exit process if DB fails
  }
};

module.exports = { sequelize, connectDB };