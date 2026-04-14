// controllers/showController.js
// Handles show timings and seat layout generation

const { Show, Movie, Seat } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Generate seat layout for a show (rows A-E, 12 seats each = 60 seats)
const generateSeats = async (showId, ticketPrice = 250) => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seatsPerRow = 10;
  const seats = [];

  for (const row of rows) {
    for (let col = 1; col <= seatsPerRow; col++) {
      const seatNumber = `${row}${col}`;

      // Different seat types and pricing
      let seatType = 'regular';
      let price = ticketPrice;

      if (row === 'A') { seatType = 'vip'; price = ticketPrice * 2; }
      else if (row === 'B') { seatType = 'premium'; price = ticketPrice * 1.5; }

      seats.push({
        showId,
        seatNumber,
        row,
        seatType,
        status: 'available',
        price
      });
    }
  }

  await Seat.bulkCreate(seats);
};

// @desc    Get shows for a specific movie
// @route   GET /api/shows/movie/:movieId
// @access  Public
const getShowsByMovie = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const { date } = req.query;

    const where = {
      movieId,
      isActive: true,
      date: { [Op.gte]: new Date().toISOString().split('T')[0] }
    };

    if (date) where.date = date;

    const shows = await Show.findAll({
      where,
      include: [{ model: Movie, as: 'movie', attributes: ['title', 'duration', 'rating', 'posterUrl', 'ticketPrice'] }],
      order: [['date', 'ASC'], ['showTime', 'ASC']]
    });

    res.json({ success: true, data: shows });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single show with seat layout
// @route   GET /api/shows/:id/seats
// @access  Public
const getShowSeats = async (req, res, next) => {
  try {
    const show = await Show.findOne({
      where: { id: req.params.id, isActive: true },
      include: [
        { model: Movie, as: 'movie' },
        {
          model: Seat, as: 'seats',
          order: [['row', 'ASC'], ['seatNumber', 'ASC']]
        }
      ]
    });

    if (!show) {
      return res.status(404).json({ success: false, message: 'Show not found.' });
    }

    // Group seats by row for frontend rendering
    const seatsByRow = {};
    show.seats.forEach(seat => {
      if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
      seatsByRow[seat.row].push(seat);
    });

    res.json({
      success: true,
      data: {
        show: {
          id: show.id,
          date: show.date,
          showTime: show.showTime,
          hall: show.hall,
          availableSeats: show.availableSeats,
          totalSeats: show.totalSeats,
          movie: show.movie
        },
        seatsByRow
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new show (Admin)
// @route   POST /api/admin/shows
// @access  Admin
const createShow = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { movieId, showTime, date, hall } = req.body;

    if (!movieId || !showTime || !date) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'MovieId, showTime, and date are required.' });
    }

    const movie = await Movie.findByPk(movieId);
    if (!movie) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Movie not found.' });
    }

    // Check for duplicate show (same movie, date, time, hall)
    const existing = await Show.findOne({ where: { movieId, date, showTime, hall: hall || 'Hall 1' } });
    if (existing) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: 'A show already exists at this time.' });
    }

    const show = await Show.create(
      { movieId, showTime, date, hall: hall || 'Hall 1', totalSeats: 60, availableSeats: 60 },
      { transaction }
    );

    // Auto-generate seat layout for this show
    await generateSeats(show.id, parseFloat(movie.ticketPrice));

    await transaction.commit();

    res.status(201).json({ success: true, message: 'Show created with seats!', data: show });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc    Update show
// @route   PUT /api/admin/shows/:id
// @access  Admin
const updateShow = async (req, res, next) => {
  try {
    const show = await Show.findByPk(req.params.id);
    if (!show) return res.status(404).json({ success: false, message: 'Show not found.' });

    await show.update(req.body);
    res.json({ success: true, message: 'Show updated!', data: show });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete show
// @route   DELETE /api/admin/shows/:id
// @access  Admin
const deleteShow = async (req, res, next) => {
  try {
    const show = await Show.findByPk(req.params.id);
    if (!show) return res.status(404).json({ success: false, message: 'Show not found.' });

    await show.update({ isActive: false });
    res.json({ success: true, message: 'Show deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all shows (Admin)
// @route   GET /api/admin/shows
// @access  Admin
const getAllShowsAdmin = async (req, res, next) => {
  try {
    const shows = await Show.findAll({
      include: [{ model: Movie, as: 'movie', attributes: ['id', 'title', 'posterUrl'] }],
      order: [['date', 'DESC'], ['showTime', 'ASC']]
    });
    res.json({ success: true, data: shows });
  } catch (error) {
    next(error);
  }
};

module.exports = { getShowsByMovie, getShowSeats, createShow, updateShow, deleteShow, getAllShowsAdmin };