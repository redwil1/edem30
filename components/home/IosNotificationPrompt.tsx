"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Share, SquarePlus } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { isIos, isStandalone, subscribeToPush } from "@/lib/pushSubscribeClient";

const SNOOZE_KEY = "edem30_ios_push_prompt_snoozed_until";
const SNOOZE_HOURS = 24;

function isSnoozed() {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_HOURS * 60 * 60 * 1000));
  } catch {
    // ignore
  }
}

export default function IosNotificationPrompt() {
  const { user } = useAuth();

  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isIos() || isSnoozed()) return;

    const standalone = isStandalone();
    setInstalled(standalone);

    if (!standalone) {
      setVisible(true);
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      if (!existing) setVisible(true);
    });
  }, [user]);

  if (!visible) return null;

  async function enable() {
    setLoading(true);
    setError(null);

    const result = await subscribeToPush();

    setLoading(false);

    if (result.ok) {
      setVisible(false);
      return;
    }

    if (result.reason === "ios-not-installed") {
      setInstalled(false);
      return;
    }

    setError("Не удалось включить. Попробуйте ещё раз или проверьте настройки уведомлений для Едем30 в Настройках iPhone.");
  }

  function dismiss() {
    snooze();
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 h-[100dvh] bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#171726] w-full max-w-md rounded-3xl p-6 max-h-[85dvh] overflow-y-auto">
        <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center mb-4">
          <Bell size={22} className="text-violet-400" />
        </div>

        <h2 className="text-xl font-bold mb-3">Включите уведомления</h2>

        <p className="text-sm text-gray-400 leading-6 mb-3">
          На iPhone мы не можем напомнить вам о важном без вашего разрешения. Без
          уведомлений вы рискуете пропустить:
        </p>

        <ul className="text-sm text-gray-300 space-y-1.5 mb-4 list-disc list-inside">
          <li>отклик попутчика на вашу поездку</li>
          <li>сообщение от водителя перед выездом</li>
          <li>ответ поддержки на ваш вопрос</li>
          <li>новый заказ такси, если вы водитель</li>
        </ul>

        <p className="text-sm text-gray-400 leading-6 mb-5">
          Это займёт 10 секунд и работает так же, как в обычном приложении из App
          Store.
        </p>

        {!installed ? (
          <div className="bg-[#1c1c2b] rounded-xl p-4 text-sm text-gray-300 leading-6">
            Сначала установите Едем30 на экран «Домой»:
            <br />
            1. Нажмите <Share size={13} className="inline -mt-0.5 mx-0.5" /> «Поделиться»
            внизу Safari
            <br />
            2. Выберите <SquarePlus size={13} className="inline -mt-0.5 mx-0.5" /> «На
            экран «Домой»»
            <br />
            3. Откройте Едем30 со значка на экране и вернитесь на эту страницу
          </div>
        ) : (
          <>
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <button
              onClick={enable}
              disabled={loading}
              className="btn-gradient w-full disabled:opacity-60 transition rounded-xl py-3.5 font-bold flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
              {loading ? "Включаем..." : "Включить уведомления"}
            </button>
          </>
        )}

        <button
          onClick={dismiss}
          className="w-full mt-3 text-sm text-gray-500 hover:text-gray-300 transition py-2"
        >
          Напомнить позже
        </button>
      </div>
    </div>
  );
}
