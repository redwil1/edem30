"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { REPORT_CATEGORIES } from "@/lib/reportCategories";

type Props = {
  tripId: number;
  open: boolean;
  onClose: () => void;
};

export default function ReportModal({ tripId, open, onClose }: Props) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function close() {
    onClose();
    setTimeout(() => {
      setCategory("");
      setDescription("");
      setError("");
      setDone(false);
    }, 200);
  }

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function submit() {
    if (!category) {
      setError("Выберите категорию жалобы");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/trips/${tripId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description: description.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось отправить жалобу");
        setSubmitting(false);
        return;
      }

      setDone(true);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50"
      onClick={close}
    >
      <div
        className="bg-[#171726] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl font-bold">
            Пожаловаться на поездку
          </h2>

          <button
            onClick={close}
            className="text-gray-400 hover:text-white transition p-1"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="text-center text-green-400 font-medium py-6">
            Спасибо, жалоба отправлена. Мы её рассмотрим.
          </div>
        ) : (
          <>
            <label className="text-xs text-gray-500 mb-1.5 block">Категория</label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#222233] border border-white/10 focus:border-violet-500 rounded-xl p-3.5 mb-4 outline-none transition"
            >
              <option value="">Выберите категорию</option>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <label className="text-xs text-gray-500 mb-1.5 block">
              Опишите проблему своими словами (необязательно)
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Что произошло?"
              className="w-full bg-[#222233] border border-white/10 focus:border-violet-500 rounded-xl p-3.5 outline-none placeholder:text-gray-500 resize-none transition"
            />

            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="btn-gradient w-full disabled:opacity-60 transition rounded-xl py-3.5 font-bold mt-5"
            >
              {submitting ? "Отправляем..." : "Отправить жалобу"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
