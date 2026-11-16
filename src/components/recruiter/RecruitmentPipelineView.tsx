"use client";

import React, { useMemo, useState } from "react";
import {
  CheckSquare2,
  Clock3,
  Download,
  ShieldCheck,
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
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollectionToolbar } from "@/components/ui/toolbar";
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus>("UNDER_REVIEW");
  const [working, setWorking] = useState(false);
  const [workspaceApplication, setWorkspaceApplication] = useState<Application | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ApplicationStatus | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSession, setReportSession] = useState(0);

  const visibleApplications = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesJob = jobFilter === "all" || String(application.job) === jobFilter;
      const matchesQuery =
        !needle ||
        [
          application.candidate_code,
          application.applicant_name,
          application.email,
          application.job_title,
        ].some((value) => value?.toLowerCase().includes(needle));
      return matchesJob && matchesQuery;
    });
  }, [applications, jobFilter, query]);

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
            Keep ownership and next actions visible from first review through the final decision.
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
            placeholder="Search candidate, role, or email…"
            containerClassName="w-full sm:w-72 lg:w-80"
          />
        }
        filters={
          <Select
            value={jobFilter}
            onValueChange={(value) => {
              setJobFilter(value);
              setSelectedIds([]);
            }}
          >
            <SelectTrigger className="w-full sm:w-64" aria-label="Filter by job">
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

      {selectedIds.length > 0 ? (
        <Card className="border border-primary/25 bg-secondary/40 shadow-xs">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status="info" dot>
                <CheckSquare2 className="size-3.5" aria-hidden="true" />
                {selectedIds.length} selected
              </StatusBadge>
              <p className="text-sm text-muted-foreground">
                Choose a target stage to move the selected candidates together.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={bulkStatus}
                onValueChange={(value) => setBulkStatus(value as ApplicationStatus)}
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
              <Button type="button" size="sm" onClick={applyBulkMove} disabled={working}>
                Move selected
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                disabled={working}
              >
                Clear selection
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
                              onClick={() => setWorkspaceApplication(application)}
                              onDragStart={() => setDraggedId(application.id)}
                              onDragEnd={() => {
                                setDraggedId(null);
                                setDragOverStage(null);
                              }}
                              className={cn(
                                "group cursor-pointer rounded-xl border bg-card shadow-xs transition-[border-color,box-shadow,transform] hover:border-primary/40 hover:shadow-sm active:scale-[0.99]",
                                selected
                                  ? "border-primary ring-2 ring-primary/20"
                                  : "border-border"
                              )}
                            >
                              <CardContent className="p-3.5">
                                <div className="flex items-start justify-between gap-2">
                                  <Button
                                    variant="ghost"
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setWorkspaceApplication(application);
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
                                    className="pt-0.5"
                                  >
                                    <Checkbox
                                      checked={selected}
                                      onCheckedChange={() => toggleSelected(application.id)}
                                      aria-label={`Select ${application.candidate_code}`}
                                    />
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-col gap-2">
                                  <div>
                                    <span className="text-sm text-muted-foreground">Match Score: </span>
                                    <Badge
                                      variant={getScoreBadgeVariant(score)}
                                      className="px-2 py-0.5 text-sm font-bold tabular-nums"
                                    >
                                      {score !== null ? `${score}%` : "—"}
                                    </Badge>
                                  </div>
                                  <span className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
                                    Remaining Tasks: {" "}
                                    {taskCount}
                                  </span>
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
        anonymize={anonymize}
        onClose={() => setWorkspaceApplication(null)}
        onApplicationUpdated={onApplicationUpdated}
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
