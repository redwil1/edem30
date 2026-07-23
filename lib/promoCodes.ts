import "server-only";

import { sql } from "@/lib/db";

export type PromoCode = {
  id: number;
  code: string;
  discountPercent: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

type PromoCodeRow = {
  id: number;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

function toPromoCode(r: PromoCodeRow): PromoCode {
  return {
    id: r.id,
    code: r.code,
    discountPercent: r.discount_percent,
    maxUses: r.max_uses,
    usedCount: r.used_count,
    expiresAt: r.expires_at,
    active: r.active,
    createdAt: r.created_at,
  };
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  const rows = await sql<PromoCodeRow[]>`
    SELECT id, code, discount_percent, max_uses, used_count, expires_at, active, created_at
    FROM promo_codes
    ORDER BY id DESC
  `;

  return rows.map(toPromoCode);
}

export type CreatePromoCodeInput = {
  code: string;
  discountPercent: number;
  maxUses: number | null;
  expiresAt: string | null;
};

export async function createPromoCode(
  input: CreatePromoCodeInput
): Promise<PromoCode | { error: string }> {
  const code = input.code.trim().toUpperCase();

  if (!code || code.length < 3 || code.length > 30) {
    return { error: "Код должен быть от 3 до 30 символов" };
  }

  if (!input.discountPercent || input.discountPercent < 1 || input.discountPercent > 100) {
    return { error: "Скидка должна быть от 1 до 100%" };
  }

  const existing = await sql`SELECT id FROM promo_codes WHERE code = ${code}`;

  if (existing.length > 0) {
    return { error: "Такой код уже существует" };
  }

  const rows = await sql<PromoCodeRow[]>`
    INSERT INTO promo_codes (code, discount_percent, max_uses, expires_at)
    VALUES (${code}, ${input.discountPercent}, ${input.maxUses}, ${input.expiresAt})
    RETURNING id, code, discount_percent, max_uses, used_count, expires_at, active, created_at
  `;

  return toPromoCode(rows[0]);
}

export async function setPromoCodeActive(id: number, active: boolean): Promise<boolean> {
  const result = await sql`UPDATE promo_codes SET active = ${active} WHERE id = ${id}`;

  return result.count > 0;
}

export async function deletePromoCode(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM promo_codes WHERE id = ${id}`;

  return result.count > 0;
}
