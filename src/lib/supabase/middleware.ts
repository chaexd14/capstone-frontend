import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest, policy: string) {
  const nextResponse = () => {
    const headers = new Headers(request.headers);
    headers.set("Content-Security-Policy", policy);
    return NextResponse.next({ request: { headers } });
  };
  let supabaseResponse = nextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = nextResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  // Read only server-controlled claims (app_metadata). Client user_metadata is never trusted.
  // Authoritative API permissions and RecruiterContext enforce database checks with the backend.
  const role = (user?.app_metadata?.role as string | undefined)?.toLowerCase();

  // 1. Recruiter Route Protection (/recruiter/*, /admin, /admin/*)
  const isRecruiterRoute =
    (pathname.startsWith("/recruiter") && !["/recruiter/login", "/recruiter/signup"].includes(pathname)) ||
    pathname.startsWith("/admin");

  if (isRecruiterRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/recruiter/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

  }

  // 2. Applicant Protected Routes (/applicant/* except /applicant/login)
  const isApplicantProtectedRoute =
    pathname.startsWith("/applicant") && !["/applicant/login", "/applicant/signup"].includes(pathname);

  if (isApplicantProtectedRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/applicant/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (role === "recruiter") {
      // Recruiter tried to access applicant-only area
      const url = request.nextUrl.clone();
      url.pathname = "/recruiter";
      return NextResponse.redirect(url);
    }
  }

  // 3. Auth Page Redirections if already logged in
  if (pathname === "/recruiter/login" && user) {
    if (role === "recruiter" || role === "superadmin") {
      const url = request.nextUrl.clone();
      url.pathname = "/recruiter";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/applicant/login" && user) {
    if (role === "applicant") {
      const url = request.nextUrl.clone();
      url.pathname = "/careers";
      return NextResponse.redirect(url);
    }
    if (role === "recruiter" || role === "superadmin") {
      const url = request.nextUrl.clone();
      url.pathname = "/recruiter";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
