import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";
import { deleteFavoriteAddress } from "@/lib/favoriteAddresses";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function DELETE(req: NextRequest, { params }: Props) {
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

  const { id } = await params;
  const addressId = Number(id);

  if (!Number.isInteger(addressId) || addressId <= 0) {
    return NextResponse.json({ error: "Некорректный адрес" }, { status: 400 });
  }

  const ok = await deleteFavoriteAddress(user.id, addressId);

  if (!ok) {
    return NextResponse.json({ error: "Адрес не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
