const mongoose = require('mongoose');

const monthlyAttendanceSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    // Month key in YYYY-MM
    month: { type: String, required: true, index: true },
    // Aggregated counts
    present: { type: Number, default: 0 },
    late: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    earlyLeave: { type: Number, default: 0 },
    // Monetary aggregates
    totalLateDeduction: { type: Number, default: 0 },
    totalEarlyOutDeduction: { type: Number, default: 0 },
    totalAbsentDeduction: { type: Number, default: 0 },
    totalPresentReward: { type: Number, default: 0 },
    totalDeduction: { type: Number, default: 0 },
    totalReward: { type: Number, default: 0 },
    netDelta: { type: Number, default: 0 }, // reward - deductions
    // Optional per-day map snapshot to speed up UI
    days: {
      type: Map,
      of: new mongoose.Schema(
        {
          status: { type: String },
          timeIn: { type: String },
          timeOut: { type: String },
          appliedLateDeduction: { type: Number, default: 0 },
          appliedEarlyOutDeduction: { type: Number, default: 0 },
          appliedAbsentDeduction: { type: Number, default: 0 },
          appliedPresentReward: { type: Number, default: 0 },
          totalDelta: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { timestamps: true }
);

monthlyAttendanceSchema.index({ staff: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyAttendance', monthlyAttendanceSchema);
