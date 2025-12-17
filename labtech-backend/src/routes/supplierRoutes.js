const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');

const router = express.Router();

router.get('/', verifyToken, requireAdmin, listSuppliers);
router.get('/:id', verifyToken, requireAdmin, getSupplier);
router.post('/', verifyToken, requireAdmin, createSupplier);
router.put('/:id', verifyToken, requireAdmin, updateSupplier);
router.delete('/:id', verifyToken, requireAdmin, deleteSupplier);

module.exports = router;
