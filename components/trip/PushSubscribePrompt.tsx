"use client";

import { useEffect, useState } from "react";
import { Bell, Share, SquarePlus, X } from "lucide-react";

import { isIos, isStandalone, subscribeToPush } from "@/lib/pushSubscribeClient";

type Props = {
  reason: string;
};

export default function PushSubscribePrompt({ reason }: Props) {
  const [visible, setVisible] = useState(false);
  const [needsIosInstall, setNeedsIosInstall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isIos() && !isStandalone()) {
      setNeedsIosInstall(true);
      setVisible(true);
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      if (!existing) setVisible(true);
    });
  }, []);

  if (!visible) return null;

  async function enable() {
    setLoading(true);
    setError(false);

    const result = await subscribeToPush();

    setLoading(false);

    if (result.ok) {
      setVisible(false);
      return;
    }

    if (result.reason === "ios-not-installed") {
      setNeedsIosInstall(true);
      return;
    }

    setError(true);
  }

  return (
    <div className="bg-[#171726] border border-violet-500/20 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
        <Bell size={16} className="text-violet-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">Включите уведомления</div>
        <div className="text-xs text-gray-400 mt-0.5">{reason}</div>

        {needsIosInstall ? (
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            На iPhone сначала установите сайт на экран «Домой»: нажмите{" "}
            <Share size={12} className="inline -mt-0.5 mx-0.5" /> «Поделиться» внизу
            Safari, затем <SquarePlus size={12} className="inline -mt-0.5 mx-0.5" /> «На
            экран «Домой»».
          </p>
        ) : (
          <>
            {error && (
              <p className="text-xs text-red-400 mt-1.5">
                Не удалось включить. Попробуйте ещё раз.
              </p>
            )}

            <button
              type="button"
              onClick={enable}
              disabled={loading}
              className="mt-2.5 text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-lg px-3.5 py-2"
            >
              {loading ? "Включаем..." : "Включить"}
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-gray-500 hover:text-white transition shrink-0"
        aria-label="Не сейчас"
      >
        <X size={14} />
      </button>
    </div>
  );
}
