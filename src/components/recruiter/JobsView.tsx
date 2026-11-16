"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowRight,
  Copy,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  UsersRound,
} from "lucide-react";
import { Job, ArchivedJob } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi } from "@/lib/api";
import { useRecruiter } from "@/context/RecruiterContext";
import { ConfirmJobActionModal, JobActionType } from "./ConfirmJobActionModal";
import { CreateJobModal } from "./CreateJobModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContextualLoading } from "@/components/ui/contextual-loading";
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
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { FilterTabs } from "@/components/ui/filter-tabs";
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
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CollectionToolbar, type ViewMode } from "@/components/ui/toolbar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RequisitionTab = "ACTIVE" | "DRAFT" | "CLOSED" | "ARCHIVED";
type DisplayMode = ViewMode;

function getDepartmentMonogram(department?: string, title?: string): string {
  const dept = (department || "").toLowerCase();
  const t = (title || "").toLowerCase();
  if (dept.includes("information") || dept.includes("tech") || t.includes("software") || t.includes("engineer")) return "IT";
  if (dept.includes("finance") || dept.includes("account")) return "FA";
  if (dept.includes("health") || dept.includes("medical") || t.includes("nurse")) return "HC";
  if (dept.includes("civil") || dept.includes("construct") || dept.includes("engineering")) return "ENG";
  if (dept.includes("sales") || dept.includes("business")) return "BD";
  if (dept.includes("bpo") || dept.includes("support") || dept.includes("customer")) return "CS";
  return (department || "HR").slice(0, 2).toUpperCase();
}

function formatJobCohort(dateStr?: string | null): string {
  if (!dateStr) return "Cohort N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Cohort N/A";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" }) + " Cohort";
}

function formatLifecycleDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function calculateDuration(startStr?: string | null, endStr?: string | null): string {
  if (!startStr || !endStr) return "Active duration unspecified";
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Active duration unspecified";
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Active for < 1 day";
  if (diffDays === 1) return "Active for 1 day";
  return `Active for ${diffDays} days`;
}

function getJobStats(jobId: number, applications: Application[]) {
  const jobApps = applications.filter((a) => a.job === jobId);
  const scores = jobApps
    .map((a) => a.match_result?.match_score)
    .filter((s): s is number => typeof s === "number" && s > 0);
  const topScore = scores.length > 0 ? Math.max(...scores) : null;
  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s, 0) / scores.length) : null;
  return { count: jobApps.length, topScore, avgScore };
}

function JobStatusBadge({ status }: { status?: Job["status"] }) {
  if (status === "CLOSED") {
    return (
      <StatusBadge status="warning" dot>
        Closed
      </StatusBadge>
    );
  }
  if (status === "DRAFT") {
    return (
      <StatusBadge status="neutral" dot>
        Draft
      </StatusBadge>
    );
  }
  return (
    <StatusBadge status="success" dot>
      Active
    </StatusBadge>
  );
}

interface JobLifecycleMenuProps {
  job: Job;
  onEditDraft: (job: Job) => void;
  onOpenRoster: (jobId: number) => void;
  onLifecycleAction: (job: Job, action: JobActionType) => void;
}

function JobLifecycleMenu({
  job,
  onEditDraft,
  onOpenRoster,
  onLifecycleAction,
}: JobLifecycleMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <IconButton
              label={`Actions for ${job.title}`}
              type="button"
              variant="outline"
              size="icon-sm"
            >
              <MoreHorizontal aria-hidden="true" />
            </IconButton>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Requisition actions</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Requisition actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {job.status === "DRAFT" ? (
          <DropdownMenuItem onClick={() => onEditDraft(job)}>
            <Pencil className="size-4" aria-hidden="true" />
            <span>Continue editing draft</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onOpenRoster(job.id)}>
            <UsersRound className="size-4" aria-hidden="true" />
            <span>Open candidate roster</span>
          </DropdownMenuItem>
        )}
        {job.status === "CLOSED" ? (
          <DropdownMenuItem onClick={() => onLifecycleAction(job, "reopen")}>
            <RotateCcw className="size-4" aria-hidden="true" />
            <span>Reopen requisition</span>
          </DropdownMenuItem>
        ) : job.status !== "DRAFT" ? (
          <DropdownMenuItem onClick={() => onLifecycleAction(job, "close")}>
            <Lock className="size-4" aria-hidden="true" />
            <span>Close applications</span>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        {job.status === "DRAFT" ? (
          <DropdownMenuItem
            onClick={() => onLifecycleAction(job, "delete-draft")}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            <span>Delete permanently</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => onLifecycleAction(job, "archive")}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Archive className="size-4" aria-hidden="true" />
            <span>Archive requisition</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function JobsView() {
  const router = useRouter();
  const {
    jobs,
    applications,
    loadData,
    onJobUpdated,
    onJobArchived,
    setIsCreateJobOpen,
  } = useRecruiter();

  const [displayMode, setDisplayMode] = useState<DisplayMode>("table");
  const [jobTab, setJobTab] = useState<RequisitionTab>("ACTIVE");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const [archivedJobs, setArchivedJobs] = useState<ArchivedJob[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState<string | null>(null);

  // Action Confirmation Modal State
  const [actionModalType, setActionModalType] = useState<JobActionType | null>(null);
  const [actionJob, setActionJob] = useState<Job | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [duplicatingTemplate, setDuplicatingTemplate] = useState<Partial<Job> | null>(null);
  const [selectedArchivedJob, setSelectedArchivedJob] = useState<ArchivedJob | null>(null);

  const handleDuplicateArchivedJob = (archivedJob: ArchivedJob) => {
    setDuplicatingTemplate({
      id: archivedJob.id,
      title: archivedJob.title,
      department: archivedJob.department,
      employment_type: archivedJob.employment_type,
      location: archivedJob.location,
      description: archivedJob.description,
      minimum_experience: archivedJob.minimum_experience,
      education_requirement: archivedJob.education_requirement,
      required_skills: archivedJob.required_skills || [],
      preferred_skills: archivedJob.preferred_skills || [],
      rubric_weights: archivedJob.rubric_weights,
      status: "PUBLISHED",
    });
  };

  const loadArchivedJobs = useCallback(async () => {
    setArchivedLoading(true);
    setArchivedError(null);
    try {
      const data = await fetchApi<ArchivedJob[]>("/archived-jobs/");
      setArchivedJobs(data);
    } catch (err) {
      console.error("Failed to fetch archived jobs:", err);
      setArchivedError(
        err instanceof Error ? err.message : "Could not load archived requisitions. Please try again."
      );
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadArchivedJobs();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadArchivedJobs]);

  useEffect(() => {
    if (jobTab === "ARCHIVED") {
      const timer = setTimeout(() => {
        void loadArchivedJobs();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [jobTab, loadArchivedJobs]);

  const titleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of jobs) {
      const key = (j.title || "").trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (const aj of archivedJobs) {
      const key = (aj.title || "").trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [jobs, archivedJobs]);

  const activeJobs = useMemo(
    () => jobs.filter((j) => j.status === "PUBLISHED" || (!j.status && j.status !== "CLOSED")),
    [jobs]
  );
  const draftJobs = useMemo(() => jobs.filter((j) => j.status === "DRAFT"), [jobs]);
  const closedJobs = useMemo(() => jobs.filter((j) => j.status === "CLOSED"), [jobs]);

  const openLifecycleModal = (job: Job, action: JobActionType) => {
    setActionJob(job);
    setActionModalType(action);
  };

  const handleRestoreArchivedJob = async (archivedJob: ArchivedJob) => {
    setIsActionLoading(true);
    try {
      const restored = await fetchApi<Job>(`/archived-jobs/${archivedJob.id}/restore/`, { method: "POST" });
      setArchivedJobs((prev) => prev.filter((j) => j.id !== archivedJob.id));
      setSelectedArchivedJob(null);
      onJobUpdated(restored);
      void loadData();
      toast.success("Position Restored", { description: `"${archivedJob.title}" has been restored to active requisitions.` });
      setJobTab("ACTIVE");
    } catch (err: unknown) {
      console.error("Failed to restore archived job:", err);
      toast.error("Restore Failed", { description: "Failed to restore requisition." });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionModalType) return;
    setIsActionLoading(true);
    try {
      if (actionModalType === "close" && actionJob) {
        const updated = await fetchApi<Job>(`/jobs/${actionJob.id}/close/`, { method: "POST" });
        onJobUpdated(updated);
        toast.success("Position Closed", { description: `"${actionJob.title}" is now closed.` });
      } else if (actionModalType === "reopen" && actionJob) {
        const updated = await fetchApi<Job>(`/jobs/${actionJob.id}/reopen/`, { method: "POST" });
        onJobUpdated(updated);
        toast.success("Position Reopened", { description: `"${actionJob.title}" is published.` });
      } else if (actionModalType === "archive" && actionJob) {
        await fetchApi(`/jobs/${actionJob.id}/archive/`, { method: "POST" });
        onJobArchived(actionJob.id);
        toast.success("Position Archived", { description: `"${actionJob.title}" moved to archive.` });
        void loadArchivedJobs();
      } else if (actionModalType === "delete-draft" && actionJob) {
        await fetchApi(`/jobs/${actionJob.id}/`, { method: "DELETE" });
        onJobArchived(actionJob.id);
        toast.success("Draft Permanently Deleted", { description: `"${actionJob.title}" was removed.` });
      }
    } catch (err: unknown) {
      console.error("Job action failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to execute action. Please try again.";
      toast.error("Action Failed", { description: msg });
    } finally {
      setIsActionLoading(false);
      setActionModalType(null);
      setActionJob(null);
    }
  };

  const displayedJobs = jobTab === "ACTIVE" ? activeJobs : jobTab === "DRAFT" ? draftJobs : closedJobs;
  const departmentOptions = useMemo(() => {
    const source = jobTab === "ARCHIVED" ? archivedJobs : displayedJobs;
    return Array.from(new Set(source.map((job) => job.department).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [archivedJobs, displayedJobs, jobTab]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesFilters = (job: Pick<Job, "title" | "department" | "location" | "employment_type" | "required_skills">) => {
    const matchesDepartment = departmentFilter === "ALL" || job.department === departmentFilter;
    const matchesSearch = !normalizedQuery || [
      job.title,
      job.department,
      job.location,
      job.employment_type,
      ...(job.required_skills || []),
    ].some((value) => value?.toLowerCase().includes(normalizedQuery));
    return matchesDepartment && matchesSearch;
  };
  const filteredJobs = displayedJobs.filter(matchesFilters);
  const filteredArchivedJobs = archivedJobs.filter(matchesFilters);
  const hasActiveFilters = Boolean(normalizedQuery || departmentFilter !== "ALL");

  const clearFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("ALL");
  };

  const dateColumnLabel =
    jobTab === "DRAFT" ? "Date Created" : jobTab === "CLOSED" ? "Date Closed" : "Date Posted";

  const getTabDateValue = (job: Job) =>
    jobTab === "CLOSED"
      ? formatLifecycleDate(job.updated_at || job.created_at)
      : formatLifecycleDate(job.created_at);

  const renderActiveJobCards = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredJobs.map((job) => {
        const stats = getJobStats(job.id, applications);
        const isDuplicateTitle = (titleCounts.get((job.title || "").trim().toLowerCase()) || 0) > 1;
        const isDraft = job.status === "DRAFT";

        return (
          <Card
            key={job.id}
            className="group flex flex-col justify-between border border-border transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-sm"
          >
            <CardHeader className="space-y-3 p-5 pb-3">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-primary">
                  {getDepartmentMonogram(job.department, job.title)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="min-w-0 text-base leading-snug">
                      {isDraft ? (
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setEditingJob(job)}
                          className="h-auto max-w-full justify-start p-0 text-left text-base font-bold text-foreground hover:text-primary"
                        >
                          <span className="truncate">{job.title}</span>
                        </Button>
                      ) : (
                        <Link
                          href={`/admin/jobs/${job.id}`}
                          className="block truncate transition-colors hover:text-primary hover:underline"
                          title={job.title}
                        >
                          {job.title}
                        </Link>
                      )}
                    </CardTitle>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <CardDescription className="mt-1 truncate text-sm">
                    {job.department || "Operations"} · {job.location || "Remote"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-5 pb-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{formatJobCohort(job.created_at)}</Badge>
                {isDuplicateTitle ? <Badge variant="warning">Req #{job.id}</Badge> : null}
                <Badge variant="outline">{job.employment_type || "Full-time"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {dateColumnLabel}:{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {getTabDateValue(job)}
                </span>
              </p>

              <div className="grid grid-cols-3 divide-x divide-border border-y border-border py-2.5 text-center">
                <div>
                  <span className="block text-sm font-medium text-muted-foreground">Total</span>
                  <span className="mt-0.5 block text-sm font-bold tabular-nums text-foreground">
                    {stats.count}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-muted-foreground">Top match</span>
                  <span className="mt-0.5 block text-sm font-bold tabular-nums text-emerald-700">
                    {stats.topScore !== null ? `${stats.topScore}%` : "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-muted-foreground">Average</span>
                  <span className="mt-0.5 block text-sm font-bold tabular-nums text-foreground">
                    {stats.avgScore !== null ? `${stats.avgScore}%` : "—"}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="justify-between gap-3 border-t border-border px-5 py-3.5">
              <JobLifecycleMenu
                job={job}
                onEditDraft={setEditingJob}
                onOpenRoster={(id) => router.push(`/admin/jobs/${id}`)}
                onLifecycleAction={openLifecycleModal}
              />

              {isDraft ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingJob(job)}
                >
                  <span>Continue draft</span>
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : (
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/admin/jobs/${job.id}`}>
                    <span>Candidate roster</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );

  const renderArchivedCards = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredArchivedJobs.map((archived) => {
        const isArchivedDuplicate =
          (titleCounts.get((archived.title || "").trim().toLowerCase()) || 0) > 1;
        return (
          <Card
            key={archived.id}
            className="flex flex-col justify-between border border-border transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-sm"
          >
            <CardHeader className="space-y-3 p-5 pb-3">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-sm font-bold text-muted-foreground">
                  {getDepartmentMonogram(archived.department, archived.title)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate text-base leading-snug" title={archived.title}>
                      {archived.title}
                    </CardTitle>
                    <StatusBadge status="neutral" dot>
                      Archived
                    </StatusBadge>
                  </div>
                  <CardDescription className="mt-1 truncate text-sm">
                    {archived.department || "Operations"} · {archived.location || "Remote"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 px-5 pb-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">
                  {formatJobCohort(archived.original_created_at || archived.archived_at)}
                </Badge>
                {isArchivedDuplicate ? <Badge variant="warning">Req #{archived.id}</Badge> : null}
                <Badge variant="outline" className="gap-1.5 tabular-nums">
                  <UsersRound className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span>{archived.applicant_count ?? 0} applicants</span>
                </Badge>
              </div>

              <div className="rounded-xl bg-muted/50 px-3.5 py-2.5 text-sm">
                <p className="font-medium text-foreground">
                  {formatLifecycleDate(archived.original_created_at || archived.archived_at)} &rarr;{" "}
                  {formatLifecycleDate(archived.archived_at)}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {calculateDuration(
                    archived.original_created_at || archived.archived_at,
                    archived.archived_at
                  )}
                </p>
              </div>
            </CardContent>

            <CardFooter className="justify-between gap-2 border-t border-border px-5 py-3.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isActionLoading}
                onClick={() => void handleRestoreArchivedJob(archived)}
              >
                <RotateCcw aria-hidden="true" />
                <span>Restore</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleDuplicateArchivedJob(archived)}
              >
                <Copy aria-hidden="true" />
                <span>Duplicate</span>
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader className="border-b border-border pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <PageHeaderTitle>Job requisitions</PageHeaderTitle>
            </div>
            <PageHeaderDescription>
              Manage hiring demand, monitor candidate volume, and move each role through its lifecycle.
            </PageHeaderDescription>
          </div>
          <PageHeaderActions>
            <Button type="button" onClick={() => setIsCreateJobOpen(true)}>
              <Plus aria-hidden="true" />
              Post a new job
            </Button>
          </PageHeaderActions>
        </PageHeader>

        <div className="space-y-3">
          <CollectionToolbar
            label="Job requisition controls"
            tabs={
              <FilterTabs
                className="max-w-full"
                label="Requisition status"
                value={jobTab}
                onValueChange={(value) => {
                  setJobTab(value as RequisitionTab);
                  setDepartmentFilter("ALL");
                }}
                tabs={[
                  { id: "ACTIVE", label: "Active", count: activeJobs.length },
                  { id: "DRAFT", label: "Drafts", count: draftJobs.length },
                  { id: "CLOSED", label: "Closed", count: closedJobs.length },
                  { id: "ARCHIVED", label: "Archived", count: archivedJobs.length },
                ]}
              />
            }
            search={
              <SearchInput
                aria-label="Search jobs"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onClear={() => setSearchQuery("")}
                placeholder="Search title, skill, or location…"
                containerClassName="w-full sm:w-64 lg:w-72"
              />
            }
            filters={
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger aria-label="Filter by department" className="w-full sm:w-44">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All departments</SelectItem>
                  {departmentOptions.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            viewMode={displayMode}
            onViewModeChange={setDisplayMode}
          />
        </div>

        {/* Main Content Area */}
        {jobTab !== "ARCHIVED" ? (
          filteredJobs.length === 0 ? (
            <EmptyState
              title={
                hasActiveFilters
                  ? "No jobs match these filters"
                  : jobTab === "ACTIVE"
                    ? "No active requisitions"
                    : jobTab === "DRAFT"
                      ? "No saved drafts"
                      : "No closed requisitions"
              }
              description={
                hasActiveFilters
                  ? "Clear the search or choose another department to see more requisitions."
                  : jobTab === "ACTIVE"
                    ? "Post a job to begin collecting candidate applications."
                    : jobTab === "DRAFT"
                      ? "Requisitions saved before publishing will appear here."
                      : "Closed requisitions remain here until they are reopened or archived."
              }
              actionLabel={
                hasActiveFilters ? "Clear filters" : jobTab === "ACTIVE" ? "Post a new job" : undefined
              }
              onAction={
                hasActiveFilters
                  ? clearFilters
                  : jobTab === "ACTIVE"
                    ? () => setIsCreateJobOpen(true)
                    : undefined
              }
              className="rounded-2xl border border-dashed border-border bg-muted/30"
            />
          ) : displayMode === "cards" ? (
            renderActiveJobCards()
          ) : (
            <>
              <div className="md:hidden">{renderActiveJobCards()}</div>
              <section
                aria-label="Job requisitions table"
                className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block"
              >
                <Table density="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead >Job title</TableHead>
                      <TableHead >Department</TableHead>
                      <TableHead >{dateColumnLabel}</TableHead>
                      <TableHead className="text-center">Candidates</TableHead>
                      <TableHead className="text-center">Top</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => {
                      const stats = getJobStats(job.id, applications);
                      const isDuplicateTitle =
                        (titleCounts.get((job.title || "").trim().toLowerCase()) || 0) > 1;
                      const isDraft = job.status === "DRAFT";

                      return (
                        <TableRow
                          key={job.id}
                          onClick={() =>
                            isDraft ? setEditingJob(job) : router.push(`/admin/jobs/${job.id}`)
                          }
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {isDraft ? (
                                    <Button
                                      type="button"
                                      variant="link"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingJob(job);
                                      }}
                                      className="h-auto max-w-[240px] justify-start p-0 text-left text-sm font-semibold text-foreground hover:text-primary"
                                    >
                                      <span className="truncate">{job.title}</span>
                                    </Button>
                                  ) : (
                                    <Link
                                      href={`/admin/jobs/${job.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="max-w-[240px] truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
                                      title={job.title}
                                    >
                                      {job.title}
                                    </Link>
                                  )}
                                  <Badge variant="secondary" className="px-1.5 py-0 text-sm">
                                    {formatJobCohort(job.created_at)}
                                  </Badge>
                                  {isDuplicateTitle ? (
                                    <Badge variant="warning" className="px-1.5 py-0 text-sm">
                                      Req #{job.id}
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm font-medium text-foreground">
                            <span className="block truncate" title={job.department || "Operations"}>
                              {job.department || "Operations"}
                            </span>
                          </TableCell>

                          <TableCell overflow="nowrap" className="text-sm text-muted-foreground tabular-nums">
                            {getTabDateValue(job)}
                          </TableCell>

                          <TableCell overflow="nowrap" className="text-center text-sm font-bold tabular-nums text-foreground">
                            {stats.count}
                          </TableCell>

                          <TableCell overflow="nowrap" className="text-center text-sm font-bold tabular-nums text-emerald-700">
                            {stats.topScore !== null ? `${stats.topScore}%` : "—"}
                          </TableCell>

                          <TableCell overflow="nowrap" className="text-center">
                            <JobStatusBadge status={job.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </section>
            </>
          )
        ) : archivedLoading ? (
          <ContextualLoading label="Loading archived requisitions" />
        ) : archivedError ? (
          <ErrorState
            title="Could not load archived requisitions"
            description={archivedError}
            onAction={() => void loadArchivedJobs()}
            className="rounded-2xl border border-border bg-card"
          />
        ) : filteredArchivedJobs.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? "No archived jobs match these filters"
                : "No archived requisitions"
            }
            description={
              hasActiveFilters
                ? "Clear the search or choose another department."
                : "Archived requisitions are preserved for audit and historical review."
            }
            actionLabel={hasActiveFilters ? "Clear filters" : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
            className="rounded-2xl border border-dashed border-border bg-muted/30"
          />
        ) : displayMode === "cards" ? (
          renderArchivedCards()
        ) : (
          <>
            <div className="md:hidden">{renderArchivedCards()}</div>
            <section
              aria-label="Archived requisitions table"
              className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block"
            >
              <Table density="compact">
                <TableHeader>
                  <TableRow>
                    <TableHead>Job title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Active Lifecycle</TableHead>
                    <TableHead className="text-center">Candidates</TableHead>
                    <TableHead className="text-center">Top</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchivedJobs.map((archived) => {
                    const isArchivedDuplicate =
                      (titleCounts.get((archived.title || "").trim().toLowerCase()) || 0) > 1;
                    const archivedStats = archived.active_job_id
                      ? getJobStats(archived.active_job_id, applications)
                      : null;
                    const candidateCount = Math.max(
                      archived.applicant_count ?? 0,
                      archivedStats?.count ?? 0
                    );
                    const topScore = archivedStats?.topScore ?? null;

                    return (
                      <TableRow
                        key={archived.id}
                        onClick={() => setSelectedArchivedJob(archived)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="link"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedArchivedJob(archived);
                                  }}
                                  className="h-auto max-w-[220px] justify-start p-0 text-left text-sm font-semibold text-foreground hover:text-primary"
                                >
                                  <span className="truncate">{archived.title}</span>
                                </Button>
                                <Badge variant="secondary" className="px-1.5 py-0 text-sm">
                                  {formatJobCohort(archived.original_created_at || archived.archived_at)}
                                </Badge>
                                {isArchivedDuplicate ? (
                                  <Badge variant="warning" className="px-1.5 py-0 text-sm">
                                    Req #{archived.id}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm font-medium text-foreground">
                          <span className="block truncate" title={archived.department || "Operations"}>
                            {archived.department || "Operations"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <p className="text-sm font-medium tabular-nums text-foreground">
                            {formatLifecycleDate(archived.original_created_at || archived.archived_at)} -{" "}
                            {formatLifecycleDate(archived.archived_at)}
                          </p>
                        </TableCell>

                        <TableCell overflow="nowrap" className="text-center text-sm font-bold tabular-nums text-foreground">
                          {candidateCount}
                        </TableCell>

                        <TableCell overflow="nowrap" className="text-center text-sm font-bold tabular-nums text-emerald-700">
                          {topScore !== null ? `${topScore}%` : "—"}
                        </TableCell>

                        <TableCell overflow="nowrap" className="text-center">
                          <StatusBadge status="neutral" dot>
                            Archived
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>
          </>
        )}

        {/* Archived Requisition Details & Actions Dialog */}
        <Dialog
          open={selectedArchivedJob !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedArchivedJob(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            {selectedArchivedJob ? (
              <>
                <DialogHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status="neutral" dot>
                      Archived
                    </StatusBadge>
                    <Badge variant="secondary">
                      {formatJobCohort(
                        selectedArchivedJob.original_created_at || selectedArchivedJob.archived_at
                      )}
                    </Badge>
                  </div>
                  <DialogTitle className="mt-2">{selectedArchivedJob.title}</DialogTitle>
                  <DialogDescription>
                    {selectedArchivedJob.department || "Operations"} ·{" "}
                    {selectedArchivedJob.location || "Remote"} ·{" "}
                    {selectedArchivedJob.employment_type || "Full-time"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Active lifecycle</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formatLifecycleDate(
                        selectedArchivedJob.original_created_at || selectedArchivedJob.archived_at
                      )}{" "}
                      &rarr; {formatLifecycleDate(selectedArchivedJob.archived_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="text-muted-foreground">
                      {calculateDuration(
                        selectedArchivedJob.original_created_at || selectedArchivedJob.archived_at,
                        selectedArchivedJob.archived_at
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Historical applicants</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {selectedArchivedJob.applicant_count ?? 0}
                    </span>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isActionLoading}
                    onClick={() => void handleRestoreArchivedJob(selectedArchivedJob)}
                  >
                    <RotateCcw aria-hidden="true" />
                    <span>Restore requisition</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const target = selectedArchivedJob;
                      setSelectedArchivedJob(null);
                      handleDuplicateArchivedJob(target);
                    }}
                  >
                    <Copy aria-hidden="true" />
                    <span>Duplicate as new opening</span>
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Confirmation Modal for Job Actions */}
        <ConfirmJobActionModal
          isOpen={actionModalType !== null}
          onClose={() => {
            setActionModalType(null);
            setActionJob(null);
          }}
          onConfirm={handleConfirmAction}
          actionType={actionModalType}
          jobTitle={actionJob?.title || ""}
          isLoading={isActionLoading}
        />

        <CreateJobModal
          isOpen={editingJob !== null || duplicatingTemplate !== null}
          jobToEdit={editingJob}
          initialTemplate={duplicatingTemplate}
          onClose={() => {
            setEditingJob(null);
            setDuplicatingTemplate(null);
          }}
          onJobCreated={(newOrUpdatedJob) => {
            onJobUpdated(newOrUpdatedJob);
            setEditingJob(null);
            setDuplicatingTemplate(null);
          }}
          onSuccessRedirect={(newJob) => {
            router.push(`/admin/jobs/${newJob.id}`);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
