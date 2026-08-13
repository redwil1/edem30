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
          className={`group relative rounded-2xl p-3.5 sm:p-4 border transition-all text-left disabled:opacity-70 ${
            user?.role === "passenger"
              ? "bg-gradient-to-br from-violet-600 to-violet-700 border-violet-400 shadow-[0_8px_24px_-6px_rgba(124,58,237,0.55)]"
              : "bg-[#14141f] border-violet-500/20 hover:border-violet-500/60 hover:-translate-y-0.5"
          }`}
        >
          {user?.role === "passenger" && (
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <Check size={12} className="text-white" strokeWidth={3} />
            </span>
          )}

          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${
              user?.role === "passenger" ? "bg-white/15" : "bg-violet-600/15 group-hover:bg-violet-600/25"
            }`}
          >
            <Users size={16} className={user?.role === "passenger" ? "text-white" : "text-violet-400"} />
          </div>

          <div className="font-display font-bold text-sm">Я — Пассажир</div>
          <div
            className={`text-[11px] mt-0.5 ${user?.role === "passenger" ? "text-violet-100" : "text-gray-500"}`}
          >
            Ищу поездку
          </div>
        </button>

        <button
          type="button"
          onClick={() => choose("driver")}
          disabled={switching !== null}
          className={`group relative rounded-2xl p-3.5 sm:p-4 border transition-all text-left disabled:opacity-70 ${
            user?.role === "driver"
              ? "bg-gradient-to-br from-violet-600 to-violet-700 border-violet-400 shadow-[0_8px_24px_-6px_rgba(124,58,237,0.55)]"
              : "bg-[#14141f] border-violet-500/20 hover:border-violet-500/60 hover:-translate-y-0.5"
          }`}
        >
          {user?.role === "driver" && (
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <Check size={12} className="text-white" strokeWidth={3} />
            </span>
          )}

          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${
              user?.role === "driver" ? "bg-white/15" : "bg-violet-600/15 group-hover:bg-violet-600/25"
            }`}
          >
            <Car size={16} className={user?.role === "driver" ? "text-white" : "text-violet-400"} />
          </div>

          <div className="font-display font-bold text-sm">Я — Водитель</div>
          <div
            className={`text-[11px] mt-0.5 ${user?.role === "driver" ? "text-violet-100" : "text-gray-500"}`}
          >
            Публикую поездки
          </div>
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
