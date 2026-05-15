// Central API service — all calls go through Vite proxy at /api
export const API_BASE = '/api';

const getToken = () => localStorage.getItem('auth_token') ?? '';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const apiLogin = (email: string, password: string) =>
  request<{ access_token: string; token_type: string; user: { email: string; role: string; firstname: string; lastname: string } }>(
    '/auth/login',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }
  );

export const apiRegister = (data: { firstname: string; lastname: string; email: string; password: string; role: string }) =>
  request<{ message: string; id: string }>(
    '/auth/register',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
  );

export const apiMe = () =>
  request<Record<string, unknown>>('/auth/me', { headers: authHeaders() });

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const apiGetSuppliers = () =>
  request<any[]>('/suppliers', { headers: authHeaders() });

export const apiGetSupplier = (id: string) =>
  request<any>(`/suppliers/${id}`, { headers: authHeaders() });

export const apiCreateSupplier = (data: any) =>
  request<any>('/suppliers', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });

export const apiUpdateSupplier = (id: string, data: any) =>
  request<any>(`/suppliers/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });

export const apiDeleteSupplier = (id: string) =>
  request<{ message: string }>(`/suppliers/${id}`, { method: 'DELETE', headers: authHeaders() });

// ─── Items (МтаК) ─────────────────────────────────────────────────────────────
export const apiGetItems = (params?: { status?: string; category?: string }) => {
  const q = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : '';
  return request<any[]>(`/items${q}`, { headers: authHeaders() });
};

export const apiGetItem = (id: string) =>
  request<any>(`/items/${id}`, { headers: authHeaders() });

export const apiCreateItem = (data: any) =>
  request<any>('/items', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });

export const apiUpdateItem = (id: string, data: any) =>
  request<any>(`/items/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });

export const apiDeleteItem = (id: string) =>
  request<{ message: string }>(`/items/${id}`, { method: 'DELETE', headers: authHeaders() });

// ─── Documents ────────────────────────────────────────────────────────────────
export const apiGetDocuments = (params?: { status?: string; type?: string }) => {
  const q = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : '';
  return request<any[]>(`/documents${q}`, { headers: authHeaders() });
};

export const apiCreateDocument = (data: any) =>
  request<any>('/documents', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });

export const apiApproveDocument = (id: string) =>
  request<any>(`/documents/${id}/approve`, { method: 'PATCH', headers: authHeaders() });

export const apiRejectDocument = (id: string) =>
  request<any>(`/documents/${id}/reject`, { method: 'PATCH', headers: authHeaders() });

export const apiDeleteDocument = (id: string) =>
  request<{ message: string }>(`/documents/${id}`, { method: 'DELETE', headers: authHeaders() });

export const apiUpdateDocument = (id: string, data: any) =>
  request<any>(`/documents/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });

// ─── Transactions ─────────────────────────────────────────────────────────────
export const apiGetTransactions = (params?: { type?: string }) => {
  const q = params?.type ? `?type=${params.type}` : '';
  return request<any[]>(`/transactions${q}`, { headers: authHeaders() });
};

export const apiCreateTransaction = (data: any) =>
  request<any>('/transactions', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });

// ─── Procurement Orders ───────────────────────────────────────────────────────
export const apiGetProcurement = () =>
  request<any[]>('/procurement', { headers: authHeaders() });

export const apiCreateProcurement = (data: any) =>
  request<any>('/procurement', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });

export const apiUpdateProcurementStatus = (id: string, status: string) =>
  request<any>(`/procurement/${id}/status?status=${status}`, { method: 'PATCH', headers: authHeaders() });

export const apiDeleteProcurement = (id: string) =>
  request<{ message: string }>(`/procurement/${id}`, { method: 'DELETE', headers: authHeaders() });

// ─── Detail Requests (DiplomDB bridge) ───────────────────────────────────────
export type DetailRequest = {
  _id: string;
  order_id: string | null;
  specialist_id: string | null;
  detail_needs: string;
  explanation: string;
  photos: string[];
  status: 'CREATED' | 'APPROVED' | 'REJECTED';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

export const apiGetDetailRequests = () =>
  request<DetailRequest[]>('/detail-requests', { headers: authHeaders() });

export const apiApproveDetailRequest = (id: string, approved_by: string) =>
  request<DetailRequest>(`/detail-requests/${id}/approve`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ approved_by }),
  });

export const apiRejectDetailRequest = (id: string, approved_by: string) =>
  request<DetailRequest>(`/detail-requests/${id}/reject`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ approved_by }),
  });

// ─── Stats ────────────────────────────────────────────────────────────────────
export const apiGetStats = () =>
  request<{
    total_items: number;
    available: number;
    issued: number;
    written_off: number;
    damaged: number;
    total_suppliers: number;
    pending_approvals: number;
    total_stock_value: number;
  }>('/stats', { headers: authHeaders() });
