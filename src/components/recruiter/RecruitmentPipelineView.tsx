"use client";

import React, { useMemo, useState } from "react";
import {
  ClipboardCheck,
  Download,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { fetchApi } from "@/lib/api";
import { getCandidateDisplayName } from "@/lib/candidate-identity";
import { cn } from "@/lib/utils";
import { Application, ApplicationStatus } from "@/types/application";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/feedback";
import { IconButton } from "@/components/ui/icon-button";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectionActionBar } from "@/components/ui/selection-action-bar";
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollectionToolbar } from "@/components/ui/toolbar";
import { CandidateAnalysisModal } from "./CandidateAnalysisModal";
import { CandidateWorkflowPanel } from "./CandidateWorkflowPanel";
import { PipelineReportDialog } from "./PipelineReportDialog";

const PIPELINE: Array<{ status: ApplicationStatus; label: string; description: string }> = [
  { status: "SUBMITTED", label: "New", description: "Awaiting first review" },
  { status: "UNDER_REVIEW", label: "Review", description: "Evidence being assessed" },
  { status: "SHORTLISTED", label: "Shortlist", description: "Ready for team decision" },
  { status: "INTERVIEW", label: "Interview", description: "In active conversations" },
  { status: "HIRED", label: "Hired", description: "Accepted candidates" },
  { status: "REJECTED", label: "Rejected", description: "Application not progressing" },
];

function normalizeStage(status: ApplicationStatus): ApplicationStatus {
  if (status === "PROCESSING") return "SUBMITTED";
  return status;
}

function getScoreBadgeVariant(score?: number | null): NonNullable<BadgeProps["variant"]> {
  if (typeof score !== "number") return "outline";
  if (score >= 85) return "success";
  if (score >= 70) return "info";
  return "secondary";
}

export function RecruitmentPipelineView() {
  const { applications, jobs, anonymize, onApplicationUpdated } = useRecruiter();
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [sortMode, setSortMode] = useState<"score" | "newest">("score");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus>("UNDER_REVIEW");
  const [working, setWorking] = useState(false);
  const [workspaceApplicationId, setWorkspaceApplicationId] = useState<number | null>(null);
  const [analysisApplication, setAnalysisApplication] = useState<Application | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ApplicationStatus | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSession, setReportSession] = useState(0);

  const workspaceApplication = useMemo(
    () => applications.find((item) => item.id === workspaceApplicationId) || null,
    [applications, workspaceApplicationId]
  );

  const visibleApplications = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = applications.filter((application) => {
      const matchesJob = jobFilter === "all" || String(application.job) === jobFilter;
      const matchesQuery =
        !needle ||
        [
          application.candidate_code,
          application.job_title,
          ...(application.tags || []),
          ...(anonymize ? [] : [application.applicant_name, application.email]),
        ].some((value) => value?.toLowerCase().includes(needle));
      return matchesJob && matchesQuery;
    });
    return [...filtered].sort((a, b) => {
      if (sortMode === "score") {
        return (b.match_result?.match_score ?? -1) - (a.match_result?.match_score ?? -1);
      }
      return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
    });
  }, [anonymize, applications, jobFilter, query, sortMode]);

  const hasFilters = Boolean(query.trim()) || jobFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setJobFilter("all");
    setSelectedIds([]);
  };

  const openReportModal = () => {
    setReportSession((count) => count + 1);
    setReportOpen(true);
  };

  const moveApplication = async (application: Application, status: ApplicationStatus) => {
    if (application.status === status) return;
    setWorking(true);
    try {
      const updated = await fetchApi<Application>(`/applications/${application.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onApplicationUpdated(updated);
      toast.success(`Moved ${application.candidate_code}`, {
        description: `Candidate is now in ${PIPELINE.find((stage) => stage.status === status)?.label || status}.`,
      });
    } catch (error) {
      toast.error("Candidate was not moved", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setWorking(false);
    }
  };

  const applyBulkMove = async () => {
    if (selectedIds.length === 0) return;
    setWorking(true);
    try {
      const updated = await fetchApi<Application[]>("/applications/bulk/", {
        method: "POST",
        body: JSON.stringify({ application_ids: selectedIds, status: bulkStatus }),
      });
      updated.forEach(onApplicationUpdated);
      toast.success(`${updated.length} candidate${updated.length === 1 ? "" : "s"} moved`);
      setSelectedIds([]);
    } catch (error) {
      toast.error("Bulk action failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setWorking(false);
    }
  };

  const toggleSelected = (applicationId: number) => {
    setSelectedIds((current) =>
      current.includes(applicationId)
        ? current.filter((id) => id !== applicationId)
        : [...current, applicationId]
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader className="border-b border-border pb-6">
        <div>
          <PageHeaderTitle>Recruitment pipeline</PageHeaderTitle>
          <PageHeaderDescription>
            Move candidates by drag-and-drop or stage selector, open AI evidence directly, and manage follow-ups from one board.
          </PageHeaderDescription>
        </div>
        <PageHeaderActions>
          {anonymize ? (
            <StatusBadge status="info" dot>
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Blind screening active
            </StatusBadge>
          ) : null}
        </PageHeaderActions>
      </PageHeader>

      <CollectionToolbar
        label="Pipeline controls"
        search={
          <SearchInput
            aria-label="Search pipeline"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery("")}
            placeholder={anonymize ? "Search candidate code, role, or tag…" : "Search candidate, role, or tag…"}
            containerClassName="w-full sm:w-72 lg:w-80"
          />
        }
        filters={
          <>
            <Select
              value={jobFilter}
              onValueChange={(value) => {
                setJobFilter(value);
                setSelectedIds([]);
              }}
            >
              <SelectTrigger className="w-full sm:w-56" aria-label="Filter by job">
                <SelectValue placeholder="All job requisitions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All job requisitions</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={String(job.id)}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortMode} onValueChange={(v) => setSortMode(v as "score" | "newest")}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Sort pipeline cards">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Highest AI match</SelectItem>
                <SelectItem value="newest">Newest applied</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        hasActiveFilters={hasFilters}
        onClearFilters={clearFilters}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={openReportModal}
            disabled={jobs.length === 0}
          >
            <Download aria-hidden="true" />
            Generate report
          </Button>
        }
      />

      <SelectionActionBar
        count={selectedIds.length}
        label="Selected pipeline candidates actions"
        description="Choose a target stage to move the selected candidates together."
        clearLabel="Clear selection"
        disabled={working}
        onClear={() => setSelectedIds([])}
        actions={
          <>
            <Select
              value={bulkStatus}
              onValueChange={(value) => setBulkStatus(value as ApplicationStatus)}
              disabled={working}
            >
              <SelectTrigger className="h-9 w-full bg-card sm:w-44" aria-label="Bulk destination">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE.map((stage) => (
                  <SelectItem key={stage.status} value={stage.status}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" onClick={() => void applyBulkMove()} disabled={working}>
              Move selected
            </Button>
          </>
        }
      />

      {visibleApplications.length === 0 ? (
        <EmptyState
          title={applications.length === 0 ? "The pipeline is ready" : "No candidates match this view"}
          description={
            applications.length === 0
              ? "Candidates will appear here when applications are submitted to an active job."
              : "Clear the search or choose another requisition to see candidate records."
          }
          actionLabel={hasFilters ? "Clear filters" : undefined}
          onAction={hasFilters ? clearFilters : undefined}
          className="rounded-2xl border border-dashed border-border bg-muted/30"
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground md:hidden">
            Swipe horizontally to review every pipeline stage.
          </p>
          <div className="overflow-x-auto pb-3" aria-label="Candidate pipeline board">
            <div className="grid min-w-[2100px] grid-cols-6 gap-3">
              {PIPELINE.map((stage) => {
                const stageApplications = visibleApplications.filter(
                  (application) => normalizeStage(application.status) === stage.status
                );
                const isDropTarget = dragOverStage === stage.status;

                return (
                  <section
                    key={stage.status}
                    className={cn(
                      "min-h-[440px] rounded-2xl border p-2.5 transition-colors lg:min-h-[520px]",
                      isDropTarget
                        ? "border-primary/40 bg-secondary/50"
                        : "border-border/60 bg-muted/50"
                    )}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (dragOverStage !== stage.status) {
                        setDragOverStage(stage.status);
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverStage((current) => (current === stage.status ? null : current));
                    }}
                    onDrop={() => {
                      const application = applications.find((item) => item.id === draggedId);
                      if (application) void moveApplication(application, stage.status);
                      setDraggedId(null);
                      setDragOverStage(null);
                    }}
                    aria-labelledby={`pipeline-${stage.status}`}
                  >
                    <div className="px-1.5 pb-3 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <h2
                          id={`pipeline-${stage.status}`}
                          className="text-sm font-bold text-foreground"
                        >
                          {stage.label}
                        </h2>
                        <Badge variant="outline" className="bg-card px-2 py-0.5 text-sm tabular-nums">
                          {stageApplications.length}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {stage.description}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {stageApplications.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm leading-5 text-muted-foreground">
                          Drop a candidate here
                        </div>
                      ) : (
                        stageApplications.map((application) => {
                          const rawScore = application.match_result?.match_score;
                          const hasScore = typeof rawScore === "number";
                          const score = hasScore ? Math.round(rawScore) : null;
                          const selected = selectedIds.includes(application.id);
                          const taskCount = application.open_task_count || 0;

                          return (
                            <Card
                              key={application.id}
                              draggable
                              onClick={() => setWorkspaceApplicationId(application.id)}
                              onDragStart={() => setDraggedId(application.id)}
                              onDragEnd={() => {
                                setDraggedId(null);
                                setDragOverStage(null);
                              }}
                              className={cn(
                                "group cursor-pointer rounded-xl border bg-card shadow-xs transition-[border-color,box-shadow,transform] hover:border-primary/40 hover:shadow-sm",
                                selected ? "border-primary ring-2 ring-primary/20" : "border-border"
                              )}
                            >
                              <CardContent className="space-y-3 p-3.5">
                                <div className="flex items-start justify-between gap-2">
                                  <Button
                                    variant="ghost"
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setWorkspaceApplicationId(application.id);
                                    }}
                                    className="h-auto min-w-0 flex-1 flex-col items-start justify-start rounded-md p-0 text-left hover:bg-transparent"
                                  >
                                    <span className="w-full truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                                      {getCandidateDisplayName(application, anonymize)}
                                    </span>
                                    <span className="mt-0.5 line-clamp-2 w-full break-words text-left text-sm font-normal leading-5 text-muted-foreground">
                                      {application.job_title || `Job #${application.job}`}
                                    </span>
                                  </Button>
                                  <div
                                    onClick={(event) => event.stopPropagation()}
                                    className="flex items-center gap-1 pt-0.5"
                                  >
                                    <IconButton
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      label={`Inspect AI analysis for ${application.candidate_code}`}
                                      onClick={() => setAnalysisApplication(application)}
                                    >
                                      <ClipboardCheck className="size-4 text-primary" />
                                    </IconButton>
                                    <Checkbox
                                      checked={selected}
                                      onCheckedChange={() => toggleSelected(application.id)}
                                      aria-label={`Select ${application.candidate_code}`}
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant={getScoreBadgeVariant(score)}
                                    className="px-2 py-0.5 text-sm font-bold tabular-nums"
                                  >
                                    {score !== null ? `${score}% match` : "Pending"}
                                  </Badge>
                                  {application.scorecard_avg_rating ? (
                                    <Badge variant="outline" className="gap-1 tabular-nums">
                                      <Star className="size-3 text-amber-500" aria-hidden="true" />
                                      {application.scorecard_avg_rating}/5
                                    </Badge>
                                  ) : null}
                                  {taskCount > 0 ? (
                                    <Badge variant="secondary" className="tabular-nums">
                                      {taskCount} task{taskCount === 1 ? "" : "s"}
                                    </Badge>
                                  ) : null}
                                </div>

                                <div onClick={(event) => event.stopPropagation()}>
                                  <Select
                                    value={normalizeStage(application.status)}
                                    onValueChange={(value) =>
                                      void moveApplication(application, value as ApplicationStatus)
                                    }
                                    disabled={working}
                                  >
                                    <SelectTrigger
                                      className="h-8 w-full text-sm"
                                      aria-label={`Move ${application.candidate_code} stage`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PIPELINE.map((dest) => (
                                        <SelectItem key={dest.status} value={dest.status}>
                                          Move to: {dest.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}

      <CandidateWorkflowPanel
        key={workspaceApplication?.id ?? "empty"}
        application={workspaceApplication}
        job={jobs.find((j) => j.id === workspaceApplication?.job) || null}
        anonymize={anonymize}
        onClose={() => setWorkspaceApplicationId(null)}
        onApplicationUpdated={onApplicationUpdated}
        onOpenAnalysis={(app) => {
          setWorkspaceApplicationId(null);
          setAnalysisApplication(app);
        }}
      />

      <CandidateAnalysisModal
        isOpen={analysisApplication !== null}
        application={
          analysisApplication
            ? applications.find((a) => a.id === analysisApplication.id) || analysisApplication
            : null
        }
        applicationsQueue={visibleApplications}
        onSelectApplication={setAnalysisApplication}
        job={jobs.find((j) => j.id === analysisApplication?.job) || null}
        onClose={() => setAnalysisApplication(null)}
        anonymize={anonymize}
        onStatusUpdated={onApplicationUpdated}
      />

      <PipelineReportDialog
        key={reportSession}
        open={reportOpen}
        onOpenChange={setReportOpen}
        jobs={jobs}
        initialJobId={jobFilter !== "all" ? Number(jobFilter) : null}
        applications={applications}
        selectedIds={selectedIds}
      />
    </div>
  );
}
