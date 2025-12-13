import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MonthYearPicker } from "@/components/lab compoenents/ui/month-year-picker";
import type { UIStaff, AttendanceRecord } from "@/lab utils/staffService";
import { getMonthlyAttendance, getAttendanceSettings, getMonthlySummary } from "@/lab utils/staffService";

interface StaffReportProps {
  isUrdu: boolean;
  staffList: UIStaff[];
  attendanceRecords: any[]; // kept for backward-compat but we rely on staff.attendance
  onClose: () => void;
  initialMonth?: string; // YYYY-MM; if provided, used as the initial selected month
  initialStaffId?: string; // if provided, preselect this staff
}

const StaffReport: React.FC<StaffReportProps> = ({ isUrdu, staffList, attendanceRecords, onClose, initialMonth, initialStaffId }) => {
  const t = (en: string, ur: string) => (isUrdu ? ur : en);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState<string>(() => initialMonth || new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [monthlyRows, setMonthlyRows] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<any>({ lateDeduction: 0, leaveDeduction: 0, earlyOutDeduction: 0, clockInTime: '', clockOutTime: '' });
  const [summary, setSummary] = useState<any | null>(null);

  useEffect(() => {
    // prioritize initialStaffId when provided
    if (initialStaffId) {
      setSelectedStaffId(initialStaffId);
      return;
    }
    if (!selectedStaffId && staffList.length > 0) {
      const first = staffList[0]?._id;
      if (first) setSelectedStaffId(first);
    }
  }, [staffList, selectedStaffId, initialStaffId]);

  useEffect(() => {
    getAttendanceSettings()
      .then((s) => {
        if (!s) return;
        const v = (s && (s as any).value) ? (s as any).value : s;
        // Normalize possible backend keys to UI keys
        const normalized = {
          lateDeduction: Number((v as any).lateDeduction ?? 0),
          earlyOutDeduction: Number((v as any).earlyOutDeduction ?? (v as any).earlyLeaveDeduction ?? 0),
          leaveDeduction: Number((v as any).leaveDeduction ?? (v as any).absentDeduction ?? 0),
          clockInTime: String((v as any).clockInTime ?? (v as any).lateThreshold ?? ''),
          clockOutTime: String((v as any).clockOutTime ?? (v as any).earlyLeaveThreshold ?? ''),
        };
        setSettings(normalized);
      })
      .catch(() => {});
  }, []);

  const filteredStaff = useMemo(
    () => staffList.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [staffList, search]
  );

  const selected = useMemo(
    () => filteredStaff.find((s) => (s._id || "") === selectedStaffId) || staffList.find(s => (s._id||"")===selectedStaffId),
    [filteredStaff, staffList, selectedStaffId]
  );

  // Fetch monthly attendance for selected staff and month
  useEffect(() => {
    if (!selectedStaffId) return;
    getMonthlyAttendance(selectedStaffId, month)
      .then((rows) => setMonthlyRows(rows))
      .catch(() => setMonthlyRows([]));
    getMonthlySummary(selectedStaffId, month)
      .then((s) => setSummary(s))
      .catch(() => setSummary(null));
  }, [selectedStaffId, month]);

  // Fallback rows if backend empty: use embedded or provided
  const rows = useMemo(() => {
    // Prefer backend monthly
    const base = (monthlyRows.length
      ? monthlyRows
      : (selected?.attendance || []).filter((a) => String(a.date).startsWith(month))
        .length
        ? (selected?.attendance || [])
        : attendanceRecords.filter((r) => r.staffId === selectedStaffId)
    ).filter((r: any) => String(r.date).startsWith(month));

    // Helper: stable YYYY-MM-DD without TZ shift
    const dateKey = (val: any) => {
      const s = String(val || "");
      const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
      const d = new Date(s);
      if (isNaN(d as any)) return s.slice(0,10);
      const pad = (n:number)=> (n<10?`0${n}`:String(n));
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    };

    // Merge by day: combine checkIn/checkOut for the same date
    const byDay: Record<string, any> = {};
    for (const r of base as any[]) {
      const day = dateKey(r.date);
      const existing = byDay[day];
      if (!existing) {
        byDay[day] = { ...r, date: day };
      } else {
        byDay[day] = {
          ...existing,
          checkIn: existing.checkIn || existing.checkInTime || r.checkIn || r.checkInTime || null,
          checkInTime: existing.checkInTime || existing.checkIn || r.checkInTime || r.checkIn || null,
          checkOut: r.checkOut || r.checkOutTime || existing.checkOut || existing.checkOutTime || null,
          checkOutTime: r.checkOutTime || r.checkOut || existing.checkOutTime || existing.checkOut || null,
          status: (String(existing.status || '').toLowerCase() === 'present' || String(r.status || '').toLowerCase() === 'present') ? 'present' : (r.status || existing.status),
        };
      }
    }
    // Auto-mark missing days as leave
    const [yy, mm] = month.split("-").map(Number); // YYYY, MM
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === yy && (today.getMonth() + 1) === mm;
    const days = new Date(yy, mm, 0).getDate();
    const lastDay = isCurrentMonth ? today.getDate() : days;
    for (let d = 1; d <= lastDay; d++) {
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
      const dayISO = `${yy}-${pad(mm)}-${pad(d)}`; // local date, avoid TZ shift
      if (!byDay[dayISO]) {
        byDay[dayISO] = {
          staffId: selectedStaffId,
          date: dayISO,
          checkIn: null,
          checkOut: null,
          status: "leave",
        };
      }
    }
    // Return sorted by date asc
    return Object.values(byDay).sort((a: any, b: any) => new Date(`${a.date}T00:00:00`).getTime() - new Date(`${b.date}T00:00:00`).getTime());
  }, [monthlyRows, selected, attendanceRecords, selectedStaffId, month]);

  const exportCSV = () => {
    if (!selected) return;
    const header = "Date,Check In,Check Out,Status\n";
    const csvBody = rows
      .map((r: any) => {
        const date = new Date(r.date).toLocaleDateString();
        const cin = r.checkIn || r.checkInTime || "";
        const cout = r.checkOut || r.checkOutTime || "";
        const status = r.status || "";
        return `${date},${cin},${cout},${status}`;
      })
      .join("\n");
    const blob = new Blob([header + csvBody], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.name}_attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const daysInMonth = useMemo(() => {
    const [yy, mm] = month.split("-").map(Number);
    return new Date(yy, mm, 0).getDate();
  }, [month]);

  const stats = useMemo(() => {
    // Always derive top-card counts from row statuses so they reflect explicit daily statuses,
    // while salary section can still use applied amounts from summary.
    const lower = (s: any) => String(s || "").toLowerCase();
    const presentRows = rows.filter((r: any) => lower(r.status) === "present");
    const present = presentRows.length;
    const leave = rows.filter((r: any) => lower(r.status) === "leave").length;
    const late = rows.filter((r: any) => lower(r.status) === "late").length;

    // EarlyOut is not a status; derive from times and official limits
    const toMinutes = (t: string) => {
      const m = String(t || '').match(/^(\d{2}):(\d{2})/);
      if (!m) return null;
      return Number(m[1]) * 60 + Number(m[2]);
    };
    const outLimit = toMinutes(settings?.clockOutTime || '');
    let earlyOut = 0;
    for (const r of presentRows as any[]) {
      const cout = String(r.checkOut || r.checkOutTime || '');
      const coutM = toMinutes(cout);
      if (outLimit != null && coutM != null && coutM < outLimit) earlyOut++;
    }
    return { present, leave, late, earlyOut } as const;
  }, [rows, settings?.clockOutTime]);

  const basicSalary = Number(selected?.salary || 0);
  // Compute breakdown from backend per-day applied amounts when available
  const { lateDeduction, earlyOutDeduction, leaveDeduction, totalDeductions, netSalary, lateCountUsed, earlyOutCountUsed, leaveCountUsed } = useMemo(() => {
    let lateSum = 0, earlyOutSum = 0, leaveSum = 0, total = 0, net = 0;
    let lateCount = 0, earlyOutCount = 0, leaveCount = 0;
    const perLate = Number(settings?.lateDeduction || 0);
    const perEarly = Number(settings?.earlyOutDeduction || (settings as any)?.earlyLeaveDeduction || 0);
    const perLeave = Number(settings?.leaveDeduction || (settings as any)?.absentDeduction || 0);

    // Prefer backend applied amounts when present; otherwise compute from counts and settings
    if (summary && summary.days) {
      let hasLateApplied = false, hasEarlyApplied = false, hasLeaveApplied = false;
      for (const d of Object.keys(summary.days)) {
        const day = summary.days[d] || {};
        const l = Number(day.appliedLateDeduction);
        const e = Number(day.appliedEarlyLeaveDeduction);
        const a = Number(day.appliedAbsentDeduction);
        if (!isNaN(l)) { lateSum += l; if (l>0) lateCount++; hasLateApplied = hasLateApplied || !!l; }
        if (!isNaN(e)) { earlyOutSum += e; if (e>0) earlyOutCount++; hasEarlyApplied = hasEarlyApplied || !!e; }
        if (!isNaN(a)) { leaveSum += a; if (a>0) leaveCount++; hasLeaveApplied = hasLeaveApplied || !!a; }
      }
      // If backend didn't provide a category, compute it from counts * settings
      if (!hasLateApplied) { lateSum = perLate * Number(stats.late || 0); lateCount = Number(stats.late || 0); }
      if (!hasEarlyApplied) { earlyOutSum = perEarly * Number((stats as any).earlyOut || 0); earlyOutCount = Number((stats as any).earlyOut || 0); }
      if (!hasLeaveApplied) { leaveSum = perLeave * Number(stats.leave || 0); leaveCount = Number(stats.leave || 0); }

      total = Number(summary.totalDeduction || (lateSum + earlyOutSum + leaveSum));
      const reward = Number(summary.totalReward || 0);
      net = Math.max(0, basicSalary - total + reward);
      return { lateDeduction: lateSum, earlyOutDeduction: earlyOutSum, leaveDeduction: leaveSum, totalDeductions: total, netSalary: net, lateCountUsed: lateCount, earlyOutCountUsed: earlyOutCount, leaveCountUsed: leaveCount };
    }

    // No backend summary: compute from settings * counts
    lateCount = Number(stats.late || 0); lateSum = perLate * lateCount;
    earlyOutCount = Number((stats as any).earlyOut || 0); earlyOutSum = perEarly * earlyOutCount;
    leaveCount = Number(stats.leave || 0); leaveSum = perLeave * leaveCount;
    total = lateSum + earlyOutSum + leaveSum;
    net = Math.max(0, basicSalary - total);
    return { lateDeduction: lateSum, earlyOutDeduction: earlyOutSum, leaveDeduction: leaveSum, totalDeductions: total, netSalary: net, lateCountUsed: lateCount, earlyOutCountUsed: earlyOutCount, leaveCountUsed: leaveCount };
  }, [summary, stats, settings, basicSalary]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="space-y-4 max-w-4xl max-h-[calc(100vh-200px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Staff Report", "سٹاف رپورٹ")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="w-full sm:flex-1 flex gap-2">
            <Input
              placeholder={t("Search staff by name...", "نام سے عملہ تلاش کریں...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="min-w-[10rem]">
              <MonthYearPicker value={month} onChange={setMonth} />
            </div>
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("Select staff", "عملہ منتخب کریں")} />
              </SelectTrigger>
              <SelectContent>
                {(filteredStaff.length ? filteredStaff : staffList).map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!selected}>{t("Export", "برآمد کریں")}</Button>
            <Button onClick={onClose}>{t("Close", "بند کریں")}</Button>
          </div>
        </div>

        {selected ? (
          <div className="space-y-4">
            {/* Selected Staff banner */}
            <div className="rounded-md border bg-blue-50 p-3 text-sm">
              <div className="font-semibold">{selected.name}</div>
              <div className="text-gray-500 capitalize">{selected.position || "-"}</div>
            </div>

            <div className="text-sm font-medium">
              {t("Monthly Report", "ماہانہ رپورٹ")} - {new Date(month + "-01").toLocaleString(undefined, { month: "long", year: "numeric" })}
            </div>

            {/* Details and Attendance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold mb-2">{t("Staff Details", "اسٹاف کی تفصیل")}</div>
                <div className="space-y-1">
                  <div><span className="font-medium">{t("Name", "نام")}:</span> {selected.name}</div>
                  <div><span className="font-medium">{t("Position", "عہدہ")}:</span> <span className="capitalize">{selected.position || "-"}</span></div>
                  <div><span className="font-medium">{t("Basic Salary", "بنیادی تنخواہ")}:</span> {(basicSalary).toLocaleString()} PKR</div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-2">{t("Attendance", "حاضری")}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-md bg-green-50 p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">{stats.present}</div>
                    <div className="text-xs text-gray-600">{t("Present", "حاضر")}</div>
                  </div>
                  <div className="rounded-md bg-red-50 p-3 text-center">
                    <div className="text-2xl font-bold text-red-700">{stats.leave}</div>
                    <div className="text-xs text-gray-600">{t("Leaves", "چھٹیاں")}</div>
                  </div>
                  <div className="rounded-md bg-yellow-50 p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-700">{stats.late}</div>
                    <div className="text-xs text-gray-600">{t("Late Arrivals", "دیر سے آمد")}</div>
                  </div>
                  <div className="rounded-md bg-orange-50 p-3 text-center">
                    <div className="text-2xl font-bold text-orange-700">{(stats as any).earlyOut || 0}</div>
                    <div className="text-xs text-gray-600">{t("Early Outs", "جلدی رخصت")}</div>
                  </div>
                  <div className="rounded-md bg-blue-50 p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">{daysInMonth}</div>
                    <div className="text-xs text-gray-600">{t("Working Days", "کاروباری دن")}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Details */}
            <div>
              <div className="font-semibold mb-2">{t("Salary Details", "تنخواہ کی تفصیل")}</div>
              <div className="rounded-md border p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">{t("Basic Salary", "بنیادی تنخواہ")}</div>
                  <div className="text-lg font-medium">{basicSalary.toLocaleString()} PKR</div>
                  <div className="mt-3 text-gray-600">{t("Deductions", "کٹوتیاں")}:</div>
                  <div className="text-xs text-gray-500">{t("Late Arrivals", "دیر سے آمد")} ({lateCountUsed ?? stats.late}): <span className="text-red-600">-{(lateDeduction||0).toLocaleString()} PKR</span></div>
                  <div className="text-xs text-gray-500">{t("Early Outs", "جلدی رخصت")} ({earlyOutCountUsed ?? ((stats as any).earlyOut || 0)}): <span className="text-red-600">-{(earlyOutDeduction||0).toLocaleString()} PKR</span></div>
                  <div className="text-xs text-gray-500">{t("Leaves", "چھٹیاں")} ({leaveCountUsed ?? stats.leave}): <span className="text-red-600">-{(leaveDeduction||0).toLocaleString()} PKR</span></div>
                  <div className="mt-1 font-medium">{t("Total Deductions", "کل کٹوتیاں")}: <span className="text-red-600">-{totalDeductions.toLocaleString()} PKR</span></div>
                </div>
                <div className="md:col-span-2 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-600 mb-1">{t("Net Salary", "خالص تنخواہ")}</div>
                    <div className="text-3xl font-extrabold text-green-600">{netSalary.toLocaleString()} PKR</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto max-h-[45vh]">
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">{t("Date", "تاریخ")}</th>
                    <th className="p-2 border">{t("Check In", "آمد")}</th>
                    <th className="p-2 border">{t("Check Out", "رخصت")}</th>
                    <th className="p-2 border">{t("Status", "حیثیت")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((rec: any, idx: number) => (
                    <tr key={idx} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border">{new Date(rec.date).toLocaleDateString()}</td>
                      <td className="p-2 border">{rec.checkIn || rec.checkInTime || '-'}</td>
                      <td className="p-2 border">{rec.checkOut || rec.checkOutTime || '-'}</td>
                      <td className="p-2 border capitalize">{rec.status || '-'}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="p-4 text-center text-gray-500 border" colSpan={4}>{t("No records", "کوئی ریکارڈ نہیں")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">{t("Please select a staff member to view details.", "تفصیلات دیکھنے کے لیے عملہ منتخب کریں۔")}</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffReport;
