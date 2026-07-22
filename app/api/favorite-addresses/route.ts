import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { addFavoriteAddress, listFavoriteAddresses } from "@/lib/favoriteAddresses";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ addresses: [] });
  }

  const addresses = await listFavoriteAddresses(user.id);

  return NextResponse.json(
    { addresses },
    { headers: { "Cache-Control": "no-store" } }
  );
}

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

  const limit = rateLimit(`favorite-address:${user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 30) : "";
  const address = typeof body?.address === "string" ? body.address.trim().slice(0, 200) : "";

  if (!label || !address) {
    return NextResponse.json(
      { error: "Укажите название и адрес" },
      { status: 400 }
    );
  }

  const result = await addFavoriteAddress(user.id, label, address);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Можно сохранить не больше 8 адресов" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, id: result.id });
}
