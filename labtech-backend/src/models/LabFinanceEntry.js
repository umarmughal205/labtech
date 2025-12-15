const mongoose = require('mongoose');

const LabFinanceEntrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['income', 'expense'], required: true },
    source: { type: String, enum: ['PO', 'Expense', 'Manual'], required: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    reference: { type: String, trim: true },
    recordedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LabFinanceEntry', LabFinanceEntrySchema);
