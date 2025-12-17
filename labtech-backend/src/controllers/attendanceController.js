const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const AttendanceSettings = require('../models/AttendanceSettings');
const MonthlyAttendance = require('../models/MonthlyAttendance');

function toYMD(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toMonthKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Recompute and persist a staff member's MonthlyAttendance snapshot for the month that contains `date`
async function recomputeMonthlyFor(staffId, date) {
  const dt = new Date(date);
  const y = dt.getFullYear();
  const m = dt.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 1);
  const monthKey = toMonthKey(dt);

  const marks = await Attendance.find({ staff: staffId, date: { $gte: start, $lt: end } }).lean();
  // Aggregate counts and applied totals
  let present = 0, late = 0, absent = 0, earlyLeave = 0;
  let totalLate = 0, totalEarly = 0, totalAbsent = 0, totalReward = 0;
  const days = {};
  for (const mdoc of marks) {
    const dayKey = toYMD(mdoc.date);
    if (mdoc.status === 'present') present++; else if (mdoc.status === 'late') late++; else if (mdoc.status === 'absent') absent++;
    if ((mdoc.appliedEarlyOutDeduction || 0) > 0) earlyLeave++;
    totalLate += Number(mdoc.appliedLateDeduction || 0);
    totalEarly += Number(mdoc.appliedEarlyOutDeduction || 0);
    totalAbsent += Number(mdoc.appliedAbsentDeduction || 0);
    totalReward += Number(mdoc.appliedPresentReward || 0);
    days[dayKey] = {
      status: mdoc.status,
      timeIn: mdoc.timeIn || '',
      timeOut: mdoc.timeOut || '',
      appliedLateDeduction: Number(mdoc.appliedLateDeduction || 0),
      appliedEarlyOutDeduction: Number(mdoc.appliedEarlyOutDeduction || 0),
      appliedAbsentDeduction: Number(mdoc.appliedAbsentDeduction || 0),
      appliedPresentReward: Number(mdoc.appliedPresentReward || 0),
      totalDelta: Number(mdoc.totalDelta || 0),
    };
  }
  const totalDeduction = totalLate + totalEarly + totalAbsent;
  const netDelta = totalReward - totalDeduction;

  await MonthlyAttendance.findOneAndUpdate(
    { staff: staffId, month: monthKey },
    {
      $set: {
        present,
        late,
        absent,
        earlyLeave,
        totalLateDeduction: totalLate,
        totalEarlyOutDeduction: totalEarly,
        totalAbsentDeduction: totalAbsent,
        totalPresentReward: totalReward,
        totalDeduction,
        totalReward,
        netDelta,
        days,
      },
    },
    { upsert: true, new: true }
  );
}

// POST /api/attendance/mark
// body: { staffId, date(ISO|Y-m-d), timeIn, timeOut, status(optional) }
async function markAttendance(req, res) {
  try {
    const { staffId, date, timeIn, timeOut, status, notes } = req.body || {};
    if (!staffId || !date) {
      return res.status(400).json({ success: false, message: 'staffId and date are required' });
    }

    const staff = await Staff.findById(staffId).lean();
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    // Load settings once for status and deductions
    const settingsDoc = (await AttendanceSettings.findOne()) || new AttendanceSettings({});
    const settings = settingsDoc.toObject();
    const overrides = (settings.perStaffOverrides || []).find((o) => String(o.staff) === String(staffId)) || {};
    // Staff document fields have highest priority, then per-staff override, then global
    const eff = (k, def) => {
      if (staff && staff[k] !== undefined && staff[k] !== null) return staff[k];
      if (overrides && overrides[k] !== undefined && overrides[k] !== null) return overrides[k];
      if (settings && settings[k] !== undefined && settings[k] !== null) return settings[k];
      return def;
    };
    // Determine status using settings if not provided
    let finalStatus = status;
    let finalNotes = notes;
    const lateThreshold = String(eff('lateThreshold', eff('clockInTime', '09:00')));
    // fetch existing attendance to merge partial updates (e.g., only checkOut)
    const theDate = new Date(date);
    const key = new Date(toYMD(theDate)); // normalize
    const existing = await Attendance.findOne({ staff: staffId, date: key }).lean();
    const finalTimeIn = typeof timeIn === 'string' && timeIn !== '' ? timeIn : (existing?.timeIn || '');
    const finalTimeOut = typeof timeOut === 'string' && timeOut !== '' ? timeOut : (existing?.timeOut || '');
    if (!finalStatus) {
      if (finalTimeIn) {
        finalStatus = finalTimeIn > lateThreshold ? 'late' : 'present';
      } else {
        finalStatus = 'absent';
      }
    }
    if (finalStatus === 'leave') {
      finalStatus = 'absent';
      if (!finalNotes) finalNotes = 'leave';
    }

    // Compute deduction entry based on settings
    const officialIn = String(eff('clockInTime', lateThreshold || '09:00'));
    const officialOut = String(eff('clockOutTime', eff('earlyLeaveThreshold', '18:00')));
    const isLate = !!(finalTimeIn && finalTimeIn > officialIn);
    const isEarlyOut = !!(finalTimeOut && finalTimeOut < officialOut);
    const lateDeduction = Number(eff('lateDeduction', 0));
    const earlyOutDeduction = Number(eff('earlyLeaveDeduction', 0));
    const absentDeduction = Number(eff('absentDeduction', eff('leaveDeduction', 0)));
    const presentReward = Number(eff('presentReward', 0));
    const appliedLate = isLate ? lateDeduction : 0;
    const appliedEarly = isEarlyOut ? earlyOutDeduction : 0;
    const appliedAbsent = finalStatus === 'absent' ? absentDeduction : 0;
    const appliedReward = finalStatus === 'present' ? presentReward : 0;
    const totalDelta = appliedReward - (appliedLate + appliedEarly + appliedAbsent);

    // If no explicit note was supplied, set a helpful default note for UI persistence
    if (!finalNotes) {
      if (finalStatus === 'present') {
        finalNotes = isLate ? 'late' : 'on time';
      } else if (finalStatus === 'absent') {
        finalNotes = '';
      }
    }

    // Persist the attendance with applied amounts (single document per staff+date)
    const doc = await Attendance.findOneAndUpdate(
      { staff: staffId, date: key },
      {
        $set: {
          status: finalStatus,
          timeIn: finalTimeIn,
          timeOut: finalTimeOut,
          notes: finalNotes,
          appliedLateDeduction: appliedLate,
          appliedEarlyOutDeduction: appliedEarly,
          appliedAbsentDeduction: appliedAbsent,
          appliedPresentReward: appliedReward,
          totalDelta,
        },
      },
      { new: true, upsert: true }
    );

    // Recompute and persist the monthly summary snapshot for this staff/month
    await recomputeMonthlyFor(staffId, key);

    const logEntry = {
      staff: staffId,
      staffName: staff?.name || undefined,
      date: toYMD(key),
      timeIn: finalTimeIn || '',
      timeOut: finalTimeOut || '',
      status: finalStatus,
      isLate,
      isEarlyOut,
      lateDeductionApplied: appliedLate,
      earlyOutDeductionApplied: appliedEarly,
      absentDeductionApplied: appliedAbsent,
      presentRewardApplied: appliedReward,
      totalDelta,
      notes: finalNotes,
      createdAt: new Date(),
    };
    // Do not persist logs inside AttendanceSettings; return computed info if the client needs it
    return res.json({ success: true, attendance: doc, deduction: logEntry });
  } catch (err) {
    console.error('markAttendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark attendance' });
  }
}

// GET /api/attendance/daily?date=YYYY-MM-DD
async function getDaily(req, res) {
  try {
    const { date } = req.query || {};
    const key = date ? new Date(date) : new Date();
    const day = new Date(toYMD(key));

    const [staffList, marks] = await Promise.all([
      Staff.find({ isActive: true, joinDate: { $lte: day } }).lean(),
      Attendance.find({ date: day }).lean(),
    ]);

    const markMap = new Map(marks.map((m) => [String(m.staff), m]));
    const rows = staffList.map((s) => {
      const m = markMap.get(String(s._id));
      return {
        staffId: s._id,
        name: s.name,
        role: s.role,
        status: m?.status || 'absent',
        timeIn: m?.timeIn || '',
        timeOut: m?.timeOut || '',
        notes: m?.notes || '',
      };
    });

    // summarize
    const summary = rows.reduce(
      (acc, r) => {
        acc.total += 1;
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { total: 0, present: 0, late: 0, absent: 0 }
    );

    return res.json({ success: true, date: toYMD(day), rows, summary });
  } catch (err) {
    console.error('getDaily error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get daily attendance' });
  }
}

// GET /api/attendance/monthly?month=YYYY-MM
async function getMonthly(req, res) {
  try {
    const { month } = req.query || {};
    const base = month ? new Date(`${month}-01`) : new Date();
    const year = base.getFullYear();
    const mon = base.getMonth();
    const start = new Date(year, mon, 1);
    const end = new Date(year, mon + 1, 1);

    const [staffList, marks, settings] = await Promise.all([
      Staff.find({ isActive: true, joinDate: { $lte: end } }).lean(),
      Attendance.find({ date: { $gte: start, $lt: end } }).lean(),
      AttendanceSettings.findOne().lean(),
    ]);

    const byStaff = new Map();
    for (const m of marks) {
      const sid = String(m.staff);
      const entry = byStaff.get(sid) || { present: 0, late: 0, absent: 0, days: {},
        sumLate: 0, sumEarly: 0, sumAbsent: 0, sumReward: 0 };
      entry[m.status] = (entry[m.status] || 0) + 1;
      // Keep per-day details including applied amounts snapshot
      entry.days[toYMD(m.date)] = {
        status: m.status,
        timeIn: m.timeIn,
        timeOut: m.timeOut,
        appliedLateDeduction: Number(m.appliedLateDeduction || 0),
        appliedEarlyOutDeduction: Number(m.appliedEarlyOutDeduction || 0),
        appliedAbsentDeduction: Number(m.appliedAbsentDeduction || 0),
        appliedPresentReward: Number(m.appliedPresentReward || 0),
        totalDelta: Number(m.totalDelta || 0),
      };
      // Aggregate applied amounts for monthly totals
      entry.sumLate += Number(m.appliedLateDeduction || 0);
      entry.sumEarly += Number(m.appliedEarlyOutDeduction || 0);
      entry.sumAbsent += Number(m.appliedAbsentDeduction || 0);
      entry.sumReward += Number(m.appliedPresentReward || 0);
      byStaff.set(sid, entry);
    }

    const earlyLeaveThreshold = String(settings?.earlyLeaveThreshold || '17:00');

    const rows = staffList.map((s) => {
      const agg = byStaff.get(String(s._id)) || { present: 0, late: 0, absent: 0, days: {}, sumLate:0, sumEarly:0, sumAbsent:0, sumReward:0 };
      // compute early leaves; prefer applied amounts if present, else derive from timeOut
      let earlyLeave = 0;
      const days = agg.days || {};
      for (const d of Object.keys(days)) {
        const entry = days[d];
        if ((entry?.appliedEarlyOutDeduction || 0) > 0) {
          earlyLeave += 1;
        } else if (entry?.timeOut && entry.timeOut < earlyLeaveThreshold) {
          earlyLeave += 1;
        }
      }
      const lateCount = agg.late || 0;
      const absentCount = agg.absent || 0;
      const presentCount = agg.present || 0;
      // Prefer persisted applied amounts to compute totals
      const totalDeduction = Number(agg.sumLate || 0) + Number(agg.sumEarly || 0) + Number(agg.sumAbsent || 0);
      const totalReward = Number(agg.sumReward || 0);
      const salary = Number(s.salary || 0);
      const netPay = Math.max(0, salary - totalDeduction + totalReward);

      return {
        staffId: s._id,
        name: s.name,
        role: s.role,
        joinDate: s.joinDate,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        earlyLeave,
        days,
        salary,
        totalDeduction,
        totalReward,
        netPay,
      };
    });

    return res.json({ success: true, month: `${year}-${String(mon + 1).padStart(2, '0')}`, rows });
  } catch (err) {
    console.error('getMonthly error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get monthly attendance' });
  }
}

// GET /api/attendance/monthly/export?month=YYYY-MM
// Returns CSV content
async function exportMonthlyCSV(req, res) {
  try {
    const data = await getMonthlyRaw(req);
    const header = ['Name', 'Role', 'Present', 'Late', 'Absent'];
    const lines = [header.join(',')];
    for (const row of data.rows) {
      lines.push([escapeCsv(row.name), escapeCsv(row.role || ''), row.present, row.late, row.absent].join(','));
    }
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-monthly.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('exportMonthlyCSV error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export monthly attendance' });
  }
}

function escapeCsv(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function getMonthlyRaw(req) {
  const { month } = req.query || {};
  const base = month ? new Date(`${month}-01`) : new Date();
  const year = base.getFullYear();
  const mon = base.getMonth();
  const start = new Date(year, mon, 1);
  const end = new Date(year, mon + 1, 1);

  const [staffList, marks] = await Promise.all([
    Staff.find({ isActive: true }).lean(),
    Attendance.find({ date: { $gte: start, $lt: end } }).lean(),
  ]);

  const byStaff = new Map();
  for (const m of marks) {
    const sid = String(m.staff);
    const entry = byStaff.get(sid) || { present: 0, late: 0, absent: 0 };
    entry[m.status] = (entry[m.status] || 0) + 1;
    byStaff.set(sid, entry);
  }

  const rows = staffList.map((s) => {
    const agg = byStaff.get(String(s._id)) || { present: 0, late: 0, absent: 0 };
    return { staffId: s._id, name: s.name, role: s.role, ...agg };
  });
  return { rows };
}

// Settings
// GET /api/attendance/settings
async function getSettings(_req, res) {
  try {
    const s = await AttendanceSettings.findOne().lean();
    return res.json({ success: true, settings: s || null });
  } catch (err) {
    console.error('getSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get settings' });
  }
}

// PUT /api/attendance/settings
// body: { lateThreshold, lateDeduction, absentDeduction, presentReward, monthStartDay }
async function updateSettings(req, res) {
  try {
    const body = req.body || {};
    const s = await AttendanceSettings.findOneAndUpdate(
      {},
      {
        $set: {
          clockInTime: body.clockInTime,
          clockOutTime: body.clockOutTime,
          lateThreshold: body.lateThreshold,
          lateDeduction: body.lateDeduction,
          absentDeduction: body.absentDeduction,
          earlyLeaveThreshold: body.earlyLeaveThreshold,
          earlyLeaveDeduction: body.earlyLeaveDeduction,
          presentReward: body.presentReward,
          monthStartDay: body.monthStartDay,
          // optional per-staff overrides array
          perStaffOverrides: Array.isArray(body.perStaffOverrides) ? body.perStaffOverrides : undefined,
        },
      },
      { new: true, upsert: true }
    );
    return res.json({ success: true, settings: s });
  } catch (err) {
    console.error('updateSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
}

module.exports = {
  markAttendance,
  getDaily,
  getMonthly,
  exportMonthlyCSV,
  getSettings,
  updateSettings,
};
