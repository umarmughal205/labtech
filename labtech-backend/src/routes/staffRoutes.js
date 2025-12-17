const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { createStaff, listStaff, getStaff, updateStaff, deleteStaff } = require('../controllers/staffController');

const router = express.Router();

router.get('/', verifyToken, requireAdmin, listStaff);
router.post('/', verifyToken, requireAdmin, createStaff);
router.get('/:id', verifyToken, requireAdmin, getStaff);
router.put('/:id', verifyToken, requireAdmin, updateStaff);
router.delete('/:id', verifyToken, requireAdmin, deleteStaff);

module.exports = router;
