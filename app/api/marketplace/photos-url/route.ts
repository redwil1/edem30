import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createSignedUploadUrl, publicStorageUrl } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Не привязан к конкретному объявлению — фото загружаются ещё до его
// создания, при заполнении формы. Владение объявлением проверяется
// отдельно при создании/редактировании самой записи.
export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const limit = rateLimit(`marketplace-photo-url:${user.id}`, { limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";

  const ext = ALLOWED_TYPES[contentType];

  if (!ext) {
    return NextResponse.json({ error: "Поддерживаются только JPEG, PNG и WEBP" }, { status: 400 });
  }

  const path = `${user.id}/${randomUUID()}.${ext}`;

  const { uploadUrl } = await createSignedUploadUrl("marketplace-photos", path);
  const publicUrl = publicStorageUrl("marketplace-photos", path);

  return NextResponse.json({ path, uploadUrl, publicUrl });
}
