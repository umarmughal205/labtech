const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { markAttendance, getDaily, getMonthly, exportMonthlyCSV, getSettings, updateSettings } = require('../controllers/attendanceController');

const router = express.Router();

// Attendance marking and views
router.post('/mark', verifyToken, requireAdmin, markAttendance);
router.get('/daily', verifyToken, requireAdmin, getDaily);
router.get('/monthly', verifyToken, requireAdmin, getMonthly);
router.get('/monthly/export', verifyToken, requireAdmin, exportMonthlyCSV);

// Settings
router.get('/settings', verifyToken, requireAdmin, getSettings);
router.put('/settings', verifyToken, requireAdmin, updateSettings);

module.exports = router;
