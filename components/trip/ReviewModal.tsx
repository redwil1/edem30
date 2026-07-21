"use client";

import { useState } from "react";
import { Loader2, Star, X } from "lucide-react";

type Props = {
  tripId: number;
  revieweeId: number;
  revieweeName: string;
  onClose: () => void;
  onSubmitted: () => void;
};

export default function ReviewModal({
  tripId,
  revieweeId,
  revieweeName,
  onClose,
  onSubmitted,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (rating < 1) {
      setError("Поставьте оценку");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/trips/${tripId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim(), revieweeId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось отправить отзыв");
        setSubmitting(false);
        return;
      }

      onSubmitted();
    } catch {
      setError("Не удалось подключиться к серверу");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
      onClick={onClose}
    >
      <div
        className="bg-[#171726] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 -mt-1 -mr-1 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/5 transition"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        <div className="font-display font-bold text-lg -mt-2">
          Поездка завершена
        </div>

        <p className="text-sm text-gray-500 mt-1.5">
          Оцените {revieweeName} — это помогает другим пользователям
        </p>

        <div className="flex items-center justify-center gap-1.5 mt-6">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;

            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                aria-label={`Оценка ${n}`}
                className="transition-transform duration-150 ease-out"
                style={{ transform: active ? "scale(1.2)" : "scale(1)" }}
              >
                <Star
                  size={34}
                  className={`transition-colors duration-150 ${
                    active
                      ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                      : "text-gray-600"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Комментарий (необязательно)"
          rows={2}
          maxLength={500}
          className="w-full bg-[#1c1c2b] rounded-xl p-3 mt-5 outline-none text-sm placeholder:text-gray-500 resize-none text-left"
        />

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <div className="flex items-center gap-2.5 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-3 text-sm font-medium border border-white/10 text-gray-400 hover:bg-white/5 transition"
          >
            Выйти
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={submitting || rating < 1}
            className="btn-gradient flex-1 flex items-center justify-center gap-2 disabled:opacity-60 transition rounded-xl py-3 text-sm font-bold"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}
