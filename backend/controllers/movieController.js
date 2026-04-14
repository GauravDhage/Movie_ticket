// controllers/movieController.js
// Handles all movie-related operations

const { Movie, Show } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all active movies (with optional search/filter)
// @route   GET /api/movies
// @access  Public
const getMovies = async (req, res, next) => {
  try {
    const { search, genre, language, page = 1, limit = 12 } = req.query;

    // Build where clause for filters
    const where = { isActive: true };

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { cast: { [Op.like]: `%${search}%` } }
      ];
    }
    if (genre) where.genre = { [Op.like]: `%${genre}%` };
    if (language) where.language = language;

    const offset = (page - 1) * limit;

    const { count, rows: movies } = await Movie.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        movies,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single movie by ID
// @route   GET /api/movies/:id
// @access  Public
const getMovieById = async (req, res, next) => {
  try {
    const movie = await Movie.findOne({
      where: { id: req.params.id, isActive: true },
      include: [{
        model: Show,
        as: 'shows',
        where: { isActive: true, date: { [Op.gte]: new Date().toISOString().split('T')[0] } },
        required: false,
        order: [['date', 'ASC'], ['showTime', 'ASC']]
      }]
    });

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found.' });
    }

    res.json({ success: true, data: movie });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available genres list
// @route   GET /api/movies/genres
// @access  Public
const getGenres = async (req, res, next) => {
  try {
    const movies = await Movie.findAll({
      attributes: ['genre'],
      where: { isActive: true },
      group: ['genre']
    });

    const genres = [...new Set(
      movies.map(m => m.genre).filter(Boolean).flatMap(g => g.split(',').map(s => s.trim()))
    )];

    res.json({ success: true, data: genres });
  } catch (error) {
    next(error);
  }
};

// ======================== ADMIN ONLY ========================

// @desc    Create a new movie
// @route   POST /api/admin/movies
// @access  Admin
const createMovie = async (req, res, next) => {
  try {
    const { title, description, duration, rating, genre, language, posterUrl, trailerUrl, releaseDate, cast, ticketPrice } = req.body;

    if (!title || !duration) {
      return res.status(400).json({ success: false, message: 'Title and duration are required.' });
    }

    const movie = await Movie.create({
      title, description, duration, rating, genre, language,
      posterUrl, trailerUrl, releaseDate, cast, ticketPrice
    });

    res.status(201).json({ success: true, message: 'Movie created successfully!', data: movie });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a movie
// @route   PUT /api/admin/movies/:id
// @access  Admin
const updateMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findByPk(req.params.id);

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found.' });
    }

    await movie.update(req.body);
    res.json({ success: true, message: 'Movie updated successfully!', data: movie });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete (deactivate) a movie
// @route   DELETE /api/admin/movies/:id
// @access  Admin
const deleteMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findByPk(req.params.id);

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found.' });
    }

    // Soft delete - just set isActive to false
    await movie.update({ isActive: false });
    res.json({ success: true, message: 'Movie deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ALL movies including inactive (admin)
// @route   GET /api/admin/movies
// @access  Admin
const getAllMoviesAdmin = async (req, res, next) => {
  try {
    const movies = await Movie.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: movies });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMovies, getMovieById, getGenres, createMovie, updateMovie, deleteMovie, getAllMoviesAdmin };