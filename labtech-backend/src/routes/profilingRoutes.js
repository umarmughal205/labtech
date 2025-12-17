const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { searchProfiling, lookupProfiling } = require('../controllers/profilingController');

const router = express.Router();

// GET /api/profiling/search?name=&cnic=&service=
router.get('/search', verifyToken, requireAdmin, searchProfiling);

// Lookup by CNIC or phone (used for Sample Intake autofill)
router.get('/lookup', verifyToken, lookupProfiling);

module.exports = router;
