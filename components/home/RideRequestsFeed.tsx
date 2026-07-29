"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Search, Users } from "lucide-react";

import Avatar from "@/components/trip/Avatar";
import { formatDate, formatRating } from "@/lib/utils";

type RequestRow = {
  id: number;
  passengerId: number;
  passengerName: string;
  passengerAvatarUrl: string | null;
  passengerAvatarPreset: string | null;
  passengerRating: number | null;
  passengerReviewsCount: number;
  from: string;
  to: string;
  date: string;
  time: string;
  passengersCount: number;
  comment: string | null;
  responsesCount: number;
  createdAt: string;
};

export default function RideRequestsFeed() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/ride-requests", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    setRequests(data?.requests ?? []);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  async function respond(requestId: number) {
    setError("");
    setRespondingId(requestId);

    const res = await fetch(`/api/ride-requests/${requestId}/respond`, { method: "POST" });
    const data = await res.json().catch(() => null);

    setRespondingId(null);

    if (!res.ok) {
      setError(data?.error || "Не удалось откликнуться");
      return;
    }

    router.push(`/dm/${data.conversationId}`);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 font-bold text-lg mb-5">
        <Search size={18} className="text-violet-400" />
        Пассажиры ищут водителя
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {!requests ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-[#12121c] border border-white/5 rounded-3xl p-10 text-center text-gray-500 text-sm">
          Пока нет заявок от пассажиров — загляните позже.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-[#12121c] border border-white/5 hover:border-violet-500/40 rounded-3xl p-5 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-bold text-xl">
                    {r.from} → {r.to}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatDate(r.date)} · {r.time}
                  </div>
                  {r.comment && (
                    <div className="text-sm text-gray-400 mt-2">{r.comment}</div>
                  )}
                </div>

                <span className="shrink-0 flex items-center gap-1 bg-violet-600/15 text-violet-300 text-xs font-medium px-2.5 py-1 rounded-full">
                  <Users size={12} />
                  {r.passengersCount}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    name={r.passengerName}
                    size={32}
                    avatarUrl={r.passengerAvatarUrl}
                    avatarPreset={r.passengerAvatarPreset}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.passengerName}</div>
                    {r.passengerRating !== null && (
                      <div className="text-xs text-yellow-400">
                        {formatRating(r.passengerRating)} ({r.passengerReviewsCount})
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => respond(r.id)}
                  disabled={respondingId === r.id}
                  className="flex items-center gap-1.5 shrink-0 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-xl px-3.5 py-2 text-sm font-bold whitespace-nowrap"
                >
                  {respondingId === r.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <MessageCircle size={14} />
                  )}
                  Откликнуться
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
