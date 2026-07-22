"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

type Pending = {
  tripId: number;
  revieweeName: string;
};

export default function PendingReviewNotifier() {
  const { user } = useAuth();
  const pathname = usePathname();

  const [pending, setPending] = useState<Pending | null>(null);
  const [dismissedTripId, setDismissedTripId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setPending(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/notifications/pending-review", {
        cache: "no-store",
      });

      if (!res.ok || cancelled) return;

      const data = await res.json();
      setPending(data.pending);
    }

    poll();

    const interval = setInterval(poll, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  if (!pending || dismissedTripId === pending.tripId) return null;
  if (pathname === `/trip/${pending.tripId}`) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-[#171726] border border-yellow-500/30 rounded-2xl p-4 shadow-xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
          <Star size={17} className="text-yellow-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">Не забудьте оставить отзыв</div>

          <div className="text-xs text-gray-400 mt-0.5">
            Оцените {pending.revieweeName} по завершённой поездке
          </div>

          <Link
            href={`/trip/${pending.tripId}`}
            className="inline-block text-xs font-medium bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25 transition rounded-lg px-3 py-1.5 mt-2.5"
          >
            Оставить отзыв
          </Link>
        </div>

        <button
          onClick={() => setDismissedTripId(pending.tripId)}
          className="text-gray-500 hover:text-white transition shrink-0"
          aria-label="Скрыть"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
