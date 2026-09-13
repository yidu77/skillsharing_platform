const express = require('express');
const router = express.Router();
const { getStats, getAdminUsers, toggleUserSuspension, getAdminSkills, createCategory } = require('../controllers/adminController');
const { getReports, updateReport } = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getAdminUsers);
router.put('/users/:id/suspension', toggleUserSuspension);
router.get('/skills', getAdminSkills);
router.post('/categories', createCategory);
router.get('/reports', getReports);
router.put('/reports/:id', updateReport);

module.exports = router;
