"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Clock,
  Check,
} from "lucide-react";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FieldError, FormAlertNote } from "@/components/ui/form-error";
import {
  validateName,
  validateEmail,
  validatePhone,
  validateResumeFile,
} from "@/lib/validation";
import {
  API_BASE_URL,
  getAuthHeaders,
  parseApiErrorPayload,
} from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/client";

interface ApplyModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (app: Application) => void;
  onApplicationCreated?: (app: Application) => void;
  onComplete?: () => void;
}

type ApplyField = "first_name" | "last_name" | "email" | "phone" | "resume";

export function ApplyModal({
  job,
  isOpen,
  onClose,
  onSuccess,
  onApplicationCreated,
  onComplete,
}: ApplyModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ApplyField, string | null>>>({});
  const [touched, setTouched] = useState<Partial<Record<ApplyField, boolean>>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [successResult, setSuccessResult] = useState<Application | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState(35);
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "disclosure">("form");
  const [acknowledged, setAcknowledged] = useState(false);
  const [disclosureError, setDisclosureError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const onSuccessRef = useRef(onSuccess);
  const onApplicationCreatedRef = useRef(onApplicationCreated);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onApplicationCreatedRef.current = onApplicationCreated;
  }, [onSuccess, onApplicationCreated]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        setUserId(user?.id ?? null);
        setEmail(user?.email ?? "");
        if (user) {
          const metaFirst = user.user_metadata?.first_name;
          const metaLast = user.user_metadata?.last_name;
          const fullName = user.user_metadata?.full_name || "";
          if (metaFirst || metaLast) {
            setFirstName((prev) => (!prev && metaFirst ? String(metaFirst) : prev));
            setLastName((prev) => (!prev && metaLast ? String(metaLast) : prev));
          } else if (fullName) {
            const parts = fullName.split(" ");
            setFirstName((prev) => (!prev ? parts[0] || "" : prev));
            setLastName((prev) => (!prev ? parts.slice(1).join(" ") || "" : prev));
          }
        }
      } catch {
        if (active) {
          setUserId(null);
          setEmail("");
        }
      }
    }
    void loadUser();
    return () => { active = false; };
  }, [isOpen, supabase]);

  // Polling effect for real-time background AI evaluation
  const resultId = successResult?.id;
  const trackingToken = successResult?.tracking_token;
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let initialPollTimer: NodeJS.Timeout | null = null;
    let progressTimer: NodeJS.Timeout | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;
    let fallbackFinishTimer: NodeJS.Timeout | null = null;
    let isCancelled = false;

    if (resultId && isEvaluating) {
      let cachedHeadersPromise: Promise<Record<string, string>> | null = null;
      const getCachedHeaders = () => {
        if (!cachedHeadersPromise) {
          cachedHeadersPromise = getAuthHeaders();
        }
        return cachedHeadersPromise;
      };

      const stopTimers = () => {
        if (initialPollTimer) clearTimeout(initialPollTimer);
        if (progressTimer) clearInterval(progressTimer);
        if (intervalId) clearInterval(intervalId);
        if (fallbackTimer) clearTimeout(fallbackTimer);
        if (fallbackFinishTimer) clearTimeout(fallbackFinishTimer);
      };

      progressTimer = setInterval(() => {
        setEvalProgress((prev) => (prev < 92 ? prev + 8 : prev));
      }, 500);

      const pollApplicationStatus = async () => {
        try {
          const authHeaders = await getCachedHeaders();
          if (isCancelled) return;
          const response = await fetch(`${API_BASE_URL}/applications/${resultId}/`, {
            headers: authHeaders,
          });
          if (!response.ok || isCancelled) return;

          const data: Application = await response.json();
          if (isCancelled) return;

          const isFinished = data.resume?.processing_status === "COMPLETED";
          if (isFinished) {
            isCancelled = true;
            stopTimers();
            setSuccessResult(data);
            setEvalProgress(100);
            setIsEvaluating(false);
            if (onApplicationCreatedRef.current) {
              onApplicationCreatedRef.current(data);
            } else if (onSuccessRef.current) {
              onSuccessRef.current(data);
            }
          } else if (data.resume?.processing_status === "FAILED") {
            isCancelled = true;
            stopTimers();
            setSuccessResult(data);
            setIsEvaluating(false);
          }
        } catch (err) {
          console.error("Polling application status error:", err);
        }
      };

      initialPollTimer = setTimeout(() => {
        void pollApplicationStatus();
      }, 800);

      intervalId = setInterval(() => {
        void pollApplicationStatus();
      }, 1000);

      // Graceful 8-second fallback so the user is never stuck at 90% if background evaluation takes longer
      fallbackTimer = setTimeout(() => {
        if (isCancelled) return;
        if (initialPollTimer) clearTimeout(initialPollTimer);
        if (progressTimer) clearInterval(progressTimer);
        if (intervalId) clearInterval(intervalId);
        setEvalProgress(100);
        fallbackFinishTimer = setTimeout(() => {
          if (!isCancelled) {
            isCancelled = true;
            setIsEvaluating(false);
          }
        }, 350);
      }, 8000);

      return () => {
        isCancelled = true;
        stopTimers();
      };
    }
  }, [resultId, trackingToken, isEvaluating]);

  if (!job) return null;

  const setFieldError = (field: ApplyField, msg: string | null) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const processSelectedFile = (selected: File) => {
    setError(null);
    setTouched((prev) => ({ ...prev, resume: true }));
    const fileErr = validateResumeFile(selected);
    if (fileErr) {
      setFile(null);
      setFieldError("resume", fileErr);
      toast.warning("Invalid Resume File", {
        description: fileErr,
      });
      return;
    }
    setFile(selected);
    setFieldError("resume", null);
    toast.info("Resume Attached", {
      description: `${selected.name} (${(selected.size / 1024 / 1024).toFixed(2)} MB)`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleProceedToDisclosure = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId) {
      const authMsg = "You must be signed in with your applicant account to submit an application.";
      setError(authMsg);
      toast.error("Sign In Required", {
        description: authMsg,
      });
      return;
    }

    if (job.status === "CLOSED") {
      const closedMsg = "This position is closed and is no longer accepting applications.";
      setError(closedMsg);
      toast.error("Position Closed", {
        description: closedMsg,
      });
      return;
    }

    const firstErr = validateName(firstName, "First name");
    const lastErr = validateName(lastName, "Last name");
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone, true);
    const resumeErr = validateResumeFile(file);

    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      resume: true,
    });

    setFieldErrors({
      first_name: firstErr,
      last_name: lastErr,
      email: emailErr,
      phone: phoneErr,
      resume: resumeErr,
    });

    const firstFailure = firstErr || lastErr || emailErr || phoneErr || resumeErr;
    if (firstFailure) {
      toast.warning("Check Highlighted Fields", {
        description: firstFailure,
      });
      return;
    }

    setDisclosureError(null);
    setStep("disclosure");
  };

  const handleFinalSubmit = async () => {
    if (submitting) return;
    if (!acknowledged) {
      const ackMsg = "Please check the acknowledgment box to confirm you understand how AI assists screening.";
      setDisclosureError(ackMsg);
      toast.warning("Acknowledgment Required", {
        description: ackMsg,
      });
      return;
    }

    const resumeErr = validateResumeFile(file);
    if (resumeErr || !file) {
      setFieldError("resume", resumeErr || "Please attach your resume file.");
      setStep("form");
      return;
    }

    if (!userId) {
      const authMsg = "You must be signed in to submit an application.";
      setError(authMsg);
      setStep("form");
      return;
    }

    if (job.status === "CLOSED") {
      const closedMsg = "This position is closed and is no longer accepting applications.";
      setError(closedMsg);
      setStep("form");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("first_name", firstName.trim());
    formData.append("last_name", lastName.trim());
    formData.append("email", email.trim());
    formData.append("phone", phone.trim());
    formData.append("resume", file);
    formData.append("user_id", userId);

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jobs/${job.id}/apply/`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const parsed = parseApiErrorPayload(errData, "Failed to submit application. Please verify your details.");
        if (Object.keys(parsed.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({
            ...prev,
            first_name: parsed.fieldErrors.first_name || prev.first_name,
            last_name: parsed.fieldErrors.last_name || prev.last_name,
            email: parsed.fieldErrors.email || prev.email,
            phone: parsed.fieldErrors.phone || prev.phone,
            resume: parsed.fieldErrors.resume || prev.resume,
          }));
        }
        setError(parsed.message);
        setStep("form");
        throw new Error(parsed.message);
      }

      const applicationData: Application = await response.json();
      setSuccessResult(applicationData);

      // Notify parent to record the new application in background without closing modal
      if (onApplicationCreated) {
        onApplicationCreated(applicationData);
      } else if (onSuccess && !onComplete) {
        onSuccess(applicationData);
      }

      toast.success("Application Submitted!", {
        description: `Your application for "${job.title}" was submitted successfully. Review in progress.`,
      });

      const alreadyCompleted =
        applicationData.resume?.processing_status === "COMPLETED";

      if (alreadyCompleted) {
        // Show smooth verification progress before displaying the final confirmation card
        setIsEvaluating(true);
        setEvalProgress(55);
        setTimeout(() => {
          setEvalProgress(100);
          setTimeout(() => {
            setIsEvaluating(false);
          }, 600);
        }, 1200);
      } else {
        setIsEvaluating(true);
        setEvalProgress(40);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting application";
      toast.error("Submission Failed", {
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    const wasSubmitted = !!successResult;
    setSuccessResult(null);
    setIsEvaluating(false);
    setEvalProgress(35);
    setFirstName("");
    setLastName("");
    setEmail("");
    setUserId(null);
    setPhone("");
    setFile(null);
    setError(null);
    setFieldErrors({});
    setTouched({});
    setDisclosureError(null);
    setStep("form");
    setAcknowledged(false);
    onClose();

    if (wasSubmitted && onComplete) {
      onComplete();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
      <DialogContent
        onClose={handleResetAndClose}
        className="max-w-2xl max-h-[88dvh] flex flex-col p-6 sm:p-8 bg-card border-border shadow-2xl"
      >
        {/* Canonical Header */}
        <DialogHeader className="pb-4 border-b border-border space-y-1 text-left shrink-0">
          <DialogTitle
            id="apply-dialog-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
          >
            {step === "disclosure" && !successResult
              ? "AI Screening Disclosure & Review"
              : job.title}
          </DialogTitle>
          <DialogDescription
            id="apply-dialog-desc"
            className="text-sm text-muted-foreground"
          >
            {step === "disclosure" && !successResult
              ? `TalentMatch Explainable AI Recruitment Standards • ${job.title}`
              : `${job.department} • ${job.location}`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress or Final Result View */}
        {successResult ? (
          <div className="flex-1 overflow-y-auto py-4">
            {isEvaluating ? (
              <div className="py-4 text-center space-y-5">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                  <Sparkles className="h-8 w-8 animate-pulse text-primary" />
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-foreground">Application Received</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Your resume has been saved. Your qualifications are being verified for the hiring team.
                  </p>
                </div>

                {/* Live Progress Bar */}
                <div className="space-y-1.5 px-1 max-w-md mx-auto">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      Review in Progress
                    </span>
                    <span className="font-mono text-primary font-semibold">{evalProgress}%</span>
                  </div>
                  <Progress value={evalProgress} className="h-2 bg-muted" />
                </div>

                {/* Stepper Card */}
                <div className="p-4 rounded-xl border border-border bg-card/60 text-left space-y-3.5 shadow-xs">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">File Uploaded &amp; Secured</p>
                      <p className="text-[11px] text-muted-foreground">
                        Your resume has been securely stored and anonymized for privacy.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">Qualification &amp; Profile Check</p>
                      <p className="text-[11px] text-muted-foreground">
                        Comparing skills, credentials, and experience tenure with role specifications...
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-muted-foreground">Routing to Hiring Team</p>
                      <p className="text-[11px] text-muted-foreground">
                        Preparing submission profile for hiring manager review...
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Feel free to close this window. Processing will finish in the background and update your application status.
                </p>

                <Button onClick={handleResetAndClose} variant="outline" size="lg" className="w-full text-sm font-semibold">
                  Close &amp; View My Applications
                </Button>
              </div>
            ) : (
              <div className="py-4 text-center space-y-5">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-foreground">Application Successfully Submitted</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Your application has been received and routed to the hiring team for review.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-border bg-card text-left space-y-3.5 shadow-xs">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Current Status:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      <Clock className="w-3.5 h-3.5" />
                      Application Received
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Position:</span>
                    <span className="text-foreground font-semibold text-xs truncate max-w-[220px]">
                      {job.title} ({job.department})
                    </span>
                  </div>
                </div>

                <Button onClick={handleResetAndClose} size="lg" className="w-full text-sm font-semibold">
                  Done &amp; View Status
                </Button>
              </div>
            )}
          </div>
        ) : step === "form" ? (
          /* Step 1: Application Form */
          <form onSubmit={handleProceedToDisclosure} noValidate className="flex-1 flex flex-col min-h-0 text-left">
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {!userId && (
                <div className="p-3.5 rounded-xl bg-amber-50/85 border border-amber-200/90 text-amber-950 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Please sign in with your applicant account to submit and track your application.</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="font-semibold text-xs shrink-0 bg-white">
                    <Link href="/applicant/login?next=/careers">Sign In / Register</Link>
                  </Button>
                </div>
              )}

              {error && (
                <FormAlertNote
                  variant="error"
                  title="Application Could Not Be Submitted"
                  description={error}
                  onDismiss={() => setError(null)}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name" className="text-sm font-semibold">
                    First Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={firstName}
                    error={!!fieldErrors.first_name}
                    aria-describedby={fieldErrors.first_name ? "apply-first-name-error" : undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFirstName(val);
                      if (error) setError(null);
                      if (touched.first_name || fieldErrors.first_name) {
                        const err = validateName(val, "First name");
                        if (!err) setFieldError("first_name", null);
                        else if (touched.first_name) setFieldError("first_name", err);
                      }
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, first_name: true }));
                      setFieldError("first_name", validateName(firstName, "First name"));
                    }}
                    placeholder="e.g. Juan"
                  />
                  <FieldError id="apply-first-name-error" message={fieldErrors.first_name} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="last_name" className="text-sm font-semibold">
                    Last Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={lastName}
                    error={!!fieldErrors.last_name}
                    aria-describedby={fieldErrors.last_name ? "apply-last-name-error" : undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLastName(val);
                      if (error) setError(null);
                      if (touched.last_name || fieldErrors.last_name) {
                        const err = validateName(val, "Last name");
                        if (!err) setFieldError("last_name", null);
                        else if (touched.last_name) setFieldError("last_name", err);
                      }
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, last_name: true }));
                      setFieldError("last_name", validateName(lastName, "Last name"));
                    }}
                    placeholder="e.g. Dela Cruz"
                  />
                  <FieldError id="apply-last-name-error" message={fieldErrors.last_name} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold">
                    Account email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    error={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "apply-email-error apply-email-help" : "apply-email-help"}
                    readOnly
                  />
                  <p id="apply-email-help" className="text-xs text-slate-600">Uses the email on your signed-in account.</p>
                  <FieldError id="apply-email-error" message={fieldErrors.email} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-semibold">
                    Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    error={!!fieldErrors.phone}
                    aria-describedby={fieldErrors.phone ? "apply-phone-error" : undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhone(val);
                      if (error) setError(null);
                      if (touched.phone || fieldErrors.phone) {
                        const err = validatePhone(val, true);
                        if (!err) setFieldError("phone", null);
                        else if (touched.phone) setFieldError("phone", err);
                      }
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, phone: true }));
                      setFieldError("phone", validatePhone(phone, true));
                    }}
                    placeholder="e.g. +63 917 123 4567"
                  />
                  <FieldError id="apply-phone-error" message={fieldErrors.phone} />
                </div>
              </div>

              {/* Resume Upload Dropzone */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-sm font-semibold">
                  Resume / CV File (.pdf, .docx, .txt) <span className="text-rose-500">*</span>
                </Label>
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition group focus-within:ring-4 outline-none ${
                    fieldErrors.resume
                      ? "border-rose-400 bg-rose-50/40 hover:border-rose-500 focus-within:ring-rose-500/15 focus-within:border-rose-500"
                      : isDragging
                      ? "border-[#2196F3] bg-blue-50/50 focus-within:ring-[#2196F3]/15"
                      : file
                      ? "border-emerald-300 bg-emerald-50/30 hover:border-emerald-400 focus-within:ring-[#2196F3]/15 focus-within:border-[#2196F3]"
                      : "border-border hover:border-[#2196F3]/60 bg-muted/20 hover:bg-muted/40 focus-within:ring-[#2196F3]/15 focus-within:border-[#2196F3]"
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    className="sr-only"
                    aria-label="Upload resume or CV document"
                    aria-invalid={!!fieldErrors.resume}
                    aria-describedby={fieldErrors.resume ? "apply-resume-error" : undefined}
                  />
                  {file ? (
                    <div className="flex items-center gap-3 text-foreground">
                      <FileText className="h-7 w-7 text-[#2196F3] shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="text-sm font-semibold truncate max-w-[340px]">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to submit (click to replace)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud
                        className={`h-8 w-8 transition mb-2 ${
                          fieldErrors.resume
                            ? "text-rose-500"
                            : "text-muted-foreground group-hover:text-[#2196F3]"
                        }`}
                      />
                      <div className="text-sm font-medium text-foreground">
                        Click or drop resume file here
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Digital PDF, DOCX, or TXT documents up to 10MB
                      </div>
                    </>
                  )}
                </label>
                <FieldError id="apply-resume-error" message={fieldErrors.resume} />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex items-center justify-end gap-2.5 shrink-0">
              <Button type="button" variant="outline" onClick={handleResetAndClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!userId}
                className="min-w-[170px] bg-[#2196F3] hover:bg-[#1976D2] text-white"
              >
                {!userId ? "Sign In Required to Apply" : "Continue to Review"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Step 2: AI Disclosure & Acknowledgment - Clean, polished, distilled layout */
          <div className="flex-1 flex flex-col min-h-0 text-left">
            <div
              tabIndex={0}
              role="region"
              aria-label="AI Screening Disclosure and Recruitment Standards"
              className="flex-1 overflow-y-auto py-5 space-y-5 text-sm text-muted-foreground leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset pr-2 text-left"
            >
              {/* 3 Core Screening Standards */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">
                    1. Assistive Qualification Screening
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    AI analyzes your resume to objectively map your verified skills and experience against the requirements of this role, helping recruiters review your profile faster.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">
                    2. Unbiased Blind Screening
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Screening focuses strictly on demonstrable merit. Demographic markers—such as your name, gender, contact info, and school prestige—are masked during initial review to eliminate bias.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">
                    3. Human Recruiter Decision Authority
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    AI functions purely as a decision-support tool and never makes hiring or rejection decisions. All shortlisting and hiring choices remain 100% with human recruiters.
                  </p>
                </div>
              </div>

              {/* Compact Submission Summary */}
              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">Applicant:</span>{" "}
                  {firstName} {lastName} ({email} · {phone})
                </div>
                {file && (
                  <div>
                    <span className="font-semibold text-foreground">Resume:</span>{" "}
                    <span className="font-mono text-[11px]">{file.name}</span>{" "}
                    <span className="text-[11px]">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>

              {disclosureError && (
                <FieldError message={disclosureError} />
              )}
            </div>

            {/* Canonical Footer */}
            <DialogFooter className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
              <label
                htmlFor="ai-disclosure-checkbox"
                className="flex items-center gap-2.5 cursor-pointer select-none py-1 text-left flex-1 min-w-0"
              >
                <input
                  id="ai-disclosure-checkbox"
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => {
                    setAcknowledged(e.target.checked);
                    if (e.target.checked) setDisclosureError(null);
                  }}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
                />
                <span className="text-sm font-medium text-foreground leading-snug">
                  I understand that AI assists screening and recruiters make all hiring decisions.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 w-full sm:w-auto shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("form")}
                  disabled={submitting}
                  className="px-4"
                >
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="min-w-[155px] bg-[#2196F3] hover:bg-[#1976D2] text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
