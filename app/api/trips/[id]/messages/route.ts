import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

type MessageRow = {
  id: number;
  user_id: number;
  name: string;
  text: string;
  created_at: string;
};

function isParticipant(tripId: number, userId: number) {
  const row = db
    .prepare(
      "SELECT 1 FROM trip_participants WHERE trip_id = ? AND user_id = ?"
    )
    .get(tripId, userId);

  return !!row;
}

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const user = await getCurrentUser();

  const rows = db
    .prepare(
      `SELECT chat_messages.id as id, chat_messages.user_id as user_id,
              users.name as name, chat_messages.text as text,
              chat_messages.created_at as created_at
       FROM chat_messages
       JOIN users ON users.id = chat_messages.user_id
       WHERE chat_messages.trip_id = ?
       ORDER BY chat_messages.created_at ASC`
    )
    .all(tripId) as MessageRow[];

  return NextResponse.json(
    {
      messages: rows.map((r) => ({
        id: r.id,
        authorName: r.name,
        text: r.text,
        createdAt: r.created_at,
        isYou: user ? r.user_id === user.id : false,
      })),
      canPost: user ? isParticipant(tripId, user.id) : false,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Войдите, чтобы писать в чат" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  if (!isParticipant(tripId, user.id)) {
    return NextResponse.json(
      { error: "Присоединитесь к поездке, чтобы писать в чат" },
      { status: 403 }
    );
  }

  const limit = rateLimit(`message:${user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много сообщений. Подождите немного." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);

  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  if (text.length > 1000) {
    return NextResponse.json(
      { error: "Слишком длинное сообщение" },
      { status: 400 }
    );
  }

  const result = db
    .prepare(
      "INSERT INTO chat_messages (trip_id, user_id, text) VALUES (?, ?, ?)"
    )
    .run(tripId, user.id, text);

  return NextResponse.json({
    id: Number(result.lastInsertRowid),
    authorName: user.name,
    text,
    createdAt: new Date().toISOString(),
    isYou: true,
  });
}
