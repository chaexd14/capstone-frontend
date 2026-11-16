"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-bold text-foreground"><span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-white">TM</span>TalentMatch</div>
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><ShieldCheck className="size-5" /></span>
          </div>
          <CardTitle>Activate recruiter access</CardTitle>
          <CardDescription>Set a secure password for the work email that received your invitation.</CardDescription>
        </CardHeader>
        <CardContent>
      <form onSubmit={activate} className="space-y-5">
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
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={busy}>{busy ? "Activating…" : "Activate recruiter account"}</Button>
      </form>
        </CardContent>
      </Card>
    </main>
  );
}
