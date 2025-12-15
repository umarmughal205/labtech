const express = require('express');
const router = express.Router();

const { listProfiling, getProfiling, createProfiling, updateProfiling, lookupProfiling } = require('../controllers/profilingController');
const { verifyToken } = require('../middleware/authMiddleware');

// All profiling routes require authentication (lab staff)
router.get('/', verifyToken, listProfiling);
router.get('/lookup', verifyToken, lookupProfiling);
router.get('/:id', verifyToken, getProfiling);
router.post('/', verifyToken, createProfiling);
router.put('/:id', verifyToken, updateProfiling);

module.exports = router;
