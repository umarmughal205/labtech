import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Download, FileDown, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  getAllPurchaseOrders,
  getPurchaseOrdersBySupplier,
  updatePurchaseOrderStatus,
  PurchaseOrderRecord,
  PurchaseOrderItem,
} from "@/components/lab compoenents/suppliers/purchaseOrdersStore";
import { useToast } from "@/hooks/use-toast";
import { addLedgerEntry } from "@/components/lab compoenents/finance/labFinanceStore";
import { api } from "@/lib/api";

const getStatusBadgeClasses = (status: PurchaseOrderRecord["status"]) => {
  switch (status) {
    case "Delivered":
      return "bg-emerald-500 text-white border-transparent";
    case "Pending":
      return "bg-amber-400 text-white border-transparent";
    case "Cancelled":
    default:
      return "bg-red-500 text-white border-transparent";
  }
};

interface PurchaseHistoryProps {
  supplierId?: string;
  supplierName?: string;
}

const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({ supplierId, supplierName }) => {
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { toast } = useToast();

  // Load from shared purchase order store (optionally filtered by supplier)
  useEffect(() => {
    (async () => {
      const loaded = supplierId
        ? await getPurchaseOrdersBySupplier(supplierId)
        : await getAllPurchaseOrders();
      setOrders(loaded);
      setPage(1);
    })();
  }, [supplierId]);

  // Local helper types for inventory sync
  interface InventoryCategory {
    _id: string;
    name: string;
  }

  interface InventoryItem {
    _id: string;
    name: string;
    category: InventoryCategory;
    currentStock: number;
    minThreshold: number;
    maxCapacity: number;
    unit: string;
    costPerUnit: number;
    supplier: string;
    location: string;
    expiryDate?: string | Date;
    lastRestocked?: string | Date;
  }

  const syncOrderToInventory = async (order: PurchaseOrderRecord) => {
    try {
      const res = await api.get("/lab/inventory");
      const existing = Array.isArray(res.data) ? (res.data as InventoryItem[]) : [];

      let updatedCount = 0;
      let createdCount = 0;

      const defaultCategory: InventoryCategory = {
        _id: "uncategorized",
        name: "Uncategorized",
      };

      for (let idx = 0; idx < order.items.length; idx++) {
        const poItem = order.items[idx];
        const rawName = poItem.description?.trim();
        const name = rawName.toLowerCase();
        if (!name) continue;

        const match = existing.find((inv) => inv.name.trim().toLowerCase() === name);

        if (match) {
          const newStock = (match.currentStock || 0) + (poItem.quantity || 0);
          await api.put(`/lab/inventory/${match._id}`, {
            currentStock: newStock,
            lastRestocked: new Date().toISOString(),
          });
          updatedCount += 1;
        } else {
          const payload = {
            name: rawName || `PO Item ${idx + 1}`,
            category: defaultCategory,
            currentStock: poItem.quantity || 0,
            minThreshold: 0,
            maxCapacity: (poItem.quantity || 0) * 5 || 100,
            unit: "units",
            costPerUnit: poItem.unitPrice || 0,
            supplier: order.supplierName,
            location: "Main Store",
            expiryDate: undefined,
            lastRestocked: new Date().toISOString(),
          };

          await api.post("/lab/inventory", payload);
          createdCount += 1;
        }
      }

      if (updatedCount > 0 || createdCount > 0) {
        const parts: string[] = [];
        if (updatedCount > 0) parts.push(`${updatedCount} existing item${updatedCount > 1 ? "s" : ""} updated`);
        if (createdCount > 0) parts.push(`${createdCount} new item${createdCount > 1 ? "s" : ""} created`);

        toast({
          title: "Inventory Updated",
          description:
            parts.length > 0
              ? parts.join(", ")
              : "Stock levels were adjusted based on this purchase order.",
        });
      } else {
        toast({
          title: "No Matching Inventory Items",
          description: "No inventory items matched the products in this purchase order. Check that item names match.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Failed to sync order to inventory", err?.response || err);
      toast({ title: "Inventory Sync Failed", description: "Could not update inventory from this PO.", variant: "destructive" });
    }
  };

  const metrics = useMemo(() => {
    const totalSpend = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders === 0 ? 0 : totalSpend / totalOrders;
    return { totalSpend, totalOrders, avgOrderValue };
  }, [orders]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;

      // Date range filtering on orderDate (YYYY-MM-DD)
      if (dateFrom) {
        if (o.orderDate < dateFrom) return false;
      }
      if (dateTo) {
        if (o.orderDate > dateTo) return false;
      }

      if (term) {
        const itemNames = o.items.map((it) => it.description).join(", ");
        const haystack = `${o.poId} ${itemNames}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, dateFrom, dateTo]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = filtered.slice(startIndex, endIndex);

  return (
    <div className="p-6 space-y-6 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Purchase History
            {supplierName ? `: ${supplierName}` : ""}
          </h1>
          <p className="text-sm text-gray-600">
            Review and manage all past purchase orders from this supplier.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-full px-4">
            <Download className="h-4 w-4 mr-2" />
            Download Selected
          </Button>
          <Button className="bg-blue-800 hover:bg-blue-700 text-white rounded-full px-4">
            <FileDown className="h-4 w-4 mr-2" />
            Export as CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              Rs {metrics.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{metrics.totalOrders}</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">
              Rs {metrics.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by PO ID or item name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-full bg-gray-50 border border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex flex-1 flex-col md:flex-row gap-2 md:items-center">
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-40">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPage(1);
                      }}
                      className="pl-10 rounded-full bg-gray-50 border border-gray-200 text-sm"
                    />
                  </div>
                  <div className="relative w-full md:w-40">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPage(1);
                      }}
                      className="pl-10 rounded-full bg-gray-50 border border-gray-200 text-sm"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                  <SelectTrigger className="rounded-full bg-gray-50 border border-gray-200 text-sm w-full md:w-40">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
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
                  <TableHead>Order Date</TableHead>
                  <TableHead>PO ID</TableHead>
                  <TableHead>Items Purchased</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((o) => {
                  const items = Array.isArray(o.items) ? o.items : [] as PurchaseOrderItem[];
                  const firstItem: PurchaseOrderItem | undefined = items[0];
                  const itemNames = items.map((it) => it.description).join(", ");
                  const totalQuantity = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="text-sm text-gray-700">{o.orderDate}</TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">{o.poId}</TableCell>
                      <TableCell className="text-sm text-gray-700">{itemNames || "-"}</TableCell>
                      <TableCell className="text-sm text-gray-700">{totalQuantity}</TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {firstItem
                          ? `Rs ${firstItem.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        Rs {o.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadgeClasses(o.status)}`}
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-gray-400 space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-black hover:text-gray-900"
                          onClick={() => {
                            setSelectedOrder(o);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span>
              Showing {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} orders
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs rounded-full"
                disabled={currentPage === 1}
                onClick={() => currentPage > 1 && setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs rounded-full"
                disabled={currentPage === totalPages || totalItems === 0}
                onClick={() => currentPage < totalPages && setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle>Purchase Order Details</DialogTitle>
                <DialogDescription>
                  View and manage the details of the purchase order.
                </DialogDescription>
              </div>
              {selectedOrder && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <Badge
                    className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadgeClasses(selectedOrder.status)}`}
                  >
                    {selectedOrder.status}
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Purchase Order ID</div>
                  <div className="font-medium text-gray-900 mt-1">{selectedOrder.poId}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Supplier Name</div>
                  <div className="font-medium text-gray-900 mt-1">{selectedOrder.supplierName}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Order Date</div>
                  <div className="font-medium text-gray-900 mt-1">{selectedOrder.orderDate}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Total Amount</div>
                  <div className="font-bold text-gray-900 mt-1">
                    Rs {selectedOrder.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Actions</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-3 py-1 h-7 text-xs"
                    disabled={selectedOrder.status === "Delivered"}
                    onClick={() => {
                      (async () => {
                        try {
                          await updatePurchaseOrderStatus(selectedOrder.id, "Delivered");
                          await syncOrderToInventory(selectedOrder);
                        } catch {}
                      })();
                      setOrders((prev) =>
                        prev.map((o) => (o.id === selectedOrder.id ? { ...o, status: "Delivered" } : o))
                      );
                      setSelectedOrder((prev) => (prev ? { ...prev, status: "Delivered" } : prev));

                      // Record expense in finance ledger for this PO
                      try {
                        addLedgerEntry({
                          type: "expense",
                          source: "PO",
                          category: "Supplies",
                          description: `PO ${selectedOrder.poId} - ${selectedOrder.supplierName}`,
                          amount: selectedOrder.totalAmount,
                          date: new Date().toISOString(),
                          reference: selectedOrder.poId,
                        });
                      } catch {
                        // ignore finance ledger errors in mock mode
                      }
                    }}
                  >
                    Mark as Delivered
                  </Button>
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full px-3 py-1 h-7 text-xs"
                    disabled={selectedOrder.status === "Cancelled"}
                    onClick={() => {
                      (async () => {
                        try {
                          await updatePurchaseOrderStatus(selectedOrder.id, "Cancelled");
                        } catch {}
                      })();
                      setOrders((prev) =>
                        prev.map((o) => (o.id === selectedOrder.id ? { ...o, status: "Cancelled" } : o))
                      );
                      setSelectedOrder((prev) => (prev ? { ...prev, status: "Cancelled" } : prev));
                    }}
                  >
                    Cancel Order
                  </Button>
                  <Button variant="outline" className="rounded-full px-3 py-1 h-7 text-xs">
                    Print/Download PO
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-800">Order Items</div>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Item ID</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item, idx) => {
                        const lineTotal = item.quantity * item.unitPrice;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="text-sm text-gray-700">{idx + 1}</TableCell>
                            <TableCell className="text-sm text-gray-700">{item.description}</TableCell>
                            <TableCell className="text-sm text-gray-700">{item.quantity}</TableCell>
                            <TableCell className="text-sm text-gray-700">
                              Rs {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-gray-900">
                              Rs {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseHistory;
