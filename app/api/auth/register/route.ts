import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";
import { verifyCaptcha } from "@/lib/captcha";
import { isPlaceholderName } from "@/lib/nameValidation";

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
  const pushConsent = body?.pushConsent === true;

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

  if (isPlaceholderName(name)) {
    return NextResponse.json(
      { error: "Укажите настоящее имя, а не «аноним» или похожее" },
      { status: 400 }
    );
  }

  if (phone.length !== 11) {
    return NextResponse.json(
      { error: "Номер телефона должен содержать 11 цифр" },
      { status: 400 }
    );
  }

  if (password.length < 7) {
    return NextResponse.json(
      { error: "Пароль должен быть не короче 7 символов" },
      { status: 400 }
    );
  }

  if (!pushConsent) {
    return NextResponse.json(
      { error: "Подтвердите согласие на push-уведомления, чтобы продолжить" },
      { status: 400 }
    );
  }

  const existing = await sql`SELECT id FROM users WHERE phone = ${phone}`;

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Пользователь с этим номером уже зарегистрирован" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const inserted = await sql<{ id: number }[]>`
    INSERT INTO users (name, phone, password_hash, push_consent_at)
    VALUES (${name}, ${phone}, ${passwordHash}, ${new Date().toISOString()})
    RETURNING id
  `;

  const userId = inserted[0].id;

  await createSession(userId);

  return NextResponse.json({ id: userId, name, phone });
}
