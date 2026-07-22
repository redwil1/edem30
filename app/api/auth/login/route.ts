import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { verifyPasswordTimingSafe, createSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

type UserRow = {
  id: number;
  name: string;
  phone: string;
  password_hash: string;
};

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60_000 });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток входа. Попробуйте позже." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);

  const phoneRaw =
    typeof body?.phone === "string" ? body.phone.slice(0, 30) : "";
  const password =
    typeof body?.password === "string" ? body.password.slice(0, 200) : "";

  const phone = normalizePhone(phoneRaw);

  const rows = await sql<UserRow[]>`
    SELECT id, name, phone, password_hash FROM users WHERE phone = ${phone}
  `;

  const user = rows[0];

  // Always run a bcrypt compare, even for an unknown phone, so responses
  // for "no such user" and "wrong password" take about the same time.
  const valid = await verifyPasswordTimingSafe(
    password,
    user?.password_hash ?? null
  );

  if (!user || !valid) {
    return NextResponse.json(
      { error: "Неверный номер телефона или пароль" },
      { status: 401 }
    );
  }

  await createSession(user.id);

  await sql`
    UPDATE users SET last_login_ip = ${ip}, last_login_at = ${new Date().toISOString()}
    WHERE id = ${user.id}
  `;

  return NextResponse.json({ id: user.id, name: user.name, phone: user.phone });
}
