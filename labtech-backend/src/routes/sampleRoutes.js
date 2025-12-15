const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { createSample, getSamples, updateSampleStatus, getSampleById, getLatestTestResult } = require('../controllers/sampleController');

const router = express.Router();

// List all samples
router.get('/', verifyToken, getSamples);

// Create a new sample from Sample Intake
router.post('/', verifyToken, createSample);

// Get a sample by id
router.get('/:id', verifyToken, getSampleById);

// Get latest test result by sample id or sampleNumber
router.get('/:id/test-result', verifyToken, getLatestTestResult);

// Update sample status by _id or sampleNumber
router.patch('/:id', verifyToken, updateSampleStatus);

module.exports = router;
