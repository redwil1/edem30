import "server-only";

import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const TTL_MS = 10 * 60_000;

function sign(payload: string) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function generateCaptcha() {
  const a = 1 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * 8);
  const answer = a + b;

  const payload = `${answer}.${Date.now()}`;
  const token = Buffer.from(`${payload}.${sign(payload)}`).toString(
    "base64url"
  );

  return { question: `${a} + ${b}`, token };
}

export function verifyCaptcha(token: string, userAnswer: number): boolean {
  if (typeof token !== "string" || !Number.isFinite(userAnswer)) return false;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");

    if (parts.length !== 3) return false;

    const [answerStr, tsStr, sig] = parts;
    const expectedSig = sign(`${answerStr}.${tsStr}`);

    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);

    if (
      sigBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return false;
    }

    const ts = Number(tsStr);

    if (!Number.isFinite(ts) || Date.now() - ts > TTL_MS) return false;

    return Number(answerStr) === userAnswer;
  } catch {
    return false;
  }
}
