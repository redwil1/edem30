"use client";

import { useEffect, useState } from "react";
import { Check, Flag, Loader2, PlayCircle } from "lucide-react";

type Status = {
  driverConfirmed: boolean;
  passengerConfirmed: boolean;
  started: boolean;
  startedAt: string | null;
  driverCompleted: boolean;
  passengerCompleted: boolean;
  completed: boolean;
  completedAt: string | null;
  isDriver: boolean;
  isPassenger: boolean;
};

type Props = {
  tripId: number;
  tripDate: string;
  tripTime: string;
};

const START_WINDOW_MS = 10 * 60_000;

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatCountdown(ms: number) {
  const totalMinutes = Math.ceil(ms / 60_000);

  if (totalMinutes > 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} ч ${minutes} мин`;
  }

  return `${totalMinutes} мин`;
}

export default function TripStartCard({ tripId, tripDate, tripTime }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const scheduledMs = (() => {
    const parsed = new Date(`${tripDate}T${tripTime}:00`).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  })();

  const canConfirmStart =
    scheduledMs === null || now >= scheduledMs - START_WINDOW_MS;

  async function load() {
    const res = await fetch(`/api/trips/${tripId}/start`, {
      cache: "no-store",
    });

    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    if (status?.completed) return;

    const tick = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(tick);
  }, [status?.completed]);

  async function confirmStart() {
    setConfirming(true);

    const res = await fetch(`/api/trips/${tripId}/start`, { method: "POST" });

    if (res.ok) {
      const data = await res.json();
      setStatus((prev) => (prev ? { ...prev, ...data } : prev));
    }

    setConfirming(false);
  }

  async function confirmComplete() {
    setConfirming(true);

    const res = await fetch(`/api/trips/${tripId}/complete`, {
      method: "POST",
    });

    if (res.ok) {
      const data = await res.json();
      setStatus((prev) => (prev ? { ...prev, ...data } : prev));
    }

    setConfirming(false);
  }

  if (!status || (!status.isDriver && !status.isPassenger)) return null;

  if (status.completed) {
    const durationMs =
      status.startedAt && status.completedAt
        ? new Date(status.completedAt).getTime() -
          new Date(status.startedAt).getTime()
        : null;

    return (
      <div className="bg-[#12121c] border border-green-500/30 rounded-3xl p-4 sm:p-6">
        <div className="font-display flex items-center gap-2 font-bold mb-2 text-green-400">
          <Flag size={18} />
          Поездка завершена
        </div>

        {durationMs !== null && (
          <p className="text-sm text-gray-400">
            Длительность: {formatDuration(durationMs)}
          </p>
        )}
      </div>
    );
  }

  if (status.started) {
    const myCompleted = status.isDriver
      ? status.driverCompleted
      : status.passengerCompleted;

    const elapsedMs = status.startedAt
      ? now - new Date(status.startedAt).getTime()
      : 0;

    return (
      <div className="bg-[#12121c] border border-violet-500/20 rounded-3xl p-4 sm:p-6">
        <div className="font-display flex items-center gap-2 font-bold mb-3">
          <PlayCircle size={18} className="text-violet-400" />
          Поездка в пути
        </div>

        <div className="font-display text-2xl font-bold text-violet-300 mb-4 tabular-nums">
          {formatDuration(elapsedMs)}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Пассажир завершил</span>
            <span
              className={
                status.passengerCompleted ? "text-green-400" : "text-gray-500"
              }
            >
              {status.passengerCompleted ? "Подтвердил" : "Ждём"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Водитель завершил</span>
            <span
              className={
                status.driverCompleted ? "text-green-400" : "text-gray-500"
              }
            >
              {status.driverCompleted ? "Подтвердил" : "Ждём"}
            </span>
          </div>
        </div>

        <button
          onClick={confirmComplete}
          disabled={confirming || myCompleted}
          className="btn-gradient w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-60 transition rounded-xl py-3 text-sm font-bold"
        >
          {confirming ? (
            <Loader2 size={15} className="animate-spin" />
          ) : myCompleted ? (
            <Check size={15} />
          ) : (
            <Flag size={15} />
          )}

          {myCompleted ? "Вы подтвердили" : "Завершить поездку"}
        </button>
      </div>
    );
  }

  const myConfirmed = status.isDriver
    ? status.driverConfirmed
    : status.passengerConfirmed;

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="font-display flex items-center gap-2 font-bold mb-3">
        <PlayCircle size={18} className="text-violet-400" />
        Начало поездки
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Пассажир сел в машину</span>
          <span
            className={
              status.passengerConfirmed ? "text-green-400" : "text-gray-500"
            }
          >
            {status.passengerConfirmed ? "Подтвердил" : "Ждём"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400">Водитель на месте</span>
          <span
            className={
              status.driverConfirmed ? "text-green-400" : "text-gray-500"
            }
          >
            {status.driverConfirmed ? "Подтвердил" : "Ждём"}
          </span>
        </div>
      </div>

      {!canConfirmStart && scheduledMs !== null ? (
        <p className="mt-4 text-xs text-gray-500 text-center">
          Подтвердить готовность можно за 10 минут до отправления — через{" "}
          {formatCountdown(scheduledMs - START_WINDOW_MS - now)}
        </p>
      ) : (
        <button
          onClick={confirmStart}
          disabled={confirming || myConfirmed}
          className="btn-gradient w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-60 transition rounded-xl py-3 text-sm font-bold"
        >
          {confirming ? (
            <Loader2 size={15} className="animate-spin" />
          ) : myConfirmed ? (
            <Check size={15} />
          ) : null}

          {myConfirmed
            ? "Вы подтвердили"
            : status.isDriver
            ? "Поехали"
            : "Я сел(а) в машину"}
        </button>
      )}
    </div>
  );
}
