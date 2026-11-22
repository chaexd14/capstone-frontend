"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, ChevronRight, Plus, Shield, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchApi } from "@/lib/api";

type Company = {
  id: number;
  name: string;
  description: string;
  website: string;
  recruiter_count?: number;
  active_job_count?: number;
  application_count?: number;
};
type Staff = { id: number; first_name: string; last_name: string; email: string; role: "recruiter"; company: number | null; active: boolean };
type StaffInvitationRow = { id: number; email: string; state: string; expires_at: string };
type Form = "company-new" | "company-edit" | "staff-new" | Staff;

export function PlatformManagement() {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [selection, setSelection] = useState<number | "unassigned" | null>(null);
  const [staffByKey, setStaffByKey] = useState<Record<string, Staff[]>>({});
  const [invitationsByKey, setInvitationsByKey] = useState<Record<number, StaffInvitationRow[]>>({});
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [staffError, setStaffError] = useState<{ key: number | "unassigned"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const rosterHeading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useRef(false);
  const key = selection ?? companies?.[0]?.id ?? "unassigned";
  const keyStr = String(key);
  const company = companies?.find((item) => item.id === key);
  const staff = Object.prototype.hasOwnProperty.call(staffByKey, keyStr) ? staffByKey[keyStr] : null;
  const invitations = typeof key === "number" ? (invitationsByKey[key] ?? []) : [];
  const companyForm = form === "company-new" || form === "company-edit";
  const editingStaff = form && typeof form === "object" ? form : null;

  useEffect(() => {
    if (form) {
      formRef.current?.focus();
    } else if (restoreFocus.current) {
      const trigger = returnFocus.current;
      (trigger?.isConnected ? trigger : rosterHeading.current)?.focus();
      restoreFocus.current = false;
    }
  }, [form]);

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<Company[]>("/platform/companies/", { signal: controller.signal })
      .then(setCompanies)
      .catch((err: Error) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [revision]);

  const companiesLoaded = companies !== null;
  useEffect(() => {
    if (!companiesLoaded) return;
    const controller = new AbortController();
    fetchApi<Staff[]>(`/platform/staff/?company=${key}`, { signal: controller.signal })
      .then((rows) => {
        if (!controller.signal.aborted) {
          setStaffByKey((prev) => ({ ...prev, [String(key)]: rows }));
          setStaffError(null);
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setStaffError({ key, text: err.message });
      });
    if (typeof key === "number") {
      fetchApi<StaffInvitationRow[]>(`/platform/staff/invitations/?company=${key}`, { signal: controller.signal })
        .then((rows) => {
          if (!controller.signal.aborted) {
            setInvitationsByKey((prev) => ({ ...prev, [key]: rows }));
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setInvitationsByKey((prev) => ({ ...prev, [key]: [] }));
          }
        });
    }
    return () => controller.abort();
  }, [companiesLoaded, key, revision]);

  function openForm(value: Form | null, trigger?: HTMLButtonElement) {
    returnFocus.current = trigger ?? null;
    setForm(value);
    setError("");
    setNotice("");
  }

  function closeForm() {
    restoreFocus.current = true;
    setForm(null);
  }

  function selectCompany(value: number | "unassigned") {
    if (busy) return;
    setSelection(value);
    openForm(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (companyForm) {
        const existing = form === "company-edit" ? company : undefined;
        const saved = await fetchApi<Company>(
          existing ? `/platform/companies/${existing.id}/` : "/platform/companies/",
          {
            method: existing ? "PATCH" : "POST",
            body: JSON.stringify({
              name: values.get("name"), description: values.get("description"), website: values.get("website"),
            }),
          },
        );
        setCompanies((items) => [...(items ?? []).filter((item) => item.id !== saved.id), saved]
          .sort((left, right) => left.name.localeCompare(right.name)));
        setSelection(saved.id);
        setNotice(existing ? "Company details updated." : "Company created.");
        closeForm();
        return;
      } else if (editingStaff) {
        const intent = (event.nativeEvent as SubmitEvent).submitter instanceof HTMLButtonElement
          ? ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement).value
          : "save";
        if (intent === "password") {
          const password = String(values.get("password") ?? "");
          if (!password) {
            setError("Enter a new password before changing it.");
            return;
          }
          await fetchApi(`/platform/staff/${editingStaff.id}/password/`, {
            method: "POST", body: JSON.stringify({ password }),
          });
          setNotice(`Password changed for ${editingStaff.email}. Their existing sessions have been revoked.`);
          closeForm();
          return;
        }
        const firstName = String(values.get("first_name") ?? "").trim();
        const lastName = String(values.get("last_name") ?? "").trim();
        const prevFirstName = (editingStaff.first_name ?? "").trim();
        const prevLastName = (editingStaff.last_name ?? "").trim();
        if (prevFirstName && !firstName) {
          setError("First name cannot be empty.");
          return;
        }
        if (prevLastName && !lastName) {
          setError("Last name cannot be empty.");
          return;
        }
        const targetCompany = Number(values.get("company")) || null;
        const active = values.get("active") === "true";
        const changes: {
          first_name?: string;
          last_name?: string;
          company?: number | null;
          active?: boolean;
        } = {
          ...(firstName !== prevFirstName && { first_name: firstName }),
          ...(lastName !== prevLastName && { last_name: lastName }),
          ...(targetCompany !== editingStaff.company && { company: targetCompany }),
          ...(active !== editingStaff.active && { active }),
        };
        if (Object.keys(changes).length === 0) {
          closeForm();
          return;
        }
        const saved = await fetchApi<Staff>(`/platform/staff/${editingStaff.id}/`, {
          method: "PATCH",
          body: JSON.stringify(changes),
        });
        const oldKey = String(editingStaff.company ?? "unassigned");
        const newKey = String(saved.company ?? "unassigned");
        setStaffByKey((prev) => {
          const next = { ...prev };
          if (next[oldKey]) {
            next[oldKey] =
              oldKey === newKey
                ? next[oldKey].map((row) => (row.id === saved.id ? saved : row))
                : next[oldKey].filter((row) => row.id !== saved.id);
          }
          if (oldKey !== newKey && next[newKey]) {
            next[newKey] = [...next[newKey].filter((row) => row.id !== saved.id), saved];
          }
          return next;
        });
        if (editingStaff.company !== saved.company) {
          setCompanies((items) =>
            items
              ? items.map((c) => {
                  if (c.id === editingStaff.company) {
                    return { ...c, recruiter_count: Math.max(0, (c.recruiter_count ?? 0) - 1) };
                  }
                  if (c.id === saved.company) {
                    return { ...c, recruiter_count: (c.recruiter_count ?? 0) + 1 };
                  }
                  return c;
                })
              : items
          );
        }
        const nameChanged = "first_name" in changes || "last_name" in changes;
        const accessChanged = "company" in changes || "active" in changes;
        setNotice(
          nameChanged && accessChanged
            ? "Recruiter details updated."
            : nameChanged
              ? "Recruiter name updated."
              : "Staff access updated."
        );
        closeForm();
        return;
      } else if (company) {
        const saved = await fetchApi<Staff>("/platform/staff/", {
          method: "POST",
          body: JSON.stringify({
            first_name: values.get("first_name"), last_name: values.get("last_name"),
            email: values.get("email"), password: values.get("password"),
            role: values.get("role"), company: company.id,
          }),
        });
        const targetKey = String(company.id);
        setStaffByKey((prev) => ({
          ...prev,
          [targetKey]: [...(prev[targetKey] ?? []), saved],
        }));
        setCompanies((items) =>
          items
            ? items.map((c) =>
                c.id === company.id
                  ? { ...c, recruiter_count: (c.recruiter_count ?? 0) + 1 }
                  : c
              )
            : items
        );
        setNotice(`${saved.first_name} ${saved.last_name} can now sign in as a recruiter.`);
        closeForm();
        return;
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The change could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendResetLink(staffMember: Staff) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fetchApi(`/platform/staff/${staffMember.id}/password-reset-link/`, { method: "POST" });
      setNotice(`Password reset link sent to ${staffMember.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The reset link could not be sent. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Companies &amp; staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage companies and control who can access their recruiter workspace.</p>
        </div>
        <Button onClick={(event) => openForm("company-new", event.currentTarget)} disabled={busy}>
          <Plus aria-hidden="true" /> New company
        </Button>
      </header>

      <p role="status" className="text-sm text-muted-foreground empty:sr-only">{notice}</p>
      {!form && error && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-700">
          {error} <Button variant="outline" size="sm" onClick={() => { setError(""); setRevision((value) => value + 1); }}>Retry</Button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)]">
        <nav aria-label="Company directory" className="min-w-0 rounded-xl border border-border bg-card p-3">
          <h2 className="px-2 pb-2 text-sm font-semibold text-foreground">Company directory</h2>
          {!companies && !error && <p role="status" className="px-2 py-2 text-sm text-muted-foreground">Loading companies…</p>}
          {companies?.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">Create a company to start assigning recruiters.</p>}
          {companies?.map((item) => (
            <Button key={item.id} variant={key === item.id ? "secondary" : "ghost"}
              aria-current={key === item.id ? "true" : undefined} disabled={busy}
              className="mb-1 w-full justify-start" onClick={() => selectCompany(item.id)}>
              <Building2 aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </Button>
          ))}
          {companies && (
            <Button variant={key === "unassigned" ? "secondary" : "ghost"}
              aria-current={key === "unassigned" ? "true" : undefined} disabled={busy}
              className="w-full justify-start" onClick={() => selectCompany("unassigned")}>
              <Shield aria-hidden="true" /> Unassigned staff
            </Button>
          )}
        </nav>

        <div className="min-w-0 space-y-6">
          {form && (
            <form key={editingStaff?.id ?? String(form)} ref={formRef} tabIndex={-1} aria-labelledby="platform-form-title"
              onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-4 outline-none sm:p-5">
              <h2 id="platform-form-title" className="break-words text-lg font-semibold">
                {form === "company-new" ? "New company" : form === "company-edit" ? "Edit company" : editingStaff ? `Manage ${editingStaff.email}` : "Create recruiter"}
              </h2>
              <fieldset disabled={busy} className="min-w-0 space-y-4">
                {companyForm ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="company-name">Company name</Label>
                      <Input id="company-name" name="name" required maxLength={255} defaultValue={form === "company-edit" ? company?.name : ""} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company-website">Website <span className="text-muted-foreground">(optional)</span></Label>
                      <Input id="company-website" name="website" type="url" defaultValue={form === "company-edit" ? company?.website : ""} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company-description">Description <span className="text-muted-foreground">(optional)</span></Label>
                      <Textarea id="company-description" name="description" maxLength={2000} defaultValue={form === "company-edit" ? company?.description : ""} />
                    </div>
                  </>
                ) : editingStaff ? (
                  <>
                    <p className="text-sm text-muted-foreground">{editingStaff.email}</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="staff-edit-first-name">First name</Label>
                        <Input
                          id="staff-edit-first-name"
                          name="first_name"
                          maxLength={150}
                          autoComplete="given-name"
                          defaultValue={editingStaff.first_name}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="staff-edit-last-name">Last name</Label>
                        <Input
                          id="staff-edit-last-name"
                          name="last_name"
                          maxLength={150}
                          autoComplete="family-name"
                          defaultValue={editingStaff.last_name}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-company">Company</Label>
                      <Select name="company" defaultValue={String(editingStaff.company ?? "unassigned")}>
                        <SelectTrigger id="staff-company"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned (no company access)</SelectItem>
                          {companies?.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">Changing the company changes which jobs and candidate records this recruiter can access.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-access">TalentMatch access</Label>
                      <Select name="active" defaultValue={String(editingStaff.active)}>
                        <SelectTrigger id="staff-access"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Disabled</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 border-t border-border pt-4">
                      <div>
                        <Label htmlFor="staff-password">Set a new password</Label>
                        <p className="mt-1 text-sm text-muted-foreground">Use at least 15 characters. Changing it revokes the recruiter’s existing sessions.</p>
                      </div>
                      <Input id="staff-password" name="password" type="password" minLength={15} maxLength={72} autoComplete="new-password" />
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" name="intent" value="password" variant="secondary">Change password</Button>
                        <Button type="button" variant="outline" onClick={() => sendResetLink(editingStaff)}>Send reset link</Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">This recruiter will have access to <strong>{company?.name}</strong>.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="staff-first-name">First name</Label>
                        <Input id="staff-first-name" name="first_name" required maxLength={150} autoComplete="given-name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="staff-last-name">Last name</Label>
                        <Input id="staff-last-name" name="last_name" required maxLength={150} autoComplete="family-name" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-email">Work email</Label>
                      <Input id="staff-email" name="email" type="email" required maxLength={254} autoComplete="email" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-create-password">Temporary password</Label>
                      <Input id="staff-create-password" name="password" type="password" required minLength={15} maxLength={72} autoComplete="new-password" />
                      <p className="text-sm text-muted-foreground">Use at least 15 characters and share it through a secure channel.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-role">Role</Label>
                      <Select name="role" defaultValue="recruiter">
                        <SelectTrigger id="staff-role"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="recruiter">Recruiter</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </fieldset>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" name="intent" value="save" disabled={busy}>{busy ? "Saving…" : form === "staff-new" ? "Create recruiter" : "Save changes"}</Button>
                <Button type="button" variant="outline" disabled={busy} onClick={closeForm}>Cancel</Button>
              </div>
            </form>
          )}

          {companies && (
            <section className="min-w-0 space-y-4" aria-labelledby="company-staff-title">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="company-staff-title" ref={rosterHeading} tabIndex={-1} className="break-words text-lg font-semibold">{company?.name ?? "Unassigned staff"}</h2>
                  {company?.description && <p className="mt-1 break-words text-sm text-muted-foreground">{company.description}</p>}
                  {company?.website && <p className="mt-1 break-all text-sm text-muted-foreground">{company.website}</p>}
                  {company && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="tabular-nums">{company.recruiter_count ?? 0} recruiters</Badge>
                      <Badge variant="outline" className="tabular-nums">{company.active_job_count ?? 0} active jobs</Badge>
                      <Badge variant="outline" className="tabular-nums">{company.application_count ?? 0} applications</Badge>
                    </div>
                  )}
                  {!company && <p className="mt-1 text-sm text-muted-foreground">Assign these recruiters to a company to grant access to its workspace.</p>}
                </div>
                {company && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={(event) => openForm("company-edit", event.currentTarget)}>Edit company</Button>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={(event) => openForm("staff-new", event.currentTarget)}>
                      <UserPlus aria-hidden="true" /> Create recruiter
                    </Button>
                  </div>
                )}
              </header>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <h3 className="border-b border-border bg-muted/50 px-4 py-3 text-sm font-semibold">Recruiter accounts</h3>
                {staffError?.key === key ? (
                  <div role="alert" className="p-4 text-sm text-red-700">
                    {staffError.text} <Button variant="outline" size="sm" onClick={() => setRevision((value) => value + 1)}>Retry</Button>
                  </div>
                ) : staff === null ? (
                  <p role="status" className="p-4 text-sm text-muted-foreground">Loading staff…</p>
                ) : staff.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">{company ? "This company has no recruiter accounts yet." : "All recruiters are assigned to a company."}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {staff.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium text-foreground">{[item.first_name, item.last_name].filter(Boolean).join(" ") || "Recruiter"}</p>
                          <p className="break-all text-sm text-muted-foreground">{item.email || "Email unavailable"}</p>
                        </div>
                        <Badge variant={item.active ? "secondary" : "outline"}>{item.active ? "Active" : "Disabled"}</Badge>
                        <Button size="sm" variant="outline" disabled={busy}
                          aria-label={`Manage ${item.email || "recruiter"}`} onClick={(event) => openForm(item, event.currentTarget)}>Manage</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {company && invitations.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <h3 className="border-b border-border bg-muted/50 px-4 py-3 text-sm font-semibold">
                    Pending staff invitations ({invitations.length})
                  </h3>
                  <ul className="divide-y divide-border">
                    {invitations.map((inv) => (
                      <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="break-all font-medium text-foreground">{inv.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Expires {new Date(inv.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">{inv.state}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
