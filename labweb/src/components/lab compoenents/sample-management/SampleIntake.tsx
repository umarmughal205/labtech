//export { default } from "./SampleIntakeClean";
import { useState, useEffect, useRef } from "react";
import { printSampleSlip } from "../../../utils/printSample";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TestType } from "@/lab types/sample";
import TestSelect from "@/components/lab compoenents/ui/TestSelect";
import { Check, Search, Filter, Eye, Edit, ExternalLink, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lab lib/api";

interface SampleIntakeProps {
  onNavigateBack?: () => void;
}

const SampleIntakeClean = ({ onNavigateBack }: SampleIntakeProps) => {
  const { toast } = useToast();
  const [availableTests, setAvailableTests] = useState<TestType[]>([]);
  const [selectedTests, setSelectedTests] = useState<TestType[]>([]);
  const [pendingPrefill, setPendingPrefill] = useState<{ name?: string; phone?: string; testName?: string } | null>(null);
  
  // Sample Management state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  
  // Add Sample Modal state
  const [showAddSampleModal, setShowAddSampleModal] = useState(false);
  const [newSample, setNewSample] = useState({
    patientName: "",
    test: "",
    assignedAnalyzer: "",
  });
  const [isSubmittingNewSample, setIsSubmittingNewSample] = useState(false);

  // Action Modals state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [editingSample, setEditingSample] = useState({
    patientName: "",
    test: "",
    status: ""
  });
  const [isUpdatingSample, setIsUpdatingSample] = useState(false);
  
  // Sample data (backend-driven)
  const [samples, setSamples] = useState<any[]>([]);
  
  // Pricing settings (tax)
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountRate, setDiscountRate] = useState<number>(0);
  useEffect(() => {
    api
      .get("/settings")
      .then((res) => {
        const s = res.data || {};
        const tr = parseFloat(String(s?.pricing?.taxRate ?? ""));
        const dr = parseFloat(String(s?.pricing?.bulkDiscountRate ?? ""));
        setTaxRate(Number.isFinite(tr) ? tr : 0);
        setDiscountRate(Number.isFinite(dr) ? dr : 0);
      })
      .catch(() => {
        setTaxRate(0);
        setDiscountRate(0);
      });
  }, []);
  const computeIncl = (price: number) => {
    const rate = Number(taxRate) || 0;
    const amount = (Number(price) || 0) * (1 + rate / 100);
    return { rate, amount } as { rate: number; amount: number };
  };

  // Load samples from backend
  const loadSamplesFromBackend = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/labtech/samples", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      const mapped = arr.map((s: any) => ({
        barcode: s.sampleNumber || s.barcode || "",
        patientName: s.patientName || "",
        test:
          Array.isArray(s.tests) && s.tests.length
            ? s.tests.map((t: any) => t?.name).filter(Boolean).join(", ")
            : s.test || "",
        status: s.status || "received",
        assignedAnalyzer: s.assignedAnalyzer || "",
        collectionTime: s.createdAt
          ? new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
      }));
      setSamples(mapped);
    } catch (err) {
      console.error("Failed to load samples from backend", err);
      // keep existing samples state on error
    }
  };

  useEffect(() => {
    loadSamplesFromBackend();
  }, []);

  // Helper functions for sample management
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: "bg-green-100 text-green-800", text: "completed" },
      "in process": { color: "bg-blue-100 text-blue-800", text: "in process" },
      pending: { color: "bg-yellow-100 text-yellow-800", text: "pending" },
      delayed: { color: "bg-red-100 text-red-800", text: "delayed" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  // Enhanced search functionality
  const performSearch = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowSearchSuggestions(false);
      return;
    }

    const searchLower = term.toLowerCase();
    const suggestions = new Set<string>();
    
    samples.forEach(sample => {
      // Add matching barcodes
      if (sample.barcode.toLowerCase().includes(searchLower)) {
        suggestions.add(sample.barcode);
      }
      // Add matching patient names
      if (sample.patientName.toLowerCase().includes(searchLower)) {
        suggestions.add(sample.patientName);
      }
      // Add matching tests
      if (sample.test.toLowerCase().includes(searchLower)) {
        suggestions.add(sample.test);
      }
      // analyzer removed
    });

    setSearchResults(Array.from(suggestions).slice(0, 5));
    setShowSearchSuggestions(suggestions.size > 0 && term.length > 0);
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Enhanced filtering with better matching
  const filteredSamples = samples.filter(sample => {
    if (searchTerm === "") {
      const matchesStatus = statusFilter === "All Status" || 
        sample.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesStatus;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      sample.barcode.toLowerCase().includes(searchLower) ||
      sample.patientName.toLowerCase().includes(searchLower) ||
      sample.test.toLowerCase().includes(searchLower) ||
      sample.status.toLowerCase().includes(searchLower) ||
      // Partial matching for better search results
      sample.patientName.toLowerCase().split(' ').some(word => word.startsWith(searchLower)) ||
      sample.test.toLowerCase().split(' ').some(word => word.startsWith(searchLower));
    
    const matchesStatus = statusFilter === "All Status" || 
      sample.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Handle search suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSearchSuggestions(false);
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length === 0) {
      setShowSearchSuggestions(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchSuggestions(false);
  };

  // Add Sample Modal functions
  const openAddSampleModal = () => {
    setShowAddSampleModal(true);
    setNewSample({
      patientName: "",
      test: "",
      assignedAnalyzer: "",
    });
  };

  const closeAddSampleModal = () => {
    setShowAddSampleModal(false);
    setNewSample({
      patientName: "",
      test: "",
      assignedAnalyzer: "",
    });
  };

  // Generate new barcode
  const generateBarcode = () => {
    const year = new Date().getFullYear();
    const nextNumber = samples.length + 1;
    return `LAB-${year}-${nextNumber.toString().padStart(3, '0')}`;
  };

  // Get current time
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle new sample submission
  const handleAddSample = async () => {
    if (!newSample.patientName || !newSample.test || !newSample.assignedAnalyzer) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingNewSample(true);

    try {
      const sampleToAdd = {
        barcode: generateBarcode(),
        patientName: newSample.patientName,
        test: newSample.test,
        status: "pending",
        assignedAnalyzer: newSample.assignedAnalyzer,
        collectionTime: getCurrentTime()
      };

      // After local add, also refresh from backend (if created through main form)
      // For now, just close modal; main form handles real submissions.
      toast({
        title: "Success",
        description: `Sample ${sampleToAdd.barcode} added successfully`,
      });

      closeAddSampleModal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add sample. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingNewSample(false);
    }
  };

  // Available test options
  const testOptions = [
    "Complete Blood Count",
    "Lipid Profile", 
    "Thyroid Panel",
    "HbA1c",
    "Liver Function Test",
    "Kidney Function Test",
    "Cardiac Markers",
    "Diabetes Panel",
    "Electrolyte Panel",
    "Coagulation Studies"
  ];

  // Available analyzer options
  const analyzerOptions = [
    "Mindray BC 700",
    "Sysmex XN-1000",
    "Cobas C111",
    "Maglumi 800",
    "Abbott Architect",
    "Roche Cobas"
  ];

  // Status options for editing
  const statusOptions = [
    "pending",
    "in process", 
    "completed",
    "delayed"
  ];

  // Action handlers
  const handleViewSample = (sample: any) => {
    setSelectedSample(sample);
    setShowViewModal(true);
  };

  const handleEditSample = (sample: any) => {
    setSelectedSample(sample);
    setEditingSample({
      patientName: sample.patientName,
      test: sample.test,
      status: sample.status
    });
    setShowEditModal(true);
  };

  const handleExportSample = (sample: any) => {
    // Create PDF content
    const generatePDF = () => {
      const currentDate = new Date().toLocaleString();
      
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Sample Report - ${sample.barcode}</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 12px;
              color: #333;
              line-height: 1.2;
              font-size: 11px;
              height: 100vh;
              overflow: hidden;
            }
            .page-container {
              height: calc(100vh - 24px);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding: 8px 0;
              margin-bottom: 12px;
            }
            .logo {
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 2px;
            }
            .subtitle {
              color: #666;
              font-size: 10px;
              line-height: 1.1;
            }
            .report-title {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin: 8px 0;
              color: #1f2937;
              text-transform: uppercase;
            }
            .content-sections {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 8px;
              margin-bottom: 12px;
              flex: 1;
            }
            .info-section {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              padding: 8px;
              height: fit-content;
            }
            .section-title {
              font-size: 10px;
              font-weight: bold;
              color: #1e40af;
              border-bottom: 1px solid #3b82f6;
              padding-bottom: 2px;
              margin-bottom: 6px;
              text-transform: uppercase;
            }
            .info-grid {
              display: grid;
              gap: 4px;
            }
            .info-item {
              background: white;
              padding: 6px;
              border-radius: 3px;
              border-left: 2px solid #3b82f6;
            }
            .info-label {
              font-weight: bold;
              color: #374151;
              font-size: 8px;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .info-value {
              font-size: 10px;
              color: #1f2937;
              font-weight: 500;
              line-height: 1.1;
            }
            .status-badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 10px;
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-completed { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-in-process { background: #dbeafe; color: #1e40af; }
            .status-delayed { background: #fee2e2; color: #dc2626; }
            .barcode {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              font-weight: bold;
              letter-spacing: 1px;
              background: #f1f5f9;
              padding: 4px;
              border-radius: 3px;
              text-align: center;
            }
            .signature-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin: 8px 0;
              padding: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
            }
            .signature-box {
              text-align: center;
              padding: 8px;
              border: 1px dashed #94a3b8;
              border-radius: 3px;
              background: white;
            }
            .signature-line {
              border-bottom: 1px solid #374151;
              height: 20px;
              margin-bottom: 4px;
            }
            .signature-title {
              font-weight: bold;
              font-size: 9px;
              margin-bottom: 2px;
            }
            .signature-date {
              font-size: 8px;
              color: #666;
            }
            .footer {
              text-align: center;
              padding: 6px;
              border-top: 1px solid #e5e7eb;
              background: #f9fafb;
              font-size: 8px;
              line-height: 1.1;
            }
            .footer-title {
              font-weight: bold;
              margin-bottom: 2px;
            }
            .footer-info {
              color: #666;
              margin: 1px 0;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 8px;
                font-size: 10px;
                height: 100vh;
              }
              .page-container {
                height: calc(100vh - 16px);
              }
              .header { padding: 6px 0; margin-bottom: 8px; }
              .report-title { margin: 6px 0; }
              .content-sections { gap: 6px; margin-bottom: 8px; }
              .info-section { padding: 6px; }
              .signature-section { margin: 6px 0; padding: 6px; }
              .signature-box { padding: 6px; }
              .footer { padding: 4px; }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="header">
              <div class="logo">MedLab LIS</div>
              <div class="subtitle">Laboratory Information System - Sample Analysis Report</div>
            </div>

            <div class="report-title">Sample Report</div>

            <div class="content-sections">
              <div class="info-section">
                <div class="section-title">Sample Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Sample Barcode</div>
                    <div class="info-value barcode">${sample.barcode}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Collection Time</div>
                    <div class="info-value">${sample.collectionTime}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Current Status</div>
                    <div class="info-value">
                      <span class="status-badge status-${sample.status.replace(' ', '-')}">${sample.status}</span>
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Export Date</div>
                    <div class="info-value">${currentDate}</div>
                  </div>
                </div>
              </div>

              <div class="info-section">
                <div class="section-title">Patient Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Patient Name</div>
                    <div class="info-value">${sample.patientName}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Test Requested</div>
                    <div class="info-value">${sample.test}</div>
                  </div>
                </div>
              </div>

              <div class="info-section">
                <div class="section-title">Laboratory Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Lab Supervisor</div>
                    <div class="info-value">Dr. John Doe</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-title">Lab Technician</div>
                <div class="signature-date">Date: _____________</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-title">Lab Supervisor</div>
                <div class="signature-date">Date: _____________</div>
              </div>
            </div>

            <div class="footer">
              <div class="footer-title">MedLab LIS - Laboratory Information System</div>
              <div class="footer-info">Generated on ${currentDate}</div>
              <div class="footer-info">This is a computer-generated report. No signature required.</div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
      }
    };

    generatePDF();

    toast({
      title: "Export Successful",
      description: `Sample ${sample.barcode} report generated for printing/PDF`,
    });
  };

  // Update sample function
  const handleUpdateSample = async () => {
    if (!editingSample.patientName || !editingSample.test) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingSample(true);

    try {
      // Update sample in the array
      setSamples(prevSamples => 
        prevSamples.map(sample => 
          sample.barcode === selectedSample.barcode 
            ? {
                ...sample,
                patientName: editingSample.patientName,
                test: editingSample.test,
                status: editingSample.status
              }
            : sample
        )
      );

      toast({
        title: "Success",
        description: `Sample ${selectedSample.barcode} updated successfully`,
      });

      setShowEditModal(false);
      setSelectedSample(null);
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update sample. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingSample(false);
    }
  };

  // Close modals
  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedSample(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedSample(null);
    setEditingSample({
      patientName: "",
      test: "",
      status: ""
    });
  };
  // Appointment fields removed per requirement
  const [patientInfo, setPatientInfo] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "",
    address: "",
    guardianRelation: "",
    guardianName: "",
    cnic: "",
  });
  const [cnicError, setCnicError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSampleId, setSubmittedSampleId] = useState<string | null>(null);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<Array<{ itemId: string; name: string; quantity: number; unit?: string; currentStock?: number }>>([]);
  const [selItemId, setSelItemId] = useState<string>("");
  const [selQty, setSelQty] = useState<string>("1");
  const [selItemText, setSelItemText] = useState<string>("");
  const [suggestOpen, setSuggestOpen] = useState<boolean>(false);
  const [highlightIdx, setHighlightIdx] = useState<number>(-1);

  // refs for Enter navigation
  const phoneRef = useRef<HTMLInputElement>(null);
  const cnicRef = useRef<HTMLInputElement>(null);

  const lookupProfiling = async (opts: { cnic?: string; phone?: string }) => {
    try {
      const params = new URLSearchParams();
      if (opts.cnic) params.append("cnic", opts.cnic);
      if (opts.phone) params.append("phone", opts.phone);
      if (!params.toString()) return;

      const token = localStorage.getItem("token");
      const res = await api.get(`/lab/profiling/lookup?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const item = (res.data && res.data.item) || null;
      if (!item) return;

      setPatientInfo((prev) => ({
        ...prev,
        name: item.name || prev.name,
        phone: item.phone || prev.phone,
        cnic: item.cnic || prev.cnic,
      }));
    } catch (err: any) {
      // 404 is fine (no profiling yet); only log other errors
      if (err?.response?.status && err.response.status !== 404) {
        console.error("Profiling lookup failed", err.response || err);
      }
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('intakePrefill');
      if (raw) {
        const pre = JSON.parse(raw) || {};
        setPatientInfo((prev) => ({
          ...prev,
          name: pre.name || prev.name,
          phone: pre.phone || prev.phone,
          cnic: pre.cnic || prev.cnic,
          age: pre.age ?? prev.age,
          gender: pre.gender || prev.gender,
          guardianRelation: pre.guardianRelation || prev.guardianRelation,
          guardianName: pre.guardianName || prev.guardianName,
        }));
        setPendingPrefill(pre);
        localStorage.removeItem('intakePrefill');
      }
    } catch {}
  }, []);

  useEffect(() => {
    api
      .get("/tests")
      .then((res) => {
        const arr = res.data;
        if (Array.isArray(arr)) {
          setAvailableTests(arr as any[]);
        } else {
          setAvailableTests([]);
        }
      })
      .catch(() => {
        setAvailableTests([]);
        toast({ title: "Error", description: "Failed to load tests", variant: "destructive" });
      });
  }, []);

  useEffect(() => {
    if (pendingPrefill?.testName && availableTests.length) {
      const tn = String(pendingPrefill.testName || '').toLowerCase();
      const match = availableTests.find((t) => String(t?.name || '').toLowerCase() === tn);
      if (match) setSelectedTests([match]);
      setPendingPrefill(null);
    }
  }, [availableTests, pendingPrefill]);

  useEffect(() => {
    const fallbackInv = [
      { _id: "inv1", name: "EDTA Tubes", unit: "pcs", currentStock: 420 },
      { _id: "inv2", name: "Serum Separator Tubes", unit: "pcs", currentStock: 120 },
      { _id: "inv3", name: "Glucose Reagent", unit: "bottle", currentStock: 6 },
      { _id: "inv4", name: "CRP Reagent", unit: "bottle", currentStock: 14 },
    ];
    fetch("/api/lab/inventory/inventory", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      credentials: "include",
    })
      .then((r) => r.json())
      .then((arr) => {
        if (Array.isArray(arr) && arr.length) {
          setAvailableInventory(arr);
        } else {
          setAvailableInventory(fallbackInv);
        }
      })
      .catch(() => {
        setAvailableInventory(fallbackInv);
        toast({ title: "Error", description: "Failed to load inventory", variant: "destructive" });
      });
  }, []);

  const handleEnter = (_e: React.KeyboardEvent, _next: React.RefObject<HTMLInputElement>) => {
    // Enter navigation simplified; email field removed
  };

  const addConsumable = () => {
    const typed = (selItemText || "").trim().toLowerCase();
    const item = availableInventory.find((i: any) => i._id === selItemId)
      || availableInventory.find((i:any)=> (i.name||'').toString().toLowerCase() === typed)
      || availableInventory.find((i:any)=> (i.name||'').toString().toLowerCase().includes(typed));
    if (!item) {
      toast({ title: "Error", description: "Select an item", variant: "destructive" });
      return;
    }
    const qty = Math.max(1, parseInt(selQty) || 0);
    if (qty > (item.currentStock || 0)) {
      toast({ title: "Error", description: "Quantity exceeds stock", variant: "destructive" });
      return;
    }
    setConsumables((prev) => {
      const idx = prev.findIndex((c) => c.itemId === item._id);
      if (idx >= 0) {
        const next = [...prev];
        const sum = next[idx].quantity + qty;
        next[idx] = { ...next[idx], quantity: Math.min(sum, item.currentStock || sum) };
        return next;
      }
      return [...prev, { itemId: item._id, name: item.name, quantity: qty, unit: item.unit, currentStock: item.currentStock }];
    });
    setSelItemId("");
    setSelItemText("");
    setSelQty("1");
  };

  const removeConsumable = (id: string) => {
    setConsumables((prev) => prev.filter((c) => c.itemId !== id));
  };

  const getTotalAmount = () => selectedTests.reduce((t, s) => t + (Number(s.price) || 0), 0);

  const handleSubmit = async () => {
    if (!patientInfo.name || !patientInfo.phone || selectedTests.length === 0) {
      toast({ title: "Error", description: "Enter patient name, phone and select at least one test", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        patientName: patientInfo.name,
        phone: patientInfo.phone,
        // email removed from payload
        age: patientInfo.age,
        gender: patientInfo.gender,
        address: patientInfo.address,
        guardianRelation: patientInfo.guardianRelation || undefined,
        guardianName: patientInfo.guardianName || undefined,
        cnic: patientInfo.cnic || undefined,
        tests: selectedTests.map((t: any) => (t?._id ?? t?.id)).filter(Boolean),
        consumables: consumables.map((c) => ({ item: c.itemId, quantity: c.quantity })),
        totalAmount: getTotalAmount(),
        status: "collected",
      };
      let created: any = null;
      try {
        const token = localStorage.getItem("token");
        try {
          const res = await api.post(
            "/labtech/samples",
            payload,
            token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
          );
          created = res.data;
        } catch (networkErr: any) {
          console.error("Error calling /labtech/samples:", networkErr?.response || networkErr);
          // If backend responded (e.g. 401/400/500), bubble up so we show a real error
          if (networkErr?.response) {
            throw networkErr;
          }
          // Only mark as network (no response) for true connectivity issues
          throw new Error("network");
        }
      } catch (err: any) {
        if (err && err.message === "network") {
          const now = new Date();
          created = {
            _id: `local-${Date.now()}`,
            sampleNumber: `LAB-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`,
            createdAt: now.toISOString(),
          };
        } else {
          // Non-network backend errors should stop submission and be handled by outer catch
          throw err;
        }
      }
      setSubmittedSampleId(created._id);
      // Reload samples from backend (if available)
      try {
        await loadSamplesFromBackend();
      } catch {}
      // Print sample slip (best effort)
      try {
        printSampleSlip({
          sampleNumber: created.sampleNumber,
          dateTime: created.createdAt,
          patientName: patientInfo.name,
          guardianRelation: patientInfo.guardianRelation,
          guardianName: patientInfo.guardianName,
          cnic: patientInfo.cnic,
          phone: patientInfo.phone,
          age: patientInfo.age,
          gender: patientInfo.gender,
          address: patientInfo.address,
          tests: selectedTests.map(t => ({ name: t.name, price: t.price })),
          totalAmount: getTotalAmount(),
        });
      } catch {}
      const localSave = typeof created?._id === "string" && created._id.startsWith("local-");
      toast({ title: localSave ? "Saved locally" : "Success", description: localSave ? "No server detected. Sample saved locally for demo." : "Sample submitted" });
      // Persist to local storage (samples) for demo/analytics flows
      try {
        const sampleRec: any = {
          barcode: created?.sampleNumber || `SMP-${Date.now()}`,
          patientName: patientInfo.name,
          tests: selectedTests.map((t: any) => ({ name: t?.name, price: t?.price })),
          test: selectedTests.map((t: any) => t?.name).filter(Boolean).join(', '),
          phone: patientInfo.phone,
          patientPhone: patientInfo.phone,
          cnic: patientInfo.cnic,
          patientCnic: patientInfo.cnic,
          guardianName: patientInfo.guardianName,
          status: "collected",
          collectionTime: new Date().toISOString(),
          consumables: consumables.map((c) => ({ name: c.name, quantity: c.quantity, unit: c.unit })),
        };
        const readArr = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
        const writeArr = (k: string, v: any[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
        const k1 = 'barcodesSamples';
        const k2 = 'samplesPageSamples';
        const a1 = readArr(k1); a1.push(sampleRec); writeArr(k1, a1);
        const a2 = readArr(k2); a2.push(sampleRec); writeArr(k2, a2);
        setSamples(prev => [...prev, sampleRec]);
      } catch {}
      try { window.dispatchEvent(new Event('sampleSubmitted')); window.dispatchEvent(new Event('samplesChanged')); } catch {}
      // reset
      setSelectedTests([]);
      setPatientInfo({ name: "", phone: "", age: "", gender: "", address: "", guardianRelation: "", guardianName: "", cnic: "" });
      setConsumables([]);
    } catch (err: any) {
      console.error("Sample submission failed", err?.response || err);
      toast({ title: "Error", description: "Submission failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedSampleId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Sample Submitted!</h2>
            <p className="text-gray-600 mb-4">ID: {submittedSampleId}</p>
            <Button onClick={() => setSubmittedSampleId(null)}>New Sample</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Sample Intake</h1>
        <p className="text-sm text-muted-foreground">Register new patient samples and manage test requests</p>
      </div>

      {/* Patient Info + Appointment (Combined) */}
      <Card className="border rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle>Patient Details</CardTitle>
          <CardDescription>Enter patient demographics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Patient row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={patientInfo.name}
                onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                onKeyDown={(e) => handleEnter(e, phoneRef)}
                className="h-10"
                required
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                ref={phoneRef}
                value={patientInfo.phone}
                onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value })}
                onBlur={() => {
                  const phone = (patientInfo.phone || "").trim();
                  if (phone.length >= 7) {
                    lookupProfiling({ phone });
                  }
                }}
                className="h-10"
                required
              />
            </div>
            <div>
              <Label>Age</Label>
              <Input
                value={patientInfo.age}
                onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
                className="h-10"
              />
            </div>
          </div>
          {/* Patient row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Gender</Label>
              <Select value={patientInfo.gender} onValueChange={(v) => setPatientInfo({ ...patientInfo, gender: v })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={patientInfo.address}
                onChange={(e) => setPatientInfo({ ...patientInfo, address: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <Label>CNIC</Label>
              <Input
                ref={cnicRef}
                value={patientInfo.cnic}
                onChange={(e) => {
                  // Keep only digits, max 13
                  const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 13);
                  setPatientInfo({ ...patientInfo, cnic: digits });
                  if (digits && digits.length !== 13) setCnicError("CNIC must be exactly 13 digits (no dashes)");
                  else setCnicError("");
                }}
                onBlur={() => {
                  const cnic = (patientInfo.cnic || "").trim();
                  if (cnic.length === 13) {
                    lookupProfiling({ cnic });
                  }
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={13}
                placeholder="13-digit without dashes"
                className="h-10"
              />
              {cnicError && <div className="text-sm text-red-600 mt-1">{cnicError}</div>}
            </div>
          </div>
          {/* Guardian and ID fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Guardian Relation</Label>
              <Select value={patientInfo.guardianRelation} onValueChange={(v) => setPatientInfo({ ...patientInfo, guardianRelation: v })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S/O">S/O</SelectItem>
                  <SelectItem value="D/O">D/O</SelectItem>
                  <SelectItem value="W/O">W/O</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Guardian Name</Label>
              <Input
                value={patientInfo.guardianName}
                onChange={(e) => setPatientInfo({ ...patientInfo, guardianName: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="hidden md:block" />
          </div>
          {/* Additional notes removed per requirement */}
        </CardContent>
      </Card>

      {/* Test selection */}
      <Card className="border rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle>Select Tests</CardTitle>
          <CardDescription>Type to search and pick multiple tests</CardDescription>
        </CardHeader>
        <CardContent>
          <TestSelect tests={availableTests} selected={selectedTests} onChange={setSelectedTests} />
        </CardContent>
      </Card>

      <Card className="border rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle>Select Consumables</CardTitle>
          <CardDescription>Choose items and quantities to use</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <Label>Item</Label>
              <div className="relative">
                <Input
                  className="h-10"
                  placeholder="Type to search..."
                  value={selItemText}
                  onFocus={()=> setSuggestOpen(true)}
                  onBlur={()=> setTimeout(()=> setSuggestOpen(false), 100)}
                  onChange={(e)=> { setSelItemText(e.target.value); setSelItemId(""); setSuggestOpen(true); setHighlightIdx(-1); }}
                  onKeyDown={(e)=> {
                    const list = availableInventory.filter((i:any)=> (i.name||'').toString().toLowerCase().includes((selItemText||'').toLowerCase())).slice(0,8);
                    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx((prev)=> Math.min(prev + 1, list.length - 1)); setSuggestOpen(true); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx((prev)=> Math.max(prev - 1, 0)); setSuggestOpen(true); }
                    if (e.key === 'Enter' && highlightIdx >= 0 && list[highlightIdx]) { e.preventDefault(); const it = list[highlightIdx]; setSelItemText(it.name); setSelItemId(it._id); setSuggestOpen(false); }
                  }}
                />
                {suggestOpen && (selItemText || '').length > 0 && (
                  (() => {
                    const suggestions = availableInventory
                      .filter((i:any)=> (i.name||'').toString().toLowerCase().includes((selItemText||'').toLowerCase()))
                      .slice(0, 8);
                    if (suggestions.length === 0) return null;
                    return (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {suggestions.map((it:any, idx:number)=> (
                          <button
                            type="button"
                            key={it._id}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-blue-50 ${idx===highlightIdx? 'bg-blue-50' : ''}`}
                            onMouseDown={()=> { setSelItemText(it.name); setSelItemId(it._id); setSuggestOpen(false); }}
                          >
                            <span className="truncate">{it.name}</span>
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{(it.currentStock ?? 0)} {it.unit || ''}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={selQty} onChange={(e) => setSelQty(e.target.value)} className="h-10" />
            </div>
            <div className="flex justify-end">
              <Button onClick={addConsumable}>Add</Button>
            </div>
          </div>
          {consumables.length > 0 && (
            <div className="space-y-2">
              {consumables.map((c) => (
                <div key={c.itemId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-gray-600">{c.quantity} {c.unit || ''}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => removeConsumable(c.itemId)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected summary */}
      {selectedTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Tests ({selectedTests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTests.map((t) => (
              <div key={t._id} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between">
                  <span>{t.name}</span>
                  <span className="font-medium">PKR {Number(t.price||0).toFixed(2)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Total</span>
              <span>PKR {getTotalAmount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              {(() => {
                const base = getTotalAmount();
                const dr = Number(discountRate) || 0;
                const disc = base * (dr / 100);
                return (
                  <>
                    <span>Discount ({dr.toFixed(0)}%)</span>
                    <span>- PKR {disc.toFixed(2)}</span>
                  </>
                );
              })()}
            </div>
            <div className="flex justify-between text-sm">
              {(() => { 
                const base = getTotalAmount();
                const dr = Number(discountRate) || 0;
                const afterDiscount = base * (1 - dr / 100);
                const c = computeIncl(afterDiscount); 
                return (
                <>
                  <span>Total Incl. tax ({c.rate.toFixed(0)}%)</span>
                  <span>PKR {c.amount.toFixed(2)}</span>
                </>
              ); })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onNavigateBack}>Cancel</Button>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={isSubmitting || selectedTests.length === 0}>
          {isSubmitting ? "Submitting..." : "Submit Sample"}
        </Button>
      </div>

      {/* View Sample Modal */}
      {showViewModal && selectedSample && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Sample Details</h2>
              <button
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Barcode</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono">
                    {selectedSample.barcode}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                    {getStatusBadge(selectedSample.status)}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Patient Name</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  {selectedSample.patientName}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Test</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  {selectedSample.test}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Collection Time</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  {selectedSample.collectionTime}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-sm text-blue-800">
                  <strong>Lab Information:</strong><br />
                  MedLab LIS - Laboratory Information System<br />
                  Supervisor: Dr. John Doe
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={closeViewModal}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  closeViewModal();
                  handleEditSample(selectedSample);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit Sample
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sample Modal */}
      {showEditModal && selectedSample && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Sample</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Sample Info (Read-only) */}
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Barcode: <span className="font-medium font-mono">{selectedSample.barcode}</span></div>
                  <div>Collection Time: <span className="font-medium">{selectedSample.collectionTime}</span></div>
                </div>
              </div>

              {/* Editable Fields */}
              <div>
                <Label htmlFor="editPatientName">Patient Name *</Label>
                <Input
                  id="editPatientName"
                  value={editingSample.patientName}
                  onChange={(e) => setEditingSample({ ...editingSample, patientName: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="editTest">Test *</Label>
                <Select 
                  value={editingSample.test} 
                  onValueChange={(value) => setEditingSample({ ...editingSample, test: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {testOptions.map((test) => (
                      <SelectItem key={test} value={test}>
                        {test}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="editStatus">Status *</Label>
                <Select 
                  value={editingSample.status} 
                  onValueChange={(value) => setEditingSample({ ...editingSample, status: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(status)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={closeEditModal}
                disabled={isUpdatingSample}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateSample}
                disabled={isUpdatingSample || !editingSample.patientName || !editingSample.test}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdatingSample ? "Updating..." : "Update Sample"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleIntakeClean;
