const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function corsHeaders(): Record<string, string> {
  return { ...CORS_HEADERS };
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
