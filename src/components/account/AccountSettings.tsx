"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Mail, Pencil, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import {
  Section,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "@/components/ui/section";
import { ApiError, fetchApi } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { validateName } from "@/lib/validation";
import type { AccountIdentity, AccountIdentityResponse } from "@/types/account";

interface AccountSettingsProps {
  identity: AccountIdentity;
  onIdentityUpdated?: (identity: AccountIdentity) => void;
}

function roleLabel(role: string) {
  if (role.toLowerCase() === "superadmin") return "Platform Admin";
  if (role.toLowerCase() === "recruiter") return "Hiring Team";
  return "Applicant";
}

function initials(firstName: string, lastName: string, email: string) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.trim().toUpperCase() || email.charAt(0).toUpperCase() || "TM";
}

export function AccountSettings({ identity, onIdentityUpdated }: AccountSettingsProps) {
  const supabase = useMemo(() => createClient(), []);
  const [currentIdentity, setCurrentIdentity] = useState(identity);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(identity.first_name);
  const [lastName, setLastName] = useState(identity.last_name);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const fullName =
    [currentIdentity.first_name, currentIdentity.last_name].filter(Boolean).join(" ").trim() ||
    currentIdentity.name ||
    currentIdentity.email.split("@")[0];

  const beginEditing = () => {
    setFirstName(currentIdentity.first_name);
    setLastName(currentIdentity.last_name);
    setFieldErrors({});
    setEditing(true);
  };

  const cancelEditing = () => {
    setFirstName(currentIdentity.first_name);
    setLastName(currentIdentity.last_name);
    setFieldErrors({});
    setEditing(false);
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstError = validateName(firstName, "First name");
    const lastError = validateName(lastName, "Last name");
    if (firstError || lastError) {
      setFieldErrors({
        ...(firstError ? { first_name: firstError } : {}),
        ...(lastError ? { last_name: lastError } : {}),
      });
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      const response = await fetchApi<AccountIdentityResponse>("/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim() }),
      });
      setCurrentIdentity(response.user);
      setFirstName(response.user.first_name);
      setLastName(response.user.last_name);
      setEditing(false);
      onIdentityUpdated?.(response.user);
      toast.success("Profile updated", {
        description: "Your name is now updated across TalentMatch.",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        toast.error("Profile could not be updated", { description: error.message });
      } else {
        toast.error("Profile could not be updated", {
          description: "Check your connection and try again.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const sendResetLink = async () => {
    if (sendingReset || resetSent) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(currentIdentity.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Password reset link sent", {
        description: "Check your email to securely choose a new password.",
      });
    } catch {
      toast.error("Reset link could not be sent", {
        description: "Wait a moment, then try again.",
      });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader>
        <div>
          <PageHeaderTitle>Account settings</PageHeaderTitle>
          <PageHeaderDescription>
            Keep your TalentMatch identity current and manage how you access your account.
          </PageHeaderDescription>
        </div>
      </PageHeader>

      <Section aria-labelledby="account-identity-title">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="size-16 border border-primary/20 bg-secondary shadow-xs">
            <AvatarFallback className="bg-secondary text-lg font-extrabold text-secondary-foreground">
              {initials(currentIdentity.first_name, currentIdentity.last_name, currentIdentity.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 id="account-identity-title" className="truncate text-xl font-bold tracking-tight text-foreground">
              {fullName}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{currentIdentity.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{roleLabel(currentIdentity.role)}</Badge>
              {currentIdentity.company_name ? (
                <Badge variant="outline">{currentIdentity.company_name}</Badge>
              ) : null}
            </div>
          </div>
        </div>
      </Section>

      <Section aria-labelledby="personal-information-title">
        <SectionHeader>
          <div>
            <SectionTitle id="personal-information-title">Personal information</SectionTitle>
            <SectionDescription>
              This name appears in your account menu and across your TalentMatch workspace.
            </SectionDescription>
          </div>
          {!editing ? (
            <Button type="button" variant="outline" size="sm" onClick={beginEditing}>
              <Pencil aria-hidden="true" />
              Edit information
            </Button>
          ) : null}
        </SectionHeader>

        {editing ? (
          <form onSubmit={saveProfile} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="First name"
                htmlFor="account-first-name"
                required
                error={fieldErrors.first_name}
              >
                <Input
                  id="account-first-name"
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                    if (fieldErrors.first_name) {
                      setFieldErrors((current) => ({ ...current, first_name: "" }));
                    }
                  }}
                  autoComplete="given-name"
                  aria-invalid={Boolean(fieldErrors.first_name)}
                  aria-describedby={fieldErrors.first_name ? "account-first-name-error" : undefined}
                  disabled={saving}
                />
              </FormField>
              <FormField
                label="Last name"
                htmlFor="account-last-name"
                required
                error={fieldErrors.last_name}
              >
                <Input
                  id="account-last-name"
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                    if (fieldErrors.last_name) {
                      setFieldErrors((current) => ({ ...current, last_name: "" }));
                    }
                  }}
                  autoComplete="family-name"
                  aria-invalid={Boolean(fieldErrors.last_name)}
                  aria-describedby={fieldErrors.last_name ? "account-last-name-error" : undefined}
                  disabled={saving}
                />
              </FormField>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={cancelEditing} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                {saving ? "Saving changes…" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="divide-y divide-border rounded-xl bg-muted/45 px-4 sm:px-5">
            <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:items-center">
              <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <UserRound className="size-4" aria-hidden="true" /> Full name
              </dt>
              <dd className="text-sm font-semibold text-foreground sm:text-right">{fullName}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:items-center">
              <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="size-4" aria-hidden="true" /> Email address
              </dt>
              <dd className="min-w-0 break-all text-sm font-semibold text-foreground sm:text-right">
                {currentIdentity.email}
              </dd>
            </div>
          </dl>
        )}
      </Section>

      <Section aria-labelledby="account-security-title">
        <SectionHeader>
          <div>
            <SectionTitle id="account-security-title">Security</SectionTitle>
            <SectionDescription>
              Password changes use a secure, time-limited link sent to your verified email.
            </SectionDescription>
          </div>
        </SectionHeader>

        <div className="flex flex-col gap-4 rounded-xl bg-muted/45 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              {resetSent ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <KeyRound className="size-5" aria-hidden="true" />}
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                {resetSent ? "Reset link sent" : "Account password"}
              </p>
              <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
                {resetSent
                  ? `We sent instructions to ${currentIdentity.email}.`
                  : "We never display or store your password in this application."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={resetSent ? "secondary" : "outline"}
            onClick={sendResetLink}
            disabled={sendingReset || resetSent}
            className="w-full shrink-0 sm:w-auto"
          >
            {sendingReset ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
            {sendingReset ? "Sending link…" : resetSent ? "Email sent" : "Send reset link"}
          </Button>
        </div>
      </Section>
    </div>
  );
}
