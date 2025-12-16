const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const LabExpense = require('../models/LabExpense');
const LabFinanceEntry = require('../models/LabFinanceEntry');
const InventoryItem = require('../models/InventoryItem');

const router = express.Router();

// GET /api/lab/expenses
// Optional query: category, from, to
router.get('/', verifyToken, async (req, res) => {
  try {
    const { category, from, to } = req.query || {};
    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const entries = await LabExpense.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    return res.json(entries);
  } catch (err) {
    console.error('Error fetching lab expenses:', err);
    return res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// POST /api/lab/expenses
router.post('/', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};

    const entry = await LabExpense.create({
      category: body.category,
      description: body.description,
      amount: Number(body.amount) || 0,
      date: body.date ? new Date(body.date) : new Date(),
      reference: body.reference,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      inventoryItemId: body.inventoryItemId,
      inventoryItemName: body.inventoryItemName,
      quantity: body.quantity != null ? Number(body.quantity) || 0 : undefined,
      recordedBy: req.user && (req.user.name || req.user.id || req.user._id) ? String(req.user.name || req.user.id || req.user._id) : undefined,
    });

    // If this expense is linked to an inventory item, increase its stock
    try {
      if (body.inventoryItemId && body.quantity != null) {
        const qty = Number(body.quantity) || 0;
        if (qty > 0) {
          const item = await InventoryItem.findById(body.inventoryItemId);
          if (item) {
            const current = Number(item.currentStock) || 0;
            item.currentStock = current + qty;
            item.lastRestocked = new Date();
            await item.save();
          }
        }
      }
    } catch (invErr) {
      console.error('Failed to apply inventory stock increase from expense:', invErr);
      // Do not fail the main expense creation because of inventory issues
    }

    // Also create a finance ledger entry so this expense appears in Finance dashboard
    try {
      const finDescriptionParts = [];
      if (body.description) finDescriptionParts.push(body.description);
      if (body.supplierName) finDescriptionParts.push(`Supplier: ${body.supplierName}`);
      if (body.inventoryItemName) {
        finDescriptionParts.push(`Item: ${body.inventoryItemName}${body.quantity ? ` x${body.quantity}` : ''}`);
      }
      const finDescription = finDescriptionParts.join(' | ') || 'Lab expense';

      await LabFinanceEntry.create({
        type: 'expense',
        source: 'Expense',
        category: body.category,
        description: finDescription,
        amount: Number(body.amount) || 0,
        date: body.date ? new Date(body.date) : new Date(),
        reference: entry._id ? String(entry._id) : body.reference,
        recordedBy: entry.recordedBy,
      });
    } catch (finErr) {
      console.error('Failed to mirror lab expense into finance ledger:', finErr);
      // Do not fail the main expense creation because of finance ledger issues
    }

    return res.status(201).json(entry);
  } catch (err) {
    console.error('Error creating lab expense:', err);
    return res.status(500).json({ message: 'Failed to create expense' });
  }
});

// DELETE /api/lab/expenses/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ message: 'Missing expense id' });
    }

    const deleted = await LabExpense.findByIdAndDelete(id).lean();
    if (!deleted) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Best-effort: also remove mirrored finance ledger entry for this expense
    try {
      await LabFinanceEntry.findOneAndDelete({ reference: String(id) }).lean();
    } catch (finErr) {
      console.error('Failed to delete mirrored finance entry for expense:', finErr);
      // Do not fail the main delete because of finance sync issues
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting lab expense:', err);
    return res.status(500).json({ message: 'Failed to delete expense' });
  }
});

// PUT /api/lab/expenses/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ message: 'Missing expense id' });
    }

    const body = req.body || {};

    const update = {};
    if (body.category !== undefined) update.category = body.category;
    if (body.description !== undefined) update.description = body.description;
    if (body.amount !== undefined) update.amount = Number(body.amount) || 0;
    if (body.date !== undefined) update.date = new Date(body.date);
    if (body.reference !== undefined) update.reference = body.reference;

    const updated = await LabExpense.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Try to keep the mirrored finance entry in sync
    try {
      const finUpdate = {
        category: updated.category,
        description: updated.description,
        amount: Number(updated.amount) || 0,
        date: updated.date,
      };
      await LabFinanceEntry.findOneAndUpdate({ reference: String(id) }, finUpdate).lean();
    } catch (finErr) {
      console.error('Failed to update mirrored finance entry for expense:', finErr);
      // Do not fail the main update because of finance sync issues
    }

    return res.json(updated);
  } catch (err) {
    console.error('Error updating lab expense:', err);
    return res.status(500).json({ message: 'Failed to update expense' });
  }
});

module.exports = router;
