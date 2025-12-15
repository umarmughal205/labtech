import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Filter, Plus, Eye, Edit2, MoreHorizontal, XCircle, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface SupplierRecord {
  id: string;
  name: string;
  contactPerson: string;
  contactInfo: string;
  products: string[];
  contractEndDate: string; // YYYY-MM-DD
  status: "Active" | "Expiring" | "Inactive" | "Cancelled";
  email?: string;
  phone?: string;
  address?: string;
  contractStartDate?: string;
}

const MOCK_SUPPLIERS: SupplierRecord[] = [];
const SUPPLIERS_STORAGE_KEY = "lab_suppliers_v1";
// Computes automatic status from dates only (does NOT handle "Cancelled")
const computeStatus = (
  contractEndDate: string,
  contractStartDate?: string
): SupplierRecord["status"] => {
  if (!contractEndDate) return "Inactive";

  const today = new Date();
  const [ey, em, ed] = contractEndDate.split("-").map((v) => parseInt(v, 10));
  if (!ey || !em || !ed) return "Inactive";
  const end = new Date(ey, em - 1, ed);

  // Days remaining until contract end
  const remainingMs = end.getTime() - today.getTime();
  const remainingDays = remainingMs / (1000 * 60 * 60 * 24);

  // Determine total contract length in days if we have a valid start date
  let totalDays: number | null = null;
  if (contractStartDate) {
    const [sy, sm, sd] = contractStartDate.split("-").map((v) => parseInt(v, 10));
    if (sy && sm && sd) {
      const start = new Date(sy, sm - 1, sd);
      const totalMs = end.getTime() - start.getTime();
      totalDays = totalMs / (1000 * 60 * 60 * 24);
    }
  }

  // If contract is less than 1 year, use a 7-day expiring window.
  // If contract is 1 year or more (or start date unknown), use a 30-day window.
  const expiringWindowDays = totalDays !== null && totalDays < 365 ? 7 : 30;

  if (remainingDays < 0) return "Inactive"; // already ended
  if (remainingDays <= expiringWindowDays) return "Expiring";
  return "Active";
};

const getStatusBadgeClasses = (status: SupplierRecord["status"]) => {
  switch (status) {
    case "Active":
      return "bg-emerald-500 text-white border-transparent";
    case "Expiring":
      return "bg-amber-400 text-white border-transparent";
    case "Cancelled":
      return "bg-red-500 text-white border-transparent";
    case "Inactive":
    default:
      return "bg-slate-400 text-white border-transparent";
  }
};

const SuppliersPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRecord | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewing, setViewing] = useState<SupplierRecord | null>(null);

  const { toast } = useToast();

  const [addForm, setAddForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    products: "",
    contractStartDate: "",
    contractEndDate: "",
  });

  // Load suppliers from backend on first mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(
          "/lab/suppliers",
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : [];
        const mapped: SupplierRecord[] = data.map((s: any) => ({
          id: String(s._id),
          name: s.name || "",
          contactPerson: s.contactPerson || "",
          contactInfo: s.contactInfo || s.email || "",
          products: Array.isArray(s.products) ? s.products : [],
          contractEndDate: s.contractEndDate || "",
          status: (s.status as SupplierRecord["status"]) || "Active",
          email: s.email || "",
          phone: s.phone || "",
          address: s.address || "",
          contractStartDate: s.contractStartDate || "",
        }));
        setSuppliers(mapped);
      } catch (err) {
        console.error("Failed to load suppliers from backend", err as any);
        setSuppliers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [editForm, setEditForm] = useState({
    name: "",
    contactPerson: "",
    contactInfo: "",
    products: "",
    contractEndDate: "",
  });

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return suppliers.filter((s) => {
      const effectiveStatus =
        s.status === "Cancelled"
          ? "Cancelled"
          : computeStatus(s.contractEndDate, s.contractStartDate);

      if (statusFilter !== "all" && statusFilter !== effectiveStatus) return false;
      if (term) {
        const haystack = `${s.name} ${s.contactPerson} ${s.contactInfo}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [suppliers, search, statusFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = filtered.slice(startIndex, endIndex);

  const resetAddForm = () => {
    setAddForm({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      products: "",
      contractStartDate: "",
      contractEndDate: "",
    });
  };

  const handleAddSupplier = async () => {
    if (!addForm.name || !addForm.contactPerson || !addForm.email) return;

    const products = addForm.products
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean);

    const status = computeStatus(addForm.contractEndDate, addForm.contractStartDate);

    const payload = {
      name: addForm.name,
      contactPerson: addForm.contactPerson,
      contactInfo: addForm.email,
      email: addForm.email,
      phone: addForm.phone,
      address: addForm.address,
      products,
      contractStartDate: addForm.contractStartDate || undefined,
      contractEndDate: addForm.contractEndDate || undefined,
      status,
    };

    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        "/lab/suppliers",
        payload,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      const s: any = res.data || {};
      const created: SupplierRecord = {
        id: String(s._id || `S${Date.now()}`),
        name: s.name || addForm.name,
        contactPerson: s.contactPerson || addForm.contactPerson,
        contactInfo: s.contactInfo || s.email || addForm.email,
        products: Array.isArray(s.products) ? s.products : products,
        contractEndDate: s.contractEndDate || addForm.contractEndDate,
        status: (s.status as SupplierRecord["status"]) || status,
        email: s.email || addForm.email,
        phone: s.phone || addForm.phone,
        address: s.address || addForm.address,
        contractStartDate: s.contractStartDate || addForm.contractStartDate,
      };
      setSuppliers((prev) => [...prev, created]);
      setIsAddOpen(false);
      resetAddForm();
      toast({ title: "Supplier added", description: `${created.name} has been saved.` });
    } catch (err: any) {
      console.error("Failed to create supplier", err?.response || err);
      toast({ title: "Error", description: "Failed to save supplier", variant: "destructive" });
    }
  };

  const openEdit = (supplier: SupplierRecord) => {
    setEditing(supplier);
    setEditForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      contactInfo: supplier.contactInfo,
      products: supplier.products.join(", "),
      contractEndDate: supplier.contractEndDate,
    });
    setIsEditOpen(true);
  };

  const openView = (supplier: SupplierRecord) => {
    setViewing(supplier);
    setIsViewOpen(true);
  };

  const handleUpdateSupplier = async () => {
    if (!editing) return;
    if (!editForm.name || !editForm.contactPerson) return;

    const products = editForm.products
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const status =
      editing.status === "Cancelled"
        ? "Cancelled"
        : computeStatus(editForm.contractEndDate, editing.contractStartDate);

    const payload = {
      name: editForm.name,
      contactPerson: editForm.contactPerson,
      contactInfo: editForm.contactInfo,
      products,
      contractStartDate: editing.contractStartDate,
      contractEndDate: editForm.contractEndDate,
      status,
      email: editing.email,
      phone: editing.phone,
      address: editing.address,
    };

    try {
      const token = localStorage.getItem("token");
      const res = await api.put(
        `/lab/suppliers/${editing.id}`,
        payload,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      const s: any = res.data || {};
      const updated: SupplierRecord = {
        id: String(s._id || editing.id),
        name: s.name || editForm.name,
        contactPerson: s.contactPerson || editForm.contactPerson,
        contactInfo: s.contactInfo || s.email || editForm.contactInfo,
        products: Array.isArray(s.products) ? s.products : products,
        contractEndDate: s.contractEndDate || editForm.contractEndDate,
        status: (s.status as SupplierRecord["status"]) || status,
        email: s.email || editing.email,
        phone: s.phone || editing.phone,
        address: s.address || editing.address,
        contractStartDate: s.contractStartDate || editing.contractStartDate,
      };
      setSuppliers((prev) => prev.map((sup) => (sup.id === editing.id ? updated : sup)));
      setIsEditOpen(false);
      setEditing(null);
      toast({ title: "Supplier updated", description: `${updated.name} has been updated.` });
    } catch (err: any) {
      console.error("Failed to update supplier", err?.response || err);
      toast({ title: "Error", description: "Failed to update supplier", variant: "destructive" });
    }
  };

  const handleCancelContract = (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this supplier's contract?"
    );
    if (!confirmed) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              contractEndDate: todayStr,
              status: "Cancelled" as SupplierRecord["status"],
            }
          : s
      )
    );

    (async () => {
      try {
        const token = localStorage.getItem("token");
        await api.put(
          `/lab/suppliers/${id}`,
          {
            contractEndDate: todayStr,
            status: "Cancelled",
          },
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );
      } catch (err) {
        console.error("Failed to cancel supplier contract in backend", err as any);
      }
    })();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-sm text-gray-600">
            Maintain your preferred vendors and keep contract details up to date.
          </p>
        </div>
        <Button
          className="bg-blue-800 hover:bg-blue-700 text-white rounded-full px-6 shadow-sm"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Supplier
        </Button>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or contact"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-full bg-gray-50 border border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-64">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-full bg-gray-50 border border-gray-200 text-sm">
                    <Filter className="mr-2 h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expiring">Expiring</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
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
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead>Products Supplied</TableHead>
                  <TableHead>Contract End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((s) => {
                  const effectiveStatus =
                    s.status === "Cancelled"
                      ? "Cancelled"
                      : computeStatus(s.contractEndDate, s.contractStartDate);
                  return (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm text-gray-900 font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-gray-700">{s.contactPerson}</TableCell>
                    <TableCell className="text-sm text-gray-700">{s.contactInfo}</TableCell>
                    <TableCell className="text-sm text-gray-700">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs rounded-full"
                          >
                            View products ({s.products.length})
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="max-w-xs">
                          {s.products.length === 0 ? (
                            <DropdownMenuItem className="text-xs text-gray-500">
                              No products listed
                            </DropdownMenuItem>
                          ) : (
                            s.products.map((p) => (
                              <DropdownMenuItem key={p} className="text-xs text-gray-700">
                                {p}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">{s.contractEndDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadgeClasses(
                            effectiveStatus
                          )}`}
                        >
                          {effectiveStatus}
                        </Badge>
                        {effectiveStatus !== "Cancelled" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
                                title="More status actions"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40">
                              <DropdownMenuItem
                                className="flex items-center gap-2 text-xs text-red-600"
                                onClick={() => handleCancelContract(s.id)}
                              >
                                Cancel contract
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-700 hover:text-gray-900"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="flex items-center gap-2 text-xs"
                            onClick={() => openView(s)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2 text-xs"
                            onClick={() => openEdit(s)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit supplier</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span>
              Showing {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} entries
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>Fill in the supplier details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Supplier Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Supplier Name *</label>
                  <Input
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. MedSupply Inc."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Contact Person</label>
                  <Input
                    value={addForm.contactPerson}
                    onChange={(e) => setAddForm({ ...addForm, contactPerson: e.target.value })}
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Email Address *</label>
                  <Input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="contact@medsupply.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Phone Number</label>
                  <Input
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Location</h3>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Physical Address</label>
                <Input
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  placeholder="123 Lab Way, Suite 456, Science City, ST 78901"
                  className="h-20"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Business Details</h3>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Products/Services Supplied</label>
                <Input
                  value={addForm.products}
                  onChange={(e) => setAddForm({ ...addForm, products: e.target.value })}
                  placeholder={"Reagents, Lab Glassware, Calibration Services, Medical Equipment"}
                  className="h-24"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Contract Start Date (Optional)</label>
                  <Input
                    type="date"
                    value={addForm.contractStartDate}
                    onChange={(e) =>
                      setAddForm({ ...addForm, contractStartDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Contract End Date</label>
                  <Input
                    type="date"
                    value={addForm.contractEndDate}
                    onChange={(e) =>
                      setAddForm({ ...addForm, contractEndDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSupplier}>Save Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>Update the supplier details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Name</label>
              <Input
                className="col-span-3"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Contact Person</label>
              <Input
                className="col-span-3"
                value={editForm.contactPerson}
                onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Contact Info</label>
              <Input
                className="col-span-3"
                value={editForm.contactInfo}
                onChange={(e) => setEditForm({ ...editForm, contactInfo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Products</label>
              <Input
                className="col-span-3"
                value={editForm.products}
                onChange={(e) => setEditForm({ ...editForm, products: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Contract End Date</label>
              <Input
                className="col-span-3"
                type="date"
                value={editForm.contractEndDate}
                onChange={(e) => setEditForm({ ...editForm, contractEndDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSupplier}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
            <DialogDescription>View full information about this supplier.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-2 text-sm text-gray-800">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Supplier</h3>
                <p className="font-medium text-gray-900">{viewing.name}</p>
                {viewing.contactPerson && (
                  <p className="text-gray-700">Contact: {viewing.contactPerson}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Contact Info</h3>
                  {viewing.email && <p>Email: {viewing.email}</p>}
                  {viewing.phone && <p>Phone: {viewing.phone}</p>}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Contract</h3>
                  {viewing.contractStartDate && <p>Start: {viewing.contractStartDate}</p>}
                  <p>End: {viewing.contractEndDate || "-"}</p>
                  <p>
                    Status: {computeStatus(viewing.contractEndDate)}
                  </p>
                </div>
              </div>
              {viewing.address && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Address</h3>
                  <p>{viewing.address}</p>
                </div>
              )}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Products/Services</h3>
                {viewing.products.length === 0 ? (
                  <p className="text-gray-500">No products listed.</p>
                ) : (
                  <ul className="list-disc list-inside space-y-1">
                    {viewing.products.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default SuppliersPage;
