"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

import TelegramLoginButton from "@/components/auth/TelegramLoginButton";

export default function LinkedAccounts() {
  const [linked, setLinked] = useState<boolean | null>(null);

  async function load() {
    const res = await fetch("/api/profile/telegram-status", { cache: "no-store" });
    const data = await res.json();
    setLinked(Boolean(data.linked));
  }

  useEffect(() => {
    load();
  }, []);

  if (linked === null) return null;

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 mt-6">
      <div className="flex items-center gap-2 font-bold mb-1">
        <Send size={16} className="text-[#2AABEE]" />
        Telegram
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Привяжите Telegram, чтобы входить на сайт в один клик, без пароля.
      </p>

      {linked ? (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle2 size={16} />
          Telegram привязан
        </div>
      ) : (
        <TelegramLoginButton mode="link" onLinked={load} />
      )}
    </div>
  );
}
