function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** iOS Safari поддерживает Web Push только для PWA, запущенного со значка на "Домой" (standalone). */
export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS-специфичное свойство, отсутствует в типах DOM
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

/** Открыт ли сайт внутри уже установленного TWA-приложения из RuStore (ru.edem30.twa). */
export function isTwa() {
  return document.referrer.startsWith("android-app://");
}

export type PushSubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason: "ios-not-installed" | "unsupported" | "permission-denied" | "no-key" | "error";
    };

/** Запрашивает разрешение браузера и подписывает пользователя на push. */
export async function subscribeToPush(): Promise<PushSubscribeResult> {
  try {
    if (isIos() && !isStandalone()) {
      return { ok: false, reason: "ios-not-installed" };
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, reason: "unsupported" };
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return { ok: false, reason: "no-key" };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "permission-denied" };

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
