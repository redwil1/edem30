"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

type Props = {
  tripId: number;
};

export default function CancelTripButton({ tripId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/trips/${tripId}/cancel`, { method: "POST" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error || "Не удалось отменить поездку");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  if (confirming) {
    return (
      <div className="bg-[#12121c] border border-red-500/30 rounded-3xl p-4 sm:p-6">
        <p className="text-sm text-gray-300 mb-4">
          Точно отменить поездку? Все участники потеряют к ней доступ.
        </p>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={cancel}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 transition rounded-xl py-3 text-sm font-bold"
          >
            {loading ? "Секунду..." : "Да, отменить"}
          </button>

          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="flex-1 border border-white/10 hover:bg-white/5 transition rounded-xl py-3 text-sm font-medium"
          >
            Передумал(а)
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full flex items-center justify-center gap-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition rounded-xl py-3 text-sm font-medium"
    >
      <Ban size={15} />
      Отменить поездку
    </button>
  );
}
