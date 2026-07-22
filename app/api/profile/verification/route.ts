import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { uploadToStorage } from "@/lib/storage";
import { getVerificationStatus, submitVerification } from "@/lib/verification";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ status: "none" });
  }

  const status = await getVerificationStatus(user.id);

  return NextResponse.json(
    { status },
    { headers: { "Cache-Control": "no-store" } }
  );
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

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

  if (user.role !== "driver") {
    return NextResponse.json(
      { error: "Верификация доступна только водителям" },
      { status: 403 }
    );
  }

  const limit = rateLimit(`verification-upload:${user.id}`, {
    limit: 5,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Поддерживаются только JPG, PNG, WEBP или PDF" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Файл слишком большой (максимум 10МБ)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const path = `${user.id}/${Date.now()}.${ext}`;

  await uploadToStorage("driver-documents", path, buffer, file.type);
  await submitVerification(user.id, path);

  return NextResponse.json({ ok: true });
}
