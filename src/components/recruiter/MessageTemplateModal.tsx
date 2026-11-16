"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Code2, Eye, Mail, Plus, Sparkles } from "lucide-react";
import { fetchApi, ApiError } from "@/lib/api";
import { CommunicationTemplate, TemplateStage } from "@/types/application";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/feedback";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { FormAlertNote } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { StatusBadge, type StatusBadgeProps } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const TEMPLATE_STAGE_ORDER: TemplateStage[] = [
  "SHORTLISTED",
  "INTERVIEW",
  "HIRED",
  "REJECTED",
  "SCREENING",
  "GENERAL",
];

export const TEMPLATE_STAGE_CONFIG: Record<
  TemplateStage,
  { label: string; status: NonNullable<StatusBadgeProps["status"]> }
> = {
  SHORTLISTED: {
    label: "Shortlisted",
    status: "info",
  },
  INTERVIEW: {
    label: "Interview",
    status: "processing",
  },
  HIRED: {
    label: "Hired / Offer",
    status: "success",
  },
  REJECTED: {
    label: "Rejection",
    status: "danger",
  },
  SCREENING: {
    label: "Screening",
    status: "warning",
  },
  GENERAL: {
    label: "General",
    status: "neutral",
  },
};

const PLACEHOLDERS = [
  { token: "{{candidate_name}}", label: "Candidate name", example: "Maria Santos" },
  { token: "{{job_title}}", label: "Job title", example: "Senior Software Engineer" },
  { token: "{{company_name}}", label: "Company name", example: "Acme Innovations" },
  { token: "{{recruiter_name}}", label: "Recruiter name", example: "King Amato" },
] as const;

export interface MessageTemplateDraft {
  name: string;
  stage: TemplateStage;
  subject: string;
  body: string;
}

interface MessageTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: CommunicationTemplate | null;
  initialDraft: MessageTemplateDraft;
  onSaved: (template: CommunicationTemplate, mode: "create" | "edit") => void;
}

type TemplateFieldErrors = {
  name?: string | null;
  subject?: string | null;
  body?: string | null;
};

export function MessageTemplateModal({
  open,
  onOpenChange,
  editingTemplate,
  initialDraft,
  onSaved,
}: MessageTemplateModalProps) {
  const [formName, setFormName] = useState(initialDraft.name);
  const [formStage, setFormStage] = useState<TemplateStage>(initialDraft.stage);
  const [formSubject, setFormSubject] = useState(initialDraft.subject);
  const [formBody, setFormBody] = useState(initialDraft.body);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [lastFocusedField, setLastFocusedField] = useState<"subject" | "body">("body");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<TemplateFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setFormName(initialDraft.name);
      setFormStage(initialDraft.stage);
      setFormSubject(initialDraft.subject);
      setFormBody(initialDraft.body);
      setActiveTab("edit");
      setLastFocusedField("body");
      setFieldErrors({});
      setFormError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, initialDraft]);

  const validateFields = useCallback((): TemplateFieldErrors => {
    const errors: TemplateFieldErrors = {};
    if (!formName.trim()) {
      errors.name = "Enter a template name so recruiters can recognize it.";
    }
    if (!formSubject.trim()) {
      errors.subject = "Add a subject line for the candidate email.";
    }
    if (!formBody.trim()) {
      errors.body = "Write the message body before saving this template.";
    }
    return errors;
  }, [formBody, formName, formSubject]);

  const insertPlaceholder = (token: string) => {
    if (lastFocusedField === "subject") {
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart ?? formSubject.length;
        const end = input.selectionEnd ?? formSubject.length;
        const next = formSubject.slice(0, start) + token + formSubject.slice(end);
        setFormSubject(next);
        setFieldErrors((prev) => ({ ...prev, subject: null }));
        window.setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + token.length, start + token.length);
        }, 0);
      } else {
        setFormSubject((prev) => prev + token);
        setFieldErrors((prev) => ({ ...prev, subject: null }));
      }
      return;
    }

    const textarea = bodyInputRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? formBody.length;
      const end = textarea.selectionEnd ?? formBody.length;
      const next = formBody.slice(0, start) + token + formBody.slice(end);
      setFormBody(next);
      setFieldErrors((prev) => ({ ...prev, body: null }));
      window.setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    } else {
      setFormBody((prev) => prev + token);
      setFieldErrors((prev) => ({ ...prev, body: null }));
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    setFormError(null);

    const errors = validateFields();
    if (errors.name || errors.subject || errors.body) {
      setFieldErrors(errors);
      setActiveTab("edit");
      toast.warning("Check highlighted fields", {
        description: errors.name || errors.subject || errors.body || "Complete all required fields.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        stage: formStage,
        subject: formSubject.trim(),
        body: formBody.trim(),
      };

      if (editingTemplate) {
        const updated = await fetchApi<CommunicationTemplate>(
          `/communication-templates/${editingTemplate.id}/`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        toast.success("Template updated", {
          description: `"${updated.name}" is now ready to use in candidate outreach.`,
        });
        onSaved(updated, "edit");
      } else {
        const created = await fetchApi<CommunicationTemplate>("/communication-templates/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Template created", {
          description: `"${created.name}" is now available to your recruitment team.`,
        });
        onSaved(created, "create");
      }
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Please check your inputs and try again.";
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors((prev) => ({
          ...prev,
          name: err.fieldErrors.name || prev.name,
          subject: err.fieldErrors.subject || prev.subject,
          body: err.fieldErrors.body || prev.body,
        }));
      }
      setFormError(message);
      setActiveTab("edit");
      toast.error("Failed to save template", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const previewSubject = useMemo(() => {
    let text = formSubject;
    for (const p of PLACEHOLDERS) {
      text = text.replaceAll(p.token, p.example);
    }
    return text.trim();
  }, [formSubject]);

  const previewBody = useMemo(() => {
    let text = formBody;
    for (const p of PLACEHOLDERS) {
      text = text.replaceAll(p.token, p.example);
    }
    return text.trim();
  }, [formBody]);

  const stageMeta = TEMPLATE_STAGE_CONFIG[formStage] ?? TEMPLATE_STAGE_CONFIG.GENERAL;

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent
        onClose={() => !saving && onOpenChange(false)}
        className="max-w-3xl overflow-hidden"
      >
        <TooltipProvider delayDuration={250}>
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DialogTitle>
                {editingTemplate ? "Edit message template" : "New message template"}
              </DialogTitle>
              <StatusBadge status={stageMeta.status} dot>
                {stageMeta.label}
              </StatusBadge>
            </div>
            <DialogDescription>
              Compose a reusable candidate message and preview it with representative sample data.
            </DialogDescription>
          </DialogHeader>

          <FilterTabs
            label="Template view mode"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "edit" | "preview")}
            fullWidth
            tabs={[
              { id: "edit", label: "Editor", icon: <Code2 /> },
              { id: "preview", label: "Candidate preview", icon: <Eye /> },
            ]}
          />

          <form
            onSubmit={handleSave}
            noValidate
            className="flex min-h-0 flex-auto flex-col gap-5"
          >
            <div className="min-h-0 flex-auto space-y-5 overflow-y-auto -mx-1.5 px-1.5 py-1">
              {formError ? (
                <FormAlertNote
                  variant="error"
                  title="Template could not be saved"
                  description={formError}
                  onDismiss={() => setFormError(null)}
                />
              ) : null}

              {activeTab === "edit" ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField
                      label="Template name"
                      htmlFor="template-name"
                      required
                      error={fieldErrors.name || undefined}
                      className="sm:col-span-2"
                    >
                      <Input
                        id="template-name"
                        value={formName}
                        error={Boolean(fieldErrors.name)}
                        disabled={saving}
                        maxLength={150}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormName(val);
                          if (fieldErrors.name && val.trim()) {
                            setFieldErrors((prev) => ({ ...prev, name: null }));
                          }
                        }}
                        onBlur={() => {
                          if (!formName.trim()) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              name: "Enter a template name so recruiters can recognize it.",
                            }));
                          }
                        }}
                        placeholder="e.g. Technical Round Invitation, Offer Follow-up"
                      />
                    </FormField>

                    <FormField label="Associated stage" htmlFor="template-stage">
                      <Select
                        value={formStage}
                        onValueChange={(val) => setFormStage(val as TemplateStage)}
                        disabled={saving}
                      >
                        <SelectTrigger id="template-stage">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_STAGE_ORDER.map((stg) => (
                            <SelectItem key={stg} value={stg}>
                              {TEMPLATE_STAGE_CONFIG[stg].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <FormField
                    label="Subject line"
                    htmlFor="template-subject"
                    required
                    error={fieldErrors.subject || undefined}
                    action={
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formSubject.length} / 200
                      </span>
                    }
                  >
                    <Input
                      id="template-subject"
                      ref={subjectInputRef}
                      value={formSubject}
                      error={Boolean(fieldErrors.subject)}
                      disabled={saving}
                      maxLength={200}
                      onFocus={() => setLastFocusedField("subject")}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormSubject(val);
                        if (fieldErrors.subject && val.trim()) {
                          setFieldErrors((prev) => ({ ...prev, subject: null }));
                        }
                      }}
                      onBlur={() => {
                        if (!formSubject.trim()) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            subject: "Add a subject line for the candidate email.",
                          }));
                        }
                      }}
                      placeholder="e.g. Next steps regarding your application for {{job_title}}"
                    />
                  </FormField>

                  <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sparkles className="size-4 text-primary" aria-hidden="true" />
                        <span>Insert variable</span>
                      </div>
                      <StatusBadge status="info" dot>
                        Inserting into:{" "}
                        {lastFocusedField === "subject" ? "Subject line" : "Message body"}
                      </StatusBadge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {PLACEHOLDERS.map((p) => (
                        <Tooltip key={p.token}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={saving}
                              onClick={() => insertPlaceholder(p.token)}
                            >
                              <Plus aria-hidden="true" />
                              <span>{p.label}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Inserts {p.token}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  <FormField
                    label="Message body"
                    htmlFor="template-body"
                    required
                    error={fieldErrors.body || undefined}
                    action={
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formBody.length} / 5000
                      </span>
                    }
                  >
                    <Textarea
                      id="template-body"
                      ref={bodyInputRef}
                      value={formBody}
                      error={Boolean(fieldErrors.body)}
                      disabled={saving}
                      rows={9}
                      maxLength={5000}
                      onFocus={() => setLastFocusedField("body")}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormBody(val);
                        if (fieldErrors.body && val.trim()) {
                          setFieldErrors((prev) => ({ ...prev, body: null }));
                        }
                      }}
                      onBlur={() => {
                        if (!formBody.trim()) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            body: "Write the message body before saving this template.",
                          }));
                        }
                      }}
                      placeholder="Write your candidate message here..."
                    />
                  </FormField>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        Representative candidate preview
                      </p>
                      <StatusBadge status={stageMeta.status} dot>
                        {stageMeta.label}
                      </StatusBadge>
                    </div>
                    <p className="mt-1.5 flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                      <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        Variables are filled using sample data for Maria Santos applying for Senior
                        Software Engineer at Acme Innovations.
                      </span>
                    </p>
                  </div>

                  <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">To</p>
                      <p className="text-sm font-semibold text-foreground">
                        Maria Santos &lt;maria.santos@example.com&gt;
                      </p>
                    </div>

                    <div className="space-y-1 border-t border-border pt-4">
                      <p className="text-sm font-medium text-muted-foreground">Subject</p>
                      <p className="text-sm font-semibold text-foreground">
                        {previewSubject || (
                          <span className="font-normal text-muted-foreground">
                            Subject line preview will appear here
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-1 border-t border-border pt-4">
                      <p className="text-sm font-medium text-muted-foreground">Message</p>
                      <div className="min-h-40 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {previewBody || (
                          <span className="text-muted-foreground">
                            Message body preview will appear here…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Spinner className="text-current" label="Saving template" />
                ) : null}
                {saving
                  ? "Saving…"
                  : editingTemplate
                  ? "Save changes"
                  : "Create template"}
              </Button>
            </DialogFooter>
          </form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
