import { sessionCookieHeader } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearAndRedirect(base: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/login", base).toString(),
      "Set-Cookie": sessionCookieHeader("", { delete: true }),
    },
  });
}

// Form posts navigate the browser, so redirect after clearing the cookie.
export async function POST(request: Request) {
  return clearAndRedirect(request.url);
}
