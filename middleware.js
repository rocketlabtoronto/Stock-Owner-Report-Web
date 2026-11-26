import { next } from "@vercel/functions";

// Vercel Routing Middleware. It only gates deployments whose project sets BASIC_AUTH_ENABLED=true
// (the Dev project), so Production stays public. Credentials live in Vercel environment variables,
// never in the repository or the browser bundle.

const encoder = new TextEncoder();

// Compares every byte so response time does not reveal how much of a guess was correct.
function safeEqual(actual, expected) {
  const a = encoder.encode(actual);
  const b = encoder.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

function readCredentials(request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) return null;
  try {
    const decoded = atob(encoded);
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

export default function middleware(request) {
  if (process.env.BASIC_AUTH_ENABLED !== "true") return next();

  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    return new Response("Basic auth is enabled but not configured.", { status: 500 });
  }

  const credentials = readCredentials(request);
  const userOk = safeEqual(credentials?.user ?? "", expectedUser);
  const passwordOk = safeEqual(credentials?.password ?? "", expectedPassword);
  if (credentials && userOk && passwordOk) return next();

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Stock Owner Report Dev", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}
