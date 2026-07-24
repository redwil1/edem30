export type TrafficSource = "vk" | "telegram" | "ok" | "google" | "yandex" | "direct" | "other";

export const TRAFFIC_SOURCES: TrafficSource[] = [
  "vk",
  "telegram",
  "ok",
  "google",
  "yandex",
  "direct",
  "other",
];

export const TRAFFIC_SOURCE_LABELS: Record<TrafficSource, string> = {
  vk: "VK",
  telegram: "Telegram",
  ok: "Одноклассники",
  google: "Google",
  yandex: "Яндекс",
  direct: "Прямой заход",
  other: "Другое",
};

export const TRAFFIC_SOURCE_COLORS: Record<TrafficSource, string> = {
  vk: "#3987e5",
  telegram: "#d95926",
  ok: "#199e70",
  google: "#c98500",
  yandex: "#d55181",
  direct: "#008300",
  other: "#9085e9",
};

export function isTrafficSource(value: unknown): value is TrafficSource {
  return typeof value === "string" && (TRAFFIC_SOURCES as string[]).includes(value);
}

const HOST_RULES: [pattern: RegExp, source: TrafficSource][] = [
  [/(^|\.)vk\.(com|ru)$/i, "vk"],
  [/(^|\.)m\.vk\.(com|ru)$/i, "vk"],
  [/(^|\.)t\.me$/i, "telegram"],
  [/(^|\.)telegram\.(org|me)$/i, "telegram"],
  [/(^|\.)(ok\.ru|odnoklassniki\.ru)$/i, "ok"],
  [/(^|\.)google\.[a-z.]+$/i, "google"],
  [/(^|\.)yandex\.[a-z.]+$/i, "yandex"],
  [/(^|\.)ya\.ru$/i, "yandex"],
];

const UTM_SOURCE_RULES: [pattern: RegExp, source: TrafficSource][] = [
  [/vk/i, "vk"],
  [/telegram|tg/i, "telegram"],
  [/^ok$|odnoklassniki/i, "ok"],
  [/google|adwords|gads/i, "google"],
  [/yandex|ya\b/i, "yandex"],
];

/** Определяет источник перехода по utm_source (если явно указан) или по referrer. */
export function detectTrafficSource(
  utmSource: string | null | undefined,
  referrer: string | null | undefined
): TrafficSource {
  if (utmSource) {
    for (const [pattern, source] of UTM_SOURCE_RULES) {
      if (pattern.test(utmSource)) return source;
    }
  }

  if (!referrer) return "direct";

  try {
    const host = new URL(referrer).hostname;

    for (const [pattern, source] of HOST_RULES) {
      if (pattern.test(host)) return source;
    }
  } catch {
    return "other";
  }

  return "other";
}

export type SourceCookiePayload = {
  source: TrafficSource;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPath: string | null;
};

export const SOURCE_COOKIE_NAME = "edem30_src";

export function parseSourceCookie(raw: string | undefined | null): SourceCookiePayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));

    if (!isTrafficSource(parsed.source)) return null;

    return {
      source: parsed.source,
      utmSource: typeof parsed.utmSource === "string" ? parsed.utmSource.slice(0, 200) : null,
      utmMedium: typeof parsed.utmMedium === "string" ? parsed.utmMedium.slice(0, 200) : null,
      utmCampaign: typeof parsed.utmCampaign === "string" ? parsed.utmCampaign.slice(0, 200) : null,
      utmContent: typeof parsed.utmContent === "string" ? parsed.utmContent.slice(0, 200) : null,
      utmTerm: typeof parsed.utmTerm === "string" ? parsed.utmTerm.slice(0, 200) : null,
      landingPath: typeof parsed.landingPath === "string" ? parsed.landingPath.slice(0, 200) : null,
    };
  } catch {
    return null;
  }
}
