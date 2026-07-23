import "server-only";

import { sql } from "@/lib/db";

export const SETTINGS_KEYS = [
  "commission_percent",
  "min_taxi_price",
  "min_trip_price",
  "support_phone",
  "support_email",
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export type SiteSettings = Record<SettingsKey, string>;

const DEFAULTS: SiteSettings = {
  commission_percent: "10",
  min_taxi_price: "20",
  min_trip_price: "1",
  support_phone: "",
  support_email: "",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await sql<{ key: string; value: string }[]>`
    SELECT key, value FROM site_settings
  `;

  const settings = { ...DEFAULTS };

  for (const row of rows) {
    if (SETTINGS_KEYS.includes(row.key as SettingsKey)) {
      settings[row.key as SettingsKey] = row.value;
    }
  }

  return settings;
}

export async function updateSiteSettings(
  updates: Partial<SiteSettings>
): Promise<SiteSettings> {
  for (const key of SETTINGS_KEYS) {
    const value = updates[key];

    if (value === undefined) continue;

    await sql`
      INSERT INTO site_settings (key, value) VALUES (${key}, ${value})
      ON CONFLICT (key) DO UPDATE SET value = ${value}
    `;
  }

  return getSiteSettings();
}
