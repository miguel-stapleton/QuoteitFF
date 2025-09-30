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

// Resolve base URL safely:
// - undefined => dev fallback to localhost
// - '' (empty string) => Vercel API routes (/api)
const envUrl = (import.meta as any).env?.VITE_API_URL;
const baseUrl = envUrl === undefined ? 'http://localhost:4000' : (envUrl || '/api');

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  
  console.log(`API ${options?.method || 'GET'} ${baseUrl}${path} - Status: ${res.status}`);
  
  if (!res.ok) {
    let errBody: any = null;
    try { errBody = await res.clone().json(); } catch {}
    console.error(`API Error: ${res.status}`, errBody);
    const error: any = new Error(errBody?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.body = errBody;
    throw error;
  }
  
  // Handle empty responses (like 204 No Content)
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as unknown as T;
  }
  
  // Clone response to read it multiple times if needed
  const contentType = res.headers.get('content-type');
  console.log('Content-Type:', contentType);
  
  // Check if response is HTML instead of JSON
  if (contentType?.includes('text/html')) {
    const text = await res.clone().text();
    console.error('API returned HTML instead of JSON:', text.substring(0, 200));
    throw new Error('API returned HTML instead of JSON. This may be a routing issue.');
  }
  
  try { 
    const data = await res.clone().json();
    console.log(`API Response:`, data);
    return data;
  } catch (parseError) {
    console.error('Failed to parse JSON response:', parseError);
    console.error('Response text:', await res.clone().text());
    throw new Error('Invalid JSON response from server');
  }
}

export const QuotesAPI = {
  list: (): Promise<QuoteListItem[]> => http('/quotes'),
  get: (id: string): Promise<any> => http(`/quotes/${id}`),
  create: (payload: QuotePayload): Promise<any> => http('/quotes', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<QuotePayload>): Promise<any> => http(`/quotes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: string): Promise<void> => http(`/quotes/${id}`, { method: 'DELETE' }),
};
