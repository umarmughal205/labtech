const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { createExpense, listExpenses, getExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');

const router = express.Router();

router.get('/', verifyToken, requireAdmin, listExpenses);
router.post('/', verifyToken, requireAdmin, createExpense);
router.get('/:id', verifyToken, requireAdmin, getExpense);
router.put('/:id', verifyToken, requireAdmin, updateExpense);
router.delete('/:id', verifyToken, requireAdmin, deleteExpense);

module.exports = router;
