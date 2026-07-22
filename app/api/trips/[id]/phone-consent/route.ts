import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";
import { isTripPartyMember } from "@/lib/trips";
import { giveConsent, getRevealedPhones, hasConsented } from "@/lib/phoneConsent";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ consented: false, revealed: [] });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const [consented, revealed] = await Promise.all([
    hasConsented(tripId, user.id),
    getRevealedPhones(tripId, user.id),
  ]);

  return NextResponse.json(
    { consented, revealed },
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
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  if (!(await isTripPartyMember(tripId, user.id))) {
    return NextResponse.json(
      { error: "Вы не участник этой поездки" },
      { status: 403 }
    );
  }

  await giveConsent(tripId, user.id);

  const revealed = await getRevealedPhones(tripId, user.id);

  return NextResponse.json({ consented: true, revealed });
}
