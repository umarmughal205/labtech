
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Download,
  Filter,
  RefreshCw
} from "lucide-react";
import { getAllLedgerEntries, LabLedgerEntry } from "@/components/lab compoenents/finance/labFinanceStore";
import { api } from "@/lib/api";

interface FinanceRecord {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  date: Date;
  reference?: string;
}

interface NewExpenseForm {
  description: string;
  amount: string;
  category: string;
}

// Format large numbers into compact form: 1,500 -> 1.5K, 1,000,000 -> 1M, etc.
function formatCompactAmount(value: number): string {
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
}


const FinanceDashboard = () => {
  const [dateFilter, setDateFilter] = useState("thisMonth");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddFinanceOpen, setIsAddFinanceOpen] = useState(false);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const expenseCategories = [
    "Lab Bills",
    "Equipment Expenses",
    "Salaries",
    "Utilities",
    "Supplies"
  ];

  const [newExpense, setNewExpense] = useState<NewExpenseForm>({
    description: "",
    amount: "",
    category: expenseCategories[0]
  });

   

  const [financeData, setFinanceData] = useState<FinanceRecord[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  // pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const txSectionRef = useRef<HTMLDivElement | null>(null);

  const refreshFinanceData = async () => {
    try {
      const entries = await getAllLedgerEntries();
      const mapped: FinanceRecord[] = entries.map((e: LabLedgerEntry) => ({
        id: e.id,
        type: e.type,
        category: e.category,
        description: e.description,
        amount: e.amount,
        date: new Date(e.date),
        reference: e.reference,
      }));
      setFinanceData(mapped);
    } catch (err) {
      console.error("Failed to refresh finance ledger entries", err as any);
    }
  };

  // load transactions from backend finance ledger
  useEffect(() => {
    (async () => {
      try {
        await refreshFinanceData();
      } catch {
        setFinanceData([]);
      }
    })();
  }, []);

  // Auto-refresh finance data periodically so dashboard stays in sync
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await refreshFinanceData();
      } catch (err) {
        console.error("Failed to auto-refresh finance ledger entries", err as any);
      }
    }, 45000); // ~45 seconds

    return () => clearInterval(interval);
  }, []);

  // fetch inventory for stock value (backend API)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/lab/inventory");
        const rows = Array.isArray(res.data) ? res.data : [];
        setInventory(rows);
      } catch (err) {
        console.error("Failed to load inventory for finance dashboard", err as any);
        setInventory([]);
      }
    })();
  }, []);

  // compute total income from ledger
  useEffect(() => {
    const income = financeData
      .filter(r => r.type === "income")
      .reduce((sum, r) => sum + r.amount, 0);
    setTotalIncome(income);
  }, [financeData]);

    // Current month filter helpers
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const getTotalIncome = () => totalIncome;

  const getTotalExpenses = () => {
    return financeData
      .filter(record => record.type === "expense" && record.date.getMonth() === currentMonth && record.date.getFullYear() === currentYear)
      .reduce((total, record) => total + record.amount, 0);
  };

  const getNetProfit = () => {
    return getTotalIncome() - getTotalExpenses();
  };

  const getTotalPurchasesThisMonth = () => {
    return financeData
      .filter(r => r.type === 'expense' && r.category === 'Supplies' && r.date.getMonth() === currentMonth && r.date.getFullYear() === currentYear)
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const getTotalStockValue = () => {
    return inventory.reduce((sum: number, it: any) => {
      const unitPrice = (typeof it.salePricePerUnit === 'number' && !isNaN(it.salePricePerUnit)) ? it.salePricePerUnit : (it.costPerUnit || 0);
      return sum + (it.currentStock || 0) * unitPrice;
    }, 0);
  };

  const jumpToTransactions = (cat?: string) => {
    if (cat) setCategoryFilter(cat);
    setTimeout(() => {
      txSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const filteredRecords = financeData.filter(record => {
    const matchesSearch = record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || record.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // reset to first page when filters/search change
  useEffect(() => { setPage(1); }, [searchTerm, categoryFilter]);

  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = filteredRecords.slice(startIdx, endIdx);

  const categories = ["all", "Lab Bills", "Equipment Expenses", "Salaries", "Utilities", "Supplies"];

  // Export filtered records to CSV
  const handleExport = () => {
    const headers = ["Description", "Category", "Type", "Amount", "Date", "Reference"];
    const rows = filteredRecords.map(r => [
      r.description,
      r.category,
      r.type,
      r.amount,
      r.date.toLocaleDateString(),
      r.reference ?? ""
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `finance_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-600">Track income, expenses, and profitability</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" className="mr-2" onClick={refreshFinanceData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="mr-2" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card ref={txSectionRef as any}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Income</p>
                <p className="text-sm font-medium text-gray-500">PKR</p>
                <p className="text-base md:text-xl font-bold text-green-600 break-words leading-tight">
                  {formatCompactAmount(getTotalIncome())}
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-sm font-medium text-gray-500">PKR</p>
                <p className="text-base md:text-xl font-bold text-red-600 break-words leading-tight">
                  {formatCompactAmount(getTotalExpenses())}
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className="text-sm font-medium text-gray-500">PKR</p>
                <p className={`text-base md:text-xl font-bold break-words leading-tight ${getNetProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCompactAmount(getNetProfit())}
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-sm font-medium text-gray-500">PKR</p>
                <p className="text-base md:text-xl font-bold text-blue-900 break-words leading-tight">
                  {formatCompactAmount(getTotalPurchasesThisMonth())}
                </p>
                <p className="text-xs text-gray-500">Supplies • This month</p>
              </div>
              {/* removed View Details button */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stock Value</p>
                <p className="text-sm font-medium text-gray-500">PKR</p>
                <p className="text-base md:text-xl font-bold text-purple-800 break-words leading-tight">
                  {formatCompactAmount(getTotalStockValue())}
                </p>
                <p className="text-xs text-gray-500">Current inventory</p>
              </div>
              {/* removed View Details button */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          className="p-2 border border-gray-300 rounded-md"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>

        <select
          className="p-2 border border-gray-300 rounded-md"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="thisMonth">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="thisQuarter">This Quarter</option>
          <option value="thisYear">This Year</option>
        </select>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest financial activities</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="space-y-4 min-w-full">
            {pageItems.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-8 rounded ${record.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <h4 className="font-medium">{record.description}</h4>
                    <p className="text-sm text-gray-600">{record.category}</p>
                    <p className="text-xs text-gray-500">
                      {record.date.toLocaleDateString()} 
                      {record.reference && ` • Ref: ${record.reference}`}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge variant={record.type === "income" ? "default" : "destructive"}>
                    {record.type}
                  </Badge>
                  <p className={`text-lg font-bold mt-1 ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {record.type === 'income' ? '+' : '-'}PKR {record.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {pageItems.length === 0 && (
              <div className="text-sm text-gray-500">No transactions found.</div>
            )}
          </div>
          {/* Pagination controls */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Showing {totalItems === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, totalItems)} of {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page</label>
              <select
                className="p-1 border rounded-md text-sm"
                value={pageSize}
                onChange={(e)=>{ setPageSize(parseInt(e.target.value)||10); setPage(1); }}
              >
                {[5,10,20,50].map(sz => (<option key={sz} value={sz}>{sz}</option>))}
              </select>
              <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={currentPage<=1}>Prev</Button>
              <span className="text-sm text-gray-700">Page {currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={currentPage>=totalPages}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceDashboard;
