"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Job } from "@/types/job";
import { Application, ApplicationStatus } from "@/types/application";
import {
  ChevronDown,
  ArrowLeft,
  Download,
  FileText,
  Lock,
  Unlock,
  Archive,
  Users,
} from "lucide-react";
import { CandidateAnalysisModal } from "./CandidateAnalysisModal";
import { JobCandidatesReportDialog } from "./JobCandidatesReportDialog";
import { ConfirmJobActionModal, JobActionType } from "./ConfirmJobActionModal";
import { fetchApi } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/feedback";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { MetricSummary } from "@/components/ui/metric-summary";
import { NavTabs } from "@/components/ui/nav-tabs";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge, type StatusBadgeProps } from "@/components/ui/status-badge";
import { CollectionToolbar } from "@/components/ui/toolbar";

const STATUS_META: Record<
  ApplicationStatus,
  { label: string; status: NonNullable<StatusBadgeProps["status"]> }
> = {
  SUBMITTED: { label: "Submitted", status: "neutral" },
  PROCESSING: { label: "Processing", status: "processing" },
  UNDER_REVIEW: { label: "Under review", status: "processing" },
  SHORTLISTED: { label: "Shortlisted", status: "success" },
  INTERVIEW: { label: "Interview", status: "warning" },
  HIRED: { label: "Hired", status: "success" },
  REJECTED: { label: "Rejected", status: "danger" },
};

const STATUS_OPTIONS: ApplicationStatus[] = [
  "SUBMITTED",
  "PROCESSING",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "HIRED",
  "REJECTED",
];

const IDENTITY_REVEAL_STATUSES = new Set<ApplicationStatus>([
  "SHORTLISTED",
  "INTERVIEW",
  "HIRED",
]);

function formatAppliedDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getBandStatus(band: string): NonNullable<StatusBadgeProps["status"]> {
  if (band === "Strong") return "success";
  if (band === "Good") return "info";
  if (band === "Partial") return "warning";
  return "neutral";
}

function getMustHavesStatus(summary: string): NonNullable<StatusBadgeProps["status"]> {
  const [met, total] = summary.split("/").map((part) => part.trim());
  if (summary.startsWith("All") || (met && total && met === total)) {
    return "success";
  }
  return "warning";
}

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status] || {
    label: status.replace(/_/g, " "),
    status: "neutral",
  };
  return (
    <StatusBadge status={meta.status} dot>
      {meta.label}
    </StatusBadge>
  );
}

interface JobProfileViewProps {
  job: Job;
  applications: Application[];
  anonymize: boolean;
  onBack: () => void;
  onApplicationUpdated: (updatedApp: Application) => void;
  onJobUpdated?: (updatedJob: Job) => void;
  onJobArchived?: (jobId: number) => void;
}

export function JobProfileView({
  job,
  applications,
  anonymize,
  onBack,
  onApplicationUpdated,
  onJobUpdated,
  onJobArchived,
}: JobProfileViewProps) {
  const [currentJob, setCurrentJob] = useState<Job>(job);
  const [prevJob, setPrevJob] = useState<Job>(job);
  const [actionModalType, setActionModalType] = useState<JobActionType | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  if (job !== prevJob) {
    setPrevJob(job);
    setCurrentJob(job);
  }

  const [activeTab, setActiveTab] = useState<"rankings" | "all">("rankings");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [bandFilter, setBandFilter] = useState<string>("ALL");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [workspaceSection, setWorkspaceSection] = useState<"candidates" | "details">("candidates");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportSession, setReportSession] = useState(0);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<number>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [pendingRejection, setPendingRejection] = useState<
    | { type: "single"; application: Application }
    | { type: "bulk"; applicationIds: number[] }
    | null
  >(null);

  // Filter applications for this specific job
  const jobApplications = useMemo(
    () => applications.filter(
      (app) => app.job === currentJob.id || app.job_title === currentJob.title
    ),
    [applications, currentJob.id, currentJob.title]
  );

  const handleConfirmAction = async () => {
    if (!actionModalType) return;
    setIsActionLoading(true);
    try {
      if (actionModalType === "close") {
        const updated = await fetchApi<Job>(`/jobs/${currentJob.id}/close/`, { method: "POST" });
        setCurrentJob(updated);
        if (onJobUpdated) onJobUpdated(updated);
        toast.success("Position Closed", {
          description: `"${currentJob.title}" is now closed to new applications.`,
        });
      } else if (actionModalType === "reopen") {
        const updated = await fetchApi<Job>(`/jobs/${currentJob.id}/reopen/`, { method: "POST" });
        setCurrentJob(updated);
        if (onJobUpdated) onJobUpdated(updated);
        toast.success("Position Reopened", {
          description: `"${currentJob.title}" is published and accepting applications.`,
        });
      } else if (actionModalType === "archive") {
        await fetchApi(`/jobs/${currentJob.id}/archive/`, { method: "POST" });
        if (onJobArchived) onJobArchived(currentJob.id);
        toast.success("Job archived", {
          description: `"${currentJob.title}" has been moved to archives.`,
        });
        onBack();
      }
    } catch (err: unknown) {
      console.error("Action error:", err);
      const message = err instanceof Error ? err.message : "An error occurred while executing this action.";
      toast.error("Action Failed", {
        description: message,
      });
    } finally {
      setIsActionLoading(false);
      setActionModalType(null);
    }
  };

  // Compute metrics
  const totalCount = jobApplications.length;
  const shortlistedCount = jobApplications.filter((a) => a.status === "SHORTLISTED").length;

  const validScores = jobApplications
    .map((a) => a.match_result?.match_score)
    .filter((s): s is number => typeof s === "number");
  const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  const topScore = validScores.length > 0 ? Math.max(...validScores) : 0;

  // Filtered and Sorted Applicants
  const filteredApps = useMemo(() => jobApplications.filter((app) => {
    const matchesSearch =
      (app.applicant_name && app.applicant_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.candidate_code && app.candidate_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.email && app.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.phone && app.phone.includes(searchQuery));
    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;

    const score = app.match_result?.match_score ?? 0;
    const band = app.match_result?.ai_insights?.band || (score >= 85 ? "Strong" : score >= 70 ? "Good" : score >= 50 ? "Partial" : "Weak");
    const matchesBand = bandFilter === "ALL" || band === bandFilter;

    return matchesSearch && matchesStatus && matchesBand;
  }), [jobApplications, searchQuery, statusFilter, bandFilter]);

  // AI Leaderboard: sorted strictly descending by match score
  const rankedApplicants = useMemo(() => [...filteredApps].sort((a, b) => {
    const scoreA = a.match_result?.match_score ?? -1;
    const scoreB = b.match_result?.match_score ?? -1;
    return scoreB - scoreA;
  }), [filteredApps]);

  // All Applicants: sorted by application date descending
  const rosterApplicants = useMemo(() => [...filteredApps].sort((a, b) => {
    return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
  }), [filteredApps]);

  const persistApplicationStatus = useCallback(async (app: Application, status: ApplicationStatus) => {
    const updated = await fetchApi<Application>(`/applications/${app.id}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    onApplicationUpdated(updated);
    return updated;
  }, [onApplicationUpdated]);

  // Direct status update handler (works for button clicks or keyboard shortcuts)
  const handleDirectStatusChange = useCallback(async (
    app: Application,
    newStatus: ApplicationStatus,
    confirmed = false
  ) => {
    if (newStatus === app.status) return;
    if (newStatus === "REJECTED" && !confirmed) {
      setPendingRejection({ type: "single", application: app });
      return;
    }

    setUpdatingId(app.id);
    try {
      const previousStatus = app.status;
      await persistApplicationStatus(app, newStatus);
      toast.success("Candidate status updated", {
        description: `${app.candidate_code} is now ${newStatus.replaceAll("_", " ").toLowerCase()}.`,
        action: {
          label: "Undo",
          onClick: () => {
            void persistApplicationStatus(app, previousStatus).catch((error: unknown) => {
              toast.error("Could not undo the status change", {
                description: error instanceof Error ? error.message : "Retry from the candidate record.",
              });
            });
          },
        },
      });
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status", {
        description: err instanceof Error ? err.message : "Network error updating candidate status.",
      });
    } finally {
      setUpdatingId(null);
    }
  }, [persistApplicationStatus]);

  const toggleSelectCandidate = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatusChange = async (
    newStatus: ApplicationStatus,
    confirmed = false,
    explicitIds?: number[]
  ) => {
    const requestedIds = explicitIds ?? Array.from(selectedCandidateIds);
    if (requestedIds.length === 0 || isBulkUpdating) return;
    if (newStatus === "REJECTED" && !confirmed) {
      setPendingRejection({ type: "bulk", applicationIds: requestedIds });
      return;
    }
    setIsBulkUpdating(true);
    const targetIds = requestedIds;
    let successCount = 0;
    const failedIds: number[] = [];
    try {
      const updates = targetIds.map(async (id) => {
        try {
          const updated = await fetchApi<Application>(`/applications/${id}/status/`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus }),
          });
          onApplicationUpdated(updated);
          successCount++;
        } catch (err) {
          console.error(`Failed to update candidate #${id}:`, err);
          failedIds.push(id);
        }
      });
      await Promise.all(updates);
      const formattedStatus =
        newStatus === "SHORTLISTED"
          ? "Shortlisted"
          : newStatus === "UNDER_REVIEW"
            ? "Moved to Review"
            : "Rejected";
      if (failedIds.length > 0) {
        toast.error(`${failedIds.length} candidate${failedIds.length === 1 ? "" : "s"} could not be updated`, {
          description: `${successCount} succeeded. The failed candidates remain selected so you can retry.`,
        });
        setSelectedCandidateIds(new Set(failedIds));
      } else {
        toast.success(`${successCount} candidate${successCount === 1 ? "" : "s"} updated`, {
          description: `Status changed to ${formattedStatus}.`,
        });
        setSelectedCandidateIds(new Set());
      }
    } catch (err) {
      console.error("Bulk update error:", err);
      toast.error("Bulk Status Update Failed", {
        description: err instanceof Error ? err.message : "Error executing bulk status change.",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const openAnalysis = (app: Application) => {
    setSelectedApplication(app);
    setIsAnalysisOpen(true);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || statusFilter !== "ALL" || bandFilter !== "ALL"
  );

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setBandFilter("ALL");
  };

  const renderMobileApplicantCard = (app: Application, ranked: boolean) => {
    const score = app.match_result?.match_score;
    const band =
      app.match_result?.ai_insights?.band ||
      (typeof score === "number"
        ? score >= 85
          ? "Strong"
          : score >= 70
            ? "Good"
            : score >= 50
              ? "Partial"
              : "Weak"
        : null);
    const credentialStatus = app.match_result?.ai_insights?.hard_requirement_status;
    const hideIdentity = anonymize && !IDENTITY_REVEAL_STATUSES.has(app.status);

    return (
      <Card key={app.id} className="border border-border">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Checkbox
              checked={selectedCandidateIds.has(app.id)}
              onCheckedChange={() => toggleSelectCandidate(app.id)}
              aria-label={`Select applicant ${app.candidate_code}`}
              className="mt-1"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {app.candidate_code}
                </span>
                <ApplicationStatusBadge status={app.status} />
              </div>
              <p className="truncate text-sm font-semibold text-foreground">
                {hideIdentity ? "Blind screening active" : app.applicant_name || "Applicant record"}
              </p>
              <p className="text-sm tabular-nums text-muted-foreground">
                Applied {formatAppliedDate(app.applied_at)}
              </p>
            </div>
          </div>

          {typeof score === "number" ? (
            <div className="shrink-0 text-right">
              <p className="text-lg font-extrabold tabular-nums text-success">{score}%</p>
              {band ? <p className="text-sm text-muted-foreground">{band} match</p> : null}
            </div>
          ) : null}
        </CardHeader>

        {credentialStatus ? (
          <CardContent className="pb-3">
            <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm leading-5 text-foreground">
              <span className="font-semibold">Required credential:</span> {credentialStatus}
            </p>
          </CardContent>
        ) : null}

        <CardFooter className="grid grid-cols-1 gap-2 border-t border-border pt-4 sm:grid-cols-2">
          <Select
            value={app.status}
            onValueChange={(value) => void handleDirectStatusChange(app, value as ApplicationStatus)}
          >
            <SelectTrigger
              className="h-11 w-full"
              aria-label={`Update status for ${app.candidate_code}`}
              disabled={updatingId === app.id}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_META[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            className="h-11 w-full"
            onClick={() => openAnalysis(app)}
          >
            {ranked ? "Review candidate" : "View profile"}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader className="border-b border-border pb-6">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 mb-2 text-muted-foreground">
            <ArrowLeft aria-hidden="true" />
            Back to jobs
          </Button>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {currentJob.status === "CLOSED" ? (
                <StatusBadge status="warning" dot>Closed</StatusBadge>
              ) : (
                <StatusBadge status="success" dot>Published</StatusBadge>
              )}
              <StatusBadge status="neutral">{currentJob.department || "Operations"}</StatusBadge>
              <span className="text-sm text-muted-foreground">
                Posted on {new Date(currentJob.created_at).toLocaleDateString()}
              </span>
            </div>
            <PageHeaderTitle>{currentJob.title}</PageHeaderTitle>
            <PageHeaderDescription>
              {currentJob.location || "Remote"} · {currentJob.employment_type || "Full time"} · {currentJob.minimum_experience || "Any experience"} · {currentJob.education_requirement || "No education requirement"}
            </PageHeaderDescription>
          </div>
        </div>
        <PageHeaderActions>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Job actions <ChevronDown aria-hidden="true" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Job #{currentJob.id} · publishing controls</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {currentJob.status === "CLOSED" ? (
                <DropdownMenuItem onSelect={() => setActionModalType("reopen")}>
                  <Unlock aria-hidden="true" className="text-emerald-600" />
                  <span><span className="block font-semibold">Reopen job</span><span className="text-sm text-muted-foreground">Start accepting applications again</span></span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setActionModalType("close")}>
                  <Lock aria-hidden="true" className="text-amber-600" />
                  <span><span className="block font-semibold">Close job</span><span className="text-sm text-muted-foreground">Stop accepting new applications</span></span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => setActionModalType("archive")} className="text-destructive focus:text-destructive">
                <Archive aria-hidden="true" />
                <span><span className="block font-semibold">Archive job</span><span className="text-sm opacity-80">Move it out of active job lists</span></span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PageHeaderActions>
      </PageHeader>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-border pb-6 sm:grid-cols-4">
        <MetricSummary label="Candidates" value={totalCount} description="Applications received" />
        <MetricSummary label="Top match" value={topScore > 0 ? `${topScore}%` : "—"} description="Highest evaluated score" tone="success" />
        <MetricSummary label="Average score" value={avgScore > 0 ? `${avgScore}%` : "—"} description="Across evaluated resumes" />
        <MetricSummary label="Shortlisted" value={shortlistedCount} description="Candidates progressing" tone="success" />
      </div>

      <NavTabs
        label="Job workspace sections"
        value={workspaceSection}
        onValueChange={(value) => setWorkspaceSection(value as "candidates" | "details")}
        tabs={[
          {
            id: "candidates",
            label: "Review candidates",
            count: totalCount,
            icon: <Users />,
          },
          {
            id: "details",
            label: "Job details",
            icon: <FileText />,
          },
        ]}
      />

      <div className="space-y-4">

        {workspaceSection === "details" && (
          <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6">
            <div>
              <span className="font-bold text-slate-900 uppercase tracking-wider text-sm block">
                Role overview
              </span>
              <p className="text-slate-600 leading-relaxed mt-1 whitespace-pre-line text-sm max-w-4xl">
                {currentJob.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-sm block">
                  Must-Have Qualifications &amp; Licensure
                </span>
                {currentJob.required_skills && currentJob.required_skills.length > 0 ? (
                  currentJob.required_skills.some((s) => s.length > 32 || s.trim().split(/\s+/).length > 4) ? (
                    <ul className="space-y-1.5 mt-2">
                      {currentJob.required_skills.map((skill, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-blue-50/70 text-slate-800 border border-blue-100 leading-relaxed"
                        >
                          <span className="text-primary font-bold text-sm mt-0.5 shrink-0">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="break-words">{skill}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {currentJob.required_skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-sm font-medium px-2.5 py-0.5 rounded-lg bg-blue-50 text-primary border border-blue-100"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )
                ) : (
                  <span className="text-slate-400 text-sm mt-2 block">None specified</span>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider text-sm block">
                  Preferred Qualifications &amp; Bonus Assets
                </span>
                {currentJob.preferred_skills && currentJob.preferred_skills.length > 0 ? (
                  currentJob.preferred_skills.some((s) => s.length > 32 || s.trim().split(/\s+/).length > 4) ? (
                    <ul className="space-y-1.5 mt-2">
                      {currentJob.preferred_skills.map((skill, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm font-normal px-3 py-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/80 leading-relaxed"
                        >
                          <span className="text-slate-400 font-bold text-sm mt-0.5 shrink-0">
                            +{idx + 1}
                          </span>
                          <span className="break-words">{skill}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {currentJob.preferred_skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-sm font-normal px-2.5 py-0.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )
                ) : (
                  <span className="text-slate-400 text-sm mt-2 block">None specified</span>
                )}
              </div>
            </div>

            {/* Calibrated Scoring Rubric Breakdown */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-sm">
                  How candidates are scored
                </span>
                <span className="text-sm text-slate-400 ">
                  {currentJob.rubric_weights ? "Custom scoring priorities" : "Standard scoring priorities"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-slate-100 rounded-xl border border-slate-200/90 bg-slate-50/50 overflow-hidden text-center text-sm">
                <div className="p-2.5 space-y-0.5">
                  <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">Required Skills</div>
                  <div className="font-bold text-primary text-sm tabular-nums">
                    {currentJob.rubric_weights?.required_skills ?? 40}%
                  </div>
                  <div className="text-sm text-slate-400">Must-have fit</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">Experience</div>
                  <div className="font-bold text-slate-900 text-sm tabular-nums">
                    {currentJob.rubric_weights?.experience ?? 25}%
                  </div>
                  <div className="text-sm text-slate-400">Tenure fit</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">Education</div>
                  <div className="font-bold text-slate-900 text-sm tabular-nums">
                    {currentJob.rubric_weights?.education ?? 15}%
                  </div>
                  <div className="text-sm text-slate-400">Degree + license</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="text-sm text-slate-400 font-bold uppercase tracking-wider">Bonus Tools</div>
                  <div className="font-bold text-slate-900 text-sm tabular-nums">
                    {currentJob.rubric_weights?.preferred_skills ?? 10}%
                  </div>
                  <div className="text-sm text-slate-400">Preferred assets</div>
                </div>
                <div className="p-2.5 space-y-0.5 col-span-2 sm:col-span-1">
                  <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">Projects / Duties</div>
                  <div className="font-bold text-slate-900 text-sm tabular-nums">
                    {currentJob.rubric_weights?.projects ?? 10}%
                  </div>
                  <div className="text-sm text-slate-400">Hands-on tasks</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Candidate Evaluation Workspace */}
      {workspaceSection === "candidates" && (
        <div className="space-y-4">
          <CollectionToolbar
            label="Candidate pipeline controls"
            tabs={
              <FilterTabs
                className="max-w-full shrink-0"
                label="Candidate view"
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as "rankings" | "all")}
                tabs={[
                  { id: "rankings", label: "Ranked" },
                  { id: "all", label: "All applicants" },
                ]}
              />
            }
            search={
              <SearchInput
                aria-label="Search applicants"
                placeholder="Search name, code, email, or phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
                containerClassName="w-full sm:w-56 lg:w-64"
              />
            }
            filters={
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger aria-label="Filter by status" className="w-full sm:w-40">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_META[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={bandFilter} onValueChange={setBandFilter}>
                  <SelectTrigger
                    id="match-strength-filter"
                    aria-label="Filter by match strength"
                    className="w-full sm:w-40"
                  >
                    <SelectValue placeholder="All strengths" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All strengths</SelectItem>
                    <SelectItem value="Strong">Strong (85%+)</SelectItem>
                    <SelectItem value="Good">Good (70–84%)</SelectItem>
                    <SelectItem value="Partial">Partial (50–69%)</SelectItem>
                    <SelectItem value="Weak">Weak (below 50%)</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            actions={
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReportSession((count) => count + 1);
                  setIsReportOpen(true);
                }}
              >
                <Download aria-hidden="true" />
                Generate report
              </Button>
            }
          />

          {(activeTab === "rankings" ? rankedApplicants : rosterApplicants).length === 0 ? (
            <EmptyState
              title={hasActiveFilters ? "No candidates match these filters" : "No applicants yet"}
              description={
                hasActiveFilters
                  ? "Clear the search or choose another status or match strength to see more candidates."
                  : "Candidate evaluations will appear here as soon as applicants submit resumes for this requisition."
              }
              actionLabel={hasActiveFilters ? "Clear filters" : undefined}
              onAction={hasActiveFilters ? clearFilters : undefined}
              className="rounded-2xl border border-dashed border-border bg-muted/30"
            />
          ) : activeTab === "rankings" ? (
            <>
              <div className="space-y-3 md:hidden">
                {rankedApplicants.map((app) => renderMobileApplicantCard(app, true))}
              </div>

              <section
                aria-label="Ranked candidates table"
                className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block"
              >
                <Table density="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Rank</TableHead>
                      <TableHead>Candidate ID</TableHead>
                      <TableHead>Applicant name</TableHead>
                      <TableHead className="text-center">Match score</TableHead>
                      <TableHead className="text-center">Match level</TableHead>
                      <TableHead className="text-center">Must-haves</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedApplicants.map((app, index) => {
                      const score = app.match_result?.match_score ?? 0;
                      const insights = app.match_result?.ai_insights;
                      const band =
                        insights?.band ||
                        (score >= 85
                          ? "Strong"
                          : score >= 70
                            ? "Good"
                            : score >= 50
                              ? "Partial"
                              : "Weak");
                      const mustHavesSummary =
                        insights?.must_haves_summary ||
                        (insights?.must_have_breakdown
                          ? `${insights.must_have_breakdown.filter((m) => m.status === "met").length} / ${insights.must_have_breakdown.length}`
                          : `${app.match_result?.matched_skills.length || 0} Met`);
                      const hideIdentity = anonymize && !IDENTITY_REVEAL_STATUSES.has(app.status);
                      const displayName = hideIdentity
                        ? "Blind screening active"
                        : app.applicant_name || "Applicant record";

                      return (
                        <TableRow
                          key={app.id}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                          onClick={() => openAnalysis(app)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openAnalysis(app);
                            }
                          }}
                        >
                          <TableCell overflow="nowrap" className="text-center tabular-nums">
                            {index < 3 && score > 0 ? (
                              <StatusBadge status={index === 0 ? "warning" : "neutral"}>
                                #{index + 1}
                              </StatusBadge>
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground">
                                {index + 1}
                              </span>
                            )}
                          </TableCell>

                          <TableCell overflow="nowrap">
                            <Button
                              type="button"
                              variant="link"
                              onClick={(event) => {
                                event.stopPropagation();
                                openAnalysis(app);
                              }}
                              className="h-auto p-0 text-sm font-bold tabular-nums text-foreground hover:text-primary"
                            >
                              {app.candidate_code || `Applicant #${app.id}`}
                            </Button>
                          </TableCell>

                          <TableCell overflow="truncate" title={displayName}>
                            <span
                              className={
                                hideIdentity
                                  ? "text-sm text-muted-foreground"
                                  : "text-sm font-semibold text-foreground"
                              }
                            >
                              {displayName}
                            </span>
                          </TableCell>

                          <TableCell
                            overflow="nowrap"
                            className="text-center text-sm font-bold tabular-nums text-success"
                          >
                            {score > 0 ? `${score}%` : "—"}
                          </TableCell>

                          <TableCell overflow="nowrap" className="text-center">
                            <StatusBadge status={getBandStatus(band)}>{band}</StatusBadge>
                          </TableCell>

                          <TableCell overflow="nowrap" className="text-center tabular-nums">
                            <StatusBadge status={getMustHavesStatus(mustHavesSummary)}>
                              {mustHavesSummary}
                            </StatusBadge>
                          </TableCell>

                          <TableCell overflow="nowrap" className="text-center">
                            <ApplicationStatusBadge status={app.status} />
                          </TableCell>

                          <TableCell
                            overflow="nowrap"
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openAnalysis(app)}
                            >
                              View profile
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </section>
            </>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {rosterApplicants.map((app) => renderMobileApplicantCard(app, false))}
              </div>

              <section
                aria-label="All job applicants table"
                className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block"
              >
                <Table density="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate ID</TableHead>
                      <TableHead>Applicant name</TableHead>
                      <TableHead>Email address</TableHead>
                      <TableHead>Contact number</TableHead>
                      <TableHead>Date applied</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosterApplicants.map((app) => {
                      const hideIdentity = anonymize && !IDENTITY_REVEAL_STATUSES.has(app.status);
                      const displayName = hideIdentity
                        ? "Blind screening active"
                        : app.applicant_name || "Applicant record";

                      return (
                        <TableRow
                          key={app.id}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                          onClick={() => openAnalysis(app)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openAnalysis(app);
                            }
                          }}
                        >
                          <TableCell overflow="nowrap">
                            <Button
                              type="button"
                              variant="link"
                              onClick={(event) => {
                                event.stopPropagation();
                                openAnalysis(app);
                              }}
                              className="h-auto p-0 text-sm font-bold tabular-nums text-foreground hover:text-primary"
                            >
                              {app.candidate_code || `Applicant #${app.id}`}
                            </Button>
                          </TableCell>

                          <TableCell overflow="truncate" title={displayName}>
                            <span
                              className={
                                hideIdentity
                                  ? "text-sm text-muted-foreground"
                                  : "text-sm font-semibold text-foreground"
                              }
                            >
                              {displayName}
                            </span>
                          </TableCell>

                          <TableCell
                            overflow="truncate"
                            title={hideIdentity ? "Hidden by blind screening" : app.email || "No email"}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {hideIdentity ? (
                              <span className="text-sm text-muted-foreground">
                                Hidden by blind screening
                              </span>
                            ) : (
                              <span className="select-text text-sm text-foreground">
                                {app.email || "No email"}
                              </span>
                            )}
                          </TableCell>

                          <TableCell overflow="nowrap" onClick={(e) => e.stopPropagation()}>
                            {hideIdentity ? (
                              <span className="text-sm text-muted-foreground">Hidden</span>
                            ) : (
                              <span className="select-text text-sm tabular-nums text-foreground">
                                {app.phone || "—"}
                              </span>
                            )}
                          </TableCell>

                          <TableCell
                            overflow="nowrap"
                            className="text-sm tabular-nums text-muted-foreground"
                          >
                            {formatAppliedDate(app.applied_at)}
                          </TableCell>

                          <TableCell overflow="nowrap" className="text-center">
                            <ApplicationStatusBadge status={app.status} />
                          </TableCell>

                          <TableCell
                            overflow="nowrap"
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openAnalysis(app)}
                            >
                              View profile
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </section>
            </>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {workspaceSection === "candidates" && selectedCandidateIds.size > 0 && (
        <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 flex-col gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 motion-reduce:animate-none sm:w-[92%] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="h-6 min-w-6 px-1.5 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
              {selectedCandidateIds.size}
            </span>
            <span className="text-sm font-medium text-slate-200">
              Selected
            </span>
            <Button
              type="button"
              onClick={() => setSelectedCandidateIds(new Set())}
              className="text-sm text-slate-400 hover:text-white underline cursor-pointer ml-1"
            >
              Clear
            </Button>
          </div>

          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
            <Button
              size="sm"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("SHORTLISTED")}
              className="h-11 px-3 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-none cursor-pointer"
            >
              Shortlist ({selectedCandidateIds.size})
            </Button>
            <Button
              size="sm"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("UNDER_REVIEW")}
              className="h-11 px-3 text-sm font-semibold bg-primary hover:bg-primary/90 text-white border-none cursor-pointer"
            >
              Review ({selectedCandidateIds.size})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("REJECTED")}
              className="h-11 px-3 text-sm font-semibold cursor-pointer"
            >
              Reject ({selectedCandidateIds.size})
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={pendingRejection !== null}
        onOpenChange={(open) => !open && !isBulkUpdating && setPendingRejection(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm rejection</DialogTitle>
            <DialogDescription className="leading-6">
              {pendingRejection?.type === "bulk"
                ? `Reject ${pendingRejection.applicationIds.length} selected candidates? They will move out of active review.`
                : `Reject ${pendingRejection?.application.candidate_code ?? "this candidate"}? They will move out of active review.`}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            {pendingRejection?.type === "bulk"
              ? "Only the selected candidates will be affected. Any failed updates will remain selected so you can retry."
              : "You can undo this change from the confirmation message immediately afterward."}
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={isBulkUpdating}
              onClick={() => setPendingRejection(null)}
            >
              Keep in review
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={isBulkUpdating}
              onClick={() => {
                const pending = pendingRejection;
                setPendingRejection(null);
                if (pending?.type === "single") {
                  void handleDirectStatusChange(pending.application, "REJECTED", true);
                } else if (pending?.type === "bulk") {
                  void handleBulkStatusChange("REJECTED", true, pending.applicationIds);
                }
              }}
            >
              Reject {pendingRejection?.type === "bulk" ? `${pendingRejection.applicationIds.length} candidates` : "candidate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidate Analysis Modal */}
      <CandidateAnalysisModal
        application={selectedApplication}
        job={currentJob}
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        anonymize={anonymize}
        onStatusUpdated={(updatedApp) => {
          setSelectedApplication(updatedApp);
          onApplicationUpdated(updatedApp);
        }}
      />

      {/* Confirm Job Action Modal */}
      <ConfirmJobActionModal
        isOpen={actionModalType !== null}
        actionType={actionModalType}
        jobTitle={currentJob.title}
        isLoading={isActionLoading}
        onConfirm={handleConfirmAction}
        onClose={() => setActionModalType(null)}
      />

      {/* Job Candidates Report Modal */}
      <JobCandidatesReportDialog
        key={reportSession}
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        job={currentJob}
        applications={jobApplications}
        initialView={activeTab === "rankings" ? "ranked" : "all"}
        initialStatus={statusFilter}
        initialBand={bandFilter}
      />
    </div>
  );
}
