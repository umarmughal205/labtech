import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Plus,
  Search,
  Filter,
  Calendar,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { FinanceRecord } from "@/hooks/useIpdFinanceApi";
import { getAllLedgerEntries, addLedgerEntry, LabLedgerEntry } from "@/components/lab compoenents/finance/labFinanceStore";

type LedgerDateRange = "last-30-days" | "last-90-days" | "this-year" | "all";
type LedgerTxTypeFilter = "all" | "Income" | "Expense";

type NewEntryForm = {
  date: string;
  type: "Income" | "Expense";
  amount: string;
  category: string;
  description: string;
  patientId?: string;
};

const formatCurrency = (amount: number) => {
  return `PKR ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Compact representation for large amounts in header cards
const formatCompact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
};

const CATEGORY_COLORS = ["#2563eb", "#22c55e", "#ef4444", "#f97316", "#a855f7"];

const getCategoryColor = (label: string, index: number) => {
  if (label === "Lab Bills") return "#22c55e";
  if (label === "Utilities") return "#2563eb";
  if (label === "Salaries") return "#ef4444";
  if (label === "Supplies") return "#f97316";

  const lower = label.toLowerCase();
  if (lower.includes("sample")) return "#2563eb";
  if (lower.includes("payment")) return "#22c55e";
  if (lower.includes("expense")) return "#f97316";
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

const formatCategoryPercent = (percent: number): string => {
  if (percent > 0 && percent < 0.1) {
    return "<0.1%";
  }
  return `${percent.toFixed(1)}%`;
};

const formatReportingPercent = (percent: number): string => {
  if (percent <= 0) return "0%";
  if (percent < 1) return "1.0%";
  if (percent > 100) return "100.0%";
  return `${percent.toFixed(1)}%`;
};

const getDateLimit = (range: LedgerDateRange) => {
  const now = new Date();
  if (range === "all") return undefined;
  if (range === "this-year") {
    return new Date(now.getFullYear(), 0, 1);
  }
  const days = range === "last-90-days" ? 90 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const FinancialLedger: React.FC = () => {
  const [baseRecords, setBaseRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshLedgerData = async () => {
    try {
      const entries: LabLedgerEntry[] = await getAllLedgerEntries();
      const mapped: FinanceRecord[] = entries.map((e) => ({
        _id: e.id,
        date: e.date,
        amount: e.amount,
        category: e.category,
        description: e.description,
        department: "Lab",
        type: e.type === "income" ? "Income" : "Expense",
        recordedBy: "Lab Ledger",
        patientId: undefined,
      })) as FinanceRecord[];
      setBaseRecords(mapped);
    } catch (err) {
      console.error("Failed to refresh lab financial ledger entries", err as any);
      setBaseRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Load all ledger entries from labFinanceStore backend (/lab/finance)
  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshLedgerData();
    })();
  }, []);

  // Auto-refresh ledger data periodically so the view stays in sync
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await refreshLedgerData();
      } catch (err) {
        console.error("Failed to auto-refresh lab financial ledger entries", err as any);
      }
    }, 45000); // ~45 seconds

    return () => clearInterval(interval);
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [reportType, setReportType] = useState("financial-summary");
  const [reportDateRange, setReportDateRange] = useState<LedgerDateRange>("last-30-days");
  const [reportTxType, setReportTxType] = useState<LedgerTxTypeFilter>("all");

  const [tableDateRange, setTableDateRange] = useState<LedgerDateRange>("last-30-days");
  const [tableTxType, setTableTxType] = useState<LedgerTxTypeFilter>("all");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newEntry, setNewEntry] = useState<NewEntryForm>({
    date: new Date().toISOString().slice(0, 10),
    type: "Income",
    amount: "",
    category: "General",
    description: "",
    patientId: "",
  });

  const metrics = useMemo(() => {
    const income = baseRecords
      .filter((r) => r.type === "Income")
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const expense = baseRecords
      .filter((r) => r.type === "Expense")
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const net = income - expense;
    const pendingCount = baseRecords.length;
    const pendingTotal = baseRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: net,
      pendingCount,
      pendingTotal,
    };
  }, [baseRecords]);

  const filteredRecords = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    const minDate = getDateLimit(tableDateRange);

    return baseRecords.filter((r) => {
      const d = new Date(r.date);
      if (minDate && d < minDate) return false;

      if (tableTxType !== "all" && r.type !== tableTxType) return false;

      if (!search) return true;

      const haystack = [
        r.description,
        r.category,
        r.patientId,
        r.admissionId,
        r.department,
        r.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [baseRecords, searchTerm, tableDateRange, tableTxType]);

  const recordsWithBalance = useMemo(() => {
    let balance = 0;
    return filteredRecords
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r) => {
        const delta = r.type === "Income" ? r.amount : -r.amount;
        balance += delta;
        return { ...r, balance } as FinanceRecord & { balance: number };
      });
  }, [filteredRecords]);

  const totalItems = recordsWithBalance.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = recordsWithBalance.slice(startIdx, endIdx);

  const categoryBreakdown = useMemo(() => {
    // We want the detailed reporting pie chart to focus on four key buckets:
    // 1) Lab Bills (sample test fee income)
    // 2) Utilities (expense)
    // 3) Salaries (expense)
    // 4) Supplies (expense)
    const buckets: Record<string, number> = {
      "Lab Bills": 0,
      Utilities: 0,
      Salaries: 0,
      Supplies: 0,
    };

    for (const r of baseRecords) {
      const cat = r.category || "";

      // Lab Bills: count only income side (sample test fee profit)
      if (cat === "Lab Bills" && r.type === "Income") {
        buckets["Lab Bills"] += r.amount || 0;
        continue;
      }

      // Expense buckets: only count expenses for these categories
      if (r.type === "Expense") {
        if (cat === "Utilities") {
          buckets["Utilities"] += r.amount || 0;
        } else if (cat === "Salaries") {
          buckets["Salaries"] += r.amount || 0;
        } else if (cat === "Supplies") {
          buckets["Supplies"] += r.amount || 0;
        }
      }
    }

    // Build list, excluding zero buckets so the chart only shows relevant slices
    const entries = Object.entries(buckets).filter(([, value]) => value > 0);
    if (!entries.length) return [] as { label: string; value: number; percent: number }[];

    const grandTotal = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
    return entries.map(([label, value]) => ({
      label,
      value,
      percent: (value / grandTotal) * 100,
    }));
  }, [baseRecords]);

  const monthlyTrends = useMemo(() => {
    const buckets: Record<string, { income: number; expense: number; label: string }> = {};
    for (const r of baseRecords) {
      const d = new Date(r.date);
      if (Number.isNaN(d.getTime())) continue;
      const ym = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      if (!buckets[ym]) {
        const label = d.toLocaleString(undefined, { month: "short", year: "2-digit" });
        buckets[ym] = { income: 0, expense: 0, label };
      }
      if (r.type === "Income") buckets[ym].income += r.amount || 0;
      if (r.type === "Expense") buckets[ym].expense += r.amount || 0;
    }
    const sortedKeys = Object.keys(buckets).sort();
    return sortedKeys.map((k) => ({
      month: k,
      monthLabel: buckets[k].label,
      income: buckets[k].income,
      expense: buckets[k].expense,
    }));
  }, [baseRecords]);

  const handleExportCsv = () => {
    if (!baseRecords.length) return;

    const rows = baseRecords;
    const headers = [
      "Date",
      "Type",
      "Category",
      "Description",
      "Amount",
      "Department",
      "PatientId",
      "AdmissionId",
    ];

    const csvRows = rows.map((r) => [
      new Date(r.date).toLocaleString(),
      r.type,
      r.category,
      r.description,
      r.amount.toFixed(2),
      r.department,
      r.patientId ?? "",
      r.admissionId ?? "",
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    try {
      const win = window.open("", "_blank");
      if (!win) return;

      const doc = win.document;
      const now = new Date();
      const generatedAt = now.toLocaleString();

      const categoryRows = categoryBreakdown
        .map((c, index) => {
          const color = getCategoryColor(c.label, index);
          const percentText = formatCategoryPercent(c.percent);
          const amountText = formatCurrency(c.value).replace("PKR ", "");
          return `
            <tr>
              <td style="padding:4px 8px;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${color};margin-right:6px;"></span>
                <span>${c.label}</span>
              </td>
              <td style="padding:4px 8px;text-align:right;">${amountText}</td>
              <td style="padding:4px 8px;text-align:right;">${percentText}</td>
            </tr>`;
        })
        .join("");

      doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>Financial Ledger Report</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #111827; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #e5e7eb; }
      th { text-align: left; padding: 6px 8px; background:#f9fafb; }
      .meta { font-size: 11px; color:#6b7280; margin-bottom: 16px; }
    </style>
  </head>
  <body>
    <h1>Financial Ledger Report</h1>
    <div class="meta">Generated at: ${generatedAt}</div>

    <h2>Category Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th style="text-align:right;">Amount (PKR)</th>
          <th style="text-align:right;">Percent</th>
        </tr>
      </thead>
      <tbody>
        ${categoryRows || "<tr><td colspan=\"3\" style=\"padding:8px;\">No category data.</td></tr>"}
      </tbody>
    </table>
  </body>
</html>`);

      doc.close();
      win.focus();
      win.print();
    } catch (err) {
      console.error("Failed to export PDF", err);
    }
  };

  const handleGenerateReport = () => {
    const minDate = getDateLimit(reportDateRange);

    let rows = baseRecords.filter((r) => {
      const d = new Date(r.date);
      if (minDate && d < minDate) return false;

      if (reportTxType !== "all" && r.type !== reportTxType) return false;

      return true;
    });

    if (reportType === "income-only") {
      rows = rows.filter((r) => r.type === "Income");
    } else if (reportType === "expenses-only") {
      rows = rows.filter((r) => r.type === "Expense");
    }

    if (!rows.length) return;

    const headers = [
      "Date",
      "Type",
      "Category",
      "Description",
      "Amount",
      "Department",
      "PatientId",
      "AdmissionId",
    ];

    const csvRows = rows.map((r) => [
      new Date(r.date).toLocaleString(),
      r.type,
      r.category,
      r.description,
      r.amount.toFixed(2),
      r.department,
      r.patientId ?? "",
      r.admissionId ?? "",
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial_report_${reportType}_${reportDateRange}_${reportTxType}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddEntry = async () => {
    if (!newEntry.description || !newEntry.amount) return;
    const amountNum = parseFloat(newEntry.amount);
    const payloadCategory = newEntry.category || "General";
    const ledgerType = newEntry.type === "Income" ? "income" : "expense";

    try {
      setIsSaving(true);
      const created = await addLedgerEntry({
        type: ledgerType,
        source: "Manual",
        category: payloadCategory,
        description: newEntry.description,
        amount: amountNum,
        date: new Date(newEntry.date).toISOString(),
        reference: newEntry.patientId || undefined,
      });

      const rec: FinanceRecord = {
        _id: created.id,
        date: created.date,
        amount: created.amount,
        category: created.category,
        description: created.description,
        department: "Lab",
        type: newEntry.type,
        recordedBy: "Manual",
        patientId: newEntry.patientId || undefined,
      } as FinanceRecord;

      setBaseRecords((prev) => [...prev, rec]);
      setIsAddOpen(false);
      setNewEntry({
        date: new Date().toISOString().slice(0, 10),
        type: "Income",
        amount: "",
        category: "General",
        description: "",
        patientId: "",
      });
    } catch (err) {
      console.error("Failed to add manual ledger entry", err as any);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Financial Ledger</h1>
          <p className="text-sm text-gray-600">
            Track all financial transactions and activity logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refreshLedgerData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export Ledger
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Manual Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Total Income
              </p>
              <p className="mt-2 text-lg md:text-2xl font-bold text-emerald-600 break-words">
                PKR {formatCompact(metrics.totalIncome)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Total Expenses
              </p>
              <p className="mt-2 text-lg md:text-2xl font-bold text-red-600 break-words">
                PKR {formatCompact(metrics.totalExpense)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Net Balance
              </p>
              <p className="mt-2 text-lg md:text-2xl font-bold break-words">
                <span
                  className={
                    metrics.netBalance >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }
                >
                  PKR {formatCompact(metrics.netBalance)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Total Transactions
              </p>
              <p className="mt-2 text-lg md:text-2xl font-bold text-blue-900 break-words">
                {metrics.pendingCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Detailed Reporting</CardTitle>
            <CardDescription>
              Generate and visualize customizable financial reports.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Report Type</Label>
                <Select
                  value={reportType}
                  onValueChange={(v) => setReportType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial-summary">
                      Financial Summary
                    </SelectItem>
                    <SelectItem value="income-only">Income Only</SelectItem>
                    <SelectItem value="expenses-only">Expenses Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Date Range</Label>
                <Select
                  value={reportDateRange}
                  onValueChange={(v: LedgerDateRange) => setReportDateRange(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                    <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Transaction Type</Label>
                <Select
                  value={reportTxType}
                  onValueChange={(v: LedgerTxTypeFilter) => setReportTxType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Income">Income</SelectItem>
                    <SelectItem value="Expense">Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Export Options</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleExportCsv}
                  >
                    <Download className="w-3 h-3 mr-1" /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleExportPdf}
                  >
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              {categoryBreakdown.length > 0 ? (
                <>
                  <div className="h-44 w-full max-w-xs mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="value"
                          nameKey="label"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          stroke="#ffffff"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell
                              key={entry.label}
                              fill={getCategoryColor(entry.label, index)}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(val: any, _name, item: any) => {
                            const amount = formatCurrency(Number(val) || 0);
                            const percent =
                              typeof item?.payload?.percent === "number"
                                ? formatReportingPercent(item.payload.percent)
                                : "";
                            const label = item?.payload?.label ?? "Amount";
                            return [
                              percent ? `${amount} (${percent})` : amount,
                              label,
                            ];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 w-full max-w-xs">
                    {categoryBreakdown.map((c, index) => (
                      <div
                        key={c.label}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: getCategoryColor(c.label, index),
                            }}
                          />
                          <span className="text-gray-700">{c.label}</span>
                        </div>
                        <span className="text-gray-500">
                          {formatReportingPercent(c.percent)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500">
                  No category data yet.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Calendar className="w-3 h-3" />
                <span>Monthly Trends</span>
              </div>
              {monthlyTrends.length > 0 ? (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="monthLabel"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                      />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          formatCurrency(Number(val) || 0),
                          name === "income" ? "Income" : "Expenses",
                        ]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ paddingTop: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        name="Expenses"
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  No monthly trend data available.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-10 rounded-full bg-gray-50 border border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                Date Range
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Filter className="w-3 h-3" />
                Filter Type
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Table Range:</span>
              <Select
                value={tableDateRange}
                onValueChange={(v: LedgerDateRange) => {
                  setTableDateRange(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">Type:</span>
              <Select
                value={tableTxType}
                onValueChange={(v: LedgerTxTypeFilter) => {
                  setTableTxType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border rounded-lg overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[140px]">Transaction ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm py-6">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                )}

                {!loading && pageItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm py-6">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  pageItems.map((r) => {
                    const signedAmount = r.type === "Income" ? r.amount : -r.amount;
                    const isIncome = r.type === "Income";
                    return (
                      <TableRow key={r._id}>
                        <TableCell className="text-sm text-gray-700">
                          {new Date(r.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-gray-500">
                          {r._id}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isIncome ? "default" : "destructive"}
                            className="text-xs capitalize"
                          >
                            {r.type.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {r.category}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700 max-w-xs truncate">
                          {r.description}
                        </TableCell>
                        <TableCell
                          className={`text-sm text-right font-semibold ${
                            isIncome ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {signedAmount >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(signedAmount))}
                        </TableCell>
                        <TableCell
                          className={`text-sm text-right font-semibold ${
                            (r as any).balance >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(Math.abs((r as any).balance))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-600">
            <div>
              Showing {totalItems === 0 ? 0 : startIdx + 1}-
              {Math.min(endIdx, totalItems)} of {totalItems} entries
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">Rows per page</span>
              <span className="text-xs">{pageSize}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <span className="text-xs">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Manual Entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                className="col-span-3"
                value={newEntry.date}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={newEntry.type}
                onValueChange={(v: "Income" | "Expense") =>
                  setNewEntry((prev) => ({ ...prev, type: v }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                className="col-span-3"
                value={newEntry.amount}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Input
                id="category"
                className="col-span-3"
                value={newEntry.category}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, category: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                className="col-span-3"
                value={newEntry.description}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patientId" className="text-right">
                Patient ID (optional)
              </Label>
              <Input
                id="patientId"
                className="col-span-3"
                value={newEntry.patientId}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, patientId: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEntry} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialLedger;
