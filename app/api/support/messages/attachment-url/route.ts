import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getSupportConversationBySubject } from "@/lib/conversations";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createSignedUploadUrl } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_TYPES: Record<string, { kind: "image" | "video"; ext: string }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "image/gif": { kind: "image", ext: "gif" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/webm": { kind: "video", ext: "webm" },
  "video/quicktime": { kind: "video", ext: "mov" },
};

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

  const conversationId = await getSupportConversationBySubject(user.id);

  if (!conversationId) {
    return NextResponse.json(
      { error: "Пока нет диалога с поддержкой" },
      { status: 403 }
    );
  }

  const limit = rateLimit(`support-attachment-url:${user.id}`, {
    limit: 15,
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

  const path = `support-${user.id}/${randomUUID()}.${spec.ext}`;

  const { uploadUrl } = await createSignedUploadUrl("chat-attachments", path);

  return NextResponse.json({
    path,
    uploadUrl,
    attachmentType: spec.kind,
  });
}
