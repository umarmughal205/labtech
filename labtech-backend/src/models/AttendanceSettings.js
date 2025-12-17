const mongoose = require('mongoose');

const attendanceSettingsSchema = new mongoose.Schema(
  {
    // Official times and thresholds (HH:mm)
    clockInTime: { type: String, default: '09:00' },
    clockOutTime: { type: String, default: '18:00' },
    lateThreshold: { type: String, default: '09:00' }, // kept for compatibility
    lateDeduction: { type: Number, default: 0 }, // currency or points
    absentDeduction: { type: Number, default: 0 },
    earlyLeaveThreshold: { type: String, default: '17:00' }, // HH:mm
    earlyLeaveDeduction: { type: Number, default: 0 },
    presentReward: { type: Number, default: 0 },
    monthStartDay: { type: Number, min: 1, max: 28, default: 1 },
    // Optional per-staff overrides (if not provided, global settings apply)
    perStaffOverrides: [
      {
        staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
        clockInTime: { type: String },
        clockOutTime: { type: String },
        lateThreshold: { type: String },
        earlyLeaveThreshold: { type: String },
        lateDeduction: { type: Number },
        absentDeduction: { type: Number },
        earlyLeaveDeduction: { type: Number },
        presentReward: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('AttendanceSettings', attendanceSettingsSchema);
