import { api } from '@/lib/api';

export interface SupplierPayload {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  products?: string[] | string;
  contractStartDate?: string; // ISO date
  contractEndDate?: string; // ISO date
  status?: 'Active' | 'Expiring' | 'Cancelled' | 'Inactive';
  notes?: string;
}

export interface SupplierDto {
  _id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  products: string[];
  contractStartDate?: string;
  contractEndDate?: string;
  status: 'Active' | 'Expiring' | 'Cancelled' | 'Inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function listSuppliers(params: { q?: string; status?: string; page?: number; limit?: number }) {
  const res = await api.get('/api/lab/suppliers', { params });
  return res.data as { success: boolean; rows: SupplierDto[]; total: number; pageSize: number };
}

export async function getSupplier(id: string) {
  const res = await api.get(`/api/lab/suppliers/${id}`);
  return res.data as { success: boolean; supplier: SupplierDto };
}

export async function createSupplier(payload: SupplierPayload) {
  const res = await api.post('/api/lab/suppliers', payload);
  return res.data as { success: boolean; supplier: SupplierDto };
}

export async function updateSupplier(id: string, payload: SupplierPayload) {
  const res = await api.put(`/api/lab/suppliers/${id}`, payload);
  return res.data as { success: boolean; supplier: SupplierDto };
}

export async function deleteSupplier(id: string) {
  const res = await api.delete(`/api/lab/suppliers/${id}`);
  return res.data as { success: boolean };
}
