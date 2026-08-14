import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { getListingById, setListingStatus, updateListing } from "@/lib/marketplace";
import {
  isValidCategory,
  isValidCondition,
  isValidListingType,
} from "@/data/marketplaceCategories";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: "Некорректное объявление" }, { status: 400 });
  }

  const listing = await getListingById(listingId);

  if (!listing) {
    return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
  }

  return NextResponse.json({ listing }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest, { params }: Props) {
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

  const limit = rateLimit(`marketplace-edit:${user.id}`, { limit: 20, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const type = body?.type;
  const category = body?.category;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const description =
    typeof body?.description === "string" ? body.description.trim().slice(0, 3000) : "";
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

  const price = priceType === "free" ? null : Number(body?.price);

  if (priceType !== "free" && (!Number.isFinite(price) || (price as number) < 0)) {
    return NextResponse.json({ error: "Укажите корректную цену" }, { status: 400 });
  }

  const updated = await updateListing(
    listingId,
    user.id,
    {
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
    }
  );

  if (!updated) {
    return NextResponse.json({ error: "Объявление не найдено или доступ запрещён" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

/** Удаление — это архивация, а не hard delete, чтобы не рвать чаты/избранное/жалобы на него. */
export async function DELETE(req: NextRequest, { params }: Props) {
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

  const updated = await setListingStatus(listingId, user.id, "archived");

  if (!updated) {
    return NextResponse.json({ error: "Объявление не найдено или доступ запрещён" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
