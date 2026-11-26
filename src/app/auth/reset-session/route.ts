import { NextRequest, NextResponse } from "next/server";

function getSupabaseCookiePrefix() {
  try {
    const projectReference = new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
    ).hostname.split(".")[0];
    return projectReference ? `sb-${projectReference}-` : null;
  } catch {
    return null;
  }
}

export function GET(request: NextRequest) {
  const redirectUrl = new URL("/careers", request.url);
  const response = NextResponse.redirect(redirectUrl);
  const cookiePrefix = getSupabaseCookiePrefix();

  if (cookiePrefix) {
    for (const cookie of request.cookies.getAll()) {
      if (!cookie.name.startsWith(cookiePrefix)) continue;
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
