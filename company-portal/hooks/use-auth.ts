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
        const remoteUser = await authService.getMe();
        setUser(remoteUser);
      } else {
        setUser(null);
      }
    } catch {
      // If fetching /me fails (e.g. token expired), clear local session
      authService.logout();
      setUser(null);
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

  const isOrgAdmin = user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN";

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isOrgAdmin,
    login,
    logout,
    refreshSession: fetchSession,
  };
}
