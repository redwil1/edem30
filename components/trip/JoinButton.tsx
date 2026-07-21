"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

type Props = {
  tripId: number;
  joined: boolean;
};

export default function JoinButton({ tripId, joined }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function leave() {
    setLoading(true);

    await fetch(`/api/trips/${tripId}/leave`, { method: "POST" });

    router.refresh();
    setLoading(false);
  }

  if (joined) {
    return (
      <div className="mt-5 space-y-2">
        <div className="w-full flex items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 py-3 text-sm font-medium">
          <Check size={16} />
          Вы участник поездки
        </div>

        <button
          onClick={leave}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-60 transition py-3 text-sm font-medium text-gray-400"
        >
          <LogOut size={15} />
          {loading ? "Секунду..." : "Покинуть поездку"}
        </button>
      </div>
    );
  }

  async function join() {
    if (!user) {
      router.push(`/login?redirect=/trip/${tripId}`);
      return;
    }

    setLoading(true);

    await fetch(`/api/trips/${tripId}/join`, { method: "POST" });

    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={join}
      disabled={loading}
      className="w-full mt-5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-xl py-3 text-sm font-bold"
    >
      {loading
        ? "Секунду..."
        : user
        ? "Забронировать место"
        : "Войдите, чтобы забронировать"}
    </button>
  );
}
