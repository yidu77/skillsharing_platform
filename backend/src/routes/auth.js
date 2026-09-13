const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../validators/authValidators');

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
