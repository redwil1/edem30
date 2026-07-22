"use client";

import Link from "next/link";
import { UserPen, X } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { isPlaceholderName } from "@/lib/nameValidation";

export default function RealNameNotifier() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed || !isPlaceholderName(user.name)) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-[#171726] border border-yellow-500/30 rounded-2xl p-4 shadow-xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
          <UserPen size={17} className="text-yellow-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">Укажите настоящее имя</div>

          <div className="text-xs text-gray-400 mt-0.5">
            Другим участникам поездок будет спокойнее знать, с кем они едут
          </div>

          <Link
            href="/profile"
            onClick={() => setDismissed(true)}
            className="inline-block text-xs font-medium bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25 transition rounded-lg px-3 py-1.5 mt-2.5"
          >
            Изменить в профиле
          </Link>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-gray-500 hover:text-white transition shrink-0"
          aria-label="Скрыть"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
