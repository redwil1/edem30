"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, Star, Trophy } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import AvatarUploader from "@/components/profile/AvatarUploader";
import { GENDERS } from "@/lib/avatarPresets";
import { formatRating } from "@/lib/utils";

type Props = {
  rating: number;
  verified: boolean;
  tripsCount: number;
};

export default function DriverCard({ rating, verified, tripsCount }: Props) {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function save(patch: { name?: string; gender?: string | null }) {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/profile/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось сохранить");
        return;
      }

      await refresh();
    } finally {
      setSaving(false);
    }
  }

  function saveNameIfChanged() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== user!.name) save({ name: trimmed });
  }

  return (
    <div className="bg-[#171726] rounded-3xl p-5 sm:p-6 border border-violet-500/10">
      <div className="flex items-center gap-4">
        <AvatarUploader />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveNameIfChanged}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              maxLength={60}
              className="bg-transparent font-bold text-lg outline-none border-b border-transparent focus:border-violet-500 transition min-w-0 w-full"
            />

            {saving && <Loader2 size={14} className="animate-spin text-gray-500 shrink-0" />}
          </div>

          <div className="flex items-center gap-1 text-yellow-400 mt-1 text-sm">
            <Star size={13} className="fill-yellow-400" />
            {formatRating(rating)}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {GENDERS.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => save({ gender: g.value })}
            disabled={saving}
            className={`flex-1 rounded-xl py-2 text-xs font-medium border transition disabled:opacity-60 ${
              user.gender === g.value
                ? "bg-violet-600 border-violet-500 text-white"
                : "bg-[#1c1c2b] border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
        {verified && (
          <div className="flex items-center gap-1.5 text-green-400 text-sm">
            <ShieldCheck size={15} />
            Проверенный водитель
          </div>
        )}

        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
          <Trophy size={15} className="text-yellow-500" />
          {tripsCount.toLocaleString("ru-RU")} поездок
        </div>
      </div>

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
    </div>
  );
}
