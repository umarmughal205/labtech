const Expense = require('../models/Expense');

async function createExpense(req, res) {
  try {
    const body = req.body || {};
    const doc = await Expense.create({
      title: body.title,
      category: body.category,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
      paidBy: body.paidBy,
      notes: body.notes,
      tags: Array.isArray(body.tags) ? body.tags : [],
      createdBy: req.user?._id || undefined,
    });
    return res.status(201).json({ success: true, expense: doc });
  } catch (err) {
    console.error('createExpense error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
}

async function listExpenses(req, res) {
  try {
    const { page = 1, limit = 50, from, to, category, q } = req.query || {};
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (category) filter.category = category;
    if (q) {
      filter.$or = [
        { title: { $regex: String(q), $options: 'i' } },
        { notes: { $regex: String(q), $options: 'i' } },
        { tags: { $in: [String(q)] } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [rows, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Expense.countDocuments(filter),
    ]);
    res.setHeader('X-Total-Count', String(total));
    return res.json({ success: true, expenses: rows, total });
  } catch (err) {
    console.error('listExpenses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list expenses' });
  }
}

async function getExpense(req, res) {
  try {
    const { id } = req.params || {};
    const doc = await Expense.findById(id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, expense: doc });
  } catch (err) {
    console.error('getExpense error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get expense' });
  }
}

async function updateExpense(req, res) {
  try {
    const { id } = req.params || {};
    const body = req.body || {};
    const doc = await Expense.findByIdAndUpdate(
      id,
      {
        $set: {
          title: body.title,
          category: body.category,
          amount: body.amount,
          date: body.date ? new Date(body.date) : undefined,
          paidBy: body.paidBy,
          notes: body.notes,
          tags: Array.isArray(body.tags) ? body.tags : undefined,
        },
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, expense: doc });
  } catch (err) {
    console.error('updateExpense error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
}

async function deleteExpense(req, res) {
  try {
    const { id } = req.params || {};
    const doc = await Expense.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteExpense error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
}

module.exports = { createExpense, listExpenses, getExpense, updateExpense, deleteExpense };
