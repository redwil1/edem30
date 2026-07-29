import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createSignedUploadUrl } from "@/lib/storage";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ userId: string }>;
};

const ALLOWED_TYPES: Record<string, { kind: "image" | "video"; ext: string }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "image/gif": { kind: "image", ext: "gif" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/webm": { kind: "video", ext: "webm" },
  "video/quicktime": { kind: "video", ext: "mov" },
};

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const staff = await requireStaff();

  if (!staff) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { userId } = await params;
  const subjectUserId = Number(userId);

  if (!Number.isInteger(subjectUserId) || subjectUserId <= 0) {
    return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
  }

  const limit = rateLimit(`admin-support-attachment-url:${staff.id}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";

  const spec = ALLOWED_TYPES[contentType];

  if (!spec) {
    return NextResponse.json(
      { error: "Неподдерживаемый тип файла" },
      { status: 400 }
    );
  }

  const path = `support-${subjectUserId}/${randomUUID()}.${spec.ext}`;

  const { uploadUrl } = await createSignedUploadUrl("chat-attachments", path);

  return NextResponse.json({
    path,
    uploadUrl,
    attachmentType: spec.kind,
  });
}
