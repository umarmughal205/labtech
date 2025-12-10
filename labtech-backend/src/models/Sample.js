const mongoose = require('mongoose');

const sampleSchema = new mongoose.Schema(
  {
    sampleNumber: { type: String, required: true, unique: true, trim: true },
    patientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    age: { type: String, trim: true },
    gender: { type: String, trim: true },
    address: { type: String, trim: true },
    guardianRelation: { type: String, trim: true },
    guardianName: { type: String, trim: true },
    cnic: { type: String, trim: true },

    tests: [
      {
        test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
        name: { type: String, required: true, trim: true },
        price: { type: Number, default: 0 },
      },
    ],

    consumables: [
      {
        item: { type: String, required: true },
        quantity: { type: Number, default: 1 },
      },
    ],

    totalAmount: { type: Number, default: 0 },
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    status: {
      type: String,
      enum: ['collected', 'processing', 'completed', 'cancelled', 'received', 'in process'],
      default: 'collected',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sample', sampleSchema);
