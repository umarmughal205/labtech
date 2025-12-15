const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '' },
    contactInfo: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    products: { type: [String], default: [] },
    contractStartDate: { type: String, default: '' }, // YYYY-MM-DD from UI
    contractEndDate: { type: String, default: '' },   // YYYY-MM-DD from UI
    status: {
      type: String,
      enum: ['Active', 'Expiring', 'Inactive', 'Cancelled'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', SupplierSchema);
