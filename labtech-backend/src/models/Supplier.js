const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => !v || /.+@.+\..+/.test(v),
        message: 'Invalid email format',
      },
    },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    products: [{ type: String, trim: true }],
    contractStartDate: { type: Date },
    contractEndDate: {
      type: Date,
      validate: {
        validator: function (v) {
          if (!v) return true;
          if (!this.contractStartDate) return true;
          return v >= this.contractStartDate;
        },
        message: 'contractEndDate must be >= contractStartDate',
      },
    },
    status: {
      type: String,
      enum: ['Active', 'Expiring', 'Cancelled', 'Inactive'],
      default: 'Inactive',
      index: true,
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

supplierSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
supplierSchema.index({ contractEndDate: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
