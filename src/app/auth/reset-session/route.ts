import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthCookieName } from "@/lib/supabase/session-recovery";

function getSafeNextPath(request: NextRequest) {
  const requestedPath = request.nextUrl.searchParams.get("next");
  if (!requestedPath?.startsWith("/") || requestedPath.startsWith("//")) {
    return "/careers";
  }

  try {
    const resolved = new URL(requestedPath, request.nextUrl.origin);
    if (
      resolved.origin !== request.nextUrl.origin ||
      resolved.pathname === "/auth/reset-session"
    ) {
      return "/careers";
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/careers";
  }
}

export function GET(request: NextRequest) {
  const redirectUrl = new URL(getSafeNextPath(request), request.url);
  const response = NextResponse.redirect(redirectUrl);
  const authCookieName = getSupabaseAuthCookieName();

  if (authCookieName) {
    for (const cookie of request.cookies.getAll()) {
      if (
        cookie.name !== authCookieName &&
        !cookie.name.startsWith(`${authCookieName}.`)
      ) {
        continue;
      }
      response.cookies.set({
        name: cookie.name,
        value: "",
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      });
    }
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
