const express = require('express');
const InventoryItem = require('../models/InventoryItem');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/lab/inventory - list all inventory items
router.get('/', async (req, res) => {
  try {
    const items = await InventoryItem.find().sort({ name: 1 });
    res.json(items);
  } catch (err) {
    console.error('Error fetching inventory items', err);
    res.status(500).json({ message: 'Failed to fetch inventory items' });
  }
});

// GET /api/lab/inventory/:id - get single inventory item by id
router.get('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.json(item);
  } catch (err) {
    console.error('Error fetching inventory item', err);
    res.status(400).json({ message: 'Failed to fetch inventory item' });
  }
});

// POST /api/lab/inventory - create inventory item (authenticated)
router.post('/', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    const item = new InventoryItem({
      name: body.name,
      category: body.category,
      currentStock: body.currentStock || 0,
      minThreshold: body.minThreshold || 0,
      maxCapacity: body.maxCapacity || 0,
      unit: body.unit,
      costPerUnit: body.costPerUnit || 0,
      supplier: body.supplier || '',
      location: body.location || '',
      expiryDate: body.expiryDate || undefined,
      lastRestocked: body.lastRestocked || undefined,
      packs: body.packs,
      itemsPerPack: body.itemsPerPack,
      salePricePerPack: body.salePricePerPack,
      salePricePerUnit: body.salePricePerUnit,
      buyPricePerPack: body.buyPricePerPack,
      invoiceNumber: body.invoiceNumber,
    });
    const saved = await item.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating inventory item', err);
    res.status(400).json({ message: 'Failed to create inventory item' });
  }
});

// PUT /api/lab/inventory/:id - update inventory item (authenticated)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    const update = {
      name: body.name,
      category: body.category,
      currentStock: body.currentStock,
      minThreshold: body.minThreshold,
      maxCapacity: body.maxCapacity,
      unit: body.unit,
      costPerUnit: body.costPerUnit,
      supplier: body.supplier,
      location: body.location,
      expiryDate: body.expiryDate,
      lastRestocked: body.lastRestocked,
      packs: body.packs,
      itemsPerPack: body.itemsPerPack,
      salePricePerPack: body.salePricePerPack,
      salePricePerUnit: body.salePricePerUnit,
      buyPricePerPack: body.buyPricePerPack,
      invoiceNumber: body.invoiceNumber,
    };

    const cleanedUpdate = Object.fromEntries(
      Object.entries(update).filter(([, v]) => v !== undefined)
    );

    const updated = await InventoryItem.findByIdAndUpdate(req.params.id, cleanedUpdate, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating inventory item', err);
    res.status(400).json({ message: 'Failed to update inventory item' });
  }
});

// DELETE /api/lab/inventory/:id - delete inventory item (authenticated)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deleted = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting inventory item', err);
    res.status(400).json({ message: 'Failed to delete inventory item' });
  }
});

module.exports = router;
