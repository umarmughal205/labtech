import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Eye, 
  BarChart3, 
  X,
  Printer,
  Download
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lab lib/api";

function getSampleTestNames(sample: any): string[] {
  try {
    const names: string[] = [];
    if (Array.isArray(sample?.tests)) {
      for (const t of sample.tests) {
        const n = String((t && (t.name || t.test)) || t || "").trim();
        if (n) names.push(n);
      }
    }
    if (typeof sample?.test === "string") {
      String(sample.test)
        .split(",")
        .map((v) => v.trim())
        .forEach((v) => v && names.push(v));
    }
    const uniq = Array.from(new Set(names.map((s) => s.toLowerCase())));
    return uniq.map((lower) => names.find((n) => n.toLowerCase() === lower) || lower);
  } catch {
    return [];
  }
}

function sampleHasCBC(sample: any): boolean {
  try {
    const names: string[] = [];
    if (Array.isArray(sample?.tests)) {
      for (const t of sample.tests) {
        const n = String((t && (t.name || t.test)) || t || "").toLowerCase();
        if (n) names.push(n);
      }
    }
    if (typeof sample?.test === "string") {
      String(sample.test)
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .forEach((v) => v && names.push(v));
    }
    const lookup = [
      "complete blood count",
      "cbc",
      "complete blood count (cbc)",
    ];
    return names.some((n) => lookup.some((k) => n.includes(k)));
  } catch {
    return false;
  }
}

const Barcodes: React.FC = () => {
  const { toast } = useToast();
  
  // Barcode Management state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReportTrackingModal, setShowReportTrackingModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [showAddSampleModal, setShowAddSampleModal] = useState(false);
  const [cbcRows, setCbcRows] = useState<Array<{ parameter: string; value: string; unit: string; ref: string; status: string }>>([]);
  const [showCbcEditor, setShowCbcEditor] = useState<boolean>(false);
  

  // New sample form state
  const [newSample, setNewSample] = useState({
    patientName: "",
    test: "",
    status: "collected" as "collected" | "processing" | "completed",
    assignedAnalyzer: "",
    collectionTime: "",
  });

  // Helper functions
  const getStatusBadge = (status: string) => {
    const raw = String(status || "").toLowerCase();
    const norm: "collected" | "processing" | "completed" =
      raw.includes("complet") ? "completed" : raw.includes("process") ? "processing" : "collected";
    const statusConfig: Record<"collected" | "processing" | "completed", { color: string; text: string }> = {
      collected: { color: "bg-blue-100 text-blue-800", text: "Collected" },
      processing: { color: "bg-yellow-100 text-yellow-800", text: "Processing" },
      completed: { color: "bg-green-100 text-green-800", text: "Completed" },
    };
    const config = statusConfig[norm];
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.text}
      </Badge>
    );
  };


  const formatCollectionTime = (value: any) => {
    try {
      if (!value) return 'N/A';
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return String(value);
    } catch {
      return String(value ?? 'N/A');
    }
  };

  // Search functionality
  const performSearch = useCallback((term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const searchableFields = samples.flatMap(sample => [
      sample.barcode,
      sample.patientName,
      sample.test,
      sample.status
    ]);

    const uniqueMatches = [...new Set(
      searchableFields.filter(field => 
        field.toLowerCase().includes(term.toLowerCase())
      )
    )];

    setSearchResults(uniqueMatches.slice(0, 5));
  }, [samples]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSearchSuggestions(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length > 0) {
      setShowSearchSuggestions(true);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchSuggestions(false);
  };

  // Filter samples based on search and status
  const filteredSamples = samples.filter(sample => {
    const matchesSearch = !searchTerm || 
      String(sample.barcode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(sample.patientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(sample.test || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(sample.status || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const rawStatus = String(sample.status || "");
    const normStatus = rawStatus.toLowerCase().includes("complet")
      ? "completed"
      : rawStatus.toLowerCase().includes("process")
      ? "processing"
      : "collected";
    const matchesStatus = statusFilter === "All Status" || normStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Load samples from backend API so Barcodes is backend-driven
  const loadSamplesFromBackend = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/labtech/samples", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      const mapped = arr.map((s: any) => {
        const rawStatus = String(s.status || "");
        const normStatus = rawStatus.toLowerCase().includes("complet")
          ? "completed"
          : rawStatus.toLowerCase().includes("process")
          ? "processing"
          : "collected";
        return {
          // keep full backend sample so we retain _id for PATCHing
          ...s,
          barcode: s.sampleNumber || s.barcode || "",
          patientName: s.patientName || "",
          test:
            Array.isArray(s.tests) && s.tests.length
              ? s.tests.map((t: any) => t?.name || t?.test).filter(Boolean).join(", ")
              : s.test || "",
          status: normStatus,
          assignedAnalyzer: s.assignedAnalyzer || "",
          collectionTime: s.createdAt
            ? new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          tests: Array.isArray(s.tests) ? s.tests : [],
        };
      });
      setSamples(mapped);
    } catch (err) {
      console.error("Failed to load samples from backend", err);
      // keep existing samples state on error
    }
  }, []);

  useEffect(() => {
    loadSamplesFromBackend();
    const sync = () => {
      loadSamplesFromBackend();
    };
    window.addEventListener("samplesChanged", sync);
    window.addEventListener("sampleSubmitted", sync);
    return () => {
      window.removeEventListener("samplesChanged", sync);
      window.removeEventListener("sampleSubmitted", sync);
    };
  }, [loadSamplesFromBackend]);

  // Action handlers
  const handleViewSample = (row: any) => {
    // Pure front-end flow: use the row data only as the current mock sample
    setSelectedSample(row);
    setShowCbcEditor(false);
    setShowViewModal(true);
  };

  const handleEditCbc = (row: any) => {
    setSelectedSample(row);
    setShowCbcEditor(true);
    setShowViewModal(true);
  };

  const handleTrackReport = (sample: any) => {
    setSelectedSample(sample);
    setShowReportTrackingModal(true);
  };

  useEffect(() => {
    if (!showViewModal || !selectedSample) return;
    const existing = Array.isArray(selectedSample.results) ? selectedSample.results : [];
    const selectedNames = getSampleTestNames(selectedSample);
    const toRow = (r: any) => ({
      parameter: String(r?.label || r?.parameter || r?.name || 'Parameter'),
      value: String(r?.value ?? ''),
      unit: String(r?.unit ?? ''),
      ref: String(r?.normalText ?? ''),
      status: r?.isCritical ? 'Critical' : (r?.isAbnormal ? 'Abnormal' : 'Normal'),
    });
    if (existing.length > 0) {
      setCbcRows(existing.map(toRow));
    } else if (selectedNames.length > 0) {
      setCbcRows(selectedNames.map((name) => ({
        parameter: name,
        value: '-',
        unit: '-',
        ref: '-',
        status: 'Normal',
      })));
    } else {
      setCbcRows([
        { parameter: 'Hemoglobin (Hgb)', value: '13.9', unit: 'g/dL', ref: '13.5 - 17.5', status: 'Normal' },
        { parameter: 'WBC', value: '7.6', unit: '10³/μL', ref: '4.0 - 11.0', status: 'Normal' },
        { parameter: 'Platelets', value: '230', unit: '10³/μL', ref: '150 - 400', status: 'Normal' },
      ]);
    }
  }, [showViewModal, selectedSample]);

  const handleSaveCBC = async () => {
    if (!selectedSample) return;
    const mapFlags = (s: string) => ({
      isCritical: s.toLowerCase() === 'critical',
      isAbnormal: s.toLowerCase() === 'high' || s.toLowerCase() === 'low' || s.toLowerCase() === 'abnormal',
    });
    const nextResults = cbcRows.map(r => ({
      label: r.parameter,
      value: r.value,
      unit: r.unit,
      normalText: r.ref,
      ...mapFlags(r.status),
    }));

    try {
      const sampleId = selectedSample._id || selectedSample.id;
      if (!sampleId) {
        throw new Error('Missing sample identifier for CBC save');
      }
      const token = localStorage.getItem('token');
      let updatedFromBackend: any = null;

      try {
        const { data } = await api.patch(`/labtech/samples/${sampleId}`, {
          results: nextResults,
          status: 'completed',
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        updatedFromBackend = data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const altId = (selectedSample as any).sampleNumber || (selectedSample as any).barcode;
          if (altId && String(altId) !== String(sampleId)) {
            const { data } = await api.patch(`/labtech/samples/${altId}`, {
              results: nextResults,
              status: 'completed',
            }, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            updatedFromBackend = data;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      // Merge backend response into local samples list
      setSamples(prev => {
        return prev.map(s => {
          const sameId = (s._id && updatedFromBackend._id && s._id === updatedFromBackend._id)
            || (s.id && updatedFromBackend.id && s.id === updatedFromBackend.id);
          const sameBarcode = !sameId && s.barcode && (updatedFromBackend.sampleNumber || updatedFromBackend.barcode)
            ? s.barcode === (updatedFromBackend.sampleNumber || updatedFromBackend.barcode)
            : false;
          if (!sameId && !sameBarcode) return s;

          const rawStatus = String(updatedFromBackend.status || '');
          const normStatus = rawStatus.toLowerCase().includes('complet')
            ? 'completed'
            : rawStatus.toLowerCase().includes('process')
            ? 'processing'
            : 'collected';

          return {
            ...s,
            ...updatedFromBackend,
            status: normStatus,
            results: Array.isArray(updatedFromBackend.results) ? updatedFromBackend.results : nextResults,
          };
        });
      });

      // Keep selectedSample in sync
      setSelectedSample(prev => {
        if (!prev) return prev;
        const sameId = (prev._id && updatedFromBackend._id && prev._id === updatedFromBackend._id)
          || (prev.id && updatedFromBackend.id && prev.id === updatedFromBackend.id);
        if (!sameId) return prev;
        return { ...prev, ...updatedFromBackend };
      });

      try {
        window.dispatchEvent(new Event('samplesChanged'));
      } catch {}

      toast({
        title: 'CBC Updated',
        description: `Saved ${cbcRows.length} parameters for ${selectedSample.barcode}`,
      });
    } catch (err) {
      console.error('Failed to save CBC to backend', err);
      toast({
        title: 'Error',
        description: 'Failed to save CBC results. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleNewSampleChange = (field: keyof typeof newSample, value: string) => {
    setNewSample(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSample = () => {
    const trimmedName = newSample.patientName.trim();
    const trimmedTest = newSample.test.trim();
    const trimmedAnalyzer = newSample.assignedAnalyzer.trim();

    if (!trimmedName || !trimmedTest || !trimmedAnalyzer) {
      toast({
        title: "Missing information",
        description: "Please enter patient name, test and analyzer.",
        variant: "destructive",
      });
      return;
    }

    // Generate a simple barcode id based on count + timestamp
    const nextIndex = samples.length + 1;
    const ts = Date.now().toString().slice(-4);
    const barcode = `LAB-2024-${nextIndex.toString().padStart(3, "0")}-${ts}`;

    const time = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const sampleToAdd = {
      id: `${Date.now()}-${nextIndex}`,
      barcode,
      patientName: trimmedName,
      test: trimmedTest,
      status: newSample.status,
      assignedAnalyzer: trimmedAnalyzer,
      collectionTime: time,
    };

    setSamples(prev => {
      const updated = [sampleToAdd, ...prev];
      try {
        // Persist to the shared key used by SamplesPage so both views stay in sync
        localStorage.setItem("samplesPageSamples", JSON.stringify(updated));
        // Also mirror to the legacy key for backward compatibility
        localStorage.setItem("barcodesSamples", JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });

    toast({
      title: "Sample added",
      description: `Sample for ${trimmedName} added with barcode ${barcode}.`,
    });

    setNewSample({
      patientName: "",
      test: "",
      status: "collected",
      assignedAnalyzer: "",
      collectionTime: "",
    });
    setShowAddSampleModal(false);
  };

  const generateReportLifecycle = (sample: any) => {
    const baseTime = new Date();
    baseTime.setHours(8, 30, 0, 0); // Start at 8:30 AM
    
    const lifecycle = [
      {
        step: "Report Initiated",
        person: "Lab Tech Bob Wilson",
        time: "08:30 AM",
        completed: true,
        icon: "initiate"
      },
      {
        step: "Data Processing",
        person: "Mindray BC 700",
        time: "08:35 AM",
        completed: true,
        icon: "processing"
      },
      {
        step: "Results Analysis",
        person: "Dr. Sarah Johnson",
        time: "09:00 AM",
        completed: sample.status === "processing" || sample.status === "completed",
        icon: "analysis"
      },
      {
        step: "Report Verification",
        person: "Dr. Sarah Johnson",
        time: "09:45 AM",
        completed: sample.status === "completed",
        icon: "verification"
      },
      {
        step: "Report Generated",
        person: "System Generated",
        time: "10:00 AM",
        completed: sample.status === "completed",
        icon: "generated"
      },
      {
        step: "Report Released",
        person: "",
        time: "",
        completed: false,
        icon: "release"
      }
    ];

    return lifecycle;
  };

  const generatePatientReport = (sample: any) => {
    const reportDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Prefer real backend data when available
    const patientName = sample?.patientName || '';
    const age = sample?.age ? `${sample.age} Years` : 'N/A';
    const gender = sample?.gender || 'N/A';
    const collection = sample?.createdAt
      ? new Date(sample.createdAt).toLocaleString('en-US', {
          year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true,
        })
      : sample?.collectionTime || 'N/A';
    const sampleId = sample?.barcode || sample?._id || 'N/A';

    let testResults: Array<{ parameter: string; result: string; unit: string; referenceRange: string; status: string }> = [];

    if (Array.isArray(sample?.results) && sample.results.length > 0) {
      testResults = sample.results.map((r: any) => {
        let name = r.label || r.parameter || r.name || r.parameterId || 'Parameter';
        let unit = r.unit || '';
        let referenceRange = r.normalText || '-';
        const value = (typeof r.value === 'number' || typeof r.value === 'string') ? String(r.value) : '-';
        const status = r.isCritical ? 'Critical' : (r.isAbnormal ? 'Abnormal' : 'Normal');
        return {
          parameter: name,
          result: value,
          unit,
          referenceRange,
          status,
        };
      });
    } else {
      const selectedNames = getSampleTestNames(sample);
      if (selectedNames.length > 0) {
        testResults = selectedNames.map((name) => ({
          parameter: name,
          result: '-',
          unit: '-',
          referenceRange: '-',
          status: 'Normal',
        }));
      } else {
        testResults = [
          { parameter: 'Hemoglobin (Hgb)', result: '14.2', unit: 'g/dL', referenceRange: '13.5 - 17.5', status: 'Normal' },
          { parameter: 'WBC', result: '7.8', unit: '10³/μL', referenceRange: '4.0 - 11.0', status: 'Normal' },
          { parameter: 'Platelets', result: '245', unit: '10³/μL', referenceRange: '150 - 400', status: 'Normal' },
        ];
      }
    }

    return {
      patientInfo: {
        name: patientName,
        id: sample?.patientId || `P-2024-001`,
        age,
        gender,
        collectionDate: collection,
        reportDate: reportDate,
        sampleId,
        lastUpdated: (sample?.updatedAt || sample?.completedAt) ? new Date(sample?.updatedAt || sample?.completedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : reportDate,
      },
      referringPhysician: {
        name: "Dr. Sarah Johnson, MD",
        department: "Internal Medicine",
      },
      testResults,
      clinicalNotes:
        sample?.interpretation ||
        "All test parameters are within normal reference ranges. Sample processed using Mindray BC 700 analyzer. Results verified and approved by laboratory supervisor.",
      verifiedBy: {
        name: "Dr. John Doe, PhD",
        title: "Laboratory Supervisor",
        license: "LAB-2024-SUP",
      },
    };
  };

  // Header button functionality
  const handleDownloadPDF = (sample: any) => {
    const reportData = generatePatientReport(sample);
    const includeCBC = sampleHasCBC(sample);
    const testsList = getSampleTestNames(sample);
    
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Medical Laboratory Report - ${sample.barcode}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.4; 
            color: #333; 
            padding: 20px;
            font-size: 12px;
          }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { 
            width: 50px; 
            height: 50px; 
            background: #2563eb; 
            border-radius: 8px; 
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-weight: bold; 
            font-size: 18px;
            margin-bottom: 10px;
          }
          .title { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: #666; }
          .patient-info { 
            background: #eff6ff; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .patient-info h3 { color: #1e40af; font-size: 16px; margin-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-item { font-size: 11px; }
          .info-label { font-weight: bold; }
          .section { margin: 20px 0; }
          .section h3 { color: #1e40af; font-size: 16px; margin-bottom: 10px; }
          .results-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0; 
            border: 1px solid #e5e7eb;
          }
          .results-table th, .results-table td { 
            border: 1px solid #e5e7eb; 
            padding: 8px; 
            text-align: left; 
            font-size: 11px;
          }
          .results-table th { 
            background: #f9fafb; 
            font-weight: bold; 
          }
          .status-normal { 
            background: #dcfce7; 
            color: #166534; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-size: 10px;
          }
          .clinical-notes { 
            background: #f9fafb; 
            padding: 15px; 
            border-radius: 8px; 
            font-size: 11px;
            line-height: 1.5;
          }
          .signatures { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            margin: 30px 0; 
          }
          .signature-box { text-align: center; }
          .signature-line { 
            border-bottom: 1px solid #374151; 
            height: 40px; 
            margin-bottom: 5px; 
          }
          .signature-name { font-weight: bold; font-size: 11px; }
          .signature-title { font-size: 10px; color: #666; }
          .footer { 
            text-align: center; 
            font-size: 10px; 
            color: #666; 
            border-top: 1px solid #e5e7eb; 
            padding-top: 15px; 
            margin-top: 30px;
          }
          @media print {
            body { padding: 10px; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ML</div>
          <div class="title">Medical Laboratory Report</div>
          <div class="subtitle">Accredited by ISO 15189:2012</div>
          <div class="subtitle">Report ID: ${reportData.patientInfo.sampleId}</div>
        </div>

        <div class="patient-info">
          <h3>Patient Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Patient Name:</span> ${reportData.patientInfo.name}
            </div>
            <div class="info-item">
              <span class="info-label">Patient ID:</span> ${reportData.patientInfo.id}
            </div>
            <div class="info-item">
              <span class="info-label">Age / Gender:</span> ${reportData.patientInfo.age} / ${reportData.patientInfo.gender}
            </div>
            <div class="info-item">
              <span class="info-label">Collection Date:</span> ${reportData.patientInfo.collectionDate}
            </div>
            <div class="info-item">
              <span class="info-label">Report Date:</span> ${reportData.patientInfo.reportDate}
            </div>
            <div class="info-item">
              <span class="info-label">Sample ID:</span> ${reportData.patientInfo.sampleId}
            </div>
            <div class="info-item">
              <span class="info-label">Last Updated:</span> ${reportData.patientInfo.lastUpdated}
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Referring Physician</h3>
          <div class="info-item">
            <div class="info-label">${reportData.referringPhysician.name}</div>
            <div style="color: #666; font-size: 10px;">${reportData.referringPhysician.department}</div>
          </div>
        </div>

        ${testsList.length ? `
        <div class="section">
          <h3>Requested Tests</h3>
          <ul style="margin-left: 18px; margin-top: 6px;">
            ${testsList.map(t => `<li>${t}</li>`).join('')}
          </ul>
        </div>
        ` : ``}

        ${includeCBC ? `
        <div class="section">
          <h3>Complete Blood Count (CBC)</h3>
          <table class="results-table">
            <thead>
              <tr>
                <th>Test Parameter</th>
                <th>Result</th>
                <th>Unit</th>
                <th>Reference Range</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.testResults.map(result => `
                <tr>
                  <td>${result.parameter}</td>
                  <td><strong>${result.result}</strong></td>
                  <td>${result.unit}</td>
                  <td>${result.referenceRange}</td>
                  <td><span class="status-normal">${result.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ``}

        <div class="section">
          <h3>Clinical Notes</h3>
          <div class="clinical-notes">
            ${reportData.clinicalNotes}
          </div>
        </div>

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-name">${reportData.verifiedBy.name}</div>
            <div class="signature-title">${reportData.verifiedBy.title}</div>
            <div class="signature-title">License: ${reportData.verifiedBy.license}</div>
            <div style="font-size: 10px; color: #666; margin-top: 5px;">Verified By:</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-name">Digital Signature Applied</div>
            <div style="font-size: 10px; color: #666; margin-top: 5px;">Authorized Signature:</div>
          </div>
        </div>

        <div class="footer">
          <div>This is a computer-generated report and does not require a physical signature.</div>
          <div>For queries, contact: lab@medlablis.com | +1 (555) 123-4567</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }

    toast({
      title: "PDF Generated",
      description: `Patient report for ${sample.patientName} generated successfully`,
    });
  };

  const handlePrintReport = (sample: any) => {
    handleDownloadPDF(sample); // Same functionality as PDF for now
    
    toast({
      title: "Report Sent to Printer",
      description: `Patient report for ${sample.patientName} sent to printer`,
    });
  };

  const handleEmailReport = (sample: any) => {
    // Simulate email functionality
    const reportData = generatePatientReport(sample);
    
    // In a real application, this would integrate with an email service
    const emailBody = `
Dear Patient,

Your laboratory report is ready. Please find the details below:

Patient: ${reportData.patientInfo.name}
Report ID: ${reportData.patientInfo.sampleId}
Collection Date: ${reportData.patientInfo.collectionDate}
Report Date: ${reportData.patientInfo.reportDate}

Test Results Summary:
${reportData.testResults.map(result => 
  `- ${result.parameter}: ${result.result} ${result.unit} (${result.status})`
).join('\n')}

Clinical Notes:
${reportData.clinicalNotes}

Best regards,
MedLab LIS Team
lab@medlablis.com
+1 (555) 123-4567
    `;

    // Create mailto link
    const subject = encodeURIComponent(`Laboratory Report - ${sample.barcode}`);
    const body = encodeURIComponent(emailBody);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    
    window.open(mailtoLink);

    toast({
      title: "Email Client Opened",
      description: `Report for ${sample.patientName} prepared for email`,
    });
  };

  const handleShareSMS = (sample: any) => {
    // Simulate SMS sharing functionality
    const reportData = generatePatientReport(sample);
    
    const smsMessage = `MedLab LIS: Your lab report is ready! 
Patient: ${reportData.patientInfo.name}
Report ID: ${reportData.patientInfo.sampleId}
Collection: ${reportData.patientInfo.collectionDate}
Status: All parameters normal
Download: https://medlablis.com/reports/${sample.barcode}
Questions? Call +1 (555) 123-4567`;

    // In a real application, this would integrate with SMS service
    // For demo, we'll copy to clipboard
    navigator.clipboard.writeText(smsMessage).then(() => {
      toast({
        title: "SMS Message Prepared",
        description: "Report summary copied to clipboard for SMS sharing",
      });
    }).catch(() => {
      toast({
        title: "SMS Sharing",
        description: `Report summary for ${sample.patientName} prepared for SMS`,
      });
    });
  };

  const handlePrintBarcode = (sample: any) => {
    // Generate barcode print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${sample.barcode}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            text-align: center;
          }
          .barcode-container {
            border: 2px solid #000;
            padding: 20px;
            margin: 20px auto;
            width: 300px;
            background: white;
          }
          .barcode-text {
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 10px 0;
          }
          .patient-info {
            font-size: 14px;
            margin: 5px 0;
          }
          .test-info {
            font-size: 12px;
            color: #666;
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          <div class="barcode-text">${sample.barcode}</div>
          <div class="patient-info"><strong>${sample.patientName}</strong></div>
          <div class="test-info">${sample.test}</div>
          <div class="test-info">Analyzer: ${sample.assignedAnalyzer}</div>
          <div class="test-info">Time: ${sample.collectionTime}</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }

    toast({
      title: "Barcode Print",
      description: `Barcode ${sample.barcode} sent to printer`,
    });
  };

  const handleExportBarcodes = () => {
    // Export all barcodes as CSV
    const csvContent = [
      ['Barcode', 'Patient Name', 'Test', 'Status', 'Collection Time'],
      ...filteredSamples.map(sample => [
        sample.barcode,
        sample.patientName,
        sample.test,
        sample.status,
        sample.collectionTime
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcodes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `${filteredSamples.length} barcodes exported to CSV`,
    });
  };

  // Update sample status for tracking (used by SampleTracking and Dashboard)
  const handleUpdateStatus = async (
    sample: any,
    newStatus: "collected" | "processing" | "completed"
  ) => {
    const sampleId = sample?._id || sample?.id;
    if (!sampleId) {
      // Do not allow fake UI-only updates for samples that are not from backend
      toast({
        title: "Cannot update status",
        description: "This row has no backend sample id. Please reload Barcodes or use Sample Intake.",
        variant: "destructive",
      });
      // ensure UI matches backend
      loadSamplesFromBackend();
      return;
    }

    // Optimistic UI update
    setSamples(prev => {
      const nowIso = new Date().toISOString();
      return prev.map(s => {
        if ((s as any)._id !== sampleId && (s as any).id !== sampleId) return s;
        const next: any = { ...s, status: newStatus, updatedAt: nowIso };
        if (newStatus === "processing" && !next.processedAt) {
          next.processedAt = nowIso;
        }
        if (newStatus === "completed") {
          next.completedAt = nowIso;
        }
        return next;
      });
    });

    try {
      const backendStatus = newStatus; // use collected/processing/completed directly

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const payload = { status: backendStatus, sampleStatus: backendStatus } as any;

      const primaryUrl = `/labtech/samples/${sampleId}`;
      const altId = (sample as any).sampleNumber || (sample as any).barcode;
      const altUrl = altId && String(altId) !== String(sampleId)
        ? `/labtech/samples/${altId}`
        : null;

      try {
        console.warn('[Barcodes] PATCH', primaryUrl, payload);
        await api.patch(primaryUrl, payload, { headers });
      } catch (e: any) {
        const code = e?.response?.status;
        console.warn('[Barcodes] update failed', primaryUrl, code, e?.response?.data || e?.message);
        if (code === 404 && altUrl) {
          console.warn('[Barcodes] PATCH (alt id)', altUrl, payload);
          await api.patch(altUrl, payload, { headers });
        } else {
          throw e;
        }
      }

      // Notify other views to reload from backend
      try {
        window.dispatchEvent(new Event("samplesChanged"));
      } catch {
        // ignore event errors
      }

      toast({
        title: "Status Updated",
        description: `Sample ${sample.barcode} marked as ${newStatus}.`,
      });
    } catch (err: any) {
      console.error("Failed to update sample status in backend", err?.response?.data || err);

      // Reload from backend so UI reflects real DB state
      await loadSamplesFromBackend();

      const code = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Request failed';
      toast({
        title: "Error",
        description: `Failed to update sample status (HTTP ${code || 'n/a'}). ${msg}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Barcodes</h1>
        <p className="text-sm text-muted-foreground">Manage and track sample barcodes throughout the testing process</p>
      </div>
      
      {/* Barcode Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Sample Management</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleExportBarcodes}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Barcodes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by barcode, patient name or test..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => searchTerm.length > 0 && setShowSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              
              {/* Search Suggestions Dropdown */}
              {showSearchSuggestions && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {searchResults.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="h-3 w-3 text-gray-400" />
                        <span>{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sample Count */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span>Samples ({filteredSamples.length})</span>
              {statusFilter !== "All Status" && ` - Filtered by: ${statusFilter}`}
            </div>
            {(searchTerm || statusFilter !== "All Status") && (
              <button
                onClick={() => {
                  clearSearch();
                  setStatusFilter("All Status");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Samples Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test(s)</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.map((sample) => (
                  <TableRow key={sample.barcode}>
                    <TableCell className="font-medium font-mono">{sample.barcode}</TableCell>
                    <TableCell>{sample.patientName}</TableCell>
                    <TableCell>{
                      sample.test || (Array.isArray(sample.tests) ? sample.tests.map((t:any) => (t && (t.name || t.test)) || t).filter(Boolean).join(', ') : '')
                    }</TableCell>
                    <TableCell>{sample.phone || sample.patientPhone || '-'}</TableCell>
                    <TableCell>{getStatusBadge(sample.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" title="View / Edit report">Report</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewSample(sample)}>View Report</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditCbc(sample)}>Edit CBC Report</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" title="Update status">Status</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUpdateStatus(sample, "collected")}>Collected</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(sample, "processing")}>Processing</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(sample, "completed")}>Completed</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handlePrintReport(sample)}
                          title="Print patient report"
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSamples.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-10 h-10 text-gray-300" />
                        <p>No samples available yet</p>
                        <p className="text-xs text-gray-400">New samples from Sample Intake will appear here automatically</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add New Sample Modal */}
      <Dialog open={showAddSampleModal} onOpenChange={setShowAddSampleModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Sample</DialogTitle>
            <DialogDescription>
              Enter patient and test information to create a new sample and barcode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-patient-name">Patient Name</Label>
              <Input
                id="new-patient-name"
                placeholder="Enter patient name"
                value={newSample.patientName}
                onChange={e => handleNewSampleChange("patientName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-test">Test</Label>
              <Input
                id="new-test"
                placeholder="Enter test name"
                value={newSample.test}
                onChange={e => handleNewSampleChange("test", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-analyzer">Assigned Analyzer</Label>
              <Input
                id="new-analyzer"
                placeholder="Enter analyzer name"
                value={newSample.assignedAnalyzer}
                onChange={e => handleNewSampleChange("assignedAnalyzer", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={newSample.status}
                onValueChange={val => handleNewSampleChange("status", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in process">In Process</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddSampleModal(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddSample}>
              Save Sample
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Patient Report Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedSample && (() => {
            const reportData = generatePatientReport(selectedSample);
            return (
              <div className="bg-white">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold">Patient Report</h2>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadPDF(selectedSample)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePrintReport(selectedSample)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEmailReport(selectedSample)}
                    >
                      Email
                    </Button>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700" 
                      size="sm"
                      onClick={() => handleShareSMS(selectedSample)}
                    >
                      Share via SMS
                    </Button>
                  </div>
                </div>

                {/* CBC Manual Edit (visible only when launched via Edit) */}
                {showCbcEditor && (
                  <div className="p-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Complete Blood Count (CBC) - Edit</h3>
                      <Button size="sm" onClick={handleSaveCBC}>Save CBC</Button>
                    </div>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Test Parameter</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Reference Range</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cbcRows.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="min-w-[180px]">
                                <Input value={row.parameter} onChange={(e) => {
                                  const v = e.target.value; setCbcRows(prev => prev.map((r, i) => i === idx ? { ...r, parameter: v } : r));
                                }} />
                              </TableCell>
                              <TableCell className="w-[120px]">
                                <Input value={row.value} onChange={(e) => {
                                  const v = e.target.value; setCbcRows(prev => prev.map((r, i) => i === idx ? { ...r, value: v } : r));
                                }} />
                              </TableCell>
                              <TableCell className="w-[120px]">
                                <Input value={row.unit} onChange={(e) => {
                                  const v = e.target.value; setCbcRows(prev => prev.map((r, i) => i === idx ? { ...r, unit: v } : r));
                                }} />
                              </TableCell>
                              <TableCell className="min-w-[160px]">
                                <Input value={row.ref} onChange={(e) => {
                                  const v = e.target.value; setCbcRows(prev => prev.map((r, i) => i === idx ? { ...r, ref: v } : r));
                                }} />
                              </TableCell>
                              <TableCell className="w-[140px]">
                                <Select value={row.status} onValueChange={(v) => setCbcRows(prev => prev.map((r, i) => i === idx ? { ...r, status: v } : r))}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Normal">Normal</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Average">Average</SelectItem>
                                    <SelectItem value="Critical">Critical</SelectItem>
                                    <SelectItem value="Abnormal">Abnormal</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Report Content */}
                <div className="p-6 space-y-6">
                  {/* Lab Logo and Title */}
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
                      <span className="text-white font-bold text-lg">ML</span>
                    </div>
                    <h1 className="text-2xl font-bold text-blue-600">Medical Laboratory Report</h1>
                    <p className="text-sm text-gray-600">Accredited by ISO 15189:2012</p>
                    <p className="text-sm text-gray-600">Report ID: {reportData.patientInfo.sampleId}</p>
                  </div>

                  {/* Patient Information */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-800 mb-3">Patient Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Patient Name:</span> {reportData.patientInfo.name}
                      </div>
                      <div>
                        <span className="font-medium">Patient ID:</span> {reportData.patientInfo.id}
                      </div>
                      <div>
                        <span className="font-medium">Age / Gender:</span> {reportData.patientInfo.age} / {reportData.patientInfo.gender}
                      </div>
                      <div>
                        <span className="font-medium">Collection Date:</span> {reportData.patientInfo.collectionDate}
                      </div>
                      <div>
                        <span className="font-medium">Report Date:</span> {reportData.patientInfo.reportDate}
                      </div>
                      <div>
                        <span className="font-medium">Sample ID:</span> {reportData.patientInfo.sampleId}
                      </div>
                      <div>
                        <span className="font-medium">Last Updated:</span> {reportData.patientInfo.lastUpdated}
                      </div>
                    </div>
                  </div>

                  {/* Referring Physician */}
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Referring Physician</h3>
                    <div className="text-sm">
                      <p className="font-medium">{reportData.referringPhysician.name}</p>
                      <p className="text-gray-600">{reportData.referringPhysician.department}</p>
                    </div>
                  </div>

                  {(() => { const tests = getSampleTestNames(selectedSample); return tests.length ? (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-blue-800 mb-2">Requested Tests</h3>
                      <div className="flex flex-wrap gap-2">
                        {tests.map((t, i) => (
                          <Badge key={i} className="bg-gray-100 text-gray-800">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  ) : null; })()}

                  {/* Test Results */}
                  {sampleHasCBC(selectedSample) && (
                    <div>
                      <h3 className="text-lg font-semibold text-blue-800 mb-3">Complete Blood Count (CBC)</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="font-semibold">Test Parameter</TableHead>
                              <TableHead className="font-semibold">Result</TableHead>
                              <TableHead className="font-semibold">Unit</TableHead>
                              <TableHead className="font-semibold">Reference Range</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.testResults.map((result, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{result.parameter}</TableCell>
                                <TableCell className="font-semibold">{result.result}</TableCell>
                                <TableCell>{result.unit}</TableCell>
                                <TableCell>{result.referenceRange}</TableCell>
                                <TableCell>
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    {result.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Clinical Notes */}
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Clinical Notes</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {reportData.clinicalNotes}
                    </p>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-8 pt-6">
                    <div className="text-center">
                      <div className="border-b border-gray-400 mb-2 pb-8"></div>
                      <p className="font-semibold text-sm">{reportData.verifiedBy.name}</p>
                      <p className="text-xs text-gray-600">{reportData.verifiedBy.title}</p>
                      <p className="text-xs text-gray-600">License: {reportData.verifiedBy.license}</p>
                      <p className="text-xs text-gray-500 mt-2">Verified By:</p>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-gray-400 mb-2 pb-8"></div>
                      <p className="font-semibold text-sm">Digital Signature Applied</p>
                      <p className="text-xs text-gray-500 mt-2">Authorized Signature:</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-xs text-gray-500 pt-4 border-t">
                    <p>This is a computer-generated report and does not require a physical signature.</p>
                    <p>For queries, contact: lab@medlablis.com | +1 (555) 123-4567</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Report Tracking Modal */}
      <Dialog open={showReportTrackingModal} onOpenChange={setShowReportTrackingModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedSample && (() => {
            const lifecycle = generateReportLifecycle(selectedSample);
            return (
              <div className="bg-white">
                {/* Header */}
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-bold text-gray-900">Report Tracking</h2>
                  <p className="text-gray-600 mt-1">Sample ID: {selectedSample.barcode}</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Sample Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Information</h3>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-500">Patient</span>
                        <p className="text-gray-900">{selectedSample.patientName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Test Type</span>
                        <p className="text-gray-900">{selectedSample.test}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Analyzer</span>
                        <p className="text-gray-900">{selectedSample.assignedAnalyzer}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Status</span>
                        <div className="mt-1">
                          <Badge className={`${selectedSample.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                                selectedSample.status === 'in process' ? 'bg-blue-100 text-blue-800' :
                                                selectedSample.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'} text-xs capitalize`}>
                            {selectedSample.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Report Lifecycle Timeline */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Lifecycle Timeline</h3>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      
                      {/* Timeline items */}
                      <div className="space-y-6">
                        {lifecycle.map((item, index) => (
                          <div key={index} className="relative flex items-start">
                            {/* Timeline dot */}
                            <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                              item.completed 
                                ? 'bg-blue-600 border-blue-600' 
                                : 'bg-gray-200 border-gray-300'
                            }`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                item.completed ? 'bg-white' : 'bg-gray-400'
                              }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                  item.completed ? 'bg-blue-600' : 'bg-gray-600'
                                }`}></div>
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="ml-6 flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className={`text-base font-medium ${
                                    item.completed ? 'text-gray-900' : 'text-gray-500'
                                  }`}>
                                    {item.step}
                                  </h4>
                                  {item.person && (
                                    <p className={`text-sm ${
                                      item.completed ? 'text-gray-600' : 'text-gray-400'
                                    }`}>
                                      {item.person}
                                    </p>
                                  )}
                                </div>
                                {item.time && (
                                  <div className="flex items-center text-sm text-gray-500">
                                    <span className="mr-1">🕐</span>
                                    {item.time}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Barcodes;
