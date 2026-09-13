const express = require('express');
const router = express.Router();
const {
  getSessions, proposeSession, updateSession, confirmSession,
  counterSession, completeSession, cancelSession, noShowSession
} = require('../controllers/sessionController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

const proposeValidator = [
  body('participant_id').notEmpty().withMessage('Participant is required.'),
  body('scheduled_date').isDate().withMessage('Valid date required (YYYY-MM-DD).'),
  body('scheduled_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time required (HH:MM).'),
  body('interaction_type').optional().isIn(['online', 'in-person']),
];

router.get('/', authenticate, getSessions);
router.post('/', authenticate, proposeValidator, proposeSession);
router.put('/:id', authenticate, updateSession);
router.put('/:id/confirm', authenticate, confirmSession);
router.put('/:id/counter', authenticate, counterSession);
router.put('/:id/complete', authenticate, completeSession);
router.put('/:id/cancel', authenticate, cancelSession);
router.put('/:id/no-show', authenticate, noShowSession);

module.exports = router;
