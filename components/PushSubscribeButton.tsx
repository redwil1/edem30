"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { subscribeToPush } from "@/lib/pushSubscribeClient";

export default function PushSubscribeButton() {
  const { user } = useAuth();

  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setSupported(true);

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setSubscribed(!!existing);
    });
  }, []);

  if (!user || !supported) return null;

  async function subscribe() {
    setLoading(true);

    try {
      const ok = await subscribeToPush();
      if (ok) setSubscribed(true);
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
    <button
      type="button"
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-60 transition"
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
  );
}
