"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, ChevronRight, Plus, Shield, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api";

type Company = { id: number; name: string; description: string; website: string };
type Invitation = { id: number; email: string; state: "sending" | "pending" | "failed" | "accepted" | "expired" };
type Staff = { id: number; email: string; company: number | null; active: boolean };
type Form = "company-new" | "company-edit" | "staff-new" | Staff;
const selectClass = "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PlatformManagement() {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [selection, setSelection] = useState<number | "unassigned" | null>(null);
  const [directory, setDirectory] = useState<{ key: number | "unassigned"; rows: Staff[]; invitations: Invitation[] } | null>(null);
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
  const company = companies?.find((item) => item.id === key);
  const staff = directory?.key === key ? directory.rows : null;
  const invitations = directory?.key === key ? directory.invitations : [];
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

  useEffect(() => {
    if (!companies) return;
    const controller = new AbortController();
    Promise.all([
      fetchApi<Staff[]>(`/platform/staff/?company=${key}`, { signal: controller.signal }),
      typeof key === "number"
        ? fetchApi<Invitation[]>(`/platform/staff/invitations/?company=${key}`, { signal: controller.signal })
        : Promise.resolve([]),
    ]).then(([rows, invitations]) => { setDirectory({ key, rows, invitations }); setStaffError(null); })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setStaffError({ key, text: err.message });
      });
    return () => controller.abort();
  }, [companies, key, revision]);

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
      } else if (editingStaff) {
        const targetCompany = Number(values.get("company")) || null;
        const active = values.get("active") === "true";
        const changes = {
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
        setDirectory((current) => current?.key === key ? {
          ...current,
          rows: current.rows.flatMap((row) => (
            row.id !== saved.id ? [row] : (saved.company ?? "unassigned") === key ? [saved] : []
          )),
        } : current);
        setNotice("Staff access updated.");
      } else if (company) {
        const invitation = await fetchApi<Invitation>("/platform/staff/", {
          method: "POST",
          body: JSON.stringify({ email: values.get("email"), company: company.id }),
        });
        setNotice(invitation.state === "pending" ? "Invitation ready. Access starts after the recipient activates their account."
          : invitation.state === "accepted" ? "This invitation was already accepted." : "This invitation is being sent.");
      }
      closeForm();
      setRevision((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The change could not be saved. Try again.");
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
                {form === "company-new" ? "New company" : form === "company-edit" ? "Edit company" : editingStaff ? `Manage ${editingStaff.email}` : "Invite recruiter"}
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
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-company">Company</Label>
                      <select id="staff-company" name="company" className={selectClass} defaultValue={editingStaff.company ?? ""}>
                        <option value="">Unassigned (no company access)</option>
                        {companies?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      <p className="text-sm text-muted-foreground">Changing the company changes which jobs and candidate records this recruiter can access.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-access">TalentMatch access</Label>
                      <select id="staff-access" name="active" className={selectClass} defaultValue={String(editingStaff.active)}>
                        <option value="true">Active</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">This recruiter will have access to <strong>{company?.name}</strong>.</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="staff-email">Work email</Label>
                      <Input id="staff-email" name="email" type="email" required maxLength={254} autoComplete="off" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The recipient verifies their work email and chooses a password before recruiter access is granted.
                    </p>
                  </>
                )}
              </fieldset>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy}>{busy ? "Saving…" : form === "staff-new" ? "Send invitation" : "Save changes"}</Button>
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
                  {!company && <p className="mt-1 text-sm text-muted-foreground">Assign these recruiters to a company to grant access to its workspace.</p>}
                </div>
                {company && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={(event) => openForm("company-edit", event.currentTarget)}>Edit company</Button>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={(event) => openForm("staff-new", event.currentTarget)}>
                      <UserPlus aria-hidden="true" /> Invite recruiter
                    </Button>
                  </div>
                )}
              </header>
              {invitations.length > 0 && (
                <section aria-labelledby="staff-invitations-title" className="rounded-xl border border-border bg-card">
                  <h3 id="staff-invitations-title" className="border-b border-border px-4 py-3 text-sm font-semibold">
                    Staff invitations
                  </h3>
                  <ul className="divide-y divide-border">
                    {invitations.map((invitation) => (
                      <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <span className="break-all text-sm font-medium">{invitation.email}</span>
                        <Badge variant="outline">
                          {invitation.state === "failed" ? "Delivery failed" : invitation.state === "sending" ? "Sending"
                            : invitation.state === "expired" ? "Expired" : "Awaiting acceptance"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
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
                          <p className="break-all text-sm font-medium text-foreground">{item.email || "Email unavailable"}</p>
                          <p className="text-xs text-muted-foreground">Recruiter</p>
                        </div>
                        <Badge variant={item.active ? "secondary" : "outline"}>{item.active ? "Active" : "Disabled"}</Badge>
                        <Button size="sm" variant="outline" disabled={busy}
                          aria-label={`Manage ${item.email || "recruiter"}`} onClick={(event) => openForm(item, event.currentTarget)}>Manage</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
