import { config } from "@/lib/config";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  const url = new URL(`${config.apiUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      // Authorization header is injected by auth.service via token storage.
      ...(typeof window !== "undefined" && localStorage.getItem("access_token")
        ? { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
        : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
};
