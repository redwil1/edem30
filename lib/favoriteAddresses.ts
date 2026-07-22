import "server-only";

import { sql } from "@/lib/db";

export type FavoriteAddress = {
  id: number;
  label: string;
  address: string;
};

const MAX_FAVORITES = 8;

export async function listFavoriteAddresses(userId: number): Promise<FavoriteAddress[]> {
  const rows = await sql<FavoriteAddress[]>`
    SELECT id, label, address FROM favorite_addresses
    WHERE user_id = ${userId}
    ORDER BY id ASC
  `;

  return rows;
}

export type AddFavoriteResult =
  | { ok: true; id: number }
  | { ok: false; reason: "limit" };

export async function addFavoriteAddress(
  userId: number,
  label: string,
  address: string
): Promise<AddFavoriteResult> {
  const [{ c }] = await sql<{ c: string }[]>`
    SELECT COUNT(*) as c FROM favorite_addresses WHERE user_id = ${userId}
  `;

  if (Number(c) >= MAX_FAVORITES) {
    return { ok: false, reason: "limit" };
  }

  const rows = await sql<{ id: number }[]>`
    INSERT INTO favorite_addresses (user_id, label, address, created_at)
    VALUES (
      ${userId}, ${label}, ${address},
      to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
    RETURNING id
  `;

  return { ok: true, id: rows[0].id };
}

export async function deleteFavoriteAddress(
  userId: number,
  id: number
): Promise<boolean> {
  const result = await sql`
    DELETE FROM favorite_addresses WHERE id = ${id} AND user_id = ${userId}
  `;

  return result.count > 0;
}
