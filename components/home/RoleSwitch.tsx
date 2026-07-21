"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Check, Users } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

type Role = "passenger" | "driver";

export default function RoleSwitch() {
  const router = useRouter();
  const { user, setRole } = useAuth();
  const [switching, setSwitching] = useState<Role | null>(null);
  const [error, setError] = useState("");

  async function choose(role: Role) {
    if (!user) {
      router.push(`/login?redirect=/&role=${role}`);
      return;
    }

    if (user.role === role) return;

    setSwitching(role);
    setError("");

    const result = await setRole(role);

    if (!result.ok) {
      setError(result.error);
    }

    router.refresh();
    setSwitching(null);
  }

  return (
    <div className="mb-5 max-w-lg">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        <div className="font-display font-bold text-sm sm:text-base">
          {user ? "Кто вы сегодня?" : "Кто вы — выберите, чтобы продолжить"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => choose("passenger")}
          disabled={switching !== null}
          className={`relative rounded-2xl p-3.5 sm:p-4 border-2 transition text-left disabled:opacity-70 ${
            user?.role === "passenger"
              ? "bg-violet-600 border-violet-400 shadow-[0_0_0_3px_rgba(124,58,237,0.25)]"
              : "bg-[#14141f] border-violet-500/20 hover:border-violet-500"
          }`}
        >
          {user?.role === "passenger" && (
            <Check size={16} className="absolute top-3 right-3 text-white" />
          )}
          <Users size={18} className="mb-2" />
          <div className="font-bold text-sm">Я — Пассажир</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Ищу поездку</div>
        </button>

        <button
          type="button"
          onClick={() => choose("driver")}
          disabled={switching !== null}
          className={`relative rounded-2xl p-3.5 sm:p-4 border-2 transition text-left disabled:opacity-70 ${
            user?.role === "driver"
              ? "bg-violet-600 border-violet-400 shadow-[0_0_0_3px_rgba(124,58,237,0.25)]"
              : "bg-[#14141f] border-violet-500/20 hover:border-violet-500"
          }`}
        >
          {user?.role === "driver" && (
            <Check size={16} className="absolute top-3 right-3 text-white" />
          )}
          <Car size={18} className="mb-2" />
          <div className="font-bold text-sm">Я — Водитель</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Публикую поездки</div>
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
