"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flag, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { playAlertSound } from "@/lib/notificationSound";

type Report = {
  id: number;
  tripRoute: string;
  reporterName: string;
};

export default function AdminComplaintAlert() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const knownIds = useRef<Set<number> | null>(null);
  const [toasts, setToasts] = useState<Report[]>([]);

  useEffect(() => {
    if (!isStaff) return;

    knownIds.current = null;
    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/admin/reports?status=new", { cache: "no-store" });
      if (!res.ok || cancelled) return;

      const data = await res.json();
      const reports: Report[] = data.reports ?? [];

      if (knownIds.current === null) {
        knownIds.current = new Set(reports.map((r) => r.id));
        return;
      }

      const fresh = reports.filter((r) => !knownIds.current!.has(r.id));

      for (const r of reports) knownIds.current!.add(r.id);

      if (fresh.length > 0) {
        setToasts((prev) => [...fresh, ...prev].slice(0, 5));
        playAlertSound();
      }
    }

    poll();

    const interval = setInterval(poll, 15_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isStaff]);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (!isStaff || toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
      {toasts.map((t) => (
        <Link
          key={t.id}
          href="/eadmin30"
          onClick={() => dismiss(t.id)}
          className="bg-[#171726] border border-red-500/40 hover:border-red-500 rounded-2xl p-3.5 shadow-xl flex items-start gap-3 transition animate-drop-in"
        >
          <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <Flag size={15} className="text-red-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold">Новая жалоба</div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {t.tripRoute} · {t.reporterName}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss(t.id);
            }}
            className="text-gray-500 hover:text-white transition shrink-0"
            aria-label="Скрыть"
          >
            <X size={14} />
          </button>
        </Link>
      ))}
    </div>
  );
}
