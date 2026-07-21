"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type UserRole = "passenger" | "driver" | "admin";

type AuthUser = {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  avatarUrl: string | null;
  avatarPreset: string | null;
  gender: string | null;
};

export type SetRoleResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => Promise<SetRoleResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await res.json();

    setUser(data.user);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });

    setUser(null);
  }, []);

  const setRole = useCallback(
    async (role: UserRole): Promise<SetRoleResult> => {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        setUser((prev) => (prev ? { ...prev, role } : prev));
      }

      await refresh();

      return res.ok
        ? { ok: true }
        : { ok: false, error: data?.error || "Не удалось сменить роль" };
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}
