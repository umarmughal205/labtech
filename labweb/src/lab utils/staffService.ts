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
}

// Staff CRUD lives under /api/lab/staff
const STAFF_API = "/api/lab/staff";
// Attendance remains under /api/lab/attendance
const ATTENDANCE_API = "/api/lab/attendance";

// Helper to handle fetch with JSON
async function http<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      ...options.headers,
    },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(text || res.statusText);
    err.status = res.status;
    try { err.body = JSON.parse(text); } catch (_) { err.body = text; }
    throw err;
  }
  return res.json();
}

// ---------------- Staff CRUD -----------------
export async function getStaff(): Promise<UIStaff[]> {
  try {
    return await http<UIStaff[]>(`${STAFF_API}`);
  } catch {
    // return empty list on failure so UI still works offline
    return [];
  }
}

export async function getStaffById(id: string): Promise<UIStaff | null> {
  try {
    return await http<UIStaff>(`${STAFF_API}/${id}`);
  } catch {
    return null;
  }
}

export async function addStaff(staff: Partial<UIStaff>): Promise<UIStaff> {
  return http<UIStaff>(`${STAFF_API}`, {
    method: "POST",
    body: JSON.stringify(staff),
  });
}

export async function updateStaff(id: string, staff: Partial<UIStaff>): Promise<UIStaff> {
  return http<UIStaff>(`${STAFF_API}/${id}`, {
    method: "PUT",
    body: JSON.stringify(staff),
  });
}

export async function deleteStaff(id: string): Promise<void> {
  await http<void>(`${STAFF_API}/${id}`, { method: "DELETE" });
}

// ---------------- Attendance -----------------
export async function getDailyAttendance(date?: string): Promise<AttendanceRecord[]> {
  // default to today (YYYY-MM-DD) if no date supplied
  const useDate = date ?? new Date().toISOString().split("T")[0];
  try {
    return await http<AttendanceRecord[]>(`${ATTENDANCE_API}/attendance?date=${useDate}`);
  } catch {
    return [];
  }
}

export async function addAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
  return http<AttendanceRecord>(`${ATTENDANCE_API}/attendance`, {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export async function clockIn(staffId: string): Promise<AttendanceRecord> {
  return http<AttendanceRecord>(`${ATTENDANCE_API}/attendance/check-in`, {
    method: "POST",
    body: JSON.stringify({ staffId }),
  });
}

export async function getAttendanceSettings(): Promise<any> {
  try {
    return await http<any>(`/api/lab/staff-settings/attendance`);
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function saveAttendanceSettings(value: any): Promise<any> {
  return http<any>(`/api/lab/staff-settings/attendance`, {
    method: "PUT",
    body: JSON.stringify({ value }),
    headers: { "Content-Type": "application/json" },
  });
}

export async function getMonthlyAttendance(staffId:string, month:string): Promise<AttendanceRecord[]> {
  return http<AttendanceRecord[]>(`${ATTENDANCE_API}/attendance/monthly?staffId=${staffId}&month=${month}`);
}

export async function clockOut(staffId: string): Promise<AttendanceRecord> {
  return http<AttendanceRecord>(`${ATTENDANCE_API}/attendance/check-out`, {
    method: "POST",
    body: JSON.stringify({ staffId }),
  });
}
