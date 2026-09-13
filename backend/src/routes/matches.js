const express = require('express');
const router = express.Router();
const { getMatches } = require('../controllers/matchController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getMatches);

module.exports = router;
