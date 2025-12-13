import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

interface ProfilingRecord {
  id: string;
  name: string;
  cnic: string;
  phone: string;
  numberOfVisits: number;
  lastVisitDate: string | null;
  sampleTypes: string[];
  profilingNotes: string;
}

const ProfilingPage = () => {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ProfilingRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple create form state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [phone, setPhone] = useState("");
  const [profilingNotes, setProfilingNotes] = useState("");

  const loadProfiling = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ success: boolean; items: ProfilingRecord[] }>("/lab/profiling");
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load profiling";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    setError(null);
    if (!name || !cnic || !phone) {
      setError("Name, CNIC and phone are required.");
      return;
    }
    try {
      await api.post("/lab/profiling", {
        name,
        cnic,
        phone,
        profilingNotes: profilingNotes || "",
      });
      setName("");
      setCnic("");
      setPhone("");
      setProfilingNotes("");
      setShowCreate(false);
      await loadProfiling();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to create profiling";
      setError(msg);
    }
  };

  const filtered = items.filter((p) => {
    const value = `${p.name} ${p.cnic} ${p.phone}`.toLowerCase();
    return value.includes(search.toLowerCase());
  });

  const selected = filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 h-full">
      <div className="md:col-span-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Patient Profiling</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowCreate((v) => !v);
                }}
              >
                Add Profile
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Input
              placeholder="Search by name, CNIC, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {showCreate && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/40">
                <div className="grid grid-cols-1 gap-2">
                  <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input placeholder="CNIC" value={cnic} onChange={(e) => setCnic(e.target.value)} />
                  <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Textarea
                    placeholder="Complete profiling / history notes"
                    value={profilingNotes}
                    onChange={(e) => setProfilingNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowCreate(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleCreate} disabled={loading}>
                    Save
                  </Button>
                </div>
              </div>
            )}
            <div className="border rounded-md max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>CNIC</TableHead>
                    <TableHead>Visits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filtered.map((row) => (
                        <TableRow
                          key={row.id}
                          className={row.id === selected?.id ? "bg-muted/60 cursor-pointer" : "cursor-pointer"}
                          onClick={() => setSelectedId(row.id)}
                        >
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>{row.cnic}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.numberOfVisits}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                            No patients found
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-8 space-y-4">
        {selected ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="font-medium">{selected.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">CNIC</div>
                  <div className="font-medium">{selected.cnic}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="font-medium">{selected.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Number of Visits</div>
                  <div className="font-medium">{selected.numberOfVisits}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last Visit Date</div>
                  <div className="font-medium">
                    {new Date(selected.lastVisitDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Sample Types</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selected.sampleTypes.map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                    {selected.sampleTypes.length === 0 && (
                      <span className="text-xs text-muted-foreground">No samples recorded</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>Complete Profiling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={selected.profilingNotes}
                  readOnly
                  className="min-h-[160px] resize-none bg-muted/40"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline">
                    Edit Profiling
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent>
              <div className="text-center text-sm text-muted-foreground">
                Select a patient from the left to view profiling details.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProfilingPage;
