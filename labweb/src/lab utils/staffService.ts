// Utility functions for Staff management and attendance
// These are minimal implementations to unblock the frontend build.
// Replace the stubbed implementations with real API calls as needed.

export interface UIStaff {
  _id: string;
  name: string;
  position: string;
  phone?: string;
  email?: string;
  address?: string;
  salary?: number;
  joinDate?: string; // ISO date string
  status?: "active" | "inactive";
  // Optional per-staff overrides to override global AttendanceSettings
  lateDeduction?: number | null;
  earlyOutDeduction?: number | null;
  leaveDeduction?: number | null;
  // Optional attendance array if backend returns embedded attendance
  attendance?: AttendanceRecord[];
}

export interface AttendanceRecord {
  _id?: string;
  staffId: string;
  date: string; // ISO date string
  status: "present" | "absent" | "leave";
  checkInTime?: string;
  checkOutTime?: string;
  // aliases used by some UI components
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

import { api } from '@/lib/api';
// Staff CRUD lives under /api/staff (backend)
const STAFF_API = "/staff";
// Attendance endpoints under /api/attendance (backend)
const ATTENDANCE_API = "/attendance";

// Helper wrappers around axios client
async function httpGet<T>(path: string, config?: any): Promise<T> {
  const res = await api.get<T>(path, config as any);
  // @ts-ignore
  return (res as any).data;
}
async function httpPost<T>(path: string, data?: any, config?: any): Promise<T> {
  const res = await api.post<T>(path, data, config as any);
  // @ts-ignore
  return (res as any).data;
}
async function httpPut<T>(path: string, data?: any, config?: any): Promise<T> {
  const res = await api.put<T>(path, data, config as any);
  // @ts-ignore
  return (res as any).data;
}
async function httpDel<T>(path: string, config?: any): Promise<T> {
  const res = await api.delete<T>(path, config as any);
  // @ts-ignore
  return (res as any).data;
}

// ---------------- Staff CRUD -----------------
export async function getStaff(): Promise<UIStaff[]> {
  try {
    const res = await httpGet<any>(`${STAFF_API}`);
    const list = Array.isArray(res) ? res : res?.staff;
    if (!Array.isArray(list)) return [];
    // map backend Staff -> UIStaff
    return list.map((s: any) => ({
      _id: s._id,
      name: s.name,
      position: s.role,
      phone: s.phone,
      email: s.email,
      salary: s.salary,
      joinDate: s.joinDate ? String(s.joinDate) : undefined,
      status: s.isActive ? "active" : "inactive",
      lateDeduction: s.lateDeduction ?? null,
      earlyOutDeduction: s.earlyOutDeduction ?? (s.earlyLeaveDeduction ?? null),
      leaveDeduction: s.leaveDeduction ?? (s.absentDeduction ?? null),
    }));
  } catch {
    return [];
  }
}

export async function getStaffById(id: string): Promise<UIStaff | null> {
  try {
    const res = await httpGet<any>(`${STAFF_API}/${id}`);
    const s = res?.staff ?? res;
    if (!s) return null;
    return {
      _id: s._id,
      name: s.name,
      position: s.role,
      phone: s.phone,
      email: s.email,
      salary: s.salary,
      joinDate: s.joinDate ? String(s.joinDate) : undefined,
      status: s.isActive ? "active" : "inactive",
      lateDeduction: s.lateDeduction ?? null,
      earlyOutDeduction: s.earlyOutDeduction ?? (s.earlyLeaveDeduction ?? null),
      leaveDeduction: s.leaveDeduction ?? (s.absentDeduction ?? null),
    };
  } catch {
    return null;
  }
}

export async function addStaff(staff: Partial<UIStaff>): Promise<UIStaff> {
  const payload = {
    name: staff.name,
    role: staff.position,
    email: staff.email,
    phone: staff.phone,
    cnic: (staff as any).cnic,
    salary: staff.salary,
    joinDate: staff.joinDate,
    isActive: staff.status ? staff.status === "active" : true,
    lateDeduction: staff.lateDeduction,
    earlyOutDeduction: staff.earlyOutDeduction,
    leaveDeduction: staff.leaveDeduction,
  };
  const res = await httpPost<any>(`${STAFF_API}`, payload);
  const s = res?.staff ?? res;
  return {
    _id: s._id,
    name: s.name,
    position: s.role,
    phone: s.phone,
    email: s.email,
    salary: s.salary,
    joinDate: s.joinDate ? String(s.joinDate) : undefined,
    status: s.isActive ? "active" : "inactive",
    lateDeduction: s.lateDeduction ?? null,
    earlyOutDeduction: s.earlyOutDeduction ?? (s.earlyLeaveDeduction ?? null),
    leaveDeduction: s.leaveDeduction ?? (s.absentDeduction ?? null),
  };
}

export async function updateStaff(id: string, staff: Partial<UIStaff>): Promise<UIStaff> {
  const payload = {
    name: staff.name,
    role: staff.position,
    email: staff.email,
    phone: staff.phone,
    cnic: (staff as any).cnic,
    salary: staff.salary,
    joinDate: staff.joinDate,
    isActive: staff.status ? staff.status === "active" : undefined,
    lateDeduction: staff.lateDeduction,
    earlyOutDeduction: staff.earlyOutDeduction,
    leaveDeduction: staff.leaveDeduction,
  };
  const res = await httpPut<any>(`${STAFF_API}/${id}`, payload);
  const s = res?.staff ?? res;
  return {
    _id: s._id,
    name: s.name,
    position: s.role,
    phone: s.phone,
    email: s.email,
    salary: s.salary,
    joinDate: s.joinDate ? String(s.joinDate) : undefined,
    status: s.isActive ? "active" : "inactive",
    lateDeduction: s.lateDeduction ?? null,
    earlyOutDeduction: s.earlyOutDeduction ?? (s.earlyLeaveDeduction ?? null),
    leaveDeduction: s.leaveDeduction ?? (s.absentDeduction ?? null),
  };
}

export async function deleteStaff(id: string): Promise<void> {
  await httpDel<any>(`${STAFF_API}/${id}`);
}

// ---------------- Attendance -----------------
export async function getDailyAttendance(date?: string): Promise<any[]> {
  const useDate = date ?? new Date().toISOString().split("T")[0];
  try {
    const res = await httpGet<any>(`${ATTENDANCE_API}/daily?date=${useDate}`);
    const rows = Array.isArray(res?.rows) ? res.rows : [];
    return rows.map((r: any) => ({
      staffId: r.staffId,
      staffName: r.name,
      date: useDate,
      checkIn: r.timeIn || r.checkIn,
      checkOut: r.timeOut || r.checkOut,
      status: r.status,
      // Only show actual notes from DB; do not derive display text
      notes: r.notes,
    }));
  } catch {
    return [];
  }
}

export async function addAttendance(record: AttendanceRecord): Promise<any> {
  const payload = {
    staffId: record.staffId,
    date: record.date,
    timeIn: record.checkIn || record.checkInTime,
    timeOut: record.checkOut || record.checkOutTime,
    status: record.status === 'leave' ? 'absent' : record.status,
    notes: record.notes,
  };
  const res = await httpPost<any>(`${ATTENDANCE_API}/mark`, payload);
  const a = res?.attendance ?? res;
  // Map backend attendance doc to UI-friendly shape
  return {
    _id: a?._id,
    staffId: a?.staff || record.staffId,
    staffName: undefined,
    date: a?.date ? String(a.date).slice(0,10) : record.date,
    checkIn: a?.timeIn || payload.timeIn,
    checkOut: a?.timeOut || payload.timeOut,
    status: a?.status || record.status,
    notes: a?.notes,
  };
}

export async function clockIn(staffId: string): Promise<any> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return addAttendance({ staffId, date: today, status: 'present', checkIn: `${hh}:${mm}` } as any);
}

export async function getAttendanceSettings(): Promise<any> {
  try {
    const res = await httpGet<any>(`${ATTENDANCE_API}/settings`);
    return res?.settings ?? null;
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function saveAttendanceSettings(value: any): Promise<any> {
  // Map UI keys -> backend keys
  const payload = {
    clockInTime: value.clockInTime,
    clockOutTime: value.clockOutTime,
    lateThreshold: value.clockInTime || value.lateThreshold,
    lateDeduction: value.lateDeduction,
    absentDeduction: value.leaveDeduction ?? value.absentDeduction,
    earlyLeaveThreshold: value.clockOutTime || value.earlyLeaveThreshold,
    earlyLeaveDeduction: value.earlyOutDeduction ?? value.earlyLeaveDeduction,
    presentReward: value.presentReward,
    monthStartDay: value.monthStartDay,
  };
  return httpPut<any>(`${ATTENDANCE_API}/settings`, payload);
}

export async function getMonthlyAttendance(staffId:string, month:string): Promise<any[]> {
  const res = await httpGet<any>(`${ATTENDANCE_API}/monthly?month=${month}`);
  const rows = Array.isArray(res?.rows) ? res.rows : res?.rows || res?.data || [];
  // Find the selected staff summary and expand its days map to a list
  const r = (rows || []).find((x:any) => String(x.staffId) === String(staffId));
  if (!r) return [];
  const days = r.days || {};
  const list = Object.keys(days).map((d) => ({
    staffId,
    staffName: r.name,
    date: d,
    checkIn: days[d]?.timeIn,
    checkOut: days[d]?.timeOut,
    status: days[d]?.status,
  }));
  // sort ascending by date
  return list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Fetch a single staff member's monthly summary with applied totals from backend
export async function getMonthlySummary(staffId: string, month: string): Promise<any | null> {
  const res = await httpGet<any>(`${ATTENDANCE_API}/monthly?month=${month}`);
  const rows = Array.isArray(res?.rows) ? res.rows : res?.rows || res?.data || [];
  const r = (rows || []).find((x:any) => String(x.staffId) === String(staffId));
  return r || null;
}

export async function clockOut(staffId: string): Promise<any> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return addAttendance({ staffId, date: today, status: 'present', checkOut: `${hh}:${mm}` } as any);
}

// Convenience helpers for admin marking leave/absent
export async function markAbsent(staffId: string, date?: string): Promise<any> {
  const d = date ?? new Date().toISOString().split('T')[0];
  return addAttendance({ staffId, date: d, status: 'absent' } as any);
}

export async function markLeave(staffId: string, date?: string): Promise<any> {
  const d = date ?? new Date().toISOString().split('T')[0];
  return addAttendance({ staffId, date: d, status: 'leave' } as any);
}
