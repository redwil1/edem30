"use client";

import { MouseEvent, useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

export default function FavoriteButton({
  listingId,
  initialFavorited,
  variant = "default",
}: {
  listingId: number;
  initialFavorited: boolean;
  variant?: "default" | "overlay";
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/login?redirect=/marketplace/${listingId}`);
      return;
    }

    setLoading(true);
    const next = !favorited;

    const res = await fetch(`/api/marketplace/listings/${listingId}/favorite`, {
      method: next ? "POST" : "DELETE",
    });

    if (res.ok) setFavorited(next);
    setLoading(false);
  }

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-label={favorited ? "Убрать из избранного" : "В избранное"}
        className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition disabled:opacity-60 ${
          favorited ? "bg-black/50 text-red-400" : "bg-black/40 text-white/80 hover:text-white"
        }`}
      >
        <Heart size={15} className={favorited ? "fill-red-400" : ""} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={favorited ? "Убрать из избранного" : "В избранное"}
      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition shrink-0 disabled:opacity-60 ${
        favorited
          ? "bg-red-500/15 border-red-500/30 text-red-400"
          : "bg-[#171726] border-white/10 text-gray-400 hover:text-white"
      }`}
    >
      <Heart size={17} className={favorited ? "fill-red-400" : ""} />
    </button>
  );
}
