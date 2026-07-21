"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Users } from "lucide-react";

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
    <div className="mb-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-lg">
        <button
          type="button"
          onClick={() => choose("passenger")}
          disabled={switching !== null}
          className={`rounded-2xl p-3.5 sm:p-4 border transition text-left disabled:opacity-70 ${
            user?.role === "passenger"
              ? "bg-violet-600 border-violet-500"
              : "bg-[#14141f] border-violet-500/20 hover:border-violet-500"
          }`}
        >
          <Users size={18} className="mb-2" />
          <div className="font-bold text-sm">Я — Пассажир</div>
        </button>

        <button
          type="button"
          onClick={() => choose("driver")}
          disabled={switching !== null}
          className={`rounded-2xl p-3.5 sm:p-4 border transition text-left disabled:opacity-70 ${
            user?.role === "driver"
              ? "bg-violet-600 border-violet-500"
              : "bg-[#14141f] border-violet-500/20 hover:border-violet-500"
          }`}
        >
          <Car size={18} className="mb-2" />
          <div className="font-bold text-sm">Я — Водитель</div>
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mt-2 max-w-lg">{error}</p>}
    </div>
  );
}
