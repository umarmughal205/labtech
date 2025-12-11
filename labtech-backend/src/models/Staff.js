const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true, index: true },
    cnic: { type: String, trim: true, index: true },
    salary: { type: Number, default: 0 },
    // per-staff attendance deductions (override global settings if set)
    lateDeduction: { type: Number, default: null },
    earlyOutDeduction: { type: Number, default: null },
    leaveDeduction: { type: Number, default: null },
    joinDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', staffSchema);
