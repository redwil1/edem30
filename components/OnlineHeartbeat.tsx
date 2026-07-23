"use client";

import { useEffect } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

const HEARTBEAT_INTERVAL_MS = 60_000;

export default function OnlineHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    function ping() {
      fetch("/api/auth/heartbeat", { method: "POST" }).catch(() => {});
    }

    ping();

    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user]);

  return null;
}
