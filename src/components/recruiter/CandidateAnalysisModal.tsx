"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Columns2,
  Download,
  FileText,
  Keyboard,
  ListTodo,
  RefreshCcw,
} from "lucide-react";
import { Job } from "@/types/job";
import {
  Application,
  ApplicationStatus,
  REJECTION_REASON_OPTIONS,
  RejectionReason,
} from "@/types/application";
import { downloadApiFile, fetchApi } from "@/lib/api";
import { getCandidateDisplayName } from "@/lib/candidate-identity";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { StatusBadge, type StatusBadgeProps } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CandidatePinpointDossier } from "./CandidatePinpointDossier";
import { CandidateResumePreview } from "./CandidateResumePreview";
import { CandidateWorkflowContent } from "./CandidateWorkflowContent";
import { JobDetailsReferencePane } from "./JobDetailsReferencePane";

interface CandidateAnalysisModalProps {
  application: Application | null;
  applicationsQueue?: Application[];
  onSelectApplication?: (app: Application) => void;
  job?: Job | null;
  isOpen: boolean;
  onClose: () => void;
  anonymize: boolean;
  onStatusUpdated: (updatedApp: Application) => void;
}

const STATUS_LABEL: Record<ApplicationStatus, { label: string; tone: NonNullable<StatusBadgeProps["status"]> }> = {
  SUBMITTED: { label: "Submitted", tone: "neutral" },
  PROCESSING: { label: "Processing", tone: "processing" },
  UNDER_REVIEW: { label: "Under review", tone: "processing" },
  SHORTLISTED: { label: "Shortlisted", tone: "success" },
  INTERVIEW: { label: "Interview", tone: "warning" },
  HIRED: { label: "Hired", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

const IDENTITY_REVEAL_STATUSES = new Set<ApplicationStatus>(["SHORTLISTED", "INTERVIEW", "HIRED"]);

export function CandidateAnalysisModal({
  application,
  applicationsQueue,
  onSelectApplication,
  job,
  isOpen,
  onClose,
  anonymize,
  onStatusUpdated,
}: CandidateAnalysisModalProps) {
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "resume" | "evaluation" | "workflow">("split");
  const [isDesktop, setIsDesktop] = useState(true);
  const [showJobRequirements, setShowJobRequirements] = useState(false);
  const [confirmation, setConfirmation] = useState<"reject" | "refresh" | null>(null);
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | "">("SKILLS_GAP");
  const [rejectionNote, setRejectionNote] = useState("");
  const [revealedAppId, setRevealedAppId] = useState<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => {
      const matches = query.matches;
      setIsDesktop(matches);
      if (!matches) {
        setViewMode((current) => (current === "split" ? "evaluation" : current));
      }
    };
    syncViewport();
    query.addEventListener("change", syncViewport);
    return () => query.removeEventListener("change", syncViewport);
  }, []);

  const queueIndex = useMemo(() => {
    if (!application || !applicationsQueue?.length) return -1;
    return applicationsQueue.findIndex((item) => item.id === application.id);
  }, [application, applicationsQueue]);

  const hasPrev = Boolean(applicationsQueue && queueIndex > 0 && onSelectApplication);
  const hasNext = Boolean(
    applicationsQueue && queueIndex >= 0 && queueIndex < applicationsQueue.length - 1 && onSelectApplication
  );

  const stepCandidate = useCallback(
    (delta: -1 | 1) => {
      if (!applicationsQueue || !onSelectApplication || queueIndex < 0) return;
      const next = applicationsQueue[queueIndex + delta];
      if (next) onSelectApplication(next);
    },
    [applicationsQueue, onSelectApplication, queueIndex]
  );

  const persistStatus = useCallback(
    async (
      targetId: number,
      newStatus: ApplicationStatus,
      options?: { reason?: RejectionReason | ""; note?: string }
    ) => {
      const updated = await fetchApi<Application>(`/applications/${targetId}/status/`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "REJECTED" && options?.reason ? { rejection_reason: options.reason } : {}),
          ...(newStatus === "REJECTED" && options?.note ? { rejection_note: options.note } : {}),
        }),
      });
      onStatusUpdated(updated);
      return updated;
    },
    [onStatusUpdated]
  );

  const handleStatusChange = useCallback(
    async (
      newStatus: ApplicationStatus,
      options?: { reason?: RejectionReason | ""; note?: string }
    ) => {
      if (!application) return;
      setUpdating(true);
      const previousStatus = application.status;
      const appId = application.id;
      const appCode = application.candidate_code;
      try {
        await persistStatus(appId, newStatus, options);

        toast.success(`Candidate moved to ${STATUS_LABEL[newStatus]?.label || newStatus}`, {
          description: `${appCode} updated.`,
          action: {
            label: "Undo",
            onClick: () => {
              void persistStatus(appId, previousStatus).catch(() => {
                toast.error("Could not undo status change");
              });
            },
          },
        });
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Update failed", {
          description: "We could not update the candidate. Please try again.",
        });
      } finally {
        setUpdating(false);
      }
    },
    [application, persistStatus]
  );

  // Fast-screen keyboard shortcuts: J/Down next, K/Up previous, S shortlist, R reject
  useEffect(() => {
    if (!isOpen || !application || confirmation !== null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "j" && hasNext) {
        event.preventDefault();
        stepCandidate(1);
      } else if (key === "k" && hasPrev) {
        event.preventDefault();
        stepCandidate(-1);
      } else if (key === "s" && !updating && application.status !== "SHORTLISTED") {
        event.preventDefault();
        void handleStatusChange("SHORTLISTED");
      } else if (key === "r" && !updating && application.status !== "REJECTED") {
        event.preventDefault();
        setConfirmation("reject");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [application, confirmation, handleStatusChange, hasNext, hasPrev, isOpen, stepCandidate, updating]);

  if (!application) return null;

  const isIdentityRevealed =
    !anonymize || IDENTITY_REVEAL_STATUSES.has(application.status) || revealedAppId === application.id;

  const handleDownloadResume = async () => {
    if (!application.resume) return;
    setDownloadingResume(true);
    try {
      await downloadApiFile(
        `/resumes/${application.resume.id}/download/`,
        application.resume.original_filename,
        { redirect: "error" }
      );
    } catch {
      toast.error("Download failed", {
        description: "We could not download this resume. Please try again.",
      });
    } finally {
      setDownloadingResume(false);
    }
  };

  const handleRefreshAnalysis = async () => {
    setRefreshing(true);
    try {
      const updated = await fetchApi<Application>(`/applications/${application.id}/reprocess/`, {
        method: "POST",
      });
      onStatusUpdated(updated);
      toast.success("Analysis is refreshing", {
        description: "The score and evidence will update when processing finishes.",
      });
    } catch (error) {
      console.error("Error refreshing analysis:", error);
      toast.error("Refresh failed", {
        description: "We could not refresh this analysis. Please try again.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const resume = application.resume;
  const appliedDate = new Date(application.applied_at).toLocaleDateString();
  const statusMeta = STATUS_LABEL[application.status] || {
    label: application.status.replace(/_/g, " "),
    tone: "neutral",
  };
  const candidateLabel = getCandidateDisplayName(application, anonymize && !isIdentityRevealed);

  const viewTabs = [
    ...(isDesktop ? [{ id: "split", label: "Split", icon: <Columns2 /> }] : []),
    { id: "resume", label: "Resume", icon: <FileText /> },
    { id: "evaluation", label: "Evaluated result", icon: <ClipboardCheck /> },
    { id: "workflow", label: "Workflow & Notes", icon: <ListTodo /> },
  ];

  const effectiveView = !isDesktop && viewMode === "split" ? "evaluation" : viewMode;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onClose={onClose}
        aria-labelledby="candidate-analysis-title"
        aria-describedby="candidate-analysis-description"
        className="h-[94vh] max-h-[94vh] w-[96vw] max-w-[1560px] gap-0 overflow-hidden bg-card p-0"
      >
        <TooltipProvider delayDuration={250}>
          <header className="shrink-0 border-b border-border bg-card px-5 py-4 pr-14 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <DialogHeader className="min-w-0 space-y-1 p-0 text-left">
                <DialogTitle id="candidate-analysis-title">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{candidateLabel}</span>
                    <StatusBadge status={statusMeta.tone} dot className="self-start">
                      {statusMeta.label}
                    </StatusBadge>
                    {application.scorecard_avg_rating ? (
                      <Badge variant="outline" className="tabular-nums">
                        Scorecard {application.scorecard_avg_rating}/5
                      </Badge>
                    ) : null}
                  </div>
                </DialogTitle>
                <DialogDescription
                  id="candidate-analysis-description"
                  className="flex flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <span>{application.job_title || "General application"}</span>
                  {application.job_department ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{application.job_department}</span>
                    </>
                  ) : null}
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Applied {appliedDate}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                {applicationsQueue && queueIndex >= 0 ? (
                  <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2 py-1">
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={!hasPrev}
                      onClick={() => stepCandidate(-1)}
                      label="Previous candidate (K)"
                    >
                      <ChevronLeft />
                    </IconButton>
                    <span className="px-1 text-sm font-semibold tabular-nums text-foreground">
                      {queueIndex + 1} / {applicationsQueue.length}
                    </span>
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={!hasNext}
                      onClick={() => stepCandidate(1)}
                      label="Next candidate (J)"
                    >
                      <ChevronRight />
                    </IconButton>
                  </div>
                ) : null}

                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="hidden sm:inline-flex">
                      <Keyboard className="size-4" aria-hidden="true" />
                      Shortcuts
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 space-y-2 text-sm">
                    <p className="font-semibold text-foreground">Fast-screen shortcuts</p>
                    <div className="space-y-1 text-muted-foreground">
                      <p className="flex justify-between"><span>Next candidate</span><Badge variant="secondary">J</Badge></p>
                      <p className="flex justify-between"><span>Previous candidate</span><Badge variant="secondary">K</Badge></p>
                      <p className="flex justify-between"><span>Shortlist</span><Badge variant="secondary">S</Badge></p>
                      <p className="flex justify-between"><span>Reject</span><Badge variant="secondary">R</Badge></p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </header>

          <div className="shrink-0 border-b border-border bg-card px-5 py-2.5 sm:px-6">
            <FilterTabs
              label="Candidate view"
              value={effectiveView}
              onValueChange={(value) =>
                setViewMode(value as "split" | "resume" | "evaluation" | "workflow")
              }
              tabs={viewTabs}
            />
          </div>

          {effectiveView === "workflow" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CandidateWorkflowContent
                key={application.id}
                application={application}
                job={job}
                anonymize={anonymize && !isIdentityRevealed}
                onApplicationUpdated={onStatusUpdated}
              />
            </div>
          ) : (
            <div
              className={cn(
                "grid min-h-0 flex-1 overflow-hidden",
                effectiveView === "split" ? "lg:grid-cols-2" : "grid-cols-1"
              )}
            >
              <div
                className={cn(
                  "min-h-0 overflow-hidden border-border",
                  effectiveView === "resume"
                    ? "flex"
                    : effectiveView === "split"
                      ? "hidden lg:flex lg:border-r"
                      : "hidden"
                )}
              >
                <CandidateResumePreview
                  application={application}
                  anonymize={anonymize}
                  isIdentityRevealed={isIdentityRevealed}
                  isExpanded={effectiveView === "resume"}
                  onToggleExpand={() =>
                    setViewMode(effectiveView === "resume" ? "split" : "resume")
                  }
                  className="h-full w-full"
                />
              </div>

              <div
                className={cn(
                  "min-h-0 overflow-y-auto bg-muted/30 px-5 py-6 sm:px-6",
                  effectiveView === "resume" ? "hidden" : "block"
                )}
              >
                <div
                  className={cn(
                    "mx-auto",
                    effectiveView === "evaluation" ? "max-w-4xl" : "max-w-3xl"
                  )}
                >
                  <CandidatePinpointDossier
                    key={application.id}
                    application={application}
                    anonymize={anonymize}
                    onIdentityRevealChange={(revealed) => setRevealedAppId(revealed ? application.id : null)}
                  />

                  <div className="mt-6 border-t border-border pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-expanded={showJobRequirements}
                      onClick={() => setShowJobRequirements((open) => !open)}
                      className="w-full justify-between text-foreground"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Briefcase className="size-4 text-primary" aria-hidden="true" />
                        <span>View job requirements</span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform duration-200",
                          showJobRequirements && "rotate-180"
                        )}
                        aria-hidden="true"
                      />
                    </Button>

                    {showJobRequirements ? (
                      <div className="mt-4">
                        <JobDetailsReferencePane application={application} job={job} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0 border-t border-border bg-card px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <ButtonGroup className="flex-wrap">
              {resume && !resume.is_purged && isIdentityRevealed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDownloadResume()}
                  disabled={downloadingResume}
                >
                  {downloadingResume ? (
                    <Spinner className="text-current" label="Downloading resume" />
                  ) : (
                    <Download aria-hidden="true" />
                  )}
                  <span>{downloadingResume ? "Downloading…" : "Download resume"}</span>
                </Button>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmation("refresh")}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Spinner className="text-current" label="Refreshing analysis" />
                ) : (
                  <RefreshCcw aria-hidden="true" />
                )}
                <span>{refreshing ? "Refreshing…" : "Refresh analysis"}</span>
              </Button>
            </ButtonGroup>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={application.status === "PROCESSING" ? "SUBMITTED" : application.status}
                onValueChange={(value) => {
                  const next = value as ApplicationStatus;
                  if (next === "REJECTED") {
                    setConfirmation("reject");
                  } else {
                    void handleStatusChange(next);
                  }
                }}
                disabled={updating}
              >
                <SelectTrigger className="h-9 w-40" aria-label="Move to stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under review</SelectItem>
                  <SelectItem value="SHORTLISTED">Shortlisted</SelectItem>
                  <SelectItem value="INTERVIEW">Interview</SelectItem>
                  <SelectItem value="HIRED">Hired</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="destructive"
                disabled={updating || application.status === "REJECTED"}
                onClick={() => setConfirmation("reject")}
              >
                Reject
              </Button>
              <Button
                type="button"
                disabled={updating || application.status === "SHORTLISTED"}
                onClick={() => void handleStatusChange("SHORTLISTED")}
              >
                Shortlist
              </Button>
            </div>
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && setConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation === "reject" ? "Reject this candidate?" : "Refresh this analysis?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation === "reject"
                ? "Record an objective reason for audit compliance. You can undo the status change from the confirmation toast."
                : "The current score and evidence will be replaced when processing finishes."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmation === "reject" ? (
            <div className="space-y-3 py-1">
              <FormField label="Rejection reason" htmlFor="reject-reason-select">
                <Select value={rejectionReason || "SKILLS_GAP"} onValueChange={(v) => setRejectionReason(v as RejectionReason)}>
                  <SelectTrigger id="reject-reason-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REJECTION_REASON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Optional internal note" htmlFor="reject-reason-note">
                <Textarea
                  id="reject-reason-note"
                  rows={2}
                  maxLength={500}
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Brief merit-based note for team reference…"
                />
              </FormField>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmation === "reject" ? "destructive" : "default"}
              onClick={() => {
                const action = confirmation;
                setConfirmation(null);
                if (action === "reject") {
                  void handleStatusChange("REJECTED", { reason: rejectionReason, note: rejectionNote });
                  setRejectionNote("");
                } else if (action === "refresh") {
                  void handleRefreshAnalysis();
                }
              }}
            >
              {confirmation === "reject" ? "Reject candidate" : "Refresh analysis"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
