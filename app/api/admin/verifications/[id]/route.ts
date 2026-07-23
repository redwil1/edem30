import { NextRequest, NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { isTrustedOrigin } from "@/lib/security";
import { setVerificationDecision } from "@/lib/verification";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const admin = await requireStaff();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const approve = body?.approve === true;

  const ok = await setVerificationDecision(userId, approve);

  if (!ok) {
    return NextResponse.json(
      { error: "Заявка не найдена или уже рассмотрена" },
      { status: 400 }
    );
  }

  sendPushToUser(userId, {
    title: approve ? "Вы прошли верификацию" : "Верификация отклонена",
    body: approve
      ? "Теперь у вашего профиля есть отметка проверенного водителя"
      : "Попробуйте загрузить документ ещё раз в профиле",
    url: "/profile",
  });

  return NextResponse.json({ ok: true });
}
