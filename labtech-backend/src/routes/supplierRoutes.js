const express = require('express');
const Supplier = require('../models/Supplier');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/lab/suppliers - list all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    console.error('Error fetching suppliers', err);
    res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
});

// POST /api/lab/suppliers - create supplier (authenticated)
router.post('/', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    const supplier = new Supplier({
      name: body.name,
      contactPerson: body.contactPerson,
      contactInfo: body.contactInfo || body.email || '',
      email: body.email,
      phone: body.phone,
      address: body.address,
      products: Array.isArray(body.products) ? body.products : [],
      contractStartDate: body.contractStartDate || '',
      contractEndDate: body.contractEndDate || '',
      status: body.status || 'Active',
    });
    const saved = await supplier.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating supplier', err);
    res.status(400).json({ message: 'Failed to create supplier' });
  }
});

// PUT /api/lab/suppliers/:id - update supplier (authenticated)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    const update = {
      name: body.name,
      contactPerson: body.contactPerson,
      contactInfo: body.contactInfo || body.email || '',
      email: body.email,
      phone: body.phone,
      address: body.address,
      products: Array.isArray(body.products) ? body.products : undefined,
      contractStartDate: body.contractStartDate,
      contractEndDate: body.contractEndDate,
      status: body.status,
    };

    const cleanedUpdate = Object.fromEntries(
      Object.entries(update).filter(([, v]) => v !== undefined)
    );

    const updated = await Supplier.findByIdAndUpdate(req.params.id, cleanedUpdate, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating supplier', err);
    res.status(400).json({ message: 'Failed to update supplier' });
  }
});

// DELETE /api/lab/suppliers/:id - delete supplier (authenticated)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deleted = await Supplier.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting supplier', err);
    res.status(400).json({ message: 'Failed to delete supplier' });
  }
});

module.exports = router;
