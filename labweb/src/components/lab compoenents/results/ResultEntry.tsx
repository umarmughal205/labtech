import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TestType } from "@/types/sample";
import { AlertTriangle, CheckCircle, Send, ArrowLeft, Search, Plus, Trash } from "lucide-react";
import { api } from "@/lib/api";

interface ResultEntryProps {
  onNavigateBack?: () => void;
}

export interface BackendSample {
  _id: string;
  patientName: string;
  phone: string;
  tests: TestType[];
  status: "collected" | "processing" | "completed";
  results?: BackendResult[];
  interpretation?: string;
  age?: string;
  gender?: string;
}

export interface BackendResult {
  parameterId: string;
  value: number | string;
  comment?: string;
  isAbnormal?: boolean;
  isCritical?: boolean;
  // optional fields for manual/custom rows and robustness in reports
  label?: string;
  unit?: string;
  normalText?: string;
}

export interface TestParameter {
  id: string;
  name: string;
  unit: string;
  normalRange: { min: number; max: number };
  // optional group-specific ranges (may be string like "4-11" or object)
  normalRangeMale?: any;
  normalRangeFemale?: any;
  normalRangePediatric?: any;
  criticalRange?: { min: number; max: number };
}

const ResultEntryClean = ({ onNavigateBack }: ResultEntryProps) => {
  const { toast } = useToast();
  const [samples, setSamples] = useState<BackendSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<BackendSample | null>(null);
  const [results, setResults] = useState<BackendResult[]>([]);
  const [interpretation, setInterpretation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dynamic parameter list fetched per selected test
  const [testParameters, setTestParameters] = useState<TestParameter[]>([]);
  // Derived reference group (read-only UI)
  const [referenceGroup, setReferenceGroup] = useState<'male' | 'female' | 'pediatric'>('male');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [patientSex, setPatientSex] = useState<'male' | 'female' | ''>('');
  // Track raw input strings so users can type freely (including empty string)
  const [resultInputs, setResultInputs] = useState<Record<string, string>>({});

  // Custom/manual rows
  type ManualRow = { id: string; name: string; unit: string; normalText: string };
  const [manualRows, setManualRows] = useState<ManualRow[]>([]);

  // ResultEntry is now fully backend-driven; samples are always loaded from /labtech/samples

  const fetchParameters = async (testKey: string) => {
    const mapParams = (data: any) =>
      (data?.parameters || []).map((p: any, idx: number) => ({
        id: p?.id || (p?.name || p?.unit ? `${p?.name || ''}|${p?.unit || ''}` : `p_${idx}`),
        name: p?.name,
        unit: p?.unit,
        normalRange: p?.normalRange || { min: undefined, max: undefined },
        normalRangeMale: p?.normalRangeMale || p?.normalRange_male || null,
        normalRangeFemale: p?.normalRangeFemale || p?.normalRange_female || null,
        normalRangePediatric: p?.normalRangePediatric || p?.normalRange_pediatric || null,
        criticalRange: p?.criticalRange || undefined,
      }));

    // Try common endpoints first
    try {
      const { data } = await api.get(`/tests/${testKey}`);
      setTestParameters(mapParams(data));
      return;
    } catch {}
    try {
      const { data } = await api.get(`/labtech/tests/${testKey}`);
      setTestParameters(mapParams(data));
      return;
    } catch {}

    // If testKey looks like a name (not an ObjectId), try name-based search
    try {
      if (typeof testKey === 'string' && !/^[a-f\d]{24}$/i.test(testKey)) {
        const { data } = await api.get(`/tests`);
        const match = Array.isArray(data)
          ? data.find((t: any) => String(t?.name || '').toLowerCase() === testKey.toLowerCase())
          : null;
        if (match) {
          setTestParameters(mapParams(match));
          return;
        }
      }
    } catch {}

    toast({ title: "Error", description: "Failed to load test parameters", variant: "destructive" });
  };

  // Derived counters for summary
  const criticalCount = results.filter(r => r.isCritical).length;
  const abnormalCount = results.filter(r => !r.isCritical && r.isAbnormal).length;

  // Auto-select reference group from selected sample demographics
  useEffect(() => {
    if (!selectedSample) return;
    if (selectedSample.gender) {
      const g = selectedSample.gender.toLowerCase();
      if (g === 'male' || g === 'm') { setPatientSex('male'); setReferenceGroup('male'); }
      if (g === 'female' || g === 'f') { setPatientSex('female'); setReferenceGroup('female'); }
    }
    if (selectedSample.age) {
      const years = parseFloat(selectedSample.age);
      if (!isNaN(years)) {
        setPatientAge(years);
        if (years < 13) setReferenceGroup('pediatric');
      }
    }
    // Load parameter definitions for all tests in this sample so units and normal ranges auto-fill
    const loadParamsForSample = async () => {
      try {
        const testKeys = (selectedSample.tests || [])
          .map((t: any) => (typeof t === 'string' ? t : (t?._id || t?.id || t?.name)))
          .filter(Boolean);
        if (testKeys.length === 0) { setTestParameters([]); return; }
        const results = await Promise.all(
          testKeys.map(async (tk: string) => {
            try {
              const { data } = await api.get(`/tests/${tk}`);
              return (data?.parameters || []).map((p: any, idx: number) => ({
                id: p?.id || (p?.name || p?.unit ? `${p?.name || ''}|${p?.unit || ''}` : `p_${idx}`),
                name: p?.name,
                unit: p?.unit,
                normalRange: p?.normalRange || { min: undefined, max: undefined },
                normalRangeMale: p?.normalRangeMale || p?.normalRange_male || null,
                normalRangeFemale: p?.normalRangeFemale || p?.normalRange_female || null,
                normalRangePediatric: p?.normalRangePediatric || p?.normalRange_pediatric || null,
                criticalRange: p?.criticalRange || undefined,
              }));
            } catch (err1) {
              try {
                const { data } = await api.get(`/labtech/tests/${tk}`);
                return (data?.parameters || []).map((p: any, idx: number) => ({
                  id: p?.id || (p?.name || p?.unit ? `${p?.name || ''}|${p?.unit || ''}` : `p_${idx}`),
                  name: p?.name,
                  unit: p?.unit,
                  normalRange: p?.normalRange || { min: undefined, max: undefined },
                  normalRangeMale: p?.normalRangeMale || p?.normalRange_male || null,
                  normalRangeFemale: p?.normalRangeFemale || p?.normalRange_female || null,
                  normalRangePediatric: p?.normalRangePediatric || p?.normalRange_pediatric || null,
                  criticalRange: p?.criticalRange || undefined,
                }));
              } catch (err2) {
                // last resort: name-based lookup
                if (typeof tk === 'string' && !/^[a-f\d]{24}$/i.test(tk)) {
                  try {
                    const { data } = await api.get(`/tests`);
                    const match = Array.isArray(data)
                      ? data.find((t: any) => String(t?.name || '').toLowerCase() === tk.toLowerCase())
                      : null;
                    if (match) return (match?.parameters || []).map((p: any, idx: number) => ({
                      id: p?.id || (p?.name || p?.unit ? `${p?.name || ''}|${p?.unit || ''}` : `p_${idx}`),
                      name: p?.name,
                      unit: p?.unit,
                      normalRange: p?.normalRange || { min: undefined, max: undefined },
                      normalRangeMale: p?.normalRangeMale || p?.normalRange_male || null,
                      normalRangeFemale: p?.normalRangeFemale || p?.normalRange_female || null,
                      normalRangePediatric: p?.normalRangePediatric || p?.normalRange_pediatric || null,
                      criticalRange: p?.criticalRange || undefined,
                    }));
                  } catch {}
                }
                return [] as any[];
              }
            }
          })
        );
        // Merge and de-duplicate by parameter id and name
        const merged: any[] = [];
        const seen = new Set<string>();
        results.flat().forEach((p: any) => {
          const key = p?.id || `${p?.name || ''}|${p?.unit || ''}`;
          if (key && !seen.has(key)) { seen.add(key); merged.push(p); }
        });
        setTestParameters(merged as any);
      } catch {
        toast({ title: 'Error', description: 'Failed to load parameters for sample tests', variant: 'destructive' });
      }
    };
    // reset raw input cache when sample changes
    setResultInputs({});
    loadParamsForSample();
  }, [selectedSample]);

  const loadSamples = () => {
    const token = localStorage.getItem('token');
    api
      .get<BackendSample[]>("/labtech/samples", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      .then(({ data }) => {
        const listRaw = Array.isArray(data) ? data : [];
        const normalized = listRaw.map((s: any) => {
          const st = String(s?.status || '').toLowerCase();
          const normStatus: any = st.includes('complet') ? 'completed' : st.includes('process') ? 'processing' : 'collected';
          return { ...s, status: normStatus };
        });
        const pending = normalized.filter((s: any) => s.status === 'processing' || s.status === 'collected');
        setSamples(pending as any);
      })
      .catch((err) => {
        console.error('Failed to load samples for ResultEntry', err);
        setSamples([]);
      });
  };

  useEffect(() => {
    loadSamples();
  }, []);

  useEffect(() => {
    const onChange = () => loadSamples();
    try {
      window.addEventListener('samplesChanged', onChange);
      window.addEventListener('sampleSubmitted', onChange);
    } catch {}
    return () => {
      try {
        window.removeEventListener('samplesChanged', onChange);
        window.removeEventListener('sampleSubmitted', onChange);
      } catch {}
    };
  }, []);

  // helper to get numeric min/max from parameter based on group
  const getGroupRange = (param: any): { min?: number; max?: number } => {
    const pick = referenceGroup === 'male' ? param.normalRangeMale
      : referenceGroup === 'female' ? param.normalRangeFemale
        : param.normalRangePediatric;
    const toRange = (r: any): { min?: number; max?: number } | null => {
      if (!r) return null;
      if (typeof r === 'object' && (typeof r.min === 'number' || typeof r.max === 'number')) return { min: r.min, max: r.max };
      if (typeof r === 'string') {
        const m = r.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
        if (m) return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
      }
      return null;
    };
    return toRange(pick) || param.normalRange || {};
  };

  const updateResult = (parameterId: string, value: string) => {
    // cache raw input so user can type freely
    setResultInputs(prev => ({ ...prev, [parameterId]: value }));
    const param: any = testParameters.find((p: any) => p.id === parameterId);
    if (!param) {
      // still ensure entry exists for comment linkage
      setResults(prev => {
        const existing = prev.find(r => r.parameterId === parameterId);
        return existing ? prev : [...prev, { parameterId, value: null as any }];
      });
      return;
    }
    if (value === '') {
      // allow clearing the field; keep entry with null value and clear flags
      setResults(prev => {
        const existing = prev.find(r => r.parameterId === parameterId);
        if (existing) return prev.map(r => (r.parameterId === parameterId ? { ...r, value: null as any, isAbnormal: undefined, isCritical: undefined } : r));
        return [...prev, { parameterId, value: null as any }];
      });
      return;
    }
    const normalized = value.trim();
    const num = parseFloat(normalized.replace(/,/g, "."));
    if (normalized !== '' && isNaN(num)) {
      // qualitative value: save as string and clear flags
      setResults(prev => {
        const existing = prev.find(r => r.parameterId === parameterId);
        if (existing) return prev.map(r => (r.parameterId === parameterId ? { ...r, value: normalized, isAbnormal: undefined, isCritical: undefined } : r));
        return [...prev, { parameterId, value: normalized }];
      });
      return;
    }
    const nr = getGroupRange(param) || {};
    const cr = param.criticalRange || undefined;
    const hasMin = typeof nr.min === 'number';
    const hasMax = typeof nr.max === 'number';
    const isAbnormal = (hasMin && num < nr.min) || (hasMax && num > nr.max) ? true : false;
    const isCritical = cr ? ((typeof cr.min === 'number' && num < cr.min) || (typeof cr.max === 'number' && num > cr.max)) : false;
    setResults((prev) => {
      const existing = prev.find((r) => r.parameterId === parameterId);
      if (existing) {
        return prev.map((r) => (r.parameterId === parameterId ? { ...r, value: num, isAbnormal, isCritical } : r));
      }
      return [...prev, { parameterId, value: num, isAbnormal, isCritical }];
    });
  };

  const updateComment = (parameterId: string, comment: string) => {
    setResults((prev) => {
      const existing = prev.find(r => r.parameterId === parameterId);
      if (existing) return prev.map(r => (r.parameterId === parameterId ? { ...r, comment } : r));
      // create entry if not exists so comments are allowed before numeric value
      return [...prev, { parameterId, value: null as any, comment }];
    });
  };



  const handleSubmit = async () => {
    if (!selectedSample) return;
    setSubmitting(true);
    try {
      const mergedResults = [
        ...results,
        ...manualRows.map(r => ({
          parameterId: r.id,
          value: (results.find(x => x.parameterId === r.id)?.value) ?? null,
          comment: (results.find(x => x.parameterId === r.id)?.comment) ?? undefined,
          label: r.name,
          unit: r.unit,
          normalText: r.normalText,
        }))
      ];
      // keep only rows that have a value (number or non-empty string)
      const cleaned = mergedResults.filter(r => {
        const v: any = (r as any).value;
        return v !== null && v !== undefined && String(v).trim() !== '';
      });
      if (cleaned.length === 0) {
        toast({ title: 'No results', description: 'Please enter at least one result value before submitting.', variant: 'destructive' });
        return;
      }
      const token = localStorage.getItem('token');
      try {
        await api.patch(`/labtech/samples/${selectedSample._id}`, { results: cleaned, interpretation, status: "completed" }, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const altId = (selectedSample as any).sampleNumber || (selectedSample as any).barcode;
          if (altId && String(altId) !== String(selectedSample._id)) {
            await api.patch(`/labtech/samples/${altId}`, { results: cleaned, interpretation, status: "completed" }, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      toast({ title: "Submitted", description: "Results submitted and sample marked completed" });
      setSelectedSample(null);
      setResults([]);
      setInterpretation("");
      setManualRows([]);
      loadSamples();
      try {
        window.dispatchEvent(new Event('samplesChanged'));
      } catch {}
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit';
      toast({ title: "Error", description: msg, variant: "destructive" });
      console.error('[ResultEntry submit]', err?.response?.data || err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (parameterId: string) => {
    const res = results.find((r) => r.parameterId === parameterId);
    if (!res) return null;
    if (res.isCritical) return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
    if (res.isAbnormal) return <Badge className="bg-orange-100 text-orange-800">Abnormal</Badge>;
    return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Result Entry</h1>
          <p className="text-sm text-gray-500 mt-1">Enter and verify test results for patient samples.</p>
        </div>
      </div>

      {/* Sample picker (full-width tabular layout) */}
      {!selectedSample && (
        <Card>
          <CardHeader>
            <CardTitle>Select Sample</CardTitle>
            <CardDescription>Choose a sample to enter test results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by Sample ID, patient, CNIC, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2 border-b">Sample ID</th>
                    <th className="px-3 py-2 border-b">Patient</th>
                    <th className="px-3 py-2 border-b">Test(s)</th>
                    <th className="px-3 py-2 border-b">CNIC</th>
                    <th className="px-3 py-2 border-b">Phone</th>
                    <th className="px-3 py-2 border-b">Status</th>
                    <th className="px-3 py-2 border-b text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {samples
                    .filter(s => {
                      const q = searchTerm.toLowerCase();
                      const sampleId =
                        (s as any).sampleNumber ||
                        (s as any).barcode ||
                        (s._id || '');
                      const cnic = (s as any).cnic || (s as any).patientCnic || (s as any).patientCNIC || '';
                      const phone = (s as any).phone || (s as any).patientPhone || '';
                      return (
                        String(sampleId).toLowerCase().includes(q) ||
                        (s.patientName || '').toLowerCase().includes(q) ||
                        String(cnic).toLowerCase().includes(q) ||
                        String(phone).toLowerCase().includes(q)
                      );
                    })
                    .map(s => {
                      const sampleId =
                        (s as any).sampleNumber ||
                        (s as any).barcode ||
                        (s._id || '-');
                      const cnic = (s as any).cnic || (s as any).patientCnic || (s as any).patientCNIC || '-';
                      const phone = (s as any).phone || (s as any).patientPhone || '-';
                      return (
                        <tr key={s._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border-b">{sampleId}</td>
                          <td className="px-3 py-2 border-b">
                            <div className="font-medium">{s.patientName}</div>
                            <div className="text-xs text-gray-500">{(s as any).patientId || ''}</div>
                          </td>
                          <td className="px-3 py-2 border-b">{(s.tests || []).map(t => (typeof t === 'string' ? '' : t.name)).filter(Boolean).join(', ')}</td>
                          <td className="px-3 py-2 border-b">{cnic}</td>
                          <td className="px-3 py-2 border-b">{phone}</td>
                          <td className="px-3 py-2 border-b">
                            <div><Badge variant="outline">{s.status}</Badge></div>
                            <div className="text-[11px] text-gray-500 mt-1">
                              {(() => {
                                const anyS: any = s as any;
                                const d = anyS.updatedAt || anyS.completedAt || anyS.processedAt || anyS.receivedAt || anyS.createdAt;
                                if (!d) return null;
                                try {
                                  const when = new Date(d).toLocaleDateString();
                                  const label = (s.status === 'completed') ? 'Completed' : 'Updated';
                                  return `${label}: ${when}`;
                                } catch {
                                  return null;
                                }
                              })()}
                            </div>
                          </td>
                          <td className="px-3 py-2 border-b text-right">
                            <Button size="sm" onClick={() => { setSelectedSample(s); setResults(s.results || []); setInterpretation(s.interpretation || ""); }}>Select</Button>
                          </td>
                        </tr>
                      );
                    })}
                  {samples.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search className="w-10 h-10 text-gray-300" />
                          <p>No samples available for result entry</p>
                          <p className="text-xs text-gray-400">Completed or in-progress samples from Intake will appear here automatically</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entry form */}
      {selectedSample && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Sample ID: {selectedSample._id}</h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={submitting}><Send className="w-4 h-4 mr-1" />Submit</Button>
            </div>
          </div>

          {/* stats */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">Critical Values</p><p className="text-2xl font-bold text-red-600">{criticalCount}</p></div><AlertTriangle className="w-8 h-8 text-red-500" /></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">Abnormal Values</p><p className="text-2xl font-bold text-orange-600">{abnormalCount}</p></div><AlertTriangle className="w-8 h-8 text-orange-500" /></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">Normal Values</p><p className="text-2xl font-bold text-green-600">{results.length - criticalCount - abnormalCount}</p></div><CheckCircle className="w-8 h-8 text-green-500" /></CardContent></Card>
          </div>

          {/* Parameter Entry (table-like) */}
          <Card>
            <CardHeader>
              <CardTitle>Parameters</CardTitle>
              <CardDescription>
                Enter results. Reference group is derived from patient demographics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="px-3 py-2 rounded bg-blue-50 text-blue-800 text-sm">
                  Patient: <strong>{selectedSample?.patientName}</strong> • Age: <strong>{patientAge || '-'}</strong> • Sex: <strong>{patientSex || '-'}</strong> • Group: <strong className="capitalize">{referenceGroup}</strong>
                </div>
                <div className="ml-auto">
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const id = `manual-${Date.now()}`;
                    setManualRows(prev => [...prev, { id, name: '', unit: '', normalText: '' }]);
                  }} className="gap-2"><Plus className="w-4 h-4" /> Add Row</Button>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border text-left">Test</th>
                      <th className="p-2 border text-left">Normal Value</th>
                      <th className="p-2 border text-left">Unit</th>
                      <th className="p-2 border text-left">Result</th>
                      <th className="p-2 border text-left">Comment</th>
                      <th className="p-2 border"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {testParameters.map((p: any) => {
                      const result = results.find(r => r.parameterId === p.id);
                      // derive normal text by group if provided else default min-max
                      let normalText = '';
                      const rangeForGroup = referenceGroup === 'male' ? p.normalRangeMale : referenceGroup === 'female' ? p.normalRangeFemale : p.normalRangePediatric;
                      if (rangeForGroup) {
                        normalText = typeof rangeForGroup === 'string' ? rangeForGroup : '';
                      } else if (p.normalRange && (p.normalRange.min !== undefined || p.normalRange.max !== undefined)) {
                        const min = p.normalRange.min ?? '';
                        const max = p.normalRange.max ?? '';
                        normalText = `${min} - ${max}`.trim();
                      }
                      return (
                        <tr key={p.id} className="align-top">
                          <td className="p-2 border w-64">{p.name}</td>
                          <td className="p-2 border w-48">{normalText}</td>
                          <td className="p-2 border w-32">{p.unit || '-'}</td>
                          <td className="p-2 border w-40">
                            <Input type="text" value={resultInputs[p.id] ?? (result?.value ?? '') as any} onChange={(e) => updateResult(p.id, e.target.value)} />
                          </td>
                          <td className="p-2 border">
                            <Input value={result?.comment ?? ''} onChange={(e) => updateComment(p.id, e.target.value)} placeholder="Optional" />
                          </td>
                          <td className="p-2 border w-32">{getStatusBadge(p.id)}</td>
                        </tr>
                      );
                    })}

                    {manualRows.map((r, idx) => {
                      const res = results.find(x => x.parameterId === r.id);
                      return (
                        <tr key={r.id} className="align-top bg-gray-50/30">
                          <td className="p-2 border w-64">
                            <Input value={r.name} onChange={(e) => {
                              const v = e.target.value; setManualRows(prev => prev.map((m, i) => i === idx ? { ...m, name: v } : m));
                            }} placeholder="Custom test name" />
                          </td>
                          <td className="p-2 border w-48">
                            <Input value={r.normalText} onChange={(e) => {
                              const v = e.target.value; setManualRows(prev => prev.map((m, i) => i === idx ? { ...m, normalText: v } : m));
                            }} placeholder="e.g., 4-11" />
                          </td>
                          <td className="p-2 border w-32">
                            <Input value={r.unit} onChange={(e) => {
                              const v = e.target.value; setManualRows(prev => prev.map((m, i) => i === idx ? { ...m, unit: v } : m));
                            }} placeholder="Unit" />
                          </td>
                          <td className="p-2 border w-40">
                            <Input type="text" value={resultInputs[r.id] ?? (res?.value ?? '') as any} onChange={(e) => updateResult(r.id, e.target.value)} />
                          </td>
                          <td className="p-2 border">
                            <Input value={res?.comment ?? ''} onChange={(e) => updateComment(r.id, e.target.value)} placeholder="Optional" />
                          </td>
                          <td className="p-2 border w-32">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setManualRows(prev => prev.filter((_, i) => i !== idx));
                            }}><Trash className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* interpretation */}
          <Card><CardHeader><CardTitle>Interpretation</CardTitle></CardHeader><CardContent><textarea className="w-full p-3 border rounded" rows={4} value={interpretation} onChange={(e) => setInterpretation(e.target.value)} placeholder="Clinical interpretation..." /></CardContent></Card>
        </>
      )}
    </div>
  );
};

export default ResultEntryClean;
