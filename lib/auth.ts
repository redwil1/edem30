import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

import { sql } from "@/lib/db";

const COOKIE_NAME = "edem30_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const DEV_FALLBACK_SECRET = "dev-secret-change-me";

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET === DEV_FALLBACK_SECRET)
) {
  throw new Error(
    "SESSION_SECRET must be set to a strong random value in production"
  );
}

const secretKey = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? DEV_FALLBACK_SECRET
);

// Precomputed dummy hash so a login with an unknown phone takes roughly the
// same time as one with a wrong password, instead of leaking which is the
// case through response timing.
const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8Q7d9K8bx6vC0OZ9dJ5dfyPqz3aC1u";

export type UserRole = "passenger" | "driver" | "admin";

export type SafeUser = {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  avatarUrl: string | null;
  avatarPreset: string | null;
  gender: string | null;
  selectedCity: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function verifyPasswordTimingSafe(
  password: string,
  hash: string | null
) {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}

async function encryptSession(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey);
}

async function decryptSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    return payload as { userId: number };
  } catch {
    return null;
  }
}

export async function createSession(userId: number) {
  const token = await encryptSession(userId);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await decryptSession(token);

  if (!payload) return null;

  const rows = await sql<SafeUser[]>`
    SELECT id, name, phone, role, avatar_url as "avatarUrl",
           avatar_preset as "avatarPreset", gender, selected_city as "selectedCity"
    FROM users WHERE id = ${payload.userId}
  `;

  return rows[0] ?? null;
}

export async function setUserRole(userId: number, role: UserRole) {
  await sql`UPDATE users SET role = ${role} WHERE id = ${userId}`;
}

export type PublicUser = {
  id: number;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  avatarPreset: string | null;
  gender: string | null;
  createdAt: string;
};

export async function getPublicUserById(id: number): Promise<PublicUser | null> {
  const rows = await sql<PublicUser[]>`
    SELECT id, name, role, avatar_url as "avatarUrl", avatar_preset as "avatarPreset",
           gender, created_at as "createdAt"
    FROM users WHERE id = ${id}
  `;

  return rows[0] ?? null;
}
