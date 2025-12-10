const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { createSample, getSamples, updateSampleStatus } = require('../controllers/sampleController');

const router = express.Router();

// List all samples
router.get('/', verifyToken, getSamples);

// Create a new sample from Sample Intake
router.post('/', verifyToken, createSample);

// Update sample status by _id or sampleNumber
router.patch('/:id', verifyToken, updateSampleStatus);

module.exports = router;
