"use client";

import { ReactNode, useState } from "react";

type Props = {
  overview: ReactNode;
  reviews: ReactNode;
  reviewsCount: number;
};

export default function ProfileTabs({ overview, reviews, reviewsCount }: Props) {
  const [tab, setTab] = useState<"overview" | "reviews">("overview");

  return (
    <div>
      <div className="flex items-center gap-1 bg-[#171723] rounded-2xl p-1 mb-6">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
            tab === "overview"
              ? "bg-violet-600 text-white"
              : "text-gray-300 hover:text-white"
          }`}
        >
          Профиль
        </button>

        <button
          type="button"
          onClick={() => setTab("reviews")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
            tab === "reviews"
              ? "bg-violet-600 text-white"
              : "text-gray-300 hover:text-white"
          }`}
        >
          Отзывы{reviewsCount > 0 ? ` (${reviewsCount})` : ""}
        </button>
      </div>

      {tab === "overview" ? overview : reviews}
    </div>
  );
}
