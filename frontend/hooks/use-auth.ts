"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import type { User } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(authService.getCurrentUser());
    setIsLoading(false);
  }, []);

  return { user, isLoading, isAuthenticated: !!user, logout: authService.logout };
}
