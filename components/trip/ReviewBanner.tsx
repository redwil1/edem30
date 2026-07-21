"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  tripId: number;
  revieweeId?: number;
  title?: string;
  subtitle?: string;
};

export default function ReviewBanner({
  tripId,
  revieweeId,
  title = "Как прошла поездка?",
  subtitle = "Ваш отзыв помогает другим пассажирам сделать правильный выбор",
}: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
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
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
          ...(revieweeId ? { revieweeId } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Не удалось отправить отзыв");
        setSubmitting(false);
        return;
      }

      setDone(true);
    } catch {
      setError("Не удалось подключиться к серверу");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 text-center text-green-400 font-medium">
        Спасибо за отзыв!
      </div>
    );
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="font-bold">{title}</div>

      <div className="text-sm text-gray-500 mt-1">{subtitle}</div>

      <div className="flex items-center gap-1 mt-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            aria-label={`Оценка ${n}`}
          >
            <Star
              size={24}
              className={
                (hover || rating) >= n
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-600"
              }
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий (необязательно)"
        rows={2}
        maxLength={500}
        className="w-full bg-[#1c1c2b] rounded-xl p-3 mt-4 outline-none text-sm placeholder:text-gray-500 resize-none"
      />

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-xl px-6 py-3 font-bold mt-4"
      >
        {submitting ? "Отправляем..." : "Оставить отзыв"}
      </button>
    </div>
  );
}
