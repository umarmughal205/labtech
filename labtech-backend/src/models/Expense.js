const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    paidBy: { type: String, trim: true }, // person or account
    notes: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    // Optional linkage to user who created/updated
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
