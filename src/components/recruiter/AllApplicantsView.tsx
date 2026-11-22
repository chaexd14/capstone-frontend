"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, Scale, ShieldCheck } from "lucide-react";
import { Application, ApplicationStatus } from "@/types/application";
import { useRecruiter } from "@/context/RecruiterContext";
import { AllApplicationsReportDialog } from "./AllApplicationsReportDialog";
import { CandidateComparisonDialog } from "./CandidateComparisonDialog";
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
import { SelectionActionBar } from "@/components/ui/selection-action-bar";
import { toast } from "@/components/ui/sonner";
import { StatusBadge, type StatusBadgeProps } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CollectionToolbar } from "@/components/ui/toolbar";

type DisplayMode = "cards" | "table";
type SortOption = "newest" | "score_desc" | "score_asc" | "activity";

interface AllApplicantsViewProps {
  onSelectApplication: (app: Application, queue?: Application[]) => void;
}

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

function formatAppliedDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getApplicantNumber(application: Application): string {
  return application.candidate_code || `Applicant #${application.id}`;
}

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status] || { label: status.replace(/_/g, " "), status: "neutral" };
  return (
    <StatusBadge status={meta.status} dot>
      {meta.label}
    </StatusBadge>
  );
}

export function AllApplicantsView({ onSelectApplication }: AllApplicantsViewProps) {
  const { applications, jobs, anonymize, onApplicationUpdated, bulkUpdateApplicationStatus } = useRecruiter();
  const [displayMode, setDisplayMode] = useState<DisplayMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [jobFilter, setJobFilter] = useState<string>("ALL");
  const [bandFilter, setBandFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus>("SHORTLISTED");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportSession, setReportSession] = useState(0);

  const jobDepartmentById = useMemo(() => {
    const map = new Map<number, string>();
    for (const job of jobs) {
      if (job.department) map.set(job.id, job.department);
    }
    return map;
  }, [jobs]);

  const getDepartment = (app: Application): string =>
    app.job_department || jobDepartmentById.get(app.job) || "General recruitment";

  const departmentOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const app of applications) {
      const dept = app.job_department || jobDepartmentById.get(app.job);
      if (dept) unique.add(dept);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [applications, jobDepartmentById]);

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = applications.filter((app) => {
      if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
      if (jobFilter !== "ALL" && String(app.job) !== jobFilter) return false;
      const department = app.job_department || jobDepartmentById.get(app.job) || "General recruitment";
      if (departmentFilter !== "ALL" && department !== departmentFilter) return false;
      const score = app.match_result?.match_score ?? 0;
      const band =
        app.match_result?.ai_insights?.band ||
        (score >= 85 ? "Strong" : score >= 70 ? "Good" : score >= 50 ? "Partial" : "Weak");
      if (bandFilter !== "ALL" && band !== bandFilter) return false;
      if (!query) return true;

      return [
        app.candidate_code,
        `#${app.id}`,
        app.job_title,
        department,
        ...(app.tags || []),
        ...(anonymize ? [] : [app.applicant_name, app.email, app.phone]),
      ].some((value) => value?.toLowerCase().includes(query));
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "score_desc") return (b.match_result?.match_score ?? -1) - (a.match_result?.match_score ?? -1);
      if (sortBy === "score_asc") return (a.match_result?.match_score ?? 999) - (b.match_result?.match_score ?? 999);
      if (sortBy === "activity") {
        const aTime = new Date(a.latest_activity_at || a.updated_at).getTime();
        const bTime = new Date(b.latest_activity_at || b.updated_at).getTime();
        return bTime - aTime;
      }
      return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
    });
  }, [applications, anonymize, bandFilter, departmentFilter, jobDepartmentById, jobFilter, searchQuery, sortBy, statusFilter]);

  const hasFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== "ALL" ||
    departmentFilter !== "ALL" ||
    jobFilter !== "ALL" ||
    bandFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setDepartmentFilter("ALL");
    setJobFilter("ALL");
    setBandFilter("ALL");
    setSelectedIds([]);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const allVisibleSelected =
    filteredApplications.length > 0 && filteredApplications.every((app) => selectedIds.includes(app.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApplications.slice(0, 100).map((app) => app.id));
    }
  };

  const applyBulkMove = async () => {
    if (selectedIds.length === 0 || bulkWorking) return;
    const idsToMove = [...selectedIds];
    const targetStatus = bulkStatus;
    setBulkWorking(true);
    setSelectedIds([]);
    try {
      const count = await bulkUpdateApplicationStatus(idsToMove, targetStatus);
      toast.success(`${count} candidate${count === 1 ? "" : "s"} updated`);
    } catch (err) {
      setSelectedIds(idsToMove);
      toast.error("Bulk update failed", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setBulkWorking(false);
    }
  };

  const selectedApplications = useMemo(
    () => applications.filter((app) => selectedIds.includes(app.id)),
    [applications, selectedIds]
  );

  const renderApplicationCards = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredApplications.map((app) => {
        const applicantNumber = getApplicantNumber(app);
        const department = getDepartment(app);
        const score = app.match_result?.match_score;
        const hasScore = typeof score === "number";
        const isSelected = selectedIds.includes(app.id);

        return (
          <Card
            key={app.id}
            className="group flex flex-col justify-between border border-border transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-sm"
          >
            <CardHeader className="space-y-3 p-5 pb-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(app.id)}
                  aria-label={`Select ${applicantNumber}`}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="min-w-0 text-base leading-snug">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => onSelectApplication(app, filteredApplications)}
                        className="h-auto max-w-full justify-start p-0 text-left text-sm font-bold text-foreground hover:text-primary"
                      >
                        <span className="truncate">{applicantNumber}</span>
                      </Button>
                    </CardTitle>
                    <ApplicationStatusBadge status={app.status} />
                  </div>
                  <CardDescription className="mt-1 truncate text-sm">
                    {anonymize
                      ? "Identity hidden by blind screening"
                      : app.applicant_name || "Name unavailable"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-5 pb-4">
              <div className="space-y-2">
                <Link
                  href={`/admin/jobs/${app.job}`}
                  className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                  title={app.job_title || `Job Requisition #${app.job}`}
                >
                  {app.job_title || `Job Requisition #${app.job}`}
                </Link>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{department}</Badge>
                  {app.match_result?.ai_insights?.band ? (
                    <Badge variant="outline">{app.match_result.ai_insights.band} fit</Badge>
                  ) : null}
                  {app.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-border border-y border-border py-2.5 text-center">
                <div>
                  <span className="block text-sm font-medium text-muted-foreground">AI match</span>
                  <span className="mt-0.5 block text-sm font-bold tabular-nums text-success">
                    {hasScore ? `${Math.round(score)}%` : "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-muted-foreground">Applied</span>
                  <span className="mt-0.5 block text-sm font-semibold tabular-nums text-foreground">
                    {formatAppliedDate(app.applied_at)}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="justify-between gap-3 border-t border-border px-5 py-3.5">
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                {anonymize ? "Contact masked" : app.email || app.phone || "No contact details"}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onSelectApplication(app, filteredApplications)}
                className="shrink-0"
              >
                <span>Review</span>
                <ArrowRight aria-hidden="true" />
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader className="border-b border-border pb-6">
        <div>
          <PageHeaderTitle>All applications</PageHeaderTitle>
          <PageHeaderDescription>
            Filter, sort, compare side-by-side, and batch-advance applicants across every active requisition.
          </PageHeaderDescription>
        </div>
        {anonymize ? (
          <PageHeaderActions>
            <StatusBadge status="info" dot>
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Blind screening active
            </StatusBadge>
          </PageHeaderActions>
        ) : null}
      </PageHeader>

      <CollectionToolbar
        label="All applications controls"
        search={
          <SearchInput
            aria-label="Search applications"
            placeholder="Search applicant number, role, tag…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
            containerClassName="w-full sm:w-64 lg:w-72"
          />
        }
        filters={
          <>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger aria-label="Filter by requisition" className="w-full sm:w-44">
                <SelectValue placeholder="All requisitions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All requisitions</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={String(job.id)}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
              <SelectTrigger aria-label="Filter by match strength" className="w-full sm:w-40">
                <SelectValue placeholder="All strengths" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All strengths</SelectItem>
                <SelectItem value="Strong">Strong (85%+)</SelectItem>
                <SelectItem value="Good">Good (70–84%)</SelectItem>
                <SelectItem value="Partial">Partial (50–69%)</SelectItem>
                <SelectItem value="Weak">Weak (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>

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

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger aria-label="Sort applications" className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest applied</SelectItem>
                <SelectItem value="score_desc">Highest AI match</SelectItem>
                <SelectItem value="score_asc">Lowest AI match</SelectItem>
                <SelectItem value="activity">Recent activity</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        hasActiveFilters={hasFilters}
        onClearFilters={clearFilters}
        viewMode={displayMode}
        onViewModeChange={setDisplayMode}
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

      <SelectionActionBar
        count={selectedIds.length}
        label="Selected applications actions"
        disabled={bulkWorking}
        onClear={() => setSelectedIds([])}
        secondaryActions={
          selectedIds.length >= 2 && selectedIds.length <= 4 ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setCompareOpen(true)}>
              <Scale className="size-4" aria-hidden="true" />
              Compare ({selectedIds.length})
            </Button>
          ) : null
        }
        actions={
          <>
            <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as ApplicationStatus)} disabled={bulkWorking}>
              <SelectTrigger className="h-9 w-full bg-card sm:w-44" aria-label="Bulk target status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter((s) => s !== "PROCESSING").map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_META[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" onClick={() => void applyBulkMove()} disabled={bulkWorking}>
              Move selected
            </Button>
          </>
        }
      />

      {filteredApplications.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No applications match these filters" : "No applications yet"}
          description={
            hasFilters
              ? "Clear the search or choose another status, requisition, or department to see more applications."
              : "Candidate applications will appear here after a resume is submitted."
          }
          actionLabel={hasFilters ? "Clear filters" : undefined}
          onAction={hasFilters ? clearFilters : undefined}
          className="rounded-2xl border border-dashed border-border bg-muted/30"
        />
      ) : displayMode === "cards" ? (
        renderApplicationCards()
      ) : (
        <>
          <div className="md:hidden">{renderApplicationCards()}</div>
          <section
            aria-label="All applications table"
            className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block"
          >
            <Table density="compact">
              <TableHeader>
                <TableRow>
                  <TableHead size="fit">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all visible applications"
                    />
                  </TableHead>
                  <TableHead>Applicant Number</TableHead>
                  <TableHead>Applied Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">AI Match</TableHead>
                  <TableHead>Date Applied</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => {
                  const applicantNumber = getApplicantNumber(app);
                  const department = getDepartment(app);
                  const score = app.match_result?.match_score;
                  const hasScore = typeof score === "number";

                  return (
                    <TableRow
                      key={app.id}
                      onClick={() => onSelectApplication(app, filteredApplications)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(app.id)}
                          onCheckedChange={() => toggleSelect(app.id)}
                          aria-label={`Select ${applicantNumber}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="min-w-0 flex-1">
                            <Button
                              type="button"
                              variant="link"
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectApplication(app, filteredApplications);
                              }}
                              className="h-auto max-w-full justify-start p-0 text-left text-sm font-bold text-foreground hover:text-primary"
                            >
                              <span className="truncate">{applicantNumber}</span>
                            </Button>
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">
                              {anonymize ? "Blind screening active" : app.applicant_name || "Applicant record"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/admin/jobs/${app.job}`}
                          onClick={(event) => event.stopPropagation()}
                          className="block truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
                          title={app.job_title || `Job Requisition #${app.job}`}
                        >
                          {app.job_title || `Job Requisition #${app.job}`}
                        </Link>
                      </TableCell>

                      <TableCell className="text-sm font-medium text-foreground">
                        <span className="block truncate" title={department}>
                          {department}
                        </span>
                      </TableCell>

                      <TableCell>
                        {anonymize ? (
                          <span className="text-sm text-muted-foreground">Hidden by blind screening</span>
                        ) : (
                          <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">{app.email || "No email"}</p>
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">{app.phone || "No phone"}</p>
                          </div>
                        )}
                      </TableCell>

                      <TableCell overflow="nowrap" className="text-center text-sm font-bold tabular-nums text-success">
                        {hasScore ? `${Math.round(score)}%` : "—"}
                      </TableCell>

                      <TableCell overflow="nowrap" className="text-sm tabular-nums text-muted-foreground">
                        {formatAppliedDate(app.applied_at)}
                      </TableCell>

                      <TableCell overflow="nowrap" className="text-center">
                        <ApplicationStatusBadge status={app.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </>
      )}

      <CandidateComparisonDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        candidates={selectedApplications}
        anonymize={anonymize}
        onApplicationUpdated={onApplicationUpdated}
        onReviewCandidate={(app) => onSelectApplication(app, filteredApplications)}
      />

      <AllApplicationsReportDialog
        key={reportSession}
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        applications={applications}
        jobs={jobs}
        initialStatus={statusFilter}
      />
    </div>
  );
}
