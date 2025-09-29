export interface QuoteListItem {
  _id: string;
  title: string;
  updatedAt: string;
}

export interface QuotePayload {
  title: string;
  appState: any;
  version?: string;
}

const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let errBody: any = null;
    try { errBody = await res.json(); } catch {}
    const error: any = new Error(errBody?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.body = errBody;
    throw error;
  }
  try { return await res.json(); } catch { return undefined as unknown as T; }
}

export const QuotesAPI = {
  list: (): Promise<QuoteListItem[]> => http('/quotes'),
  get: (id: string): Promise<any> => http(`/quotes/${id}`),
  create: (payload: QuotePayload): Promise<any> => http('/quotes', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<QuotePayload>): Promise<any> => http(`/quotes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: string): Promise<void> => http(`/quotes/${id}`, { method: 'DELETE' }),
};
