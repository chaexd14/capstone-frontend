import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const connectionOrigins = [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api",
  ].flatMap((value) => {
    try {
      const url = new URL(value ?? "");
      return ["http:", "https:"].includes(url.protocol) ? [url.origin] : [];
    } catch {
      return [];
    }
  });
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${connectionOrigins.join(" ")}${development ? " ws: wss:" : ""}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ");

  const response = await updateSession(request, policy);
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
