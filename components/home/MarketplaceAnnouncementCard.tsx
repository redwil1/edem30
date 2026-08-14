"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import { useMarketplaceAnnouncementVisible } from "@/lib/marketplaceAnnouncementBanner";

export default function MarketplaceAnnouncementCard() {
  const [visible, dismiss] = useMarketplaceAnnouncementVisible();

  if (!visible) return null;

  return (
    <div className="relative max-w-xs mx-auto rounded-3xl overflow-hidden border border-violet-500/20">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Закрыть"
        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition"
      >
        <X size={15} />
      </button>

      <Link href="/marketplace" className="block">
        <Image
          src="/marketplace-announcement.jpg"
          alt="Барахолка теперь в Едем30 — продавай, покупай или отдавай вещи рядом"
          width={1024}
          height={1024}
          className="w-full h-auto"
          priority
        />
      </Link>
    </div>
  );
}
