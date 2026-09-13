const express = require('express');
const router = express.Router();
const { getRequests, createRequest, acceptRequest, declineRequest, cancelRequest } = require('../controllers/requestController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

const createRequestValidator = [
  body('receiver_id').notEmpty().withMessage('Receiver is required.'),
  body('request_type').isIn(['learn', 'teach', 'exchange', 'practice']).withMessage('Invalid request type.'),
  body('message').optional().isLength({ max: 500 }).withMessage('Message too long.'),
];

router.get('/', authenticate, getRequests);
router.post('/', authenticate, createRequestValidator, createRequest);
router.put('/:id/accept', authenticate, acceptRequest);
router.put('/:id/decline', authenticate, declineRequest);
router.delete('/:id', authenticate, cancelRequest);

module.exports = router;
