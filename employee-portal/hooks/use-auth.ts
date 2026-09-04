"use client";

import { useEffect, useState, useCallback } from "react";
import { authService, LoginPayload } from "@shared/services/auth.service";
import type { User } from "@shared/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const stored = authService.getCurrentUser();
      if (stored) {
        setUser(stored);
      }

      if (authService.isAuthenticated()) {
        try {
          const remoteUser = await authService.getMe();
          setUser(remoteUser);
        } catch (err: any) {
          // Only clear if explicitly unauthorized/revoked token
          if (
            err?.message?.includes("401") ||
            err?.message?.includes("Unauthorized") ||
            err?.message?.includes("Invalid token") ||
            err?.message?.includes("Token has expired")
          ) {
            authService.logout();
            setUser(null);
          } else if (stored) {
            // Keep active session alive on page reload
            setUser(stored);
          }
        }
      } else {
        setUser(null);
      }
    } catch {
      // Non-fatal fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const login = async (payload: LoginPayload) => {
    const session = await authService.login(payload);
    setUser(session.user);
    return session;
  };

  const logout = () => {
    setUser(null);
    authService.logout("/login");
  };

  const isEmployee = !!user && user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN";
  const hasOrganization = !!user && (!!user.organization_id || !!user.organizationId);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isEmployee,
    hasOrganization,
    login,
    logout,
    refreshSession: fetchSession,
  };
}
