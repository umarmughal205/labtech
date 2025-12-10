import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye } from "lucide-react";
import { api } from "@/lib/api";

interface AppointmentRecord {
  id: string;
  patientName: string;
  patientId: string;
  contact: string;
  address?: string;
  test: string;
  date: string;
  time: string;
  status: "Confirmed" | "Pending" | "Cancelled" | "Completed";
  cnic?: string;
  gender?: string;
  age?: number;
  guardian?: string;
  guardianName?: string;
  payment?: string;
}

const formatDisplayDateTime = (date: string, time: string) => {
  if (!date && !time) return "-";
  try {
    const [year, month, day] = date.split("-").map((v) => parseInt(v, 10));
    if (!year || !month || !day) return `${date} ${time}`.trim();
    const [hh = "0", mm = "0"] = time.split(":");
    const d = new Date(year, month - 1, day, parseInt(hh, 10), parseInt(mm, 10));
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return `${date} ${time}`.trim();
  }
};

const Appointment: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRecord | null>(null);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const { data } = await api.get<{
          success?: boolean;
          appointments?: any[];
        }>("/appointments/admin");

        const source = data && Array.isArray((data as any).appointments)
          ? (data as any).appointments
          : Array.isArray(data)
            ? (data as any)
            : [];

        const mapped: AppointmentRecord[] = source.map((apt: any) => ({
          id: String(apt._id || ""),
          patientName: apt.patientName || "-",
          patientId: apt.appointmentCode || apt.cnic || "-",
          contact: apt.contact || "-",
          address: apt.address,
          test: apt.testName || "-",
          date: apt.date || "",
          time: apt.time || "",
          status: (apt.status || "Pending") as AppointmentRecord["status"],
          cnic: apt.cnic,
          gender: apt.gender,
          age: typeof apt.age === "number" ? apt.age : undefined,
          guardian: apt.guardian,
          guardianName: apt.guardianName,
          payment: apt.paymentStatus,
        }));

        setAppointments(mapped);
      } catch (err) {
        console.error("Failed to load lab appointments from labTech-backend", err);
        setAppointments([]);
      }
    };

    loadAppointments();
  }, []);

  const handleStatusChange = async (
    appt: AppointmentRecord,
    newStatus: AppointmentRecord["status"]
  ) => {
    if (appt.status === newStatus) return;
    const previousStatus = appt.status;

    try {
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status: newStatus } : a))
      );

      await api.patch(`/appointments/admin/${appt.id}/status`, {
        status: newStatus,
      });
    } catch (err) {
      console.error("Failed to update appointment status from web", err);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status: previousStatus } : a))
      );
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return appointments.filter((appt) => {
      if (statusFilter !== "all" && appt.status !== statusFilter) return false;
      if (term) {
        const haystack = `${appt.patientName} ${appt.patientId} ${appt.test} ${appt.contact} ${appt.address ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [appointments, searchTerm, statusFilter]);

  const openDetailDialog = (appt: AppointmentRecord) => {
    setSelectedAppointment(appt);
    setIsDetailOpen(true);
  };

  const closeDetailDialog = () => {
    setIsDetailOpen(false);
    setSelectedAppointment(null);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
          <p className="text-sm text-gray-600">
            View, search, and manage all patient appointments.
          </p>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by patient name, ID, test, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-full bg-gray-50 border border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-64">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-full text-xs rounded-full bg-gray-50 border border-gray-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Service/Test</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="text-sm text-gray-700 font-medium">{appt.patientId}</TableCell>
                    <TableCell className="text-sm text-gray-700">{appt.patientName}</TableCell>
                    <TableCell className="text-sm text-gray-700">{appt.contact}</TableCell>
                    <TableCell className="text-sm text-gray-700">{appt.address || "-"}</TableCell>
                    <TableCell className="text-sm text-gray-700">{appt.test}</TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {formatDisplayDateTime(appt.date, appt.time)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={appt.status}
                        onValueChange={(value) =>
                          handleStatusChange(
                            appt,
                            value as AppointmentRecord["status"]
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Confirmed">Confirmed</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-xs text-gray-400 space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500 hover:text-gray-800"
                        title="View details"
                        onClick={() => openDetailDialog(appt)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) closeDetailDialog();
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Appointment Detail</DialogTitle>
            <DialogDescription>Full information for this appointment.</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-2 py-2 text-sm text-gray-800">
              <div className="flex justify-between">
                <span className="text-gray-500">Lab Test</span>
                <span className="font-semibold text-right">{selectedAppointment.test}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Patient Name</span>
                <span className="text-right">{selectedAppointment.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="text-right">{selectedAppointment.contact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Address</span>
                <span className="text-right">{selectedAppointment.address || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Gender</span>
                <span className="text-right">{selectedAppointment.gender || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Age</span>
                <span className="text-right">{selectedAppointment.age ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">CNIC</span>
                <span className="text-right">{selectedAppointment.cnic || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Guardian</span>
                <span className="text-right">{selectedAppointment.guardian || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Guardian Name</span>
                <span className="text-right">{selectedAppointment.guardianName || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-right">{selectedAppointment.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="text-right">{selectedAppointment.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment</span>
                <span className="text-right">{selectedAppointment.payment || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-right">{selectedAppointment.status}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Appointment;
