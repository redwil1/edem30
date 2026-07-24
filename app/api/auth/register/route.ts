import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { sql } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";
import { verifyCaptcha } from "@/lib/captcha";
import { isPlaceholderName } from "@/lib/nameValidation";
import { isValidEmail, verifyEmailCode } from "@/lib/emailVerification";
import { parseSourceCookie, SOURCE_COOKIE_NAME } from "@/lib/traffic";

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
  const dataConsent = body?.dataConsent === true;
  const emailRaw =
    typeof body?.email === "string" ? body.email.trim().slice(0, 200) : "";
  const emailCode =
    typeof body?.emailCode === "string" ? body.emailCode.trim() : "";

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

  if (!dataConsent) {
    return NextResponse.json(
      { error: "Подтвердите согласие на обработку персональных данных, чтобы продолжить" },
      { status: 400 }
    );
  }

  if (!pushConsent) {
    return NextResponse.json(
      { error: "Подтвердите согласие на push-уведомления, чтобы продолжить" },
      { status: 400 }
    );
  }

  if (!isValidEmail(emailRaw)) {
    return NextResponse.json({ error: "Укажите корректную почту" }, { status: 400 });
  }

  if (!emailCode) {
    return NextResponse.json(
      { error: "Подтвердите почту кодом из письма" },
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

  const codeCheck = await verifyEmailCode(emailRaw, emailCode);

  if (!codeCheck.ok) {
    return NextResponse.json({ error: codeCheck.error }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const cookieStore = await cookies();
  const sourceInfo = parseSourceCookie(cookieStore.get(SOURCE_COOKIE_NAME)?.value);

  let userId: number;

  try {
    const now = new Date().toISOString();

    const inserted = await sql<{ id: number }[]>`
      INSERT INTO users (
        name, phone, password_hash, email, push_consent_at, data_consent_at,
        signup_source, signup_utm_source, signup_utm_medium, signup_utm_campaign,
        signup_utm_content, signup_utm_term
      )
      VALUES (
        ${name}, ${phone}, ${passwordHash}, ${codeCheck.email}, ${now}, ${now},
        ${sourceInfo?.source ?? "direct"}, ${sourceInfo?.utmSource ?? null},
        ${sourceInfo?.utmMedium ?? null}, ${sourceInfo?.utmCampaign ?? null},
        ${sourceInfo?.utmContent ?? null}, ${sourceInfo?.utmTerm ?? null}
      )
      RETURNING id
    `;

    userId = inserted[0].id;
  } catch {
    return NextResponse.json(
      { error: "Эта почта уже привязана к другому аккаунту" },
      { status: 409 }
    );
  }

  await createSession(userId);

  return NextResponse.json({ id: userId, name, phone });
}
