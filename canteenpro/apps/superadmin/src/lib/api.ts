const BASE =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:4000/api";
const TOKEN_KEY = "cp_admin_token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {}
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: any,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;
const qs = (q?: Query) => {
  if (!q) return "";
  const p = new URLSearchParams();
  Object.entries(q).forEach(
    ([k, v]) =>
      v !== undefined && v !== null && v !== "" && p.set(k, String(v)),
  );
  const s = p.toString();
  return s ? `?${s}` : "";
};

let onUnauthorized: () => void = () => {};
let onPaymentRequired: () => void = () => {};
export const setApiHandlers = (h: {
  unauthorized: () => void;
  paymentRequired: () => void;
}) => {
  onUnauthorized = h.unauthorized;
  onPaymentRequired = h.paymentRequired;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  query?: Query,
): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(BASE + path + qs(query), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    if (res.status === 402) onPaymentRequired();
    let msg = data.error || "Request failed";
    if (data.code === "VALIDATION" && data.details?.fieldErrors) {
      const f = Object.entries(
        data.details.fieldErrors as Record<string, string[]>,
      )[0];
      if (f) msg = `${f[0]}: ${f[1][0]}`;
    }
    throw new ApiError(res.status, msg, data.code, data.details);
  }
  return data as T;
}

export const api = {
  get: <T = any>(p: string, q?: Query) => request<T>("GET", p, undefined, q),
  post: <T = any>(p: string, b?: unknown) => request<T>("POST", p, b ?? {}),
  put: <T = any>(p: string, b?: unknown) => request<T>("PUT", p, b ?? {}),
  patch: <T = any>(p: string, b?: unknown) => request<T>("PATCH", p, b ?? {}),
  del: <T = any>(p: string) => request<T>("DELETE", p),
  /** Download a CSV export with auth header */
  download: async (p: string, q: Query, filename: string) => {
    const res = await fetch(BASE + p + qs({ ...q, format: "csv" }), {
      headers: { Authorization: `Bearer ${tokenStore.get()}` },
    });
    if (!res.ok) throw new ApiError(res.status, "Export failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
