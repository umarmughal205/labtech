import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UIStaff } from "@/lab utils/staffService";

interface AttendanceFormProps {
  isUrdu: boolean;
  staffList: UIStaff[];
  defaultStaffId?: string;
  defaultDate?: string;
  onClose: () => void;
  onSave: (data: { staffId: string; date: string; status?: string; checkIn?: string; checkOut?: string }) => void;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({ isUrdu, staffList, defaultStaffId = "", defaultDate = "", onClose, onSave }) => {
  const [staffId, setStaffId] = useState(defaultStaffId);
  const [date, setDate] = useState(defaultDate);
  const [status, setStatus] = useState("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>("");

  const hours = (() => {
    if (!checkIn || !checkOut) return "--";
    try {
      const [ih, im] = checkIn.split(":").map(Number);
      const [oh, om] = checkOut.split(":").map(Number);
      const start = ih * 60 + im;
      const end = oh * 60 + om;
      if (isNaN(start) || isNaN(end)) return "--";
      const diff = end - start;
      if (diff <= 0) return "--";
      const hh = Math.floor(diff / 60);
      const mm = diff % 60;
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    } catch {
      return "--";
    }
  })();

  const handleSubmit = () => {
    setError("");
    if (!staffId) { setError(t("Please select staff","عملہ منتخب کریں")); return; }
    if (!date) { setError(t("Please select date","تاریخ منتخب کریں")); return; }
    if (checkIn && checkOut) {
      if (checkOut <= checkIn) { setError(t("Checkout must be after check-in","چیک آؤٹ چیک اِن کے بعد ہونا چاہیے")); return; }
    }
    const final = { staffId, date, status, checkIn, checkOut, notes } as any;
    if (status === 'halfDay') {
      final.status = 'present';
      final.notes = notes ? `${notes} (half-day)` : 'half-day';
    }
    onSave(final);
    onClose();
  };

  const t = (en: string, ur: string) => (isUrdu ? ur : en);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>{t("Add Attendance", "حاضری شامل کریں")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="block text-sm font-medium">{t("Staff", "عملہ")}</label>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-full border rounded p-2">
            <option value="" disabled>{t("Select staff", "عملہ منتخب کریں")}</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <label className="block text-sm font-medium">{t("Date", "تاریخ")}</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium">{t("Arrival (Check-in)", "آمد (چیک اِن)")}</label>
              <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">{t("Checkout (Check-out)", "رخصت (چیک آؤٹ)")}</label>
              <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
          <div className="text-xs text-gray-600">{t("Hours", "گھنٹے")}: {hours}</div>
          <label className="block text-sm font-medium">{t("Notes","نوٹس")}</label>
          <Input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder={t("Optional note","اختیاری نوٹ")} />
          <label className="block text-sm font-medium">{t("Status", "حیثیت")}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border rounded p-2">
            <option value="present">{t("Present", "حاضر")}</option>
            <option value="absent">{t("Absent", "غیر حاضر")}</option>
            <option value="leave">{t("Leave", "چھٹی")}</option>
            <option value="halfDay">{t("Half Day", "آدھا دن")}</option>
          </select>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Cancel", "منسوخ")}</Button>
          <Button onClick={handleSubmit}>{t("Save", "محفوظ کریں")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceForm;
