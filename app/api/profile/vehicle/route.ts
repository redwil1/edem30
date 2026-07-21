import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { isValidCarBodyType, isValidCarColor } from "@/lib/vehicle";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const rows = await sql<
    {
      car_body_type: string | null;
      car_model: string | null;
      car_plate: string | null;
      car_color: string | null;
    }[]
  >`
    SELECT car_body_type, car_model, car_plate, car_color FROM users WHERE id = ${user.id}
  `;

  const row = rows[0];

  return NextResponse.json(
    {
      bodyType: row?.car_body_type ?? null,
      model: row?.car_model ?? null,
      plate: row?.car_plate ?? null,
      color: row?.car_color ?? null,
    },
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

  const limit = rateLimit(`vehicle-save:${user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const bodyType = body?.bodyType;
  const model =
    typeof body?.model === "string" ? body.model.trim().slice(0, 60) : "";
  const plate =
    typeof body?.plate === "string"
      ? body.plate.trim().toUpperCase().slice(0, 20)
      : "";
  const color = body?.color;

  if (bodyType !== null && bodyType !== "" && !isValidCarBodyType(bodyType)) {
    return NextResponse.json({ error: "Некорректный тип кузова" }, { status: 400 });
  }

  if (color !== null && color !== "" && !isValidCarColor(color)) {
    return NextResponse.json({ error: "Некорректный цвет" }, { status: 400 });
  }

  await sql`
    UPDATE users SET
      car_body_type = ${bodyType || null},
      car_model = ${model || null},
      car_plate = ${plate || null},
      car_color = ${color || null}
    WHERE id = ${user.id}
  `;

  return NextResponse.json({ ok: true });
}
