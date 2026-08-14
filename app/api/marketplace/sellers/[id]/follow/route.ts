import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";
import { setSellerFollow } from "@/lib/marketplace";

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
  const sellerId = Number(id);

  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
  }

  if (sellerId === user.id) {
    return NextResponse.json({ error: "Нельзя подписаться на себя" }, { status: 400 });
  }

  await setSellerFollow(user.id, sellerId, on);

  return NextResponse.json({ ok: true, following: on });
}

export async function POST(req: NextRequest, { params }: Props) {
  return toggle(req, params, true);
}

export async function DELETE(req: NextRequest, { params }: Props) {
  return toggle(req, params, false);
}
