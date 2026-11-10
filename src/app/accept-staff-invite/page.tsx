"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export default function AcceptStaffInvitePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    if (values.get("password") !== values.get("confirm")) {
      setError("The passwords must match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const tokenHash = new URLSearchParams(window.location.hash.slice(1)).get("token_hash");
      let token: string | undefined;
      if (tokenHash) {
        const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
        if (verified.error || !verified.data.session) {
          throw new Error("This invitation link is invalid or expired. Contact your platform administrator.");
        }
        token = verified.data.session.access_token;
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        token = (await supabase.auth.getSession()).data.session?.access_token;
      }
      if (!token) throw new Error("Open the invitation from your work email to continue.");
      await fetchApi("/auth/staff-invitation/accept/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: values.get("password") }),
      });
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/recruiter/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Activate recruiter access</h1>
        <p className="text-sm text-muted-foreground">
          Set a password for the work email that received your TalentMatch invitation.
        </p>
      </div>
      <form onSubmit={activate} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="invite-password">Password</Label>
          <Input id="invite-password" name="password" type="password" minLength={15} maxLength={72}
            autoComplete="new-password" required disabled={busy} aria-describedby="invite-password-hint" />
          <p id="invite-password-hint" className="text-sm text-muted-foreground">Use at least 15 characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-confirm">Confirm password</Label>
          <Input id="invite-confirm" name="confirm" type="password" minLength={15} maxLength={72}
            autoComplete="new-password" required disabled={busy} />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button disabled={busy}>{busy ? "Activating…" : "Activate account"}</Button>
      </form>
    </main>
  );
}
