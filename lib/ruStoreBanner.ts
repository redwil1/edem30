"use client";

import { useEffect, useState } from "react";

import { isAndroid, isStandalone, isTwa } from "@/lib/pushSubscribeClient";

const DISMISS_KEY = "edem30_rustore_banner_dismissed";
const CHANGE_EVENT = "edem30:rustore-banner-change";

export function isRuStoreBannerDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissRuStoreBanner() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Показан ли сейчас баннер установки RuStore-приложения — используется как
 * самим баннером, так и другими фиксированными элементами (кнопка
 * поддержки), чтобы не перекрывать друг друга на мобильном.
 */
export function useRuStoreBannerVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function compute() {
      setVisible(isAndroid() && !isTwa() && !isStandalone() && !isRuStoreBannerDismissed());
    }

    compute();
    window.addEventListener(CHANGE_EVENT, compute);
    return () => window.removeEventListener(CHANGE_EVENT, compute);
  }, []);

  return visible;
}
