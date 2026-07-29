"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CityModal from "@/components/CityModal";
import { intercityDestinations } from "@/lib/cities";

type CityField = "from" | "to" | null;

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

    setSubmitting(true);

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

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-md mx-auto px-5 py-8 flex-1 w-full">
        <Link href="/" className="text-violet-400 inline-block mb-8">
          ← Назад
        </Link>

        <h1 className="text-3xl font-bold mb-2">Ищу водителя</h1>
        <p className="text-gray-500 text-sm mb-8">
          Оставьте заявку — водители, едущие по вашему маршруту, откликнутся и
          напишут вам в чат.
        </p>

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
            disabled={submitting}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-2xl py-4 font-bold"
          >
            {submitting ? "Публикуем..." : "Опубликовать заявку"}
          </button>
        </form>
      </div>

      <Footer />
    </main>
  );
}
