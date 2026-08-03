"use client";

import Image from "next/image";
import { X } from "lucide-react";

import { dismissRuStoreBanner, useRuStoreBannerVisible } from "@/lib/ruStoreBanner";

const RUSTORE_URL = "https://www.rustore.ru/catalog/app/ru.edem30.twa";

/**
 * Показываем только тем, кто открыл сайт в мобильном браузере на Android —
 * если это уже установленное из RuStore TWA-приложение (открыто по
 * android-app:// referrer) или уже standalone-режим, баннер не нужен.
 */
export default function RuStoreInstallBanner() {
  const visible = useRuStoreBannerVisible();

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-40 bg-[#12121c] border-t border-white/10 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <Image
        src="/pwa-icon-192.png"
        alt="Едем30"
        width={40}
        height={40}
        className="rounded-xl shrink-0"
      />

      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold truncate">Едем30</div>
        <div className="text-xs text-gray-500 truncate">Есть приложение в RuStore — быстрее и удобнее сайта</div>
      </div>

      <a
        href={RUSTORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-gradient rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap shrink-0"
      >
        Установить
      </a>

      <button
        type="button"
        onClick={dismissRuStoreBanner}
        aria-label="Закрыть"
        className="text-gray-500 hover:text-gray-300 transition shrink-0 p-1"
      >
        <X size={18} />
      </button>
    </div>
  );
}
