const mongoose = require('mongoose');

const PurchaseOrderItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unitPrice: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    poId: { type: String, required: true, unique: true },
    supplierId: { type: String, required: true },
    supplierName: { type: String, required: true },
    orderDate: { type: String, required: true }, // YYYY-MM-DD
    items: { type: [PurchaseOrderItemSchema], default: [] },
    totalAmount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
