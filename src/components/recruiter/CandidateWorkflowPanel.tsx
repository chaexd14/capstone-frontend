"use client";

import React from "react";
import { ClipboardCheck } from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { getCandidateDisplayName } from "@/lib/candidate-identity";
import { Application, ApplicationStatus } from "@/types/application";
import { Job } from "@/types/job";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { CandidateWorkflowContent } from "./CandidateWorkflowContent";

const STAGE_OPTIONS: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "SUBMITTED", label: "New" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
];

interface CandidateWorkflowPanelProps {
  application: Application | null;
  job?: Job | null;
  anonymize: boolean;
  onClose: () => void;
  onApplicationUpdated?: (application: Application) => void;
  onOpenAnalysis?: (application: Application) => void;
}

function getCandidateInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function CandidateWorkflowPanel({
  application,
  job,
  anonymize,
  onClose,
  onApplicationUpdated,
  onOpenAnalysis,
}: CandidateWorkflowPanelProps) {
  const { updateApplicationStatus, pendingApplicationIds } = useRecruiter();
  const updatingStage = Boolean(application && pendingApplicationIds.has(application.id));

  const candidateName = application ? getCandidateDisplayName(application, anonymize) : "Candidate";
  const applicantNumber = application ? application.candidate_code || `#${application.id}` : "";
  const candidateInitials = getCandidateInitials(candidateName);
  const matchScore =
    typeof application?.match_result?.match_score === "number"
      ? Math.round(application.match_result.match_score)
      : null;
  const statusTone =
    application?.status === "SHORTLISTED" || application?.status === "HIRED"
      ? "success"
      : application?.status === "REJECTED"
        ? "danger"
        : application?.status === "INTERVIEW"
          ? "warning"
          : application?.status === "UNDER_REVIEW" || application?.status === "PROCESSING"
            ? "processing"
            : "neutral";

  const handleStageChange = (nextStatus: ApplicationStatus) => {
    if (!application || nextStatus === application.status) return;
    const prevSnapshot = application;
    onApplicationUpdated?.({ ...prevSnapshot, status: nextStatus });
    toast.success(`Stage updated to ${nextStatus.replaceAll("_", " ").toLowerCase()}`);

    void updateApplicationStatus(prevSnapshot, nextStatus)
      .then((confirmed) => onApplicationUpdated?.(confirmed))
      .catch((error) => {
        onApplicationUpdated?.(prevSnapshot);
        toast.error("Stage not updated", {
          description: error instanceof Error ? error.message : "Try again.",
        });
      });
  };

  return (
    <Sheet open={application !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-2xl lg:max-w-[min(54vw,58rem)]"
      >
        <div className="shrink-0 bg-card">
          <SheetHeader className="px-5 pb-4 pt-5 text-left sm:px-6 sm:pt-6">
            <div className="flex min-w-0 flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <div
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-secondary text-sm font-semibold text-secondary-foreground"
                >
                  {candidateInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle className="truncate text-xl text-foreground">{candidateName}</SheetTitle>
                    {application ? (
                      <StatusBadge status={statusTone} dot className="shrink-0">
                        {application.status.replaceAll("_", " ")}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-foreground">{application?.job_title || "Candidate workflow"}</span>
                    {application ? <span aria-hidden="true">·</span> : null}
                    {application ? (
                      <span className="tabular-nums">
                        ID: <span className="font-medium text-foreground">{applicantNumber}</span>
                      </span>
                    ) : null}
                    {matchScore !== null ? <span aria-hidden="true">·</span> : null}
                    {matchScore !== null ? (
                      <span className="tabular-nums">
                        Match: <span className="font-medium text-foreground">{matchScore}%</span>
                      </span>
                    ) : null}
                  </SheetDescription>
                </div>
              </div>

              {application ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={application.status === "PROCESSING" ? "SUBMITTED" : application.status}
                    onValueChange={(value) => void handleStageChange(value as ApplicationStatus)}
                    disabled={updatingStage}
                  >
                    <SelectTrigger className="h-9 w-40" aria-label="Change candidate stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {onOpenAnalysis ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenAnalysis(application)}
                    >
                      <ClipboardCheck className="size-4" aria-hidden="true" />
                      AI Review
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </SheetHeader>
        </div>

        {application ? (
          <CandidateWorkflowContent
            key={application.id}
            application={application}
            job={job}
            anonymize={anonymize}
            onApplicationUpdated={onApplicationUpdated}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
