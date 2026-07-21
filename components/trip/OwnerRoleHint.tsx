"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

export default function OwnerRoleHint() {
  const router = useRouter();
  const { setRole } = useAuth();
  const [switching, setSwitching] = useState(false);

  async function switchToDriver() {
    setSwitching(true);
    await setRole("driver");
    router.refresh();
    setSwitching(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-violet-600/10 border border-violet-500/20 rounded-2xl px-4 py-3.5">
      <div className="flex items-center gap-2.5 text-sm text-gray-300">
        <Car size={16} className="text-violet-400 shrink-0" />
        Это ваша поездка — переключитесь в режим водителя, чтобы управлять ей
      </div>

      <button
        onClick={switchToDriver}
        disabled={switching}
        className="text-sm font-medium text-violet-400 hover:text-violet-300 disabled:opacity-60 transition whitespace-nowrap shrink-0"
      >
        {switching ? "Секунду..." : "Переключиться"}
      </button>
    </div>
  );
}
