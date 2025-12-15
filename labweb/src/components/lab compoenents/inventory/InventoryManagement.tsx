import React, { useState, useEffect } from "react";
import AddNewItemForm from './AddNewItemForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ArrowLeft,
  Save,
  X,
  BarChart3,
  Printer,
} from "lucide-react";
import EditItemForm from './EditItemForm';
import { useToast } from "@/hooks/use-toast";
import UpdateStockDialog from './UpdateStockDialog';
import AdjustLooseItemsDialog from './AdjustLooseItemsDialog';
import InventoryToolbar from './InventoryToolbar';
import InventoryTable from './InventoryTable';
import { api } from "@/lib/api";

// TODO: Move to env config
// Lab inventory routes are mounted at /api/lab/inventory
// NOTE: For this mock/local mode, we are not calling the API and instead use localStorage-backed data.
const API_BASE = "/api/lab/inventory";

interface Category { _id: string; name: string; }

interface InventoryItem {
  _id: string;
  name: string;
  category: Category;
  currentStock: number;
  minThreshold: number;
  maxCapacity: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  location: string;
  expiryDate?: Date | string;
  lastRestocked?: Date | string;
  // Optional pricing/pack fields
  packs?: number;
  itemsPerPack?: number;
  salePricePerPack?: number;
  salePricePerUnit?: number;
  buyPricePerPack?: number;
  invoiceNumber?: string;
}

const INVENTORY_STORAGE_KEY = "lab_inventory_mock_v1";

const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    _id: "inv-1",
    name: "CBC Reagent Kit",
    category: { _id: "chem", name: "Chemicals & Reagents" },
    currentStock: 120,
    minThreshold: 30,
    maxCapacity: 300,
    unit: "packs",
    costPerUnit: 450,
    supplier: "MediSupply Co.",
    location: "Main Lab Store A1",
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    lastRestocked: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    _id: "inv-2",
    name: "Pipette Tips 200µL",
    category: { _id: "cons", name: "Consumables" },
    currentStock: 800,
    minThreshold: 200,
    maxCapacity: 2000,
    unit: "boxes",
    costPerUnit: 150,
    supplier: "Lab Essentials Ltd.",
    location: "Main Lab Store B3",
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    lastRestocked: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    _id: "inv-3",
    name: "Vacutainer Tubes",
    category: { _id: "coll", name: "Collection" },
    currentStock: 50,
    minThreshold: 40,
    maxCapacity: 400,
    unit: "packs",
    costPerUnit: 90,
    supplier: "MedLab Supplies",
    location: "Sample Collection Room",
    expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    lastRestocked: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
];

function loadInventoryFromStorage(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(DEFAULT_INVENTORY));
      return DEFAULT_INVENTORY;
    }
    const parsed = JSON.parse(raw) as InventoryItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(DEFAULT_INVENTORY));
      return DEFAULT_INVENTORY;
    }
    return parsed;
  } catch {
    return DEFAULT_INVENTORY;
  }
}

function saveInventoryToStorage(items: InventoryItem[]) {
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors in mock mode
  }
}

const InventoryManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  // single filter query replaces the three fields
  const [filterQuery, setFilterQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updateStockFor, setUpdateStockFor] = useState<InventoryItem | null>(null);
  const [adjustUnitsFor, setAdjustUnitsFor] = useState<InventoryItem | null>(null);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);
  const [quickItemId, setQuickItemId] = useState<string>("");
  const [showQuickAdjust, setShowQuickAdjust] = useState(false);
  const [quickAdjustItemId, setQuickAdjustItemId] = useState<string>("");
  const { toast } = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadInventoryFromStorage());
  const suppliers = React.useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(i => { if (i.supplier) set.add(i.supplier); });
    return Array.from(set);
  }, [inventory]);
  const [dbCategories, setDbCategories] = useState<Category[]>(() => {
    const items = loadInventoryFromStorage();
    const map = new Map<string, Category>();
    items.forEach((it) => {
      if (it.category && !map.has(it.category._id)) {
        map.set(it.category._id, it.category);
      }
    });
    return Array.from(map.values());
  });
  const [tableFilter, setTableFilter] = useState<'all'|'low'|'expiring'|'out'>('all');

  // When opening quick update, default to first item so full form shows immediately
  React.useEffect(() => {
    if (showQuickUpdate && !quickItemId && inventory.length > 0) {
      setQuickItemId(inventory[0]._id);
    }
  }, [showQuickUpdate, quickItemId, inventory]);

  // fetch categories & inventory on mount (backend first, fallback to local)
  const loadAll = React.useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(
        "/lab/inventory",
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      const data = Array.isArray(res.data) ? res.data : [];
      const mapped: InventoryItem[] = data.map((it: any) => ({
        _id: String(it._id),
        name: it.name || "",
        category: (it.category as any) || { _id: "", name: "" },
        currentStock: it.currentStock ?? 0,
        minThreshold: it.minThreshold ?? 0,
        maxCapacity: it.maxCapacity ?? 0,
        unit: it.unit || "",
        costPerUnit: it.costPerUnit ?? 0,
        supplier: it.supplier || "",
        location: it.location || "",
        expiryDate: it.expiryDate || undefined,
        lastRestocked: it.lastRestocked || undefined,
        packs: it.packs,
        itemsPerPack: it.itemsPerPack,
        salePricePerPack: it.salePricePerPack,
        salePricePerUnit: it.salePricePerUnit,
        buyPricePerPack: it.buyPricePerPack,
        invoiceNumber: it.invoiceNumber,
      }));
      setInventory(mapped);
      const map = new Map<string, Category>();
      mapped.forEach((it) => {
        if (it.category && it.category._id && !map.has(it.category._id)) {
          map.set(it.category._id, it.category);
        }
      });
      setDbCategories(Array.from(map.values()));
    } catch (err) {
      console.error("Failed to load inventory from backend, falling back to local storage", err as any);
      const loaded = loadInventoryFromStorage();
      setInventory(loaded);
      const map = new Map<string, Category>();
      loaded.forEach((it) => {
        if (it.category && !map.has(it.category._id)) {
          map.set(it.category._id, it.category);
        }
      });
      setDbCategories(Array.from(map.values()));
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      await loadAll();
    })();
  }, [loadAll]);

  // Function to add a new category to the DB and local state (mock/local)
  const handleAddCategory = async (name: string) => {
    const newCat: Category = { _id: `cat_${Date.now()}`, name };
    setDbCategories((prev) => [...prev, newCat]);
    toast({ title: "Category Added", description: `${name} has been added.` });
  };

  // Build printable rows according to the current tab filter
  const getVisibleRowsForPrint = () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let rows = [...filteredInventory];
    if (tableFilter === 'low') rows = rows.filter(r => r.currentStock <= r.minThreshold);
    if (tableFilter === 'expiring') rows = rows.filter(r => r.expiryDate && (new Date(r.expiryDate as any) <= soon));
    if (tableFilter === 'out') rows = rows.filter(r => r.currentStock <= 0);
    return rows;
  };

  const handlePrint = () => {
    const rows = getVisibleRowsForPrint();
    const headers = [
      'Invoice #','Item','Category','Packs','Units/Pack','Sale/Pack','Unit Sale','Total Units','Min Stock','Expiry','Supplier','Status'
    ];
    const htmlRows = rows.map(r => {
      const exp = r.expiryDate ? (typeof r.expiryDate === 'string' ? new Date(r.expiryDate) : r.expiryDate) : null;
      const isOut = r.currentStock <= 0;
      const isLow = r.currentStock <= r.minThreshold;
      const isExp = exp ? (exp <= new Date(Date.now() + 30*24*60*60*1000)) : false;
      const status = isOut ? 'Out of stock' : (isLow ? 'Low' : (isExp ? 'Expiring' : 'OK'));
      return `<tr>
        <td>${(r as any).invoiceNumber || '-'}</td>
        <td>${r.name}</td>
        <td>${(r.category && (r.category as any).name) || 'Uncategorized'}</td>
        <td>${(r as any).packs ?? '-'}</td>
        <td>${(r as any).itemsPerPack ?? '-'}</td>
        <td>${(r as any).salePricePerPack ?? '-'}</td>
        <td>${(r as any).salePricePerUnit ?? '-'}</td>
        <td>${r.currentStock}</td>
        <td>${r.minThreshold}</td>
        <td>${exp ? exp.toLocaleDateString() : '-'}</td>
        <td>${r.supplier}</td>
        <td>${status}</td>
      </tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><title>Inventory Print</title>
      <style>
        body{font-family: Arial, sans-serif;padding:16px}
        h2{margin:0 0 12px 0}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px;text-align:left}
        th{background:#f5f5f5}
      </style>
    </head><body>
      <h2>Inventory (${tableFilter})</h2>
      <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${htmlRows || '<tr><td colspan="12">No items</td></tr>'}</tbody></table>
      <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(), 300); };</script>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  };
  const filteredInventory = inventory
    .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(item => {
      const q = appliedQuery.trim().toLowerCase();
      if (!q) return true;
      const nameMatch = item.name.toLowerCase().includes(q);
      const catMatch = (item.category?.name || "").toLowerCase().includes(q);
      const invMatch = String((item as any).invoiceNumber || "").toLowerCase().includes(q);
      return nameMatch || catMatch || invMatch;
    });

  const lowStockItems = inventory.filter(item => item.currentStock <= item.minThreshold);
  const expiringSoonItems = inventory.filter(item => 
    (item.expiryDate && (typeof item.expiryDate === 'string' ? new Date(item.expiryDate) : item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
  );

  const getStockStatus = (item: InventoryItem) => {
    const percentage = (item.currentStock / item.maxCapacity) * 100;
    if (item.currentStock <= item.minThreshold) return { status: "low", color: "bg-red-500", textColor: "text-red-700" };
    if (percentage < 30) return { status: "medium", color: "bg-yellow-500", textColor: "text-yellow-700" };
    return { status: "good", color: "bg-green-500", textColor: "text-green-700" };
  };

  const getTotalValue = () => {
    return inventory.reduce((total, item: any) => {
      const spu: number | undefined = item.salePricePerUnit;
      const cpu: number = item.costPerUnit;
      const unitPrice = typeof spu === 'number' && !isNaN(spu) ? spu : cpu;
      return total + (item.currentStock * (unitPrice || 0));
    }, 0);
  };

  const handleAddItem = async (newItem: any) => {
    try {
      // newItem.category is a category _id from AddNewItemForm
      const catId: string = newItem.category;
      const cat = dbCategories.find(c => c._id === catId);

      const payload: any = {
        name: newItem.name,
        category: cat ? { _id: cat._id, name: cat.name } : undefined,
        currentStock: newItem.currentStock,
        minThreshold: newItem.minThreshold,
        maxCapacity: newItem.maxCapacity || 0,
        unit: newItem.unit,
        costPerUnit: newItem.costPerUnit,
        supplier: newItem.supplier,
        location: newItem.location,
        expiryDate: newItem.expiryDate,
        // pack/pricing fields
        packs: newItem.packs,
        itemsPerPack: newItem.itemsPerPack,
        buyPricePerPack: newItem.buyPricePerPack,
        salePricePerPack: newItem.salePricePerPack,
        salePricePerUnit: newItem.salePricePerUnit,
        invoiceNumber: newItem.invoiceNumber,
      };

      const token = localStorage.getItem("token");
      const res = await api.post(
        "/lab/inventory",
        payload,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      const it: any = res.data || {};
      const created: InventoryItem = {
        _id: String(it._id),
        name: it.name || newItem.name,
        category: (it.category as any) || (cat || { _id: "", name: "" }),
        currentStock: it.currentStock ?? newItem.currentStock ?? 0,
        minThreshold: it.minThreshold ?? newItem.minThreshold ?? 0,
        maxCapacity: it.maxCapacity ?? newItem.maxCapacity ?? 0,
        unit: it.unit || newItem.unit,
        costPerUnit: it.costPerUnit ?? newItem.costPerUnit ?? 0,
        supplier: it.supplier || newItem.supplier || "",
        location: it.location || newItem.location || "",
        expiryDate: it.expiryDate || newItem.expiryDate,
        lastRestocked: it.lastRestocked || new Date().toISOString(),
        packs: it.packs ?? newItem.packs,
        itemsPerPack: it.itemsPerPack ?? newItem.itemsPerPack,
        salePricePerPack: it.salePricePerPack ?? newItem.salePricePerPack,
        salePricePerUnit: it.salePricePerUnit ?? newItem.salePricePerUnit,
        buyPricePerPack: it.buyPricePerPack ?? newItem.buyPricePerPack,
        invoiceNumber: it.invoiceNumber ?? newItem.invoiceNumber,
      };

      setInventory((prev) => [...prev, created]);

      toast({
        title: "Item Added",
        description: `${created.name} has been added to inventory.`,
      });

      setIsAddingItem(false);
    } catch (err: any) {
      console.error("Failed to add inventory item", err?.response || err);
      toast({ title: "Error", description: "Failed to add inventory item", variant: "destructive" });
    }
  };

  const handleUpdateStock = (_id: string, newStock: number) => {
    setInventory(prev => {
      const next = prev.map(item => 
        item._id === _id 
          ? { ...item, currentStock: newStock, lastRestocked: new Date() }
          : item
      );
      saveInventoryToStorage(next);
      return next;
    });

    toast({
      title: "Stock Updated",
      description: "Inventory has been updated successfully.",
    });
  };

  const handleDeleteItem = async (_id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    setInventory((prev) => {
      const next = prev.filter((item) => item._id !== _id);
      saveInventoryToStorage(next);
      return next;
    });
    toast({
      title: "Item Deleted",
      description: "Item has been removed from inventory.",
    });
  };

  // Replace full-page add form with modal dialog below in returned JSX

  // Edit flow handled via dialog below

  return (
    <div className="p-6 space-y-6 overflow-x-hidden">
      {/* Add New Item Dialog */}
      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          <AddNewItemForm 
            onClose={() => setIsAddingItem(false)} 
            onAddItem={handleAddItem}
            onAddCategory={handleAddCategory}
            dbCategories={dbCategories}
            suppliers={suppliers}
          />
        </DialogContent>
      </Dialog>
      {/* Edit Item Dialog */}
      <Dialog open={isEditing} onOpenChange={(open)=> { setIsEditing(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <EditItemForm
              onClose={() => { setIsEditing(false); setEditingItem(null); }}
              onUpdateItem={(updated) => {
                setInventory(prev => {
                  const next = prev.map(it => it._id === updated._id ? updated : it);
                  saveInventoryToStorage(next);
                  return next;
                });
                setIsEditing(false);
                setEditingItem(null);
              }}
              dbCategories={dbCategories}
              item={editingItem}
            />
          )}
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-600">Track and manage laboratory supplies</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InventoryToolbar 
            onRefresh={loadAll}
            onExport={() => {
              const rows = filteredInventory.map(i => ({
                id: i._id,
                name: i.name,
                category: i.category?.name ?? 'Uncategorized',
                stock: i.currentStock,
                unit: i.unit,
                costPerUnit: i.costPerUnit,
                supplier: i.supplier,
                location: i.location
              }));
              const header = Object.keys(rows[0] || {id:'', name:'', category:'', stock:'', unit:'', costPerUnit:'', supplier:'', location:''});
              const csv = [header.join(','), ...rows.map(r => header.map(h => String((r as any)[h] ?? '')).join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'inventory.csv'; a.click();
              URL.revokeObjectURL(url);
            }}
            search={searchTerm}
            onSearch={setSearchTerm}
            showSearch={false}
          />
          <Button variant="secondary" className="bg-blue-800 text-white hover:bg-blue-900" onClick={() => setShowQuickUpdate(true)}>
            Update Stock
          </Button>
          <Button variant="secondary" className="bg-blue-800 text-white hover:bg-blue-900" onClick={() => setShowQuickAdjust(true)}>
            Add Loose Items
          </Button>
          <Button className="bg-blue-800 text-white hover:bg-blue-900" onClick={() => setIsAddingItem(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{expiringSoonItems.length}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">PKR {getTotalValue().toFixed(2)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apply Filter Controls */}
      <div className="flex items-end gap-3 justify-between">
        <div className="flex-1 max-w-xl">
          <Label>Search (name, category, invoice #)</Label>
          <Input
            placeholder="Type to search..."
            value={filterQuery}
            onChange={e => {
              const v = e.target.value;
              setFilterQuery(v);
              setAppliedQuery(v);
            }}
          />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Button className="bg-blue-800 text-white hover:bg-blue-900" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>Manage your laboratory inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Button variant={tableFilter==='all'? 'default':'outline'} size="sm" onClick={()=> setTableFilter('all')}>All Items</Button>
            <Button variant={tableFilter==='low'? 'default':'outline'} size="sm" onClick={()=> setTableFilter('low')}>Low Stock</Button>
            <Button variant={tableFilter==='expiring'? 'default':'outline'} size="sm" onClick={()=> setTableFilter('expiring')}>Expiring Soon</Button>
            <Button variant={tableFilter==='out'? 'default':'outline'} size="sm" onClick={()=> setTableFilter('out')}>Out of Stock</Button>
          </div>
          <InventoryTable 
            rows={filteredInventory as any}
            filter={tableFilter}
            onEdit={(row)=> { const item = inventory.find(i=> i._id === row._id); if (item) { setEditingItem(item); setIsEditing(true);} }}
            onDelete={(row)=> handleDeleteItem(row._id)}
            onUpdateStock={(row)=> { const item = inventory.find(i=> i._id === row._id); if (item) setUpdateStockFor(item); }}
            onAdjustUnits={(row)=> { const item = inventory.find(i=> i._id === row._id); if (item) setAdjustUnitsFor(item); }}
          />
        </CardContent>
      </Card>

      {/* Update Stock Dialog */}
      <Dialog open={!!updateStockFor} onOpenChange={(o)=> { if (!o) setUpdateStockFor(null); }}>
        {updateStockFor && (
          <UpdateStockDialog 
            itemId={updateStockFor._id}
            currentUnitsPerPack={undefined}
            onClose={() => setUpdateStockFor(null)}
            onUpdated={loadAll}
          />
        )}
      </Dialog>

      {/* Adjust Loose Items Dialog */}
      <Dialog open={!!adjustUnitsFor} onOpenChange={(o)=> { if (!o) setAdjustUnitsFor(null); }}>
        {adjustUnitsFor && (
          <AdjustLooseItemsDialog 
            itemId={adjustUnitsFor._id}
            currentStock={adjustUnitsFor.currentStock}
            unit={adjustUnitsFor.unit}
            onClose={() => setAdjustUnitsFor(null)}
            onUpdated={loadAll}
          />
        )}
      </Dialog>

      {/* Bulk Import feature removed */}

      {/* Quick Update Stock Dialog: selector inside */}
      <Dialog open={showQuickUpdate} onOpenChange={(o)=> { setShowQuickUpdate(o); if (!o) setQuickItemId(""); }}>
        {showQuickUpdate && (
          <UpdateStockDialog 
            items={inventory.map(i=> ({ _id: i._id, name: i.name }))}
            currentUnitsPerPack={undefined}
            onClose={() => { setShowQuickUpdate(false); setQuickItemId(""); }}
            onUpdated={async ()=> { await loadAll(); setShowQuickUpdate(false); setQuickItemId(""); }}
          />
        )}
      </Dialog>

      {/* Quick Adjust Loose Items Dialog (picker -> AdjustLooseItemsDialog) */}
      <Dialog open={showQuickAdjust} onOpenChange={(o)=> { setShowQuickAdjust(o); if (!o) setQuickAdjustItemId(""); }}>
        {!quickAdjustItemId ? (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select Item to Adjust Units</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Item</Label>
              <select className="border rounded-md p-2 w-full" value={quickAdjustItemId} onChange={e=> setQuickAdjustItemId(e.target.value)}>
                <option value="">-- Select item --</option>
                {inventory.map(it => (
                  <option key={it._id} value={it._id}>{it.name}</option>
                ))}
              </select>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={()=> setShowQuickAdjust(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        ) : (
          (() => {
            const sel = inventory.find(i => i._id === quickAdjustItemId);
            if (!sel) return null;
            return (
              <AdjustLooseItemsDialog 
                itemId={sel._id}
                currentStock={sel.currentStock}
                unit={sel.unit}
                onClose={() => { setShowQuickAdjust(false); setQuickAdjustItemId(""); }}
                onUpdated={async ()=> { await loadAll(); setShowQuickAdjust(false); setQuickAdjustItemId(""); }}
              />
            );
          })()
        )}
      </Dialog>
    </div>
  );
};

export default InventoryManagement;
