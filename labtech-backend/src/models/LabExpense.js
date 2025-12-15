const mongoose = require('mongoose');

const LabExpenseSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    reference: { type: String, trim: true },
    supplierId: { type: String, trim: true },
    supplierName: { type: String, trim: true },
    inventoryItemId: { type: String, trim: true },
    inventoryItemName: { type: String, trim: true },
    quantity: { type: Number, min: 0 },
    recordedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LabExpense', LabExpenseSchema);
