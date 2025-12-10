const express = require('express');
const router = express.Router();

const { getSettings, updateSettings } = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public GET for now (labweb may not send auth yet). If you want to restrict later,
// you can add verifyToken/requireAdmin here as well.
router.get('/', getSettings);

// Admin-only update of settings
router.put('/', verifyToken, requireAdmin, updateSettings);

module.exports = router;
