import { api } from "@/lib/api";

export type LabLedgerEntryType = "income" | "expense";

export type LabLedgerSource = "PO" | "Expense" | "Manual";

export interface LabLedgerEntry {
  id: string; // mapped from backend _id
  type: LabLedgerEntryType;
  source: LabLedgerSource;
  category: string;
  description: string;
  amount: number;
  date: string; // ISO string
  reference?: string;
}

function mapFromBackend(doc: any): LabLedgerEntry {
  return {
    id: String(doc._id),
    type: doc.type === "expense" ? "expense" : "income",
    source: (doc.source as LabLedgerSource) || "Manual",
    category: doc.category || "",
    description: doc.description || "",
    amount: Number(doc.amount) || 0,
    date: doc.date ? new Date(doc.date).toISOString() : new Date().toISOString(),
    reference: doc.reference || undefined,
  };
}

export async function getAllLedgerEntries(): Promise<LabLedgerEntry[]> {
  const res = await api.get("/lab/finance");
  const arr = Array.isArray(res.data) ? res.data : [];
  return arr.map(mapFromBackend);
}

export async function addLedgerEntry(entry: Omit<LabLedgerEntry, "id">): Promise<LabLedgerEntry> {
  const payload = {
    type: entry.type,
    source: entry.source,
    category: entry.category,
    description: entry.description,
    amount: entry.amount,
    date: entry.date,
    reference: entry.reference,
  };
  const res = await api.post("/lab/finance", payload);
  return mapFromBackend(res.data);
}

export async function getExpenseEntries(): Promise<LabLedgerEntry[]> {
  const all = await getAllLedgerEntries();
  return all.filter((e) => e.type === "expense");
}

export async function getIncomeEntries(): Promise<LabLedgerEntry[]> {
  const all = await getAllLedgerEntries();
  return all.filter((e) => e.type === "income");
}
