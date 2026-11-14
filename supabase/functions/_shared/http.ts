export const snaptradeCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-profile, accept-profile",
  "Content-Type": "application/json",
};

const passwordCorsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

// Each endpoint supplies its own origin policy; sharing formatting must not broaden access.
export function createCorsHeaders(
  allowedOrigins: ReadonlySet<string>,
  headers: Record<string, string> = passwordCorsHeaders,
  fallbackOrigin?: string
) {
  return (req: Request): Record<string, string> => {
    const origin = req.headers.get("origin") ?? "";
    const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : fallbackOrigin;
    return {
      ...headers,
      ...(allowedOrigin !== undefined ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    };
  };
}

export function createJsonResponder(headers: HeadersInit) {
  return (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers });
}

export async function parseBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function readTextSafe(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
