export type PurchaseOrderStatus = "Pending" | "Delivered" | "Cancelled";

export interface PurchaseOrderItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderRecord {
  id: string;
  poId: string;
  supplierId: string;
  supplierName: string;
  orderDate: string; // YYYY-MM-DD
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  notes?: string;
}

const STORAGE_KEY = "lab_purchase_orders_v1";

function normalizeOrders(raw: any): PurchaseOrderRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o: any, idx: number) => {
    const safeItems: PurchaseOrderItem[] = Array.isArray(o?.items)
      ? (o.items as any[]).map((it: any) => ({
          description: String(it?.description ?? "").trim(),
          quantity: Number(it?.quantity ?? 0) || 0,
          unitPrice: Number(it?.unitPrice ?? 0) || 0,
        }))
      : [];

    const id = String(o?.id ?? `PO_${Date.now()}_${idx + 1}`);
    const poId = String(o?.poId ?? "");
    const supplierId = String(o?.supplierId ?? "");
    const supplierName = String(o?.supplierName ?? "");
    const orderDate = String(o?.orderDate ?? new Date().toISOString().slice(0, 10));
    const status: PurchaseOrderStatus = ((): PurchaseOrderStatus => {
      const s = String(o?.status || "Pending");
      return s === "Delivered" || s === "Cancelled" ? (s as PurchaseOrderStatus) : "Pending";
    })();
    const totalAmount = typeof o?.totalAmount === "number"
      ? o.totalAmount
      : safeItems.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0), 0);

    return {
      id,
      poId,
      supplierId,
      supplierName,
      orderDate,
      items: safeItems,
      totalAmount,
      status,
      notes: typeof o?.notes === "string" ? o.notes : undefined,
    } as PurchaseOrderRecord;
  });
}

function loadAll(): PurchaseOrderRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any;
    return normalizeOrders(parsed);
  } catch {
    return [];
  }
}

function saveAll(orders: PurchaseOrderRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // ignore storage errors for now
  }
}

function generatePoId(existingCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(3, "0");
  return `PO-${year}-${seq}`;
}

export function getAllPurchaseOrders(): PurchaseOrderRecord[] {
  return loadAll();
}

export function getPurchaseOrdersBySupplier(supplierId: string): PurchaseOrderRecord[] {
  return loadAll().filter((o) => o.supplierId === supplierId);
}

interface CreatePurchaseOrderInput {
  supplierId: string;
  supplierName: string;
  orderDate?: string; // defaults to today
  items: PurchaseOrderItem[];
  status?: PurchaseOrderStatus;
  notes?: string;
}

export function createPurchaseOrder(input: CreatePurchaseOrderInput): PurchaseOrderRecord {
  const all = loadAll();
  const id = `PO_${Date.now()}_${all.length + 1}`;
  const poId = generatePoId(all.length);
  const orderDate = input.orderDate || new Date().toISOString().slice(0, 10);
  const totalAmount = input.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const record: PurchaseOrderRecord = {
    id,
    poId,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    orderDate,
    items: input.items,
    totalAmount,
    status: input.status || "Pending",
    notes: input.notes,
  };

  const next = [...all, record];
  saveAll(next);
  return record;
}

export function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
  const all = loadAll();
  const next = all.map((o) => (o.id === id ? { ...o, status } : o));
  saveAll(next);
}
