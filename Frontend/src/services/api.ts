/**
 * Thin fetch wrapper around the backend API.
 *
 * Every service module imports `api` and calls `api.get(…)`, `api.post(…)` etc.
 * The base URL comes from the VITE_API_BASE_URL env variable.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number>,
): Promise<T> {
  let url = `${BASE_URL}${path}`;

  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const qsStr = qs.toString();
    if (qsStr) url += `?${qsStr}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = json.detail ?? JSON.stringify(json);
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

const api = {
  get: <T>(path: string, params?: Record<string, string | number>) =>
    request<T>("GET", path, undefined, params),

  post: <T>(path: string, body?: unknown) =>
    request<T>("POST", path, body),

  put: <T>(path: string, body?: unknown) =>
    request<T>("PUT", path, body),

  delete: <T>(path: string) =>
    request<T>("DELETE", path),

  patch: <T>(path: string, body?: unknown) =>
    request<T>("PATCH", path, body),
};

export default api;
