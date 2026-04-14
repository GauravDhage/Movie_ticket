// routes/showRoutes.js
const express = require('express');
const router = express.Router();
const { getShowsByMovie, getShowSeats } = require('../controllers/showController');

router.get('/movie/:movieId', getShowsByMovie);
router.get('/:id/seats', getShowSeats);

module.exports = router;