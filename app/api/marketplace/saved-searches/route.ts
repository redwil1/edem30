import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createSavedSearch, deleteSavedSearch, listSavedSearches } from "@/lib/marketplace";
import { isValidCategory } from "@/data/marketplaceCategories";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const searches = await listSavedSearches(user.id);

  return NextResponse.json({ searches }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const limit = rateLimit(`marketplace-saved-search:${user.id}`, { limit: 20, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 120) : "";
  const category = isValidCategory(body?.category) ? body.category : null;
  const city = typeof body?.city === "string" && body.city.trim() ? body.city.trim() : null;
  const priceMin = Number.isFinite(body?.priceMin) ? Number(body.priceMin) : null;
  const priceMax = Number.isFinite(body?.priceMax) ? Number(body.priceMax) : null;
  const notify = body?.notify !== false;

  if (!query && !category && !city) {
    return NextResponse.json(
      { error: "Укажите хотя бы запрос, категорию или город" },
      { status: 400 }
    );
  }

  const id = await createSavedSearch(user.id, { query, category, city, priceMin, priceMax, notify });

  return NextResponse.json({ id });
}

export async function DELETE(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const deleted = await deleteSavedSearch(id, user.id);

  if (!deleted) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
