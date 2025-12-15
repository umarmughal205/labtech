const mongoose = require('mongoose');

const sampleSchema = new mongoose.Schema(
  {
    sampleNumber: { type: String, required: true, unique: true, trim: true },
    patientId: { type: String, trim: true },
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

    results: [
      {
        parameterId: { type: String, default: '' },
        value: { type: mongoose.Schema.Types.Mixed, default: null },
        comment: { type: String, default: '' },
        isAbnormal: { type: Boolean, default: false },
        isCritical: { type: Boolean, default: false },
        label: { type: String, default: '' },
        unit: { type: String, default: '' },
        normalText: { type: String, default: '' },
      },
    ],

    // Overall interpretation for backward compatibility
    interpretation: { type: String, default: '' },
    // Optional per-test interpretations (one entry per ordered test)
    interpretations: [
      {
        testKey: { type: String, default: '' },
        testName: { type: String, default: '' },
        text: { type: String, default: '' },
      },
    ],
    completedAt: { type: Date },
  },
  { timestamps: true }
);
sampleSchema.index({ patientId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Sample', sampleSchema);
