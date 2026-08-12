import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { listOkPosts, publishOkPost } from "@/lib/okPost";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(
    { posts: await listOkPosts() },
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

  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`admin-ok-post:${admin.id}`, { limit: 10, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "Пустой текст поста" }, { status: 400 });
  }

  if (content.length > 4000) {
    return NextResponse.json({ error: "Слишком длинный пост" }, { status: 400 });
  }

  const post = await publishOkPost(content, admin.id);

  return NextResponse.json({ post });
}
