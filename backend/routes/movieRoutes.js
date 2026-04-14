// routes/movieRoutes.js
const express = require('express');
const router = express.Router();
const {
  getMovies, getMovieById, getGenres
} = require('../controllers/movieController');

// Public routes
router.get('/', getMovies);
router.get('/genres', getGenres);
router.get('/:id', getMovieById);

module.exports = router;