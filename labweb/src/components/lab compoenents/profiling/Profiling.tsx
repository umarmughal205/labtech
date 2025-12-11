import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface AppointmentItem {
  _id: string;
  patientName: string;
  cnic?: string;
  contact?: string;
  testName: string;
  date: string;
  time: string;
  status: string;
  appointmentCode?: string;
  createdAt?: string;
}

interface SampleItem {
  _id: string;
  sampleNumber: string;
  patientName: string;
  cnic?: string;
  tests?: { name: string; price?: number }[];
  status?: string;
  createdAt?: string;
}

const Profiling: React.FC = () => {
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [service, setService] = useState("");
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/profiling/search", {
        params: {
          name: name || undefined,
          cnic: cnic || undefined,
          service: service || undefined,
        },
      });
      setAppointments(res.data?.appointments || []);
      setSamples(res.data?.samples || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Patient Profiling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm block mb-1">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient name" />
            </div>
            <div>
              <label className="text-sm block mb-1">CNIC</label>
              <Input value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="CNIC" />
            </div>
            <div>
              <label className="text-sm block mb-1">Lab Service / Test</label>
              <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. CBC" />
            </div>
            <div className="flex items-end">
              <Button onClick={onSearch} disabled={loading} className="w-full">{loading ? "Searching..." : "Search"}</Button>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        </CardContent>
      </Card>

      {(appointments.length === 0 && samples.length === 0) ? (
        <div className="w-full border rounded p-10 text-center text-muted-foreground">
          <div className="text-lg font-medium mb-1">No records found</div>
          <div className="text-xs">Run a search to see patient visits and tests</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {appointments.map((a) => (
                    <div key={a._id} className="border rounded p-2">
                      <div className="text-sm font-medium">{a.patientName} {a.cnic ? `(${a.cnic})` : ""}</div>
                      <div className="text-xs text-muted-foreground">{a.date} {a.time} • {a.testName} • {a.status}</div>
                      {a.appointmentCode && (
                        <div className="text-xs">Code: {a.appointmentCode}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {samples.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Samples / Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {samples.map((s) => (
                    <div key={s._id} className="border rounded p-2">
                      <div className="text-sm font-medium">{s.patientName} {s.cnic ? `(${s.cnic})` : ""}</div>
                      <div className="text-xs text-muted-foreground">Sample #{s.sampleNumber} • {s.status}</div>
                      {Array.isArray(s.tests) && s.tests.length > 0 && (
                        <div className="text-xs mt-1">Tests: {s.tests.map(t => t?.name).filter(Boolean).join(", ")}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Profiling;
