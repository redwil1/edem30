"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, MailX } from "lucide-react";

export default function EmailNotifyToggle() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profile/notifications", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setEmail(data?.email ?? null);
        setEnabled(data?.emailNotifyFallback ?? true);
      })
      .catch(() => setEmail(null));
  }, []);

  // Без привязанной почты переключателю нечего переключать — почта
  // добавляется выше, в EmailSettings.
  if (!email) return null;

  async function toggle() {
    const next = !enabled;
    setLoading(true);

    try {
      const res = await fetch("/api/profile/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotifyFallback: next }),
      });

      if (res.ok) setEnabled(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 mt-6">
      <div className="flex items-center gap-2 font-bold mb-1">
        <Mail size={16} className="text-violet-400" />
        Уведомления на почту
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Если push-уведомления недоступны (например, не разрешены в браузере), важные события по
        вашей поездке — водитель выехал, прибыл, поездка завершена или отменена — продублируются
        на почту.
      </p>

      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2.5 disabled:opacity-60 transition"
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : enabled ? (
          <MailX size={15} />
        ) : (
          <Mail size={15} />
        )}
        {enabled ? "Отключить письма-дубли" : "Включить письма-дубли"}
      </button>
    </div>
  );
}
