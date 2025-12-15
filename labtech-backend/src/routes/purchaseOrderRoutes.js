const express = require('express');
const PurchaseOrder = require('../models/PurchaseOrder');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/lab/purchase-orders - list all POs (optionally filter by supplierId)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.supplierId) {
      filter.supplierId = String(req.query.supplierId);
    }
    const orders = await PurchaseOrder.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching purchase orders', err);
    res.status(500).json({ message: 'Failed to fetch purchase orders' });
  }
});

// GET /api/lab/purchase-orders/:id - get single PO
router.get('/:id', async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    res.json(order);
  } catch (err) {
    console.error('Error fetching purchase order', err);
    res.status(400).json({ message: 'Failed to fetch purchase order' });
  }
});

// POST /api/lab/purchase-orders - create PO (authenticated)
router.post('/', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    const existingCount = await PurchaseOrder.countDocuments();
    const year = new Date().getFullYear();
    const seq = String(existingCount + 1).padStart(3, '0');
    const poId = body.poId || `PO-${year}-${seq}`;
    const orderDate = body.orderDate || new Date().toISOString().slice(0, 10);
    const items = Array.isArray(body.items) ? body.items : [];
    const totalAmount =
      typeof body.totalAmount === 'number'
        ? body.totalAmount
        : items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

    const order = new PurchaseOrder({
      poId,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      orderDate,
      items,
      totalAmount,
      status: body.status || 'Pending',
      notes: body.notes,
    });

    const saved = await order.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating purchase order', err);
    res.status(400).json({ message: 'Failed to create purchase order' });
  }
});

// PUT /api/lab/purchase-orders/:id - update PO (e.g. status)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    const update = {
      status: body.status,
      notes: body.notes,
    };

    const cleaned = Object.fromEntries(
      Object.entries(update).filter(([, v]) => v !== undefined)
    );

    const updated = await PurchaseOrder.findByIdAndUpdate(req.params.id, cleaned, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating purchase order', err);
    res.status(400).json({ message: 'Failed to update purchase order' });
  }
});

module.exports = router;
