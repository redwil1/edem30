"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin, Users } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CityModal from "@/components/CityModal";
import { intercityDestinations } from "@/lib/cities";

type CityField = "from" | "to" | null;

type MatchCluster = {
  from: string;
  to: string;
  date: string;
  time: string;
  waitingCount: number;
  requestsCount: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function FindDriverPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [passengersCount, setPassengersCount] = useState("1");
  const [comment, setComment] = useState("");
  const [cityModalField, setCityModalField] = useState<CityField>(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingMatch, setCheckingMatch] = useState(false);
  const [match, setMatch] = useState<MatchCluster | null>(null);

  if (loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-gray-400 mb-5">Войдите, чтобы создать заявку.</p>
            <Link
              href="/login?redirect=/find-driver"
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

  async function createRequest() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/ride-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          date,
          time,
          passengersCount: Number(passengersCount) || 1,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось создать заявку");
        setSubmitting(false);
        return;
      }

      router.push("/find-driver/mine");
    } catch {
      setError("Не удалось подключиться к серверу");
      setSubmitting(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!from || !to) {
      setError("Укажите откуда и куда");
      return;
    }
    if (!date || !time) {
      setError("Укажите дату и время");
      return;
    }

    setCheckingMatch(true);

    try {
      const params = new URLSearchParams({ from, to, date, time });
      const res = await fetch(`/api/ride-requests/match?${params.toString()}`);
      const data = await res.json().catch(() => null);

      setCheckingMatch(false);

      if (data?.cluster) {
        setMatch(data.cluster);
        return;
      }
    } catch {
      setCheckingMatch(false);
    }

    await createRequest();
  }

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-md mx-auto px-5 py-8 flex-1 w-full">
        <Link href="/" className="text-violet-400 inline-block mb-8">
          ← Назад
        </Link>

        <h1 className="text-3xl font-bold mb-2">Ищу водителя</h1>
        <p className="text-gray-500 text-sm mb-8">
          Оставьте заявку — как только на маршрут наберутся пассажиры,
          водители увидят формирующуюся поездку и смогут её принять.
        </p>

        {match ? (
          <div className="bg-violet-600/10 border border-violet-500/30 rounded-3xl p-5">
            <div className="flex items-center gap-2 text-sm text-violet-300 font-medium mb-2">
              <Users size={16} />
              На этот маршрут уже формируется поездка
            </div>

            <p className="text-sm text-gray-300 mb-1">
              {match.from} → {match.to} · {match.time}
            </p>

            <p className="text-sm text-gray-400 mb-5">
              Сейчас ждут {match.waitingCount}{" "}
              {match.waitingCount === 1 ? "пассажир" : "пассажиров"}. Если
              присоединитесь, водителю будет выгоднее взять именно эту
              поездку.
            </p>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={createRequest}
                disabled={submitting}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-2xl py-3.5 font-bold"
              >
                {submitting ? "Секунду..." : "Присоединиться"}
              </button>

              <button
                onClick={createRequest}
                disabled={submitting}
                className="w-full text-gray-400 hover:text-white transition text-sm py-2 disabled:opacity-60"
              >
                Всё равно создать отдельно
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <button
              type="button"
              onClick={() => setCityModalField("from")}
              className="w-full flex items-center gap-2 bg-[#171726] border border-white/10 hover:border-violet-500/50 rounded-2xl p-4 text-left transition"
            >
              <MapPin size={18} className="text-gray-500 shrink-0" />
              <span className={`flex-1 min-w-0 truncate ${from ? "" : "text-gray-500"}`}>
                {from || "Откуда"}
              </span>
              <ChevronDown size={18} className="text-gray-500 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setCityModalField("to")}
              className="w-full flex items-center gap-2 bg-[#171726] border border-white/10 hover:border-violet-500/50 rounded-2xl p-4 text-left transition"
            >
              <MapPin size={18} className="text-gray-500 shrink-0" />
              <span className={`flex-1 min-w-0 truncate ${to ? "" : "text-gray-500"}`}>
                {to || "Куда"}
              </span>
              <ChevronDown size={18} className="text-gray-500 shrink-0" />
            </button>

            <CityModal
              cities={intercityDestinations}
              open={cityModalField !== null}
              onClose={() => setCityModalField(null)}
              onSelect={(city) => {
                if (cityModalField === "from") setFrom(city);
                if (cityModalField === "to") setTo(city);
              }}
              title={cityModalField === "from" ? "Откуда вы едете?" : "Куда вы едете?"}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={date}
                min={today()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
              />
            </div>

            <input
              type="number"
              min={1}
              max={8}
              value={passengersCount}
              onChange={(e) => setPassengersCount(e.target.value)}
              placeholder="👥 Количество пассажиров"
              className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
            />

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Комментарий (необязательно) — например, багаж, пожелания"
              rows={3}
              maxLength={500}
              className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-2xl p-4 outline-none transition resize-none"
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting || checkingMatch}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-2xl py-4 font-bold"
            >
              {checkingMatch
                ? "Проверяем..."
                : submitting
                ? "Публикуем..."
                : "Опубликовать заявку"}
            </button>
          </form>
        )}
      </div>

      <Footer />
    </main>
  );
}
