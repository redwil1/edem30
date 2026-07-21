import { Star } from "lucide-react";

import Avatar from "@/components/trip/Avatar";
import { UserReview } from "@/lib/reviews";
import { formatDate } from "@/lib/utils";

type Props = {
  reviews: UserReview[];
};

export default function ReviewsList({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="bg-[#12121c] border border-white/5 rounded-2xl py-12 text-center text-gray-500 text-sm">
        Пока нет отзывов
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div
          key={r.id}
          className="bg-[#12121c] border border-white/5 rounded-2xl p-4"
        >
          <div className="flex items-start gap-3">
            <Avatar
              name={r.authorName}
              size={36}
              avatarUrl={r.authorAvatarUrl}
              avatarPreset={r.authorAvatarPreset}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium truncate">{r.authorName}</div>
                <div className="text-xs text-gray-500 shrink-0">
                  {formatDate(r.createdAt.slice(0, 10))}
                </div>
              </div>

              <div className="flex items-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={14}
                    className={
                      n <= r.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-600"
                    }
                  />
                ))}
              </div>

              <div className="text-xs text-gray-500 mt-1.5">{r.tripRoute}</div>

              {r.comment && (
                <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                  {r.comment}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
