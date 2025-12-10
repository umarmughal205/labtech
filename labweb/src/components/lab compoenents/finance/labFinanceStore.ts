export type LabLedgerEntryType = "income" | "expense";

export type LabLedgerSource = "PO" | "Expense" | "Manual";

export interface LabLedgerEntry {
  id: string;
  type: LabLedgerEntryType;
  source: LabLedgerSource;
  category: string;
  description: string;
  amount: number;
  date: string; // ISO string
  reference?: string;
}

const STORAGE_KEY = "lab_finance_ledger_v1";

function loadAll(): LabLedgerEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as LabLedgerEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

function saveAll(entries: LabLedgerEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function getAllLedgerEntries(): LabLedgerEntry[] {
  return loadAll();
}

export function getExpenseEntries(): LabLedgerEntry[] {
  return loadAll().filter((e) => e.type === "expense");
}

export function getIncomeEntries(): LabLedgerEntry[] {
  return loadAll().filter((e) => e.type === "income");
}

export function addLedgerEntry(entry: Omit<LabLedgerEntry, "id">): LabLedgerEntry {
  const all = loadAll();
  const created: LabLedgerEntry = {
    ...entry,
    id: entry.reference || `LED-${Date.now()}`,
  };
  all.unshift(created);
  saveAll(all);
  return created;
}
