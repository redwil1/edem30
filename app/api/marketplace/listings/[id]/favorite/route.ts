import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";
import { setFavorite } from "@/lib/marketplace";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

async function toggle(req: NextRequest, params: Props["params"], on: boolean) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: "Некорректное объявление" }, { status: 400 });
  }

  await setFavorite(user.id, listingId, on);

  return NextResponse.json({ ok: true, favorited: on });
}

export async function POST(req: NextRequest, { params }: Props) {
  return toggle(req, params, true);
}

export async function DELETE(req: NextRequest, { params }: Props) {
  return toggle(req, params, false);
}
