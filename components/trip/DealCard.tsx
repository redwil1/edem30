"use client";

import { useEffect, useState } from "react";
import { Handshake, Loader2 } from "lucide-react";

import { formatPrice } from "@/lib/utils";

type Deal = {
  price: number | null;
  driverConfirmed: boolean;
  passengerConfirmed: boolean;
  finalized: boolean;
  isDriver: boolean;
  isPassenger: boolean;
};

type Props = {
  tripId: number;
  initialPrice: number;
  onFinalized?: () => void;
};

export default function DealCard({ tripId, initialPrice, onFinalized }: Props) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [price, setPrice] = useState(String(initialPrice));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/trips/${tripId}/deal`, { cache: "no-store" });

    if (res.ok) {
      const data = (await res.json()) as Deal;
      setDeal(data);

      if (data.price !== null) setPrice(String(data.price));
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    if (deal?.finalized) onFinalized?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.finalized]);

  async function submit() {
    const value = Number(price);

    if (!Number.isInteger(value) || value <= 0) {
      setError("Укажите корректную цену");
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/trips/${tripId}/deal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: value }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error || "Не удалось отправить предложение");
      setSubmitting(false);
      return;
    }

    setDeal((prev) => (prev ? { ...prev, ...data } : prev));
    setSubmitting(false);
  }

  if (!deal || (!deal.isDriver && !deal.isPassenger) || deal.finalized) {
    return null;
  }

  const myConfirmed = deal.isDriver ? deal.driverConfirmed : deal.passengerConfirmed;
  const otherConfirmed = deal.isDriver ? deal.passengerConfirmed : deal.driverConfirmed;
  const priceMatches = deal.price !== null && Number(price) === deal.price;

  return (
    <div className="bg-[#12121c] border border-violet-500/20 rounded-3xl p-4 sm:p-6">
      <div className="flex items-center gap-2 font-bold mb-3">
        <Handshake size={18} className="text-violet-400" />
        Договоритесь о цене в чате
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Обсудите поездку в чате, затем оба подтвердите цену — только после
        этого можно будет начать поездку.
      </p>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Пассажир</span>
          <span className={deal.passengerConfirmed ? "text-green-400" : "text-gray-500"}>
            {deal.passengerConfirmed ? "Подтвердил" : "Ждём"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400">Водитель</span>
          <span className={deal.driverConfirmed ? "text-green-400" : "text-gray-500"}>
            {deal.driverConfirmed ? "Подтвердил" : "Ждём"}
          </span>
        </div>
      </div>

      {myConfirmed && !otherConfirmed ? (
        <p className="text-sm text-gray-400">
          Вы предложили {formatPrice(Number(price))}. Ждём подтверждения
          второй стороны.
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={100_000}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="flex-1 bg-[#1c1c2b] rounded-xl px-4 py-3 outline-none text-sm"
          />

          <button
            onClick={submit}
            disabled={submitting}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-xl px-5 py-3 text-sm font-bold whitespace-nowrap flex items-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {priceMatches && !myConfirmed ? "Договорились" : "Предложить"}
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
}
