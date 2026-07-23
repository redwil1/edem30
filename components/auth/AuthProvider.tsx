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
  selectedCity: string | null;
};

export type SetRoleResult = { ok: true } | { ok: false; error: string };

const CITY_STORAGE_KEY = "edem30_city";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => Promise<SetRoleResult>;
  city: string | null;
  setCity: (city: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [city, setCityState] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await res.json();

    setUser(data.user);
    setLoading(false);

    // Аккаунт — источник правды, если в нём уже сохранён город. Иначе (гость
    // или пользователь без сохранённого выбора) остаёмся на значении из
    // localStorage, которое уже могло быть выставлено на этой сессии.
    if (data.user?.selectedCity) {
      setCityState(data.user.selectedCity);
      localStorage.setItem(CITY_STORAGE_KEY, data.user.selectedCity);
    } else {
      const stored = localStorage.getItem(CITY_STORAGE_KEY);
      if (stored) setCityState(stored);
    }
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

  const setCity = useCallback(
    (next: string | null) => {
      setCityState(next);

      if (next) {
        localStorage.setItem(CITY_STORAGE_KEY, next);
      } else {
        localStorage.removeItem(CITY_STORAGE_KEY);
      }

      // Сохраняем в аккаунте только для вошедших — так выбор переносится
      // между устройствами и разделами сайта, а не только в этом браузере.
      if (user) {
        setUser((prev) => (prev ? { ...prev, selectedCity: next } : prev));

        fetch("/api/profile/identity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedCity: next }),
        }).catch(() => {});
      }
    },
    [user]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{ user, loading, refresh, logout, setRole, city, setCity }}
    >
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
