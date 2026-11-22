export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export class AdminApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListResult<T> {
  data: T[];
  pagination: Pagination;
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new AdminApiError(
      res.status,
      body.error ?? { code: 'UNKNOWN', message: 'Something went wrong.' },
    );
  }

  return body as T;
}

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  async list<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ): Promise<ListResult<T>> {
    const res = await fetch(`${endpoint}${buildQuery(params)}`);
    return handle<ListResult<T>>(res);
  },

  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(endpoint);
    const body = await handle<{ data: T }>(res);
    return body.data;
  },

  async post<T>(endpoint: string, payload: unknown): Promise<T> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await handle<{ data: T }>(res);
    return body.data;
  },

  async patch<T>(endpoint: string, payload: unknown): Promise<T> {
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await handle<{ data: T }>(res);
    return body.data;
  },

  async put<T>(endpoint: string, payload: unknown): Promise<T> {
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await handle<{ data: T }>(res);
    return body.data;
  },

  async delete(endpoint: string): Promise<void> {
    const res = await fetch(endpoint, { method: 'DELETE' });
    await handle<void>(res);
  },

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const res = await fetch(endpoint, { method: 'POST', body: formData });
    const body = await handle<{ data: T }>(res);
    return body.data;
  },
};
