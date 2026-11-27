"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AccountSettings } from "@/components/account/AccountSettings";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { fetchApi } from "@/lib/api";
import type { AccountIdentity, AccountIdentityResponse } from "@/types/account";

export default function ApplicantAccountPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  const [failed, setFailed] = useState(false);

  const loadIdentity = useCallback(async () => {
    try {
      const response = await fetchApi<AccountIdentityResponse>("/auth/me/");
      if (["recruiter", "superadmin"].includes(response.user.role.toLowerCase())) {
        router.replace("/admin?view=account");
        return;
      }
      setIdentity(response.user);
    } catch {
      setFailed(true);
    }
  }, [router]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadIdentity();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadIdentity]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/80 bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/careers" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm text-primary-foreground shadow-xs">TM</span>
            <span>TalentMatch</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/careers">
              <ArrowLeft aria-hidden="true" />
              Back to careers
            </Link>
          </Button>
        </div>
      </header>
      <main className="px-4 py-7 sm:px-6 sm:py-10">
        {failed ? (
          <div className="mx-auto max-w-4xl rounded-2xl bg-card shadow-xs">
            <ErrorState
              title="Account settings are unavailable"
              description="We could not load your profile. Check your connection and try again."
              onAction={() => {
                setFailed(false);
                void loadIdentity();
              }}
            />
          </div>
        ) : identity ? (
          <AccountSettings identity={identity} onIdentityUpdated={setIdentity} />
        ) : (
          <div className="mx-auto max-w-4xl space-y-6" aria-label="Loading account settings">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        )}
      </main>
    </div>
  );
}
