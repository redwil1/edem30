import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";
import { verifyCaptcha } from "@/lib/captcha";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`register:${ip}`, { limit: 5, windowMs: 15 * 60_000 });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);

  const name =
    typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const phoneRaw =
    typeof body?.phone === "string" ? body.phone.slice(0, 30) : "";
  const password =
    typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken : "";
  const captchaAnswer = Number(body?.captchaAnswer);

  const phone = normalizePhone(phoneRaw);

  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    return NextResponse.json(
      { error: "Неверный ответ на проверку. Попробуйте ещё раз." },
      { status: 400 }
    );
  }

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Укажите имя" }, { status: 400 });
  }

  if (phone.length < 10 || phone.length > 15) {
    return NextResponse.json(
      { error: "Укажите корректный номер телефона" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Пароль должен быть не короче 6 символов" },
      { status: 400 }
    );
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE phone = ?")
    .get(phone);

  if (existing) {
    return NextResponse.json(
      { error: "Пользователь с этим номером уже зарегистрирован" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const result = db
    .prepare(
      "INSERT INTO users (name, phone, password_hash) VALUES (?, ?, ?)"
    )
    .run(name, phone, passwordHash);

  const userId = Number(result.lastInsertRowid);

  await createSession(userId);

  return NextResponse.json({ id: userId, name, phone });
}
