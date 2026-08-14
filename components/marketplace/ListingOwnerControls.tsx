"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2, Pencil, Trash2 } from "lucide-react";

import type { ListingStatus } from "@/lib/marketplace";

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "active", label: "Активно" },
  { value: "reserved", label: "Забронировано" },
  { value: "sold", label: "Продано" },
];

export default function ListingOwnerControls({
  listingId,
  status,
}: {
  listingId: number;
  status: ListingStatus;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(next: string) {
    setUpdating(true);
    setError("");

    const res = await fetch(`/api/marketplace/listings/${listingId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => null);

    setUpdating(false);

    if (!res.ok) {
      setError(data?.error || "Не удалось обновить");
      return;
    }

    router.refresh();
  }

  async function archive() {
    if (!confirm("Снять объявление с публикации?")) return;

    setUpdating(true);
    const res = await fetch(`/api/marketplace/listings/${listingId}`, { method: "DELETE" });
    setUpdating(false);

    if (res.ok) router.refresh();
  }

  return (
    <div className="bg-[#12121c] border border-violet-500/20 rounded-2xl p-4 space-y-3">
      <div className="text-xs text-gray-500 font-medium">Это ваше объявление</div>

      {status !== "archived" && (
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatus(s.value)}
              disabled={updating || status === s.value}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition disabled:cursor-default ${
                status === s.value ? "bg-violet-600 text-white" : "bg-[#171726] text-gray-400 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-sm">
        <Link
          href={`/marketplace/${listingId}/edit`}
          className="flex items-center gap-1.5 text-gray-300 hover:text-white transition"
        >
          <Pencil size={14} />
          Изменить
        </Link>

        {status === "active" && (
          <button
            type="button"
            onClick={() => setStatus("bump")}
            disabled={updating}
            className="flex items-center gap-1.5 text-gray-300 hover:text-white transition disabled:opacity-60"
          >
            {updating ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
            Поднять
          </button>
        )}

        {status !== "archived" && (
          <button
            type="button"
            onClick={archive}
            disabled={updating}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition disabled:opacity-60"
          >
            <Trash2 size={14} />
            Снять
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
