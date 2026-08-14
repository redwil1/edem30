import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import {
  countActiveListingsByOwner,
  createListing,
  isMarketplaceBanned,
  listListings,
  notifySavedSearchMatches,
} from "@/lib/marketplace";
import {
  isValidCategory,
  isValidCondition,
  isValidListingType,
} from "@/data/marketplaceCategories";

export const runtime = "nodejs";

const MAX_ACTIVE_LISTINGS = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viewer = await getCurrentUser();

  const query = searchParams.get("q") ?? undefined;
  const categoryParam = searchParams.get("category");
  const cityParam = searchParams.get("city");
  const typeParam = searchParams.get("type");
  const conditionParam = searchParams.get("condition");
  const priceMinParam = searchParams.get("priceMin");
  const priceMaxParam = searchParams.get("priceMax");
  const photoOnly = searchParams.get("photoOnly") === "1";
  const sortParam = searchParams.get("sort");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam), 60) : undefined;

  const listings = await listListings({
    query,
    category: isValidCategory(categoryParam) ? categoryParam : undefined,
    city: cityParam || undefined,
    type: isValidListingType(typeParam) ? typeParam : undefined,
    condition: isValidCondition(conditionParam) ? conditionParam : undefined,
    priceMin: priceMinParam ? Number(priceMinParam) : undefined,
    priceMax: priceMaxParam ? Number(priceMaxParam) : undefined,
    photoOnly,
    sort: sortParam === "cheap" || sortParam === "expensive" ? sortParam : "newest",
    limit: limit && Number.isFinite(limit) && limit > 0 ? limit : undefined,
    viewerId: viewer?.id,
  });

  return NextResponse.json(
    { listings },
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

  const limit = rateLimit(`marketplace-create:${user.id}`, { limit: 10, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  if (await isMarketplaceBanned(user.id)) {
    return NextResponse.json(
      { error: "Публикация объявлений для вас ограничена администрацией" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);

  const type = body?.type;
  const category = body?.category;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const description =
    typeof body?.description === "string" ? body.description.trim().slice(0, 3000) : "";
  const priceRaw = body?.price;
  const priceType = body?.priceType === "negotiable" || body?.priceType === "free" ? body.priceType : "fixed";
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  const condition = isValidCondition(body?.condition) ? body.condition : null;
  const urgent = body?.urgent === true;
  const exchangePossible = body?.exchangePossible === true;
  const photoUrls = Array.isArray(body?.photoUrls)
    ? body.photoUrls.filter((u: unknown): u is string => typeof u === "string").slice(0, 5)
    : [];

  if (!isValidListingType(type)) {
    return NextResponse.json({ error: "Некорректный тип объявления" }, { status: 400 });
  }

  if (!isValidCategory(category)) {
    return NextResponse.json({ error: "Выберите категорию" }, { status: 400 });
  }

  if (!title || title.length < 3) {
    return NextResponse.json({ error: "Укажите название объявления" }, { status: 400 });
  }

  if (!city) {
    return NextResponse.json({ error: "Укажите город" }, { status: 400 });
  }

  const price = priceType === "free" ? null : Number(priceRaw);

  if (priceType !== "free" && (!Number.isFinite(price) || (price as number) < 0)) {
    return NextResponse.json({ error: "Укажите корректную цену" }, { status: 400 });
  }

  const activeCount = await countActiveListingsByOwner(user.id);

  if (activeCount >= MAX_ACTIVE_LISTINGS) {
    return NextResponse.json(
      { error: `Можно разместить не более ${MAX_ACTIVE_LISTINGS} активных объявлений одновременно` },
      { status: 409 }
    );
  }

  const listingInput = {
    type,
    category,
    title,
    description,
    price: priceType === "free" ? null : (price as number),
    priceType,
    city,
    condition,
    urgent,
    exchangePossible,
    photoUrls,
  };

  const id = await createListing(listingInput, user.id);

  notifySavedSearchMatches(id, listingInput, user.id);

  return NextResponse.json({ id });
}
