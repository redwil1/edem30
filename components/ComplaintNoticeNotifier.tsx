"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

type Notice = {
  reportId: number;
  tripId: number;
  tripRoute: string;
};

export default function ComplaintNoticeNotifier() {
  const { user } = useAuth();

  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    if (!user) {
      setNotices([]);
      return;
    }

    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/notifications/my-reports", {
        cache: "no-store",
      });

      if (!res.ok || cancelled) return;

      const data = await res.json();
      setNotices(data.notices ?? []);
    }

    poll();

    const interval = setInterval(poll, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  async function dismiss(reportId: number) {
    setNotices((prev) => prev.filter((n) => n.reportId !== reportId));

    await fetch("/api/notifications/my-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportIds: [reportId] }),
    });
  }

  if (notices.length === 0) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md flex flex-col gap-2">
      {notices.map((n) => (
        <div
          key={n.reportId}
          className="bg-[#171726] border border-orange-500/30 rounded-2xl p-4 shadow-xl flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={17} className="text-orange-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">На вас поступила жалоба</div>

            <div className="text-xs text-gray-400 mt-0.5 truncate">
              По поездке: {n.tripRoute}
            </div>

            <div className="text-xs text-gray-400 mt-1">
              Администрация рассмотрит обращение. Пожалуйста, соблюдайте
              правила сервиса.
            </div>
          </div>

          <button
            onClick={() => dismiss(n.reportId)}
            className="text-gray-500 hover:text-white transition shrink-0"
            aria-label="Понятно"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
