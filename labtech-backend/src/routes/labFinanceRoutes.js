const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const LabFinanceEntry = require('../models/LabFinanceEntry');

const router = express.Router();

// GET /api/lab/finance
// Optional query: type, category, from, to
router.get('/', verifyToken, async (req, res) => {
  try {
    const { type, category, from, to } = req.query || {};
    const filter = {};

    if (type && (type === 'income' || type === 'expense')) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const entries = await LabFinanceEntry.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    return res.json(entries);
  } catch (err) {
    console.error('Error fetching lab finance entries:', err);
    return res.status(500).json({ message: 'Failed to fetch finance entries' });
  }
});

// POST /api/lab/finance
router.post('/', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};

    const entry = await LabFinanceEntry.create({
      type: body.type,
      source: body.source || 'Manual',
      category: body.category,
      description: body.description,
      amount: Number(body.amount) || 0,
      date: body.date ? new Date(body.date) : new Date(),
      reference: body.reference,
      recordedBy: req.user && (req.user.name || req.user.id || req.user._id) ? String(req.user.name || req.user.id || req.user._id) : undefined,
    });

    return res.status(201).json(entry);
  } catch (err) {
    console.error('Error creating lab finance entry:', err);
    return res.status(500).json({ message: 'Failed to create finance entry' });
  }
});

// DELETE /api/lab/finance/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ message: 'Missing entry id' });
    }

    const deleted = await LabFinanceEntry.findByIdAndDelete(id).lean();
    if (!deleted) {
      return res.status(404).json({ message: 'Finance entry not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting lab finance entry:', err);
    return res.status(500).json({ message: 'Failed to delete finance entry' });
  }
});

module.exports = router;
