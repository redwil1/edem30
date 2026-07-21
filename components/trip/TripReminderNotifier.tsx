"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlarmClock, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

type Alert = {
  tripId: number;
  route: string;
  requiredRole: "driver" | "passenger";
  minutesUntil: number;
  started: boolean;
};

export default function TripReminderNotifier() {
  const { user, setRole } = useAuth();
  const router = useRouter();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [dismissedTripId, setDismissedTripId] = useState<number | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!user) {
      setAlert(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/notifications/upcoming-trip", {
        cache: "no-store",
      });

      if (!res.ok || cancelled) return;

      const data = await res.json();
      setAlert(data.alert);
    }

    poll();

    const interval = setInterval(poll, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  async function switchRole() {
    if (!alert) return;

    setSwitching(true);
    await setRole(alert.requiredRole);
    router.refresh();
    setSwitching(false);
  }

  if (!alert || dismissedTripId === alert.tripId) return null;

  const roleLabel = alert.requiredRole === "driver" ? "водителя" : "пассажира";

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-[#171726] border border-yellow-500/30 rounded-2xl p-4 shadow-xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
          <AlarmClock size={17} className="text-yellow-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">
            {alert.started
              ? "Ваша поездка уже началась"
              : `Поездка начнётся через ${alert.minutesUntil} мин`}
          </div>

          <div className="text-xs text-gray-400 mt-0.5 truncate">{alert.route}</div>

          <div className="text-xs text-gray-400 mt-1">
            Переключитесь в режим {roleLabel}, чтобы продолжить
          </div>

          <div className="flex items-center gap-3 mt-2.5">
            <button
              onClick={switchRole}
              disabled={switching}
              className="text-xs font-medium bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25 disabled:opacity-60 transition rounded-lg px-3 py-1.5"
            >
              {switching ? "Секунду..." : "Переключиться"}
            </button>

            <Link
              href={`/trip/${alert.tripId}`}
              className="text-xs font-medium text-gray-400 hover:text-white transition"
            >
              Открыть поездку
            </Link>
          </div>
        </div>

        <button
          onClick={() => setDismissedTripId(alert.tripId)}
          className="text-gray-500 hover:text-white transition shrink-0"
          aria-label="Скрыть"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
