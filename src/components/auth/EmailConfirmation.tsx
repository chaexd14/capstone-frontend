"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSafeRedirectUrl } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/client";

type ConfirmationState = "checking" | "confirmed" | "invalid";

export default function EmailConfirmation() {
  const router = useRouter();
  const [state, setState] = useState<ConfirmationState>("checking");

  useEffect(() => {
    let active = true;

    const confirmEmail = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorDescription = url.searchParams.get("error_description");
      const destination = getSafeRedirectUrl(url.searchParams.get("next"), "/careers");
      const supabase = createClient();

      if (errorDescription) {
        if (active) setState("invalid");
        return;
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) throw error || new Error("Missing confirmation session");
        }

        window.history.replaceState({}, document.title, "/auth/callback");
        if (!active) return;
        setState("confirmed");
        window.setTimeout(() => {
          router.replace(destination);
          router.refresh();
        }, 1200);
      } catch {
        if (active) setState("invalid");
      }
    };

    void confirmEmail();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm" aria-live="polite">
        {state === "checking" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Confirming your email</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Please keep this page open while TalentMatch verifies the one-time link.</p>
          </>
        )}

        {state === "confirmed" && (
          <>
            <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Email confirmed</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Your account is ready. We are taking you back to TalentMatch.</p>
          </>
        )}

        {state === "invalid" && (
          <>
            <MailWarning className="mx-auto h-9 w-9 text-amber-600" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Confirmation link unavailable</h1>
            <p role="alert" className="mt-2 text-sm leading-6 text-slate-600">This link is invalid, expired, or has already been used. Return to sign up or sign in to request a new confirmation.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild><Link href="/signup">Return to sign up</Link></Button>
              <Button asChild variant="outline"><Link href="/login">Go to sign in</Link></Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
