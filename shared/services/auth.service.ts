import { config } from "../lib/config";
import { apiClient } from "./api-client";
import type { User } from "../types";

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface CompanyRegisterPayload {
  company_name: string;
  company_email: string;
  industry: string;
  company_size: string;
  employee_count: number;
  company_phone?: string;
  website?: string;
  country?: string;
  city?: string;
  business_model?: string;
  description?: string;
  primary_contact?: string;
  admin_name: string;
  admin_email: string;
  admin_phone?: string;
  admin_password: string;
  confirm_password?: string;
}

export interface EmployeeRegisterPayload {
  organization_id: string;
  name: string;
  email: string;
  password: string;
  confirm_password?: string;
  employee_id?: string;
  department?: string;
  job_title?: string;
  phone?: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token?: string;
}

function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === "undefined") return;
  const maxAge = days * 86400;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match && match[2] ? decodeURIComponent(match[2]) : null;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    if (config.useMocks) {
      const isEmployee = payload.email.includes("employee");
      const isUnaffiliated = payload.email.includes("unaffiliated");
      const user: User = {
        id: isEmployee ? "emp_1" : "usr_admin_1",
        name: isEmployee ? "Rohan Mehta" : "Asha Verma",
        email: payload.email,
        role: isEmployee ? "EMPLOYEE" : "ORG_ADMIN",
        organization_id: isUnaffiliated ? undefined : "org_1",
        organizationId: isUnaffiliated ? undefined : "org_1",
      };
      const session: AuthSession = {
        user,
        access_token: "mock_jwt_token_" + (isEmployee ? "employee" : "org_admin"),
        refresh_token: "mock_refresh_token",
      };

      if (typeof window !== "undefined") {
        setCookie("access_token", session.access_token, payload.rememberMe ? 30 : 7);
        setCookie("user_role", session.user.role || "EMPLOYEE", payload.rememberMe ? 30 : 7);
        const orgId = session.user.organization_id || session.user.organizationId;
        if (orgId) {
          setCookie("organization_id", orgId, payload.rememberMe ? 30 : 7);
        } else {
          deleteCookie("organization_id");
        }
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("current_user", JSON.stringify(session.user));
      }
      return session;
    }

    const res = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>("/auth/login", {
      email: payload.email,
      password: payload.password,
    });

    const session: AuthSession = {
      user: res.user,
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    };

    if (typeof window !== "undefined") {
      setCookie("access_token", session.access_token, payload.rememberMe ? 30 : 7);
      setCookie("user_role", session.user.role || "EMPLOYEE", payload.rememberMe ? 30 : 7);
      const orgId = session.user.organization_id || session.user.organizationId;
      if (orgId) {
        setCookie("organization_id", orgId, payload.rememberMe ? 30 : 7);
      } else {
        deleteCookie("organization_id");
      }
      localStorage.setItem("access_token", session.access_token);
      if (session.refresh_token) {
        localStorage.setItem("refresh_token", session.refresh_token);
      }
      localStorage.setItem("current_user", JSON.stringify(session.user));
    }

    return session;
  },

  async registerCompany(payload: CompanyRegisterPayload): Promise<AuthSession> {
    if (config.useMocks) {
      const user: User = {
        id: "usr_reg_" + Date.now(),
        name: payload.admin_name,
        email: payload.admin_email,
        role: "ORG_ADMIN",
        organization_id: "org_reg_" + Date.now(),
      };
      const session: AuthSession = {
        user,
        access_token: "mock_jwt_token_admin_registered",
        refresh_token: "mock_refresh_token",
      };
      if (typeof window !== "undefined") {
        setCookie("access_token", session.access_token, 7);
        setCookie("user_role", "ORG_ADMIN", 7);
        if (user.organization_id) {
          setCookie("organization_id", user.organization_id, 7);
        }
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("current_user", JSON.stringify(session.user));
      }
      return session;
    }

    const res = await apiClient.post<{
      success: boolean;
      message: string;
      access_token: string;
      refresh_token: string;
      token_type: string;
      organization: { id: string; company_name: string };
      user: User;
    }>("/onboarding/company/register", payload);

    const session: AuthSession = {
      user: res.user,
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    };

    if (typeof window !== "undefined") {
      setCookie("access_token", session.access_token, 7);
      setCookie("user_role", session.user.role || "ORG_ADMIN", 7);
      const orgId = session.user.organization_id || session.user.organizationId || res.organization?.id;
      if (orgId) {
        setCookie("organization_id", orgId, 7);
      }
      localStorage.setItem("access_token", session.access_token);
      if (session.refresh_token) {
        localStorage.setItem("refresh_token", session.refresh_token);
      }
      localStorage.setItem("current_user", JSON.stringify(session.user));
    }

    return session;
  },

  async registerEmployee(payload: EmployeeRegisterPayload): Promise<AuthSession> {
    if (config.useMocks) {
      const user: User = {
        id: "usr_emp_reg_" + Date.now(),
        name: payload.name,
        email: payload.email,
        role: "EMPLOYEE",
        job_title: payload.job_title || payload.department || "Software Engineer",
        phone: payload.phone,
        organization_id: payload.organization_id,
        organizationId: payload.organization_id,
      };
      const session: AuthSession = {
        user,
        access_token: "mock_jwt_token_employee_registered",
        refresh_token: "mock_refresh_token",
      };
      if (typeof window !== "undefined") {
        setCookie("access_token", session.access_token, 7);
        setCookie("user_role", "EMPLOYEE", 7);
        setCookie("organization_id", payload.organization_id, 7);
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("current_user", JSON.stringify(session.user));
      }
      return session;
    }

    const res = await apiClient.post<{
      success: boolean;
      message: string;
      access_token: string;
      refresh_token: string;
      token_type: string;
      organization: { id: string; company_name: string };
      user: User;
    }>("/onboarding/employee/register", payload);

    const session: AuthSession = {
      user: res.user,
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    };

    if (typeof window !== "undefined") {
      setCookie("access_token", session.access_token, 7);
      setCookie("user_role", "EMPLOYEE", 7);
      const orgId = session.user.organization_id || session.user.organizationId || payload.organization_id;
      if (orgId) {
        setCookie("organization_id", orgId, 7);
      }
      localStorage.setItem("access_token", session.access_token);
      if (session.refresh_token) {
        localStorage.setItem("refresh_token", session.refresh_token);
      }
      localStorage.setItem("current_user", JSON.stringify(session.user));
    }

    return session;
  },

  async getMe(): Promise<User> {
    if (config.useMocks) {
      const current = this.getCurrentUser();
      if (current) return current;
      throw new Error("Unauthenticated");
    }
    const res = await apiClient.get<{ success: boolean; data: User }>("/auth/me");
    const user = res.data;
    if (typeof window !== "undefined") {
      localStorage.setItem("current_user", JSON.stringify(user));
      setCookie("user_role", user.role || "", 7);
      const orgId = user.organization_id || user.organizationId;
      if (orgId) {
        setCookie("organization_id", orgId, 7);
      } else {
        deleteCookie("organization_id");
      }
    }
    return user;
  },

  logout(redirectPath = "/login") {
    if (typeof window !== "undefined") {
      deleteCookie("access_token");
      deleteCookie("user_role");
      deleteCookie("organization_id");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("current_user");
      if (redirectPath) {
        window.location.href = redirectPath;
      }
    }
  },

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("current_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token") || getCookie("access_token");
  },

  getUserRole(): string | null {
    const user = this.getCurrentUser();
    if (user?.role) return user.role;
    return getCookie("user_role");
  },

  getUserOrgId(): string | null {
    const user = this.getCurrentUser();
    if (user?.organization_id) return user.organization_id;
    if (user?.organizationId) return user.organizationId;
    return getCookie("organization_id");
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
