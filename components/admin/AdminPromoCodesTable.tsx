"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Plus, Tag, Trash2 } from "lucide-react";

type PromoCode = {
  id: number;
  code: string;
  discountPercent: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

export default function AdminPromoCodesTable() {
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/promo-codes", { cache: "no-store" });
    const data = await res.json();
    setCodes(data.codes ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountPercent: Number(discountPercent),
          maxUses: maxUses ? Number(maxUses) : null,
          expiresAt: expiresAt || null,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось создать код");
        return;
      }

      setCode("");
      setDiscountPercent("10");
      setMaxUses("");
      setExpiresAt("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(c: PromoCode) {
    setBusyId(c.id);

    try {
      await fetch(`/api/admin/promo-codes/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !c.active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: PromoCode) {
    if (!confirm(`Удалить промокод «${c.code}»?`)) return;

    setBusyId(c.id);

    try {
      await fetch(`/api/admin/promo-codes/${c.id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="bg-[#12121c] border border-white/5 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
      >
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Код</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="LETO2026"
            required
            maxLength={30}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Скидка, %</label>
          <input
            type="number"
            min={1}
            max={100}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            required
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Лимит использований</label>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Без лимита"
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1.5 block">Действует до</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="btn-gradient rounded-xl px-4 py-2.5 disabled:opacity-60 transition shrink-0 self-end"
            title="Создать код"
          >
            {creating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
          </button>
        </div>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {!codes ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/5">
                <th className="px-4 py-3 font-medium">Код</th>
                <th className="px-4 py-3 font-medium">Скидка</th>
                <th className="px-4 py-3 font-medium">Использован</th>
                <th className="px-4 py-3 font-medium">Действует до</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>

            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono font-medium flex items-center gap-2">
                    <Tag size={13} className="text-violet-400 shrink-0" />
                    {c.code}
                  </td>
                  <td className="px-4 py-3">{c.discountPercent}%</td>
                  <td className="px-4 py-3 text-gray-400">
                    {c.usedCount}
                    {c.maxUses ? ` / ${c.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.expiresAt ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      disabled={busyId === c.id}
                      className={`text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap transition disabled:opacity-50 ${
                        c.active
                          ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                          : "bg-gray-500/15 text-gray-400 hover:bg-gray-500/25"
                      }`}
                    >
                      {c.active ? "Активен" : "Выключен"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      disabled={busyId === c.id}
                      title="Удалить"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {codes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Промокодов пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
