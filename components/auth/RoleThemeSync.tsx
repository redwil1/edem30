"use client";

import { useEffect } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

export default function RoleThemeSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === "driver") {
      document.documentElement.setAttribute("data-role-theme", "driver");
    } else {
      document.documentElement.removeAttribute("data-role-theme");
    }
  }, [user?.role]);

  return null;
}
