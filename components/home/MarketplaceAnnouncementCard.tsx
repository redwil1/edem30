"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import { useMarketplaceAnnouncementVisible } from "@/lib/marketplaceAnnouncementBanner";

export default function MarketplaceAnnouncementCard() {
  const [visible, dismiss] = useMarketplaceAnnouncementVisible();

  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-xs rounded-3xl overflow-hidden border border-violet-500/20 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Закрыть"
          className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition"
        >
          <X size={15} />
        </button>

        <Link href="/marketplace" onClick={dismiss} className="block">
          <Image
            src="/marketplace-announcement.jpg"
            alt="Барахолка теперь в Едем30 — продавай, покупай или отдавай вещи рядом"
            width={1024}
            height={1024}
            className="w-full h-auto"
            priority
          />
        </Link>

        <Link
          href="/marketplace/new"
          onClick={dismiss}
          aria-label="Разместить объявление"
          className="absolute z-10 rounded-full hover:bg-white/10 active:bg-white/15 transition"
          style={{ left: "17%", right: "17%", top: "86%", bottom: "5.5%" }}
        />
      </div>
    </div>
  );
}
