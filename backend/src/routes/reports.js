const express = require('express');
const router = express.Router();
const { createReport } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

const reportValidator = [
  body('reported_user_id').notEmpty().withMessage('User to report is required.'),
  body('reason').isIn(['inappropriate_behavior', 'harassment', 'spam', 'fake_profile', 'no_show', 'other'])
    .withMessage('Invalid reason.'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long.'),
];

router.post('/', authenticate, reportValidator, createReport);

module.exports = router;
