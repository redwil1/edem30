"use client";

import { useEffect, useState } from "react";
import { Loader2, Star, Trash2 } from "lucide-react";

type Review = {
  id: number;
  authorName: string;
  rating: number;
  comment: string | null;
  tripRoute: string;
  tripId: number;
};

export default function AdminReviewsTable() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load(min: number) {
    const res = await fetch(
      `/api/admin/reviews${min > 0 ? `?minRating=${min}` : ""}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setReviews(data.reviews ?? []);
  }

  useEffect(() => {
    load(minRating);
  }, [minRating]);

  async function remove(reviewId: number) {
    setBusyId(reviewId);

    await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });

    await load(minRating);
    setBusyId(null);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-sm text-gray-500">Рейтинг от:</span>

        <select
          value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          className="bg-[#12121c] border border-white/5 rounded-xl px-3 py-2 text-sm outline-none"
        >
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "Все" : `${n}+`}
            </option>
          ))}
        </select>
      </div>

      {!reviews ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/5">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Пользователь</th>
                <th className="px-4 py-3 font-medium">Рейтинг</th>
                <th className="px-4 py-3 font-medium">Текст</th>
                <th className="px-4 py-3 font-medium">Поездка</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>

            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-gray-500">{r.id}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {r.authorName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Star size={13} className="fill-yellow-400" />
                      {r.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[280px] truncate">
                    {r.comment || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {r.tripRoute}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remove(r.id)}
                      disabled={busyId === r.id}
                      className="text-red-400 hover:text-red-300 disabled:opacity-60"
                      title="Удалить отзыв"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {reviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Отзывов нет
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
