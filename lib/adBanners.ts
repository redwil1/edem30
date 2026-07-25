import "server-only";

import { sql } from "@/lib/db";
import { AdPlacement, isValidPlacement } from "@/lib/adPlacements";

export type { AdPlacement } from "@/lib/adPlacements";
export { AD_PLACEMENTS, isValidPlacement } from "@/lib/adPlacements";

export type AdBanner = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  placement: AdPlacement;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

type AdBannerRow = {
  id: number;
  title: string;
  image_url: string;
  link_url: string;
  placement: AdPlacement;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

function toBanner(r: AdBannerRow): AdBanner {
  return {
    id: r.id,
    title: r.title,
    imageUrl: r.image_url,
    linkUrl: r.link_url,
    placement: r.placement,
    active: r.active,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdAt: r.created_at,
  };
}

export async function listAdBanners(): Promise<AdBanner[]> {
  const rows = await sql<AdBannerRow[]>`
    SELECT id, title, image_url, link_url, placement, active, starts_at, ends_at, created_at
    FROM ad_banners
    ORDER BY id DESC
  `;

  return rows.map(toBanner);
}

export type CreateAdBannerInput = {
  title: string;
  imageUrl: string;
  linkUrl: string;
  placement: AdPlacement;
  startsAt: string | null;
  endsAt: string | null;
};

export async function createAdBanner(
  input: CreateAdBannerInput
): Promise<AdBanner | { error: string }> {
  const title = input.title.trim();
  const imageUrl = input.imageUrl.trim();
  const linkUrl = input.linkUrl.trim();

  if (!title || title.length > 80) {
    return { error: "Укажите название (до 80 символов)" };
  }

  if (!imageUrl || !/^https?:\/\//.test(imageUrl)) {
    return { error: "Укажите корректную ссылку на картинку" };
  }

  if (!linkUrl || !/^https?:\/\//.test(linkUrl)) {
    return { error: "Укажите корректную ссылку перехода" };
  }

  if (!isValidPlacement(input.placement)) {
    return { error: "Некорректное место показа" };
  }

  const rows = await sql<AdBannerRow[]>`
    INSERT INTO ad_banners (title, image_url, link_url, placement, starts_at, ends_at)
    VALUES (${title}, ${imageUrl}, ${linkUrl}, ${input.placement}, ${input.startsAt}, ${input.endsAt})
    RETURNING id, title, image_url, link_url, placement, active, starts_at, ends_at, created_at
  `;

  return toBanner(rows[0]);
}

export async function setAdBannerActive(id: number, active: boolean): Promise<boolean> {
  const result = await sql`UPDATE ad_banners SET active = ${active} WHERE id = ${id}`;

  return result.count > 0;
}

export async function deleteAdBanner(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM ad_banners WHERE id = ${id}`;

  return result.count > 0;
}

/** Активный баннер для показа на сайте — учитывает active-флаг и даты показа. */
export async function getActiveBannerForPlacement(
  placement: AdPlacement
): Promise<AdBanner | null> {
  const rows = await sql<AdBannerRow[]>`
    SELECT id, title, image_url, link_url, placement, active, starts_at, ends_at, created_at
    FROM ad_banners
    WHERE placement = ${placement}
      AND active = true
      AND (starts_at IS NULL OR starts_at::timestamptz <= now())
      AND (ends_at IS NULL OR ends_at::timestamptz >= now())
    ORDER BY id DESC
    LIMIT 1
  `;

  return rows[0] ? toBanner(rows[0]) : null;
}
