const express = require('express');
const router = express.Router();
const { getUsers, getUserById, updateUser, getUserReviews, updateInterests } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

const updateValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 150 }),
  body('preferred_interaction').optional().isIn(['online', 'in-person', 'both']),
];

router.get('/', authenticate, getUsers);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, updateValidator, updateUser);
router.get('/:id/reviews', authenticate, getUserReviews);
router.put('/me/interests', authenticate, updateInterests);

module.exports = router;
