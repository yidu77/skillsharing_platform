const { body } = require('express-validator');

const registerValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Name must be 2–150 characters.'),
];

const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

module.exports = { registerValidator, loginValidator };
