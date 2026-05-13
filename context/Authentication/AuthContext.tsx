"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { UserRole } from "../../types/types";

interface AuthUser {
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user?: AuthUser | null };
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { error?: string; user?: AuthUser };
    if (!res.ok) {
      throw new Error(data.error || "Falha ao entrar");
    }
    if (!data.user) {
      throw new Error("Resposta inválida do servidor.");
    }
    setUser({ email: data.user.email, role: data.user.role });
  };

  const register = async (email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { error?: string; user?: AuthUser };
    if (!res.ok) {
      throw new Error(data.error || "Falha ao cadastrar");
    }
    if (!data.user) {
      throw new Error("Resposta inválida do servidor.");
    }
    setUser({ email: data.user.email, role: data.user.role });
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
