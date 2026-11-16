"use client";

import React, { useEffect, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  ClipboardCheck,
  Columns2,
  Download,
  FileText,
  RefreshCcw,
} from "lucide-react";
import { Job } from "@/types/job";
import { Application, ApplicationStatus } from "@/types/application";
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
import { toast } from "@/components/ui/sonner";
import { StatusBadge, type StatusBadgeProps } from "@/components/ui/status-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CandidatePinpointDossier } from "./CandidatePinpointDossier";
import { CandidateResumePreview } from "./CandidateResumePreview";
import { JobDetailsReferencePane } from "./JobDetailsReferencePane";

interface CandidateAnalysisModalProps {
  application: Application | null;
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

export function CandidateAnalysisModal({
  application,
  job,
  isOpen,
  onClose,
  anonymize,
  onStatusUpdated,
}: CandidateAnalysisModalProps) {
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "resume" | "evaluation">("split");
  const [isDesktop, setIsDesktop] = useState(true);
  const [showJobRequirements, setShowJobRequirements] = useState(false);
  const [confirmation, setConfirmation] = useState<"reject" | "refresh" | null>(null);

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

  if (!application) return null;

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

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    setUpdating(true);
    const previousStatus = application.status;
    try {
      const updated = await fetchApi<Application>(`/applications/${application.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusUpdated(updated);

      if (newStatus === "SHORTLISTED") {
        toast.success("Candidate shortlisted", {
          description: `${application.candidate_code} was moved to the shortlist.`,
          action: { label: "Undo", onClick: () => void handleStatusChange(previousStatus) },
        });
      } else if (newStatus === "REJECTED") {
        toast.info("Candidate rejected", {
          description: `${application.candidate_code} was marked as rejected.`,
          action: { label: "Undo", onClick: () => void handleStatusChange(previousStatus) },
        });
      } else {
        toast.success("Candidate kept under review");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Update failed", {
        description: "We could not update the candidate. Please try again.",
      });
    } finally {
      setUpdating(false);
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
  const candidateLabel = getCandidateDisplayName(application, anonymize);

  const viewTabs = [
    ...(isDesktop ? [{ id: "split", label: "Split", icon: <Columns2 /> }] : []),
    { id: "resume", label: "Resume", icon: <FileText /> },
    { id: "evaluation", label: "Evaluated result", icon: <ClipboardCheck /> },
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
                <DialogTitle id="candidate-analysis-title"><div className="flex items-center gap-2">{candidateLabel}<StatusBadge status={statusMeta.tone} dot className="self-start">
                  {statusMeta.label}
                </StatusBadge></div></DialogTitle>
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

            </div>
          </header>

          <div className="shrink-0 border-b border-border bg-card px-5 py-2.5 sm:px-6">
            <FilterTabs
              label="Candidate view"
              value={effectiveView}
              onValueChange={(value) =>
                setViewMode(value as "split" | "resume" | "evaluation")
              }
              tabs={viewTabs}
            />
          </div>

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
                <CandidatePinpointDossier application={application} anonymize={anonymize} />

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

          <DialogFooter className="shrink-0 border-t border-border bg-card px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <ButtonGroup className="flex-wrap">
              {resume && !resume.is_purged ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadResume}
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

            <ButtonGroup className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
              <Button
                type="button"
                variant="outline"
                disabled={updating || application.status === "UNDER_REVIEW"}
                onClick={() => handleStatusChange("UNDER_REVIEW")}
              >
                Keep under review
              </Button>
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
                onClick={() => handleStatusChange("SHORTLISTED")}
              >
                Shortlist
              </Button>
            </ButtonGroup>
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
                ? "The candidate will leave active review. You can undo the status change from the confirmation message."
                : "The current score and evidence will be replaced when processing finishes."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmation === "reject" ? "destructive" : "default"}
              onClick={() => {
                const action = confirmation;
                setConfirmation(null);
                if (action === "reject") void handleStatusChange("REJECTED");
                else if (action === "refresh") void handleRefreshAnalysis();
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
