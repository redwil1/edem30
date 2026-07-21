import "server-only";

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");

  if (realIp) return realIp;

  return "unknown";
}

export function isTrustedOrigin(req: Request) {
  const host = req.headers.get("host");

  if (!host) return false;

  const origin = req.headers.get("origin");

  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");

  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // Neither header present — can't verify the request's origin, so fail
  // closed rather than trusting it by default.
  return false;
}
