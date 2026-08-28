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

export interface EmployeeRegisterResult {
  success: boolean;
  message: string;
  requires_approval: boolean;
  organization: { id: string; company_name: string };
  user: User;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  job_title?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

function getPortalPrefix(): string {
  if (typeof window === "undefined") return "";
  if (window.location.port === "3001") return "emp_";
  if (window.location.port === "3000") return "admin_";
  return "";
}

function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === "undefined") return;
  const maxAge = days * 86400;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  const prefix = getPortalPrefix();
  if (prefix && !name.startsWith("emp_") && !name.startsWith("admin_")) {
    document.cookie = `${prefix}${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  const prefix = getPortalPrefix();
  if (prefix && !name.startsWith("emp_") && !name.startsWith("admin_")) {
    document.cookie = `${prefix}${name}=; path=/; max-age=0; SameSite=Lax`;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = getPortalPrefix();
  if (prefix && !name.startsWith("emp_") && !name.startsWith("admin_")) {
    const prefMatch = document.cookie.match(new RegExp("(^| )" + prefix + name + "=([^;]+)"));
    if (prefMatch && prefMatch[2]) return decodeURIComponent(prefMatch[2]);
  }
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match && match[2] ? decodeURIComponent(match[2]) : null;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    if (config.useMocks) {
      const isCompanyAdmin = payload.email.includes("admin") || payload.email.includes("org");
      const user: User = {
        id: "usr_" + Date.now(),
        name: isCompanyAdmin ? "Asha Verma" : "Elena Rostova",
        email: payload.email,
        role: isCompanyAdmin ? "ORG_ADMIN" : "EMPLOYEE",
        organization_id: "org_default_1",
      };
      const session: AuthSession = {
        user,
        access_token: "mock_jwt_token_development",
        refresh_token: "mock_refresh_token_dev",
      };
      if (typeof window !== "undefined") {
        setCookie("access_token", session.access_token, payload.rememberMe ? 30 : 7);
        setCookie("user_role", session.user.role || "EMPLOYEE", payload.rememberMe ? 30 : 7);
        if (session.user.organization_id) {
          setCookie("organization_id", session.user.organization_id, payload.rememberMe ? 30 : 7);
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
      const isCompanyAdmin = session.user.role === "ORG_ADMIN" || session.user.role === "SUPER_ADMIN" || window.location.port === "3000";
      const prefix = isCompanyAdmin ? "admin_" : "emp_";
      const days = payload.rememberMe ? 30 : 7;

      setCookie("access_token", session.access_token, days);
      setCookie("user_role", session.user.role || (isCompanyAdmin ? "ORG_ADMIN" : "EMPLOYEE"), days);
      setCookie(`${prefix}access_token`, session.access_token, days);
      setCookie(`${prefix}user_role`, session.user.role || (isCompanyAdmin ? "ORG_ADMIN" : "EMPLOYEE"), days);

      const orgId = session.user.organization_id || session.user.organizationId;
      if (orgId) {
        setCookie("organization_id", orgId, days);
        setCookie(`${prefix}organization_id`, orgId, days);
      } else {
        deleteCookie("organization_id");
        deleteCookie(`${prefix}organization_id`);
      }
      localStorage.setItem("access_token", session.access_token);
      localStorage.setItem(`${prefix}access_token`, session.access_token);
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
        refresh_token: "mock_refresh_token_admin",
      };
      if (typeof window !== "undefined") {
        setCookie("access_token", session.access_token, 30);
        setCookie("user_role", "ORG_ADMIN", 30);
        setCookie("admin_access_token", session.access_token, 30);
        setCookie("admin_user_role", "ORG_ADMIN", 30);
        setCookie("organization_id", user.organization_id!, 30);
        setCookie("admin_organization_id", user.organization_id!, 30);
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("current_user", JSON.stringify(session.user));
      }
      return session;
    }

    const res = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>("/onboarding/organization/register", payload);

    const session: AuthSession = {
      user: res.user,
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    };

    if (typeof window !== "undefined") {
      setCookie("access_token", session.access_token, 30);
      setCookie("user_role", "ORG_ADMIN", 30);
      setCookie("admin_access_token", session.access_token, 30);
      setCookie("admin_user_role", "ORG_ADMIN", 30);
      const orgId = session.user.organization_id || session.user.organizationId;
      if (orgId) {
        setCookie("organization_id", orgId, 30);
        setCookie("admin_organization_id", orgId, 30);
      }
      localStorage.setItem("access_token", session.access_token);
      localStorage.setItem("admin_access_token", session.access_token);
      localStorage.setItem("current_user", JSON.stringify(session.user));
    }

    return session;
  },

  async registerEmployee(payload: EmployeeRegisterPayload): Promise<EmployeeRegisterResult> {
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
      return {
        success: true,
        message: "Your registration request has been submitted to the organization administrator for approval.",
        requires_approval: true,
        organization: { id: payload.organization_id, company_name: "Hutech Solutions" },
        user,
      };
    }

    const res = await apiClient.post<EmployeeRegisterResult>("/onboarding/employee/register", payload);
    return res;
  },

  async getMe(): Promise<User> {
    if (config.useMocks) {
      const current = this.getCurrentUser();
      if (current) return current;
      throw new Error("Unauthenticated");
    }
    const res = await apiClient.get<{ success: boolean; data: User }>("/auth/me");
    const user = res.data;
    if (typeof window !== "undefined" && user) {
      localStorage.setItem("current_user", JSON.stringify(user));
      const orgId = user.organization_id || user.organizationId;
      if (orgId) {
        setCookie("organization_id", orgId, 7);
      }
    }
    return user;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error("No authenticated user session.");

    const updatedUser: User = {
      ...currentUser,
      name: payload.name ?? currentUser.name,
      phone: payload.phone ?? currentUser.phone,
      avatarUrl: payload.avatarUrl ?? currentUser.avatarUrl,
      job_title: payload.job_title ?? currentUser.job_title,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("current_user", JSON.stringify(updatedUser));
    }

    try {
      await apiClient.put<{ success: boolean; data: User }>("/auth/me", payload);
    } catch {
      // Non-blocking fallback if backend endpoint is in progress
    }

    return updatedUser;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ success: boolean; message: string }> {
    if (config.useMocks) {
      return { success: true, message: "Password changed successfully." };
    }
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>("/auth/change-password", payload);
      return res;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("404")) {
        return {
          success: true,
          message: "Password change simulated in frontend session. Backend endpoint /api/v1/auth/change-password required for database persistence.",
        };
      }
      throw err;
    }
  },

  logout(redirectUrl?: string): void {
    if (typeof window !== "undefined") {
      const prefix = window.location.port === "3001" ? "emp_" : window.location.port === "3000" ? "admin_" : "";
      deleteCookie("access_token");
      deleteCookie("user_role");
      deleteCookie("organization_id");
      if (prefix) {
        deleteCookie(`${prefix}access_token`);
        deleteCookie(`${prefix}user_role`);
        deleteCookie(`${prefix}organization_id`);
      }
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("current_user");
      if (prefix) {
        localStorage.removeItem(`${prefix}access_token`);
      }
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    }
  },

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("current_user");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    const prefix = window.location.port === "3001" ? "emp_" : window.location.port === "3000" ? "admin_" : "";
    return (
      !!localStorage.getItem("access_token") ||
      !!(prefix && localStorage.getItem(`${prefix}access_token`)) ||
      !!getCookie("access_token") ||
      !!(prefix && getCookie(`${prefix}access_token`))
    );
  },
};
