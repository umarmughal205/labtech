import { api } from "@/lib/api";

export type PurchaseOrderStatus = "Pending" | "Delivered" | "Cancelled";

export interface PurchaseOrderItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderRecord {
  id: string; // Mongo _id
  poId: string;
  supplierId: string;
  supplierName: string;
  orderDate: string; // YYYY-MM-DD
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  notes?: string;
}

function normalizeOrders(raw: any): PurchaseOrderRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o: any) => {
    const safeItems: PurchaseOrderItem[] = Array.isArray(o?.items)
      ? (o.items as any[]).map((it: any) => ({
          description: String(it?.description ?? "").trim(),
          quantity: Number(it?.quantity ?? 0) || 0,
          unitPrice: Number(it?.unitPrice ?? 0) || 0,
        }))
      : [];

    const id = String(o?._id ?? o?.id ?? "");
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

export async function getAllPurchaseOrders(): Promise<PurchaseOrderRecord[]> {
  try {
    const res = await api.get("/lab/purchase-orders");
    return normalizeOrders(res.data);
  } catch (err) {
    console.error("Failed to load purchase orders", err as any);
    return [];
  }
}

export async function getPurchaseOrdersBySupplier(supplierId: string): Promise<PurchaseOrderRecord[]> {
  try {
    const res = await api.get("/lab/purchase-orders", {
      params: { supplierId },
    });
    return normalizeOrders(res.data);
  } catch (err) {
    console.error("Failed to load purchase orders by supplier", err as any);
    return [];
  }
}

interface CreatePurchaseOrderInput {
  supplierId: string;
  supplierName: string;
  orderDate?: string; // defaults to today
  items: PurchaseOrderItem[];
  status?: PurchaseOrderStatus;
  notes?: string;
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrderRecord> {
  const payload = {
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    orderDate: input.orderDate,
    items: input.items,
    status: input.status,
    notes: input.notes,
  };

  const res = await api.post("/lab/purchase-orders", payload);
  const [record] = normalizeOrders([res.data]);
  return record;
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus): Promise<void> {
  try {
    await api.put(`/lab/purchase-orders/${id}`, { status });
  } catch (err) {
    console.error("Failed to update purchase order status", err as any);
    throw err;
  }
}
