"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import CategorySwitch from "@/components/CategorySwitch";
import AddressInput from "@/components/taxi/AddressInput";
import { cities } from "@/lib/cities";
import { TripType } from "@/types/trips";

const DATES = ["Сегодня", "Завтра", "Послезавтра"];

export default function CreateTripPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [type, setType] = useState<TripType>("intercity");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(DATES[0]);
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [transport, setTransport] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!from.trim() || !to.trim()) {
      setError("Укажите откуда и куда едем");
      return;
    }

    if (!time) {
      setError("Укажите время отправления");
      return;
    }

    if (!price || Number(price) <= 0) {
      setError("Укажите цену за место");
      return;
    }

    if (!totalSeats || Number(totalSeats) <= 0) {
      setError("Укажите количество мест");
      return;
    }

    if (!transport.trim()) {
      setError("Укажите тип транспорта");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          from: from.trim(),
          to: to.trim(),
          date,
          time,
          price: Number(price),
          totalSeats: Number(totalSeats),
          transport: transport.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Не удалось опубликовать поездку");
        setSubmitting(false);
        return;
      }

      router.push(`/trip/${data.id}`);
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
      setSubmitting(false);
    }
  }

  if (!loading && !user) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white">
        <div className="max-w-md mx-auto px-5 py-8">
          <Link href="/" className="text-violet-400 inline-block mb-8">
            ← Назад
          </Link>

          <h1 className="text-3xl font-bold mb-4">Создать поездку</h1>

          <p className="text-gray-400 mb-6">
            Публиковать поездки могут только зарегистрированные пользователи.
          </p>

          <Link
            href="/login?redirect=/create-trip"
            className="block w-full text-center bg-violet-600 hover:bg-violet-700 transition rounded-2xl py-4 font-bold"
          >
            Войти или зарегистрироваться
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white">
      <div className="max-w-md mx-auto px-5 py-8">
        <Link href="/" className="text-violet-400 inline-block mb-8">
          ← Назад
        </Link>

        <h1 className="text-3xl font-bold mb-8">Создать поездку</h1>

        <form onSubmit={submit} className="space-y-4">
          <CategorySwitch value={type} onChange={setType} />

          {type === "intercity" ? (
            <>
              <datalist id="cities-list">
                {cities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>

              <input
                list="cities-list"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="📍 Откуда"
                className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
              />

              <input
                list="cities-list"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="🏙 Куда"
                className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
              />
            </>
          ) : (
            <>
              <AddressInput value={from} onChange={setFrom} placeholder="📍 Откуда" />
              <AddressInput value={to} onChange={setTo} placeholder="🏁 Куда" />
            </>
          )}

          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
          >
            {DATES.map((d) => (
              <option key={d} value={d}>
                📅 {d}
              </option>
            ))}
          </select>

          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
          />

          <input
            type="number"
            min={1}
            max={100000}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="💰 Цена за место, ₽"
            className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
          />

          <input
            type="number"
            min={1}
            max={8}
            value={totalSeats}
            onChange={(e) => setTotalSeats(e.target.value)}
            placeholder="💺 Свободных мест"
            className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
          />

          <input
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
            placeholder={
              type === "city" ? "🚗 Легковой автомобиль" : "🚐 Микроавтобус"
            }
            className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-2xl py-4 font-bold"
          >
            {submitting ? "Публикуем..." : "Опубликовать поездку"}
          </button>
        </form>
      </div>
    </main>
  );
}
