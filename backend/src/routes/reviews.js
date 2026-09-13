const express = require('express');
const router = express.Router();
const { createReview, getSessionReviews, checkReview } = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

const reviewValidator = [
  body('session_id').notEmpty().withMessage('Session ID required.'),
  body('reviewee_id').notEmpty().withMessage('Reviewee required.'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5.'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment too long.'),
];

router.post('/', authenticate, reviewValidator, createReview);
router.get('/session/:session_id', authenticate, getSessionReviews);
router.get('/session/:session_id/check', authenticate, checkReview);

module.exports = router;
