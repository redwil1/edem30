"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageCircle, Plus, Search, X } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Avatar from "@/components/trip/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatDate, formatRating } from "@/lib/utils";

type ResponseRow = {
  id: number;
  driverId: number;
  driverName: string;
  driverAvatarUrl: string | null;
  driverAvatarPreset: string | null;
  driverRating: number | null;
  driverReviewsCount: number;
  conversationId: number | null;
  createdAt: string;
};

type RequestRow = {
  id: number;
  from: string;
  to: string;
  date: string;
  time: string;
  passengersCount: number;
  comment: string | null;
  status: "open" | "closed" | "cancelled";
  acceptedDriverId: number | null;
  responsesCount: number;
  createdAt: string;
  responses: ResponseRow[];
};

const STATUS_LABEL: Record<RequestRow["status"], { label: string; className: string }> = {
  open: { label: "Открыта", className: "bg-violet-600/15 text-violet-300" },
  closed: { label: "Закрыта", className: "bg-green-500/10 text-green-400" },
  cancelled: { label: "Отменена", className: "bg-red-500/10 text-red-400" },
};

export default function MyRideRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/ride-requests/mine", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    setRequests(data?.requests ?? []);
  }

  useEffect(() => {
    if (!user) return;
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [user]);

  async function chooseDriver(requestId: number, driverId: number) {
    setBusyId(requestId);
    await fetch(`/api/ride-requests/${requestId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId }),
    });
    setBusyId(null);
    load();
  }

  async function cancelRequest(requestId: number) {
    setBusyId(requestId);
    await fetch(`/api/ride-requests/${requestId}/cancel`, { method: "POST" });
    setBusyId(null);
    load();
  }

  if (authLoading) return null;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-gray-400 mb-5">Войдите, чтобы посмотреть свои заявки.</p>
            <Link
              href="/login?redirect=/find-driver/mine"
              className="inline-block bg-violet-600 hover:bg-violet-700 transition rounded-xl px-6 py-3 font-bold"
            >
              Войти
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-2xl mx-auto px-5 py-8 flex-1 w-full">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Search size={18} className="text-violet-400" />
            Мои заявки «Ищу водителя»
          </div>

          <Link
            href="/find-driver"
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 transition rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap"
          >
            <Plus size={15} />
            Новая заявка
          </Link>
        </div>

        {!requests ? (
          <div className="py-16 flex items-center justify-center text-gray-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-[#12121c] border border-white/5 rounded-3xl p-10 text-center text-gray-500 text-sm">
            Заявок пока нет. Создайте первую — водители по вашему маршруту
            смогут откликнуться.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => {
              const status = STATUS_LABEL[r.status];

              return (
                <div key={r.id} className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-bold">
                        {r.from} → {r.to}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {formatDate(r.date)} · {r.time} · {r.passengersCount} пасс.
                      </div>
                      {r.comment && (
                        <div className="text-sm text-gray-400 mt-2">{r.comment}</div>
                      )}
                    </div>

                    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  {r.status === "open" && (
                    <button
                      onClick={() => cancelRequest(r.id)}
                      disabled={busyId === r.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-400 transition mt-3 disabled:opacity-60"
                    >
                      <X size={12} />
                      Отменить заявку
                    </button>
                  )}

                  {r.responses.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                      <div className="text-xs text-gray-500 font-medium">
                        Откликнулись водители ({r.responses.length})
                      </div>

                      {r.responses.map((resp) => (
                        <div key={resp.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar
                              name={resp.driverName}
                              size={32}
                              avatarUrl={resp.driverAvatarUrl}
                              avatarPreset={resp.driverAvatarPreset}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{resp.driverName}</div>
                              {resp.driverRating !== null && (
                                <div className="text-xs text-yellow-400">
                                  {formatRating(resp.driverRating)} ({resp.driverReviewsCount})
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {resp.conversationId && (
                              <Link
                                href={`/dm/${resp.conversationId}`}
                                className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition border border-violet-500/30 rounded-lg px-2.5 py-1.5"
                              >
                                <MessageCircle size={12} />
                                Чат
                              </Link>
                            )}

                            {r.status === "open" && (
                              <button
                                onClick={() => chooseDriver(r.id, resp.driverId)}
                                disabled={busyId === r.id}
                                className="text-xs font-bold bg-violet-600 hover:bg-violet-700 transition rounded-lg px-2.5 py-1.5 disabled:opacity-60"
                              >
                                Выбрать
                              </button>
                            )}

                            {r.acceptedDriverId === resp.driverId && (
                              <span className="text-xs text-green-400 font-medium">Выбран</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
