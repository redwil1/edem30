"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";

export default function DealConfirmCard({ listingId }: { listingId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [matched, setMatched] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sendingReview, setSendingReview] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/marketplace/listings/${listingId}/review`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setCanReview(!!data.canReview);
        setAlreadyReviewed(!!data.alreadyReviewed);
      });
  }, [listingId]);

  async function confirmDeal() {
    setConfirming(true);
    setError("");

    const res = await fetch(`/api/marketplace/listings/${listingId}/deal`, { method: "POST" });
    const data = await res.json().catch(() => null);

    setConfirming(false);

    if (!res.ok) {
      setError(data?.error || "Не удалось подтвердить сделку");
      return;
    }

    setConfirmed(true);
    setMatched(!!data.matched);

    if (data.matched) {
      const reviewRes = await fetch(`/api/marketplace/listings/${listingId}/review`, { cache: "no-store" });
      const reviewData = await reviewRes.json().catch(() => null);
      setCanReview(!!reviewData?.canReview);
    }

    router.refresh();
  }

  async function sendReview() {
    if (rating === 0) {
      setError("Поставьте оценку");
      return;
    }

    setSendingReview(true);
    setError("");

    const res = await fetch(`/api/marketplace/listings/${listingId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: comment || undefined }),
    });
    const data = await res.json().catch(() => null);

    setSendingReview(false);

    if (!res.ok) {
      setError(data?.error || "Не удалось отправить отзыв");
      return;
    }

    setReviewSent(true);
  }

  if (alreadyReviewed || reviewSent) {
    return (
      <div className="bg-[#12121c] border border-green-500/20 rounded-2xl p-4 text-sm text-green-400">
        Спасибо! Отзыв отправлен.
      </div>
    );
  }

  if (canReview) {
    return (
      <div className="bg-[#12121c] border border-violet-500/20 rounded-2xl p-4">
        <div className="text-sm font-bold mb-3">Оцените сделку</div>

        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)}>
              <Star
                size={22}
                className={n <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}
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
          className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition resize-none mb-3"
        />

        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        <button
          type="button"
          onClick={sendReview}
          disabled={sendingReview}
          className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60 transition flex items-center gap-2"
        >
          {sendingReview && <Loader2 size={14} className="animate-spin" />}
          Отправить отзыв
        </button>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 text-sm text-gray-400">
        {matched
          ? "Сделка подтверждена с обеих сторон."
          : "Подтверждение отправлено — ждём, когда подтвердит вторая сторона."}
      </div>
    );
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
      <div className="text-sm font-bold mb-1">Сделка состоялась?</div>
      <p className="text-xs text-gray-500 mb-3">
        Подтвердите, если купля-продажа реально произошла — тогда можно будет оставить отзыв.
      </p>

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <button
        type="button"
        onClick={confirmDeal}
        disabled={confirming}
        className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60 transition flex items-center gap-2"
      >
        {confirming && <Loader2 size={14} className="animate-spin" />}
        Да, сделка состоялась
      </button>
    </div>
  );
}
