const express = require('express');
const contactController = require('../controllers/contactController');
const { asyncHandler } = require('../../shared/utils/helpers');

const router = express.Router();

/**
 * Contact routes - maps HTTP endpoints to controller methods.
 * Uses asyncHandler to catch async errors and pass them to Express error middleware.
 */

router.get('/', asyncHandler((req, res) => contactController.list(req, res)));
router.get('/:id', asyncHandler((req, res) => contactController.getById(req, res)));
router.post('/', asyncHandler((req, res) => contactController.create(req, res)));
router.patch('/:id', asyncHandler((req, res) => contactController.update(req, res)));
router.delete('/:id', asyncHandler((req, res) => contactController.delete(req, res)));

module.exports = router;
