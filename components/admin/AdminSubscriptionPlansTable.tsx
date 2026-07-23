"use client";

import { FormEvent, useEffect, useState } from "react";
import { CreditCard, Loader2, Plus, Trash2 } from "lucide-react";

import { formatPrice } from "@/lib/utils";

type Plan = {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  description: string | null;
  active: boolean;
};

export default function AdminSubscriptionPlansTable() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/subscription-plans", { cache: "no-store" });
    const data = await res.json();
    setPlans(data.plans ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/subscription-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: Number(price),
          durationDays: Number(durationDays),
          description,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось создать тариф");
        return;
      }

      setName("");
      setPrice("");
      setDurationDays("30");
      setDescription("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(p: Plan) {
    setBusyId(p.id);

    try {
      await fetch(`/api/admin/subscription-plans/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !p.active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p: Plan) {
    if (!confirm(`Удалить тариф «${p.name}»?`)) return;

    setBusyId(p.id);

    try {
      await fetch(`/api/admin/subscription-plans/${p.id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Каталог платных тарифов для водителей (например, безлимитные заказы такси).
        Приём оплаты пока не подключён — здесь только управление списком тарифов.
      </p>

      <form
        onSubmit={submit}
        className="bg-[#12121c] border border-white/5 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Про-водитель"
            required
            maxLength={60}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Цена, ₽</label>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Срок, дней</label>
          <input
            type="number"
            min={1}
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            required
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Описание</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Необязательно"
            maxLength={300}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <button
          type="submit"
          disabled={creating}
          className="btn-gradient rounded-xl px-4 py-2.5 disabled:opacity-60 transition flex items-center justify-center gap-2"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Добавить
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {!plans ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`bg-[#12121c] border rounded-2xl p-5 ${
                p.active ? "border-white/5" : "border-white/5 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-bold">
                  <CreditCard size={16} className="text-violet-400" />
                  {p.name}
                </div>

                <button
                  type="button"
                  onClick={() => remove(p)}
                  disabled={busyId === p.id}
                  className="text-gray-500 hover:text-red-400 transition disabled:opacity-30"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="text-2xl font-bold mb-1">{formatPrice(p.price)}</div>
              <div className="text-xs text-gray-500 mb-3">на {p.durationDays} дн.</div>

              {p.description && (
                <p className="text-sm text-gray-400 mb-4">{p.description}</p>
              )}

              <button
                type="button"
                onClick={() => toggleActive(p)}
                disabled={busyId === p.id}
                className={`w-full text-xs font-medium py-2 rounded-xl transition disabled:opacity-50 ${
                  p.active
                    ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                    : "bg-gray-500/15 text-gray-400 hover:bg-gray-500/25"
                }`}
              >
                {p.active ? "Активен" : "Выключен"}
              </button>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-10">
              Тарифов пока нет
            </div>
          )}
        </div>
      )}
    </div>
  );
}
