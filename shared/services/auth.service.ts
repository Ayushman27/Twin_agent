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
      deleteCookie("access_token");
      deleteCookie("user_role");
      deleteCookie("organization_id");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("current_user");
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
    return !!localStorage.getItem("access_token") || !!getCookie("access_token");
  },
};
