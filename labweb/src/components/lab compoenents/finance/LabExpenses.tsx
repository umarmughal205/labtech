import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, DollarSign, Filter, Search, Edit3, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface ExpenseRecord {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  reference?: string;
  supplierId?: string;
  supplierName?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  quantity?: number;
}

const categories = [
  "Lab Bills",
  "Equipment Expenses",
  "Salaries",
  "Utilities",
  "Supplies",
];

const LabExpenses = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", category: categories[0] });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/lab/expenses");
        const data = Array.isArray(res.data) ? res.data : [];
        const loaded = data.map((e: any) => ({
          id: String(e._id),
          category: e.category || "",
          description: e.description || "",
          amount: Number(e.amount) || 0,
          date: e.date ? new Date(e.date) : new Date(),
          reference: e.reference,
          supplierId: e.supplierId ? String(e.supplierId) : undefined,
          supplierName: e.supplierName || "",
          inventoryItemId: e.inventoryItemId ? String(e.inventoryItemId) : undefined,
          inventoryItemName: e.inventoryItemName || "",
          quantity: typeof e.quantity === "number" ? e.quantity : undefined,
        }));
        setExpenses(loaded);
      } catch (err) {
        console.error("Failed to load lab expenses", err as any);
        setExpenses([]);
      }
    })();
  }, []);

  // fetch suppliers and inventory for linking
  useEffect(() => {
    (async () => {
      try {
        const [supRes, invRes] = await Promise.all([
          api.get("/lab/suppliers"),
          api.get("/lab/inventory"),
        ]);
        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
        setInventoryItems(Array.isArray(invRes.data) ? invRes.data : []);
      } catch (err) {
        console.error("Failed to load suppliers or inventory for expenses", err as any);
        setSuppliers([]);
        setInventoryItems([]);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  useEffect(() => setPage(1), [searchTerm, categoryFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = filtered.slice(startIdx, endIdx);

  const exportCsv = () => {
    const headers = ["Description", "Category", "Amount", "Date", "Reference"];
    const rows = filtered.map((e) => [
      e.description,
      e.category,
      e.amount.toFixed(2),
      e.date.toLocaleDateString(),
      e.reference || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lab_expenses_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const saveExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;
    const supplier = suppliers.find((s: any) => String(s._id) === selectedSupplierId);
    const item = inventoryItems.find((i: any) => String(i._id) === selectedItemId);
    const qtyNum = Math.max(0, parseFloat(quantity) || 0);
    const linkToSupplier = newExpense.category === "Supplies";
    const payload: any = {
      category: newExpense.category,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      date: new Date().toISOString(),
      supplierId: linkToSupplier && supplier ? String(supplier._id) : undefined,
      supplierName: linkToSupplier && supplier ? (supplier.name || supplier.contactPerson || "") : undefined,
      inventoryItemId: linkToSupplier && item ? String(item._id) : undefined,
      inventoryItemName: linkToSupplier && item ? (item.name || "") : undefined,
      quantity: linkToSupplier ? (qtyNum || undefined) : undefined,
    };
    try {
      const res = editingExpense
        ? await api.put(`/lab/expenses/${editingExpense.id}`, payload)
        : await api.post("/lab/expenses", payload);
      const created: any = res.data || {};
      const rec: ExpenseRecord = {
        id: String(created._id),
        category: created.category || payload.category,
        description: created.description || payload.description,
        amount: Number(created.amount ?? payload.amount) || 0,
        date: created.date ? new Date(created.date) : new Date(),
        reference: created.reference,
        supplierId: created.supplierId || payload.supplierId,
        supplierName: created.supplierName || payload.supplierName,
        inventoryItemId: created.inventoryItemId || payload.inventoryItemId,
        inventoryItemName: created.inventoryItemName || payload.inventoryItemName,
        quantity: typeof created.quantity === "number" ? created.quantity : payload.quantity,
      };
      setExpenses((prev) => {
        if (!editingExpense) {
          return [rec, ...prev];
        }
        return prev.map((e) => (e.id === editingExpense.id ? rec : e));
      });
      setNewExpense({ description: "", amount: "", category: categories[0] });
      setSelectedSupplierId("");
      setSelectedItemId("");
      setQuantity("1");
      setEditingExpense(null);
      setIsAddOpen(false);
    } catch (err) {
      console.error("Failed to create lab expense", err as any);
    }
  };

  const startAdd = () => {
    setEditingExpense(null);
    setNewExpense({ description: "", amount: "", category: categories[0] });
    setSelectedSupplierId("");
    setSelectedItemId("");
    setQuantity("1");
    setIsAddOpen(true);
  };

  const startEdit = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setNewExpense({
      description: exp.description,
      amount: String(exp.amount),
      category: exp.category || categories[0],
    });
    setSelectedSupplierId(exp.supplierId ?? "");
    setSelectedItemId(exp.inventoryItemId ?? "");
    setQuantity(exp.quantity != null ? String(exp.quantity) : "1");
    setIsAddOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this expense?");
    if (!confirmed) return;
    try {
      await api.delete(`/lab/expenses/${id}`);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete lab expense", err as any);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Expenses</h1>
          <p className="text-sm text-gray-600">Track and add laboratory expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2"/>Export</Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={startAdd}><DollarSign className="w-4 h-4 mr-2"/>{editingExpense ? "Edit Expense" : "Add Expense"}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="desc" className="text-right">Description</Label>
                  <Input id="desc" className="col-span-3" value={newExpense.description} onChange={(e)=>setNewExpense({...newExpense, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount (PKR)</Label>
                  <Input id="amount" type="number" className="col-span-3" value={newExpense.amount} onChange={(e)=>setNewExpense({...newExpense, amount: e.target.value})} />
                </div>
                {newExpense.category === "Supplies" && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="supplier" className="text-right">Supplier</Label>
                      <select
                        id="supplier"
                        className="col-span-3 border rounded-md p-2"
                        value={selectedSupplierId}
                        onChange={(e)=>setSelectedSupplierId(e.target.value)}
                      >
                        <option value="">-- Optional: Select supplier --</option>
                        {suppliers.map((s:any) => (
                          <option key={s._id} value={s._id}>{s.name || s.contactPerson || s.contactInfo}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="item" className="text-right">Inventory Item</Label>
                      <select
                        id="item"
                        className="col-span-3 border rounded-md p-2"
                        value={selectedItemId}
                        onChange={(e)=>setSelectedItemId(e.target.value)}
                      >
                        <option value="">-- Optional: Select item --</option>
                        {inventoryItems.map((it:any) => (
                          <option key={it._id} value={it._id}>{it.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="qty" className="text-right">Quantity</Label>
                      <Input
                        id="qty"
                        type="number"
                        className="col-span-3"
                        value={quantity}
                        onChange={(e)=>setQuantity(e.target.value)}
                        min={0}
                      />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">Category</Label>
                  <select id="category" className="col-span-3 border rounded-md p-2" value={newExpense.category} onChange={(e)=>setNewExpense({...newExpense, category: e.target.value})}>
                    {categories.map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>{ setIsAddOpen(false); setEditingExpense(null); }}>Cancel</Button>
                <Button onClick={saveExpense}>{editingExpense ? "Update" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input placeholder="Search expenses..." className="pl-10" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
        </div>
        <select className="p-2 border rounded-md" value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => (<option key={c} value={c}>{c}</option>))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>Recent expenses</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="space-y-3 min-w-full">
            {pageItems.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">{e.description}</div>
                  <div className="text-sm text-gray-600">{e.category}</div>
                  {(e.supplierName || e.inventoryItemName) && (
                    <div className="text-xs text-gray-500">
                      {e.supplierName && <span>Supplier: {e.supplierName}</span>}
                      {e.supplierName && e.inventoryItemName && " • "}
                      {e.inventoryItemName && <span>Item: {e.inventoryItemName}{e.quantity ? ` (Qty: ${e.quantity})` : ""}</span>}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">{e.date.toLocaleDateString()} {e.reference ? `• Ref: ${e.reference}` : ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-red-600 font-bold">- PKR {e.amount.toFixed(2)}</div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="p-1 rounded-md border text-gray-600 hover:bg-gray-50"
                      onClick={() => startEdit(e)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded-md border text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(e.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pageItems.length === 0 && (
              <div className="text-sm text-gray-500">No expenses found.</div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-600">Showing {totalItems === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, totalItems)} of {totalItems}</div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows per page</label>
              <select className="p-1 border rounded-md text-sm" value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)||10); setPage(1); }}>
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

export default LabExpenses;
