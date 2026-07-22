import "server-only";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function publicStorageUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadToStorage(
  bucket: string,
  path: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    throw new Error(`Storage upload failed: ${res.status} ${await res.text()}`);
  }

  return publicStorageUrl(bucket, path);
}

export async function createSignedDownloadUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 300
): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    }
  );

  if (!res.ok) {
    throw new Error(`Storage sign failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { signedURL: string };

  return `${SUPABASE_URL}/storage/v1${data.signedURL}`;
}

export type SignedUpload = {
  path: string;
  uploadUrl: string;
};

export async function createSignedUploadUrl(
  bucket: string,
  path: string
): Promise<SignedUpload> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/upload/sign/${bucket}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": "application/json",
      },
      body: "{}",
    }
  );

  if (!res.ok) {
    throw new Error(`Storage sign failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { url: string };

  return {
    path,
    uploadUrl: `${SUPABASE_URL}/storage/v1${data.url}`,
  };
}
