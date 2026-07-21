"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import CategorySwitch from "@/components/CategorySwitch";
import CityModal from "@/components/CityModal";
import AddressInput from "@/components/taxi/AddressInput";
import { TripType } from "@/types/trips";

type CityField = "from" | "to" | null;

const TRANSPORT_CATEGORIES = [
  { value: "sedan", label: "🚗 Легковой автомобиль" },
  { value: "minivan", label: "🚙 Минивэн" },
  { value: "minibus", label: "🚐 Микроавтобус" },
  { value: "cargo", label: "🚚 Грузовой автомобиль" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function CreateTripPage() {
  const router = useRouter();
  const { user, loading, setRole } = useAuth();

  const [type, setType] = useState<TripType>("intercity");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [transportCategory, setTransportCategory] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [becomingDriver, setBecomingDriver] = useState(false);
  const [cityModalField, setCityModalField] = useState<CityField>(null);

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

    if (!transportCategory) {
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
          transportCategory,
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
            href="/login?redirect=/create-trip&role=driver"
            className="block w-full text-center bg-violet-600 hover:bg-violet-700 transition rounded-2xl py-4 font-bold"
          >
            Войти или зарегистрироваться
          </Link>
        </div>
      </main>
    );
  }

  if (!loading && user && user.role !== "driver") {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white">
        <div className="max-w-md mx-auto px-5 py-8">
          <Link href="/" className="text-violet-400 inline-block mb-8">
            ← Назад
          </Link>

          <h1 className="text-3xl font-bold mb-4">Создать поездку</h1>

          <p className="text-gray-400 mb-6">
            Публиковать поездки могут только водители. Переключитесь в режим
            водителя, чтобы продолжить.
          </p>

          <button
            onClick={async () => {
              setBecomingDriver(true);
              await setRole("driver");
              router.refresh();
              setBecomingDriver(false);
            }}
            disabled={becomingDriver}
            className="block w-full text-center bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-2xl py-4 font-bold"
          >
            {becomingDriver ? "Секунду..." : "Стать водителем"}
          </button>
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
              <button
                type="button"
                onClick={() => setCityModalField("from")}
                className="w-full flex items-center gap-2 bg-[#171726] rounded-2xl p-4 text-left"
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
                className="w-full flex items-center gap-2 bg-[#171726] rounded-2xl p-4 text-left"
              >
                <MapPin size={18} className="text-gray-500 shrink-0" />
                <span className={`flex-1 min-w-0 truncate ${to ? "" : "text-gray-500"}`}>
                  {to || "Куда"}
                </span>
                <ChevronDown size={18} className="text-gray-500 shrink-0" />
              </button>

              <CityModal
                open={cityModalField !== null}
                onClose={() => setCityModalField(null)}
                onSelect={(city) => {
                  if (cityModalField === "from") setFrom(city);
                  if (cityModalField === "to") setTo(city);
                }}
                title={cityModalField === "from" ? "Откуда вы едете?" : "Куда вы едете?"}
              />
            </>
          ) : (
            <>
              <AddressInput value={from} onChange={setFrom} placeholder="📍 Откуда" />
              <AddressInput value={to} onChange={setTo} placeholder="🏁 Куда" />
            </>
          )}

          <input
            type="date"
            min={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
          />

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

          <select
            value={transportCategory}
            onChange={(e) => setTransportCategory(e.target.value)}
            className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
          >
            <option value="">🚘 Тип транспорта</option>
            {TRANSPORT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

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
