"use client";

import { useEffect, useState } from "react";
import { Check, Flag, Loader2, PlayCircle } from "lucide-react";

type Participant = {
  userId: number;
  name: string;
  startConfirmed: boolean;
  completeConfirmed: boolean;
};

type Status = {
  driverConfirmed: boolean;
  started: boolean;
  startedAt: string | null;
  driverCompleted: boolean;
  completed: boolean;
  completedAt: string | null;
  isDriver: boolean;
  isPassenger: boolean;
  myStartConfirmed: boolean;
  myCompleteConfirmed: boolean;
  participants: Participant[];
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

function ConfirmRow({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 truncate pr-2">{label}</span>
      <span className={confirmed ? "text-green-400 shrink-0" : "text-gray-500 shrink-0"}>
        {confirmed ? "Подтвердил" : "Ждём"}
      </span>
    </div>
  );
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

    if (res.ok) setStatus(await res.json());

    setConfirming(false);
  }

  async function confirmComplete() {
    setConfirming(true);

    const res = await fetch(`/api/trips/${tripId}/complete`, {
      method: "POST",
    });

    if (res.ok) setStatus(await res.json());

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

        <div className="space-y-2 text-sm max-h-[180px] overflow-y-auto pr-1">
          <ConfirmRow label="Водитель завершил" confirmed={status.driverCompleted} />

          {status.participants.map((p) => (
            <ConfirmRow
              key={p.userId}
              label={`${p.name} завершил`}
              confirmed={p.completeConfirmed}
            />
          ))}
        </div>

        <button
          onClick={confirmComplete}
          disabled={confirming || status.myCompleteConfirmed}
          className="btn-gradient w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-60 transition rounded-xl py-3 text-sm font-bold"
        >
          {confirming ? (
            <Loader2 size={15} className="animate-spin" />
          ) : status.myCompleteConfirmed ? (
            <Check size={15} />
          ) : (
            <Flag size={15} />
          )}

          {status.myCompleteConfirmed ? "Вы подтвердили" : "Завершить поездку"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="font-display flex items-center gap-2 font-bold mb-3">
        <PlayCircle size={18} className="text-violet-400" />
        Начало поездки
      </div>

      <div className="space-y-2 text-sm max-h-[180px] overflow-y-auto pr-1">
        <ConfirmRow label="Водитель на месте" confirmed={status.driverConfirmed} />

        {status.participants.map((p) => (
          <ConfirmRow
            key={p.userId}
            label={`${p.name} сел(а) в машину`}
            confirmed={p.startConfirmed}
          />
        ))}
      </div>

      {status.participants.length > 1 && (
        <p className="text-xs text-gray-500 mt-3">
          Поездка начнётся, когда подтвердят все участники —{" "}
          {status.participants.filter((p) => p.startConfirmed).length} из{" "}
          {status.participants.length} пассажиров готовы.
        </p>
      )}

      {!canConfirmStart && scheduledMs !== null ? (
        <p className="mt-4 text-xs text-gray-500 text-center">
          Подтвердить готовность можно за 10 минут до отправления — через{" "}
          {formatCountdown(scheduledMs - START_WINDOW_MS - now)}
        </p>
      ) : (
        <button
          onClick={confirmStart}
          disabled={confirming || status.myStartConfirmed}
          className="btn-gradient w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-60 transition rounded-xl py-3 text-sm font-bold"
        >
          {confirming ? (
            <Loader2 size={15} className="animate-spin" />
          ) : status.myStartConfirmed ? (
            <Check size={15} />
          ) : null}

          {status.myStartConfirmed
            ? "Вы подтвердили"
            : status.isDriver
            ? "Поехали"
            : "Я сел(а) в машину"}
        </button>
      )}
    </div>
  );
}
