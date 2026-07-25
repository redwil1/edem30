"use client";

import { useEffect, useState } from "react";
import type { AdPlacement } from "@/lib/adPlacements";

type Banner = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
};

type Props = {
  placement: AdPlacement;
};

// Компонент готов, но пока нигде не подключён на страницах — реклама
// не показывается пользователям, пока это не потребуется явно.
export default function AdBanner({ placement }: Props) {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    fetch(`/api/ads?placement=${placement}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setBanner(data.banner ?? null))
      .catch(() => setBanner(null));
  }, [placement]);

  if (!banner) return null;

  return (
    <a
      href={banner.linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="block rounded-2xl overflow-hidden border border-white/5 hover:border-violet-500/40 transition"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.imageUrl} alt={banner.title} className="w-full h-auto" />
    </a>
  );
}
