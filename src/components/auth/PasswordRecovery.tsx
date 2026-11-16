"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function recoveryClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { isSingleton: false, auth: { detectSessionInUrl: false, autoRefreshToken: false } },
  );
}

async function openRecoveryLink() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const flowId = url.searchParams.get("sb_flow_id");
  window.history.replaceState(window.history.state, "", url.pathname);
  if (!code) return null;

  const client = recoveryClient();
  let recoveryUserId: string | undefined;
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") recoveryUserId = session?.user.id;
  });
  try {
    const { data, error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    return !error && recoveryUserId && data.session?.user.id === recoveryUserId
      ? { client, userId: recoveryUserId }
      : null;
  } finally {
    subscription.unsubscribe();
  }
}

export default function PasswordRecovery() {
  const pendingLink = useRef<ReturnType<typeof openRecoveryLink> | null>(null);
  const [recovery, setRecovery] = useState<Awaited<ReturnType<typeof openRecoveryLink>>>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    pendingLink.current ??= openRecoveryLink();
    void pendingLink.current.then(
      (result) => { if (active) setRecovery(result); },
      () => { if (active) setRecovery(null); },
    );
    return () => { active = false; };
  }, []);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recovery || busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < 15 || new TextEncoder().encode(password).length > 72) {
      setError("Use at least 15 characters and at most 72 bytes.");
      return;
    }
    if (password !== form.get("confirm")) {
      setError("The passwords must match.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { data: { user } } = await recovery.client.auth.getUser();
      if (user?.id !== recovery.userId) {
        setRecovery(null);
        return;
      }
      const { error: updateError } = await recovery.client.auth.updateUser({ password });
      if (updateError) {
        setError("The password could not be updated. Choose a different password or request a fresh recovery link.");
        return;
      }
      setComplete(true);
      const { error: signOutError } = await recovery.client.auth.signOut();
      if (signOutError) await recovery.client.auth.signOut({ scope: "local" });
    } catch {
      setError("The request could not be completed. Try again or request a fresh link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex items-center justify-between"><Link href="/" className="flex items-center gap-2 text-sm font-bold"><span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">TM</span>TalentMatch</Link><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><KeyRound className="size-5" /></span></div>
        <CardTitle>{complete ? "Password updated" : "Reset your password"}</CardTitle>
        <CardDescription>Use the secure recovery link from your email to set a new password.</CardDescription>
        {complete && <p className="text-sm text-muted-foreground">Sign in with your new password.</p>}
        {!complete && recovery === undefined && <p role="status" className="text-sm text-muted-foreground">Checking your recovery link…</p>}
        {!complete && recovery === null && <p role="alert" className="text-sm text-muted-foreground">This link is invalid or expired. Request a new one from the sign-in page.</p>}
      </CardHeader>
      <CardContent className="space-y-5">
      {!complete && recovery && (
        <form onSubmit={resetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-password">New password</Label>
            <Input id="reset-password" name="password" type="password" autoComplete="new-password"
              minLength={15} maxLength={72} required disabled={busy} aria-describedby="reset-password-help" />
            <p id="reset-password-help" className="text-sm text-muted-foreground">Use at least 15 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password"
              minLength={15} maxLength={72} required disabled={busy} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
        </form>
      )}
      <Link href="/login" className="w-fit text-sm font-medium text-primary hover:underline">Back to sign in</Link>
      </CardContent>
      </Card>
    </main>
  );
}
