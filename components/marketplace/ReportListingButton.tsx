"use client";

import { useState } from "react";
import { Flag, Loader2, X } from "lucide-react";

import { MARKETPLACE_REPORT_CATEGORIES } from "@/data/marketplaceReportCategories";

export default function ReportListingButton({ listingId }: { listingId: number }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!category) {
      setError("Выберите причину");
      return;
    }

    setSending(true);
    setError("");

    const res = await fetch(`/api/marketplace/listings/${listingId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, description: description || undefined }),
    });
    const data = await res.json().catch(() => null);

    setSending(false);

    if (!res.ok) {
      setError(data?.error || "Не удалось отправить жалобу");
      return;
    }

    setDone(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition"
      >
        <Flag size={12} />
        Пожаловаться
      </button>
    );
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold">Пожаловаться на объявление</div>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition">
          <X size={16} />
        </button>
      </div>

      {done ? (
        <p className="text-sm text-green-400">Жалоба отправлена, администрация рассмотрит её.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {MARKETPLACE_REPORT_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                  category === c.value ? "bg-red-500/20 text-red-400" : "bg-[#171726] text-gray-400"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Подробности (необязательно)"
            rows={2}
            maxLength={500}
            className="w-full bg-[#171726] border border-white/10 focus:border-red-500/40 rounded-xl px-3.5 py-2.5 text-sm outline-none transition resize-none mb-3"
          />

          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="flex items-center gap-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 transition rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
          >
            {sending && <Loader2 size={13} className="animate-spin" />}
            Отправить жалобу
          </button>
        </>
      )}
    </div>
  );
}
