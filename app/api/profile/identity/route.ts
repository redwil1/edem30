import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { isValidAvatarPreset, isValidGender } from "@/lib/avatarPresets";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const limit = rateLimit(`identity-save:${user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  if (body?.gender !== undefined) {
    if (body.gender !== null && !isValidGender(body.gender)) {
      return NextResponse.json({ error: "Некорректный пол" }, { status: 400 });
    }

    await sql`UPDATE users SET gender = ${body.gender || null} WHERE id = ${user.id}`;
  }

  if (body?.avatarPreset !== undefined) {
    if (body.avatarPreset !== null && !isValidAvatarPreset(body.avatarPreset)) {
      return NextResponse.json({ error: "Некорректная аватарка" }, { status: 400 });
    }

    // Выбор готовой аватарки отменяет загруженное фото, иначе оно
    // продолжит показываться вместо пресета (у фото приоритет в Avatar).
    await sql`
      UPDATE users SET avatar_preset = ${body.avatarPreset || null}, avatar_url = NULL
      WHERE id = ${user.id}
    `;
  }

  return NextResponse.json({ ok: true });
}
