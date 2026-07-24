"use client";

import { useEffect } from "react";

import { detectTrafficSource, SOURCE_COOKIE_NAME, type SourceCookiePayload } from "@/lib/traffic";

const SESSION_FLAG = "edem30_visit_logged";
const COOKIE_MAX_AGE_DAYS = 180;

function readCookie(name: string): string | undefined {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match?.split("=")[1];
}

function writeCookie(name: string, value: string, days: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${days * 86400}; SameSite=Lax`;
}

export default function VisitTracker() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_FLAG)) return;

    sessionStorage.setItem(SESSION_FLAG, "1");

    const existing = readCookie(SOURCE_COOKIE_NAME);

    let payload: SourceCookiePayload;

    if (existing) {
      try {
        payload = JSON.parse(decodeURIComponent(existing));
      } catch {
        payload = buildPayload();
        writeCookie(SOURCE_COOKIE_NAME, JSON.stringify(payload), COOKIE_MAX_AGE_DAYS);
      }
    } else {
      payload = buildPayload();
      writeCookie(SOURCE_COOKIE_NAME, JSON.stringify(payload), COOKIE_MAX_AGE_DAYS);
    }

    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, []);

  return null;
}

function buildPayload(): SourceCookiePayload {
  const params = new URLSearchParams(window.location.search);

  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmContent = params.get("utm_content");
  const utmTerm = params.get("utm_term");

  const source = detectTrafficSource(utmSource, document.referrer || null);

  return {
    source,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    landingPath: window.location.pathname,
  };
}
