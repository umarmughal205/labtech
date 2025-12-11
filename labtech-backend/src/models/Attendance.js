const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: ['present', 'late', 'absent'], required: true },
    timeIn: { type: String, trim: true }, // e.g. 09:15
    timeOut: { type: String, trim: true },
    notes: { type: String, trim: true },
    // Applied amounts for this day (persisted snapshot)
    appliedLateDeduction: { type: Number, default: 0 },
    appliedEarlyOutDeduction: { type: Number, default: 0 },
    appliedAbsentDeduction: { type: Number, default: 0 },
    appliedPresentReward: { type: Number, default: 0 },
    totalDelta: { type: Number, default: 0 }, // reward - deductions
  },
  { timestamps: true }
);

attendanceSchema.index({ staff: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
