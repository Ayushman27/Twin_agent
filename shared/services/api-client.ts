import { config } from "../lib/config";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const localToken = localStorage.getItem("access_token");
  if (localToken) return localToken;
  // Fallback to cookie
  const match = document.cookie.match(new RegExp("(^| )access_token=([^;]+)"));
  return match && match[2] ? decodeURIComponent(match[2]) : null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  const url = new URL(`${config.apiUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const token = getStoredToken();

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (netErr: any) {
    throw new Error(
      netErr?.message === "Failed to fetch"
        ? `Unable to connect to backend API server at ${config.apiUrl}. Please ensure FastAPI is running on http://localhost:8000.`
        : (netErr?.message || "Network request failed")
    );
  }

  if (!res.ok) {
    let errorMsg = `API error ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData?.error?.message) {
        errorMsg = errorData.error.message;
      } else if (errorData?.message) {
        errorMsg = errorData.message;
      } else if (typeof errorData?.detail === "string") {
        errorMsg = errorData.detail;
      } else if (Array.isArray(errorData?.detail)) {
        errorMsg = errorData.detail.map((d: { msg?: string }) => d.msg || "").join(", ");
      }
    } catch {
      // fallback to statusText
    }
    throw new Error(errorMsg);
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
