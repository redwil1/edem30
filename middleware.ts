import { NextRequest, NextResponse } from "next/server";

// Пути, которые сканеры уязвимостей перебирают на любом сайте (чужие CMS,
// .env, git-каталоги и т.п.) — у нас их никогда не будет, отсекаем сразу,
// не тратя на них рендер/БД.
const BLOCKED_PATH_PATTERNS: RegExp[] = [
  /^\/wp-admin/i,
  /^\/wp-login/i,
  /^\/wp-content/i,
  /^\/wp-includes/i,
  /^\/xmlrpc\.php$/i,
  /^\/phpmyadmin/i,
  /^\/administrator/i,
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.aws/i,
  /^\/vendor\/phpunit/i,
  /^\/config\.json$/i,
  /^\/actuator/i,
];

// Общий предохранитель по IP на все запросы, отдельно от точечных лимитов
// внутри самих API-роутов (логин, код подтверждения и т.д. лимитированы
// строже уже там). Это just-in-case щит от простого флуда/скрейпинга,
// а не замена нормального rate limiting в конкретных ручках.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 240;

const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (BLOCKED_PATH_PATTERNS.some((p) => p.test(path))) {
    return new NextResponse(null, { status: 404 });
  }

  const ip = getClientIp(req);
  const now = Date.now();

  sweep(now);

  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    bucket.count += 1;

    if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        { error: "Слишком много запросов, попробуйте позже" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|sw.js|robots.txt|sitemap.xml).*)",
  ],
};
