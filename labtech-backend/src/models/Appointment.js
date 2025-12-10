const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    patientName: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true }, // email or phone
    cnic: { type: String, required: true, trim: true },
    gender: { type: String, trim: true },
    age: { type: Number },
    guardian: { type: String, trim: true },
    guardianName: { type: String, trim: true },
    address: { type: String, trim: true },

    testName: { type: String, required: true, trim: true },
    testFee: { type: Number },

    date: { type: String, required: true }, // keep as string (YYYY-MM-DD) to match UI
    time: { type: String, required: true }, // e.g. '10:30 AM'

    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Pending',
    },

    paymentMethod: { type: String, trim: true }, // card / mobile / lab
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Online', 'Pay at Lab'],
      default: 'Pending',
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'admin'],
    },
    // Professional-style unique appointment ID, e.g. P01, P02, ...
    appointmentCode: { type: String, unique: true, sparse: true, trim: true },
    // Internal numeric sequence used to generate appointmentCode
    appointmentSequence: { type: Number, unique: true, sparse: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
