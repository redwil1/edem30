import "server-only";

import { sql } from "@/lib/db";
import { createSignedDownloadUrl } from "@/lib/storage";

export type VerificationStatus = "none" | "pending" | "approved" | "rejected";

export async function submitVerification(
  userId: number,
  docPath: string
): Promise<void> {
  await sql`
    UPDATE users
    SET verification_status = 'pending',
        verification_doc_path = ${docPath},
        verification_submitted_at = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    WHERE id = ${userId}
  `;
}

export async function getVerificationStatus(
  userId: number
): Promise<VerificationStatus> {
  const rows = await sql<{ verification_status: VerificationStatus }[]>`
    SELECT verification_status FROM users WHERE id = ${userId}
  `;

  return rows[0]?.verification_status ?? "none";
}

export type PendingVerification = {
  userId: number;
  name: string;
  phone: string;
  submittedAt: string | null;
  docUrl: string;
};

export async function listPendingVerifications(): Promise<PendingVerification[]> {
  const rows = await sql<
    { id: number; name: string; phone: string; verification_submitted_at: string | null; verification_doc_path: string | null }[]
  >`
    SELECT id, name, phone, verification_submitted_at, verification_doc_path
    FROM users
    WHERE verification_status = 'pending'
    ORDER BY verification_submitted_at ASC
  `;

  return Promise.all(
    rows
      .filter((r) => r.verification_doc_path)
      .map(async (r) => ({
        userId: r.id,
        name: r.name,
        phone: r.phone,
        submittedAt: r.verification_submitted_at,
        docUrl: await createSignedDownloadUrl("driver-documents", r.verification_doc_path!),
      }))
  );
}

export async function setVerificationDecision(
  userId: number,
  approve: boolean
): Promise<boolean> {
  const result = await sql`
    UPDATE users
    SET verification_status = ${approve ? "approved" : "rejected"}
    WHERE id = ${userId} AND verification_status = 'pending'
  `;

  return result.count > 0;
}
