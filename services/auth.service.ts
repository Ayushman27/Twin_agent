import { config } from "@/lib/config";
import { apiClient } from "@/services/api-client";
import type { User } from "@/types";

interface LoginPayload {
  email: string;
  password: string;
  organization?: string;
  rememberMe?: boolean;
}

/**
 * Auth abstraction. In mock mode, simulates a login; in real mode,
 * talks to the FastAPI /auth endpoints (OIDC/Keycloak-ready).
 * No component should call fetch() directly for auth.
 */
export const authService = {
  async login(payload: LoginPayload): Promise<User> {
    if (config.useMocks) {
      const user: User = {
        id: "emp_3", name: "Priya Shah", email: payload.email,
        role: "MANAGER", organizationId: "org_1",
      };
      localStorage.setItem("access_token", "mock_token");
      localStorage.setItem("current_user", JSON.stringify(user));
      return user;
    }
    const res = await apiClient.post<{ user: User; access_token: string }>("/auth/login", payload);
    localStorage.setItem("access_token", res.access_token);
    return res.user;
  },

  async loginWithSSO(): Promise<void> {
    // OIDC/Keycloak redirect placeholder.
    window.location.href = `${config.apiUrl}/auth/sso/redirect`;
  },

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("current_user");
    window.location.href = "/login";
  },

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("current_user");
    return raw ? (JSON.parse(raw) as User) : null;
  },

  isAuthenticated(): boolean {
    return typeof window !== "undefined" && !!localStorage.getItem("access_token");
  },
};
