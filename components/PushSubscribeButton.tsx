"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Share, SquarePlus } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { isIos, isStandalone, subscribeToPush } from "@/lib/pushSubscribeClient";

const REASON_MESSAGES: Record<string, string> = {
  "permission-denied":
    "Уведомления заблокированы в настройках браузера. Разрешите их для сайта и попробуйте снова.",
  unsupported: "Ваш браузер не поддерживает push-уведомления.",
  "no-key": "Уведомления временно недоступны. Попробуйте позже.",
  error: "Не удалось включить уведомления. Попробуйте ещё раз.",
};

export default function PushSubscribeButton() {
  const { user } = useAuth();

  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsIosInstall, setNeedsIosInstall] = useState(false);

  useEffect(() => {
    if (isIos() && !isStandalone()) {
      setNeedsIosInstall(true);
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setSupported(true);

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setSubscribed(!!existing);
    });
  }, []);

  if (!user) return null;

  if (needsIosInstall) {
    return (
      <div className="text-sm text-gray-400 bg-[#1c1c2b] rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Bell size={15} className="shrink-0 mt-0.5" />
        <span>
          Чтобы получать уведомления на iPhone, сначала установите сайт на экран «Домой»:
          нажмите <Share size={13} className="inline -mt-0.5 mx-0.5" /> «Поделиться» внизу
          Safari, затем <SquarePlus size={13} className="inline -mt-0.5 mx-0.5" /> «На экран
          «Домой»». После этого откройте Едем30 со значка на экране и включите уведомления здесь.
        </span>
      </div>
    );
  }

  if (!supported) return null;

  async function subscribe() {
    setLoading(true);
    setError(null);

    try {
      const result = await subscribeToPush();

      if (result.ok) {
        setSubscribed(true);
      } else {
        setError(REASON_MESSAGES[result.reason] ?? REASON_MESSAGES.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe();
      }

      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2.5 disabled:opacity-60 transition"
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : subscribed ? (
          <BellOff size={15} />
        ) : (
          <Bell size={15} />
        )}
        {subscribed ? "Отключить уведомления" : "Включить уведомления"}
      </button>

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
