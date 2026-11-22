"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Scale, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { fetchApi } from "@/lib/api";
import { getCandidateDisplayName } from "@/lib/candidate-identity";
import {
  Application,
  ApplicationStatus,
  REJECTION_REASON_OPTIONS,
  RejectionReason,
} from "@/types/application";
import { CandidateComparisonDialog } from "./CandidateComparisonDialog";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Label } from "@/components/ui/label";
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
import { CollectionToolbar, type ViewMode } from "@/components/ui/toolbar";

type DisplayMode = ViewMode;
type SortOption = "score_desc" | "exp_desc" | "newest";

interface TalentPoolViewProps {
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

const BULK_STATUS_OPTIONS: ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "HIRED",
  "REJECTED",
];

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status] || { label: status.replace(/_/g, " "), status: "neutral" };
  return (
    <StatusBadge status={meta.status} dot>
      {meta.label}
    </StatusBadge>
  );
}

function getCandidateSkills(app: Application): string[] {
  return app.resume?.extracted_skills?.length
    ? app.resume.extracted_skills
    : app.match_result?.matched_skills || [];
}

function formatExperienceYears(years?: number | null): string {
  if (typeof years !== "number" || Number.isNaN(years)) return "—";
  const rounded = Number.isInteger(years) ? String(years) : years.toFixed(1);
  return `${rounded} ${rounded === "1" ? "yr" : "yrs"}`;
}

export function TalentPoolView({ onSelectApplication }: TalentPoolViewProps) {
  const { applications, anonymize, onApplicationUpdated } = useRecruiter();
  const [displayMode, setDisplayMode] = useState<DisplayMode>("table");
  const [results, setResults] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState("70");
  const [minExp, setMinExp] = useState("any");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("score_desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus>("SHORTLISTED");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState<RejectionReason>("SKILLS_GAP");

  const searchPool = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (minScore !== "any") params.set("min_score", minScore);
      if (minExp !== "any") params.set("min_exp", minExp);
      if (tagFilter !== "ALL") params.set("tag", tagFilter);
      const data = await fetchApi<Application[]>(`/applications/talent-pool/?${params.toString()}`);
      setResults(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search the talent pool.");
    } finally {
      setLoading(false);
    }
  }, [minExp, minScore, query, tagFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void searchPool(), 250);
    return () => window.clearTimeout(timer);
  }, [searchPool]);

  const applicationsById = useMemo(() => {
    const map = new Map<number, Application>();
    for (const app of applications) {
      map.set(app.id, app);
    }
    return map;
  }, [applications]);

  const sortedResults = useMemo(() => {
    const merged = results.map((item) => {
      const live = applicationsById.get(item.id);
      if (!live) return item;
      return {
        ...item,
        status: live.status,
        tags: live.tags ?? item.tags,
        rejection_reason: live.rejection_reason ?? item.rejection_reason,
        rejection_note: live.rejection_note ?? item.rejection_note,
        updated_at: live.updated_at || item.updated_at,
      };
    });

    return [...merged].sort((a, b) => {
      if (sortBy === "exp_desc") {
        const expDiff =
          (b.resume?.extracted_experience_years ?? -1) -
          (a.resume?.extracted_experience_years ?? -1);
        if (expDiff !== 0) return expDiff;
        return (b.match_result?.match_score ?? -1) - (a.match_result?.match_score ?? -1);
      }
      if (sortBy === "newest") {
        return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
      }
      const scoreDiff = (b.match_result?.match_score ?? -1) - (a.match_result?.match_score ?? -1);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
    });
  }, [applicationsById, results, sortBy]);

  const visibleIdSet = useMemo(
    () => new Set(sortedResults.map((app) => app.id)),
    [sortedResults]
  );

  const activeSelectedIds = useMemo(
    () => selectedIds.filter((id) => visibleIdSet.has(id)),
    [selectedIds, visibleIdSet]
  );

  const selectedApplications = useMemo(
    () => sortedResults.filter((app) => activeSelectedIds.includes(app.id)),
    [activeSelectedIds, sortedResults]
  );

  const allVisibleSelected =
    sortedResults.length > 0 &&
    sortedResults.every((app) => activeSelectedIds.includes(app.id));

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedResults.slice(0, 100).map((app) => app.id));
    }
  };

  const syncUpdatedApplication = useCallback(
    (updated: Application) => {
      setResults((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      );
      onApplicationUpdated(updated);
    },
    [onApplicationUpdated]
  );

  const executeBulkMove = async (targetStatus: ApplicationStatus, rejectionReason?: RejectionReason) => {
    if (activeSelectedIds.length === 0) return;
    setBulkWorking(true);
    try {
      const payload: Record<string, unknown> = {
        application_ids: activeSelectedIds,
        status: targetStatus,
      };
      if (targetStatus === "REJECTED" && rejectionReason) {
        payload.rejection_reason = rejectionReason;
      }
      const updated = await fetchApi<Application[]>("/applications/bulk/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      updated.forEach(syncUpdatedApplication);
      toast.success(
        `${updated.length} candidate${updated.length === 1 ? "" : "s"} moved to ${STATUS_META[targetStatus].label}`
      );
      setSelectedIds([]);
      setRejectDialogOpen(false);
    } catch (err) {
      toast.error("Bulk update failed", {
        description: err instanceof Error ? err.message : "Could not update selected candidates. Try again.",
      });
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkMoveClick = () => {
    if (activeSelectedIds.length === 0) return;
    if (bulkStatus === "REJECTED") {
      setRejectDialogOpen(true);
      return;
    }
    void executeBulkMove(bulkStatus);
  };

  const hasFilters = Boolean(
    query.trim() || minScore !== "any" || minExp !== "any" || tagFilter !== "ALL"
  );
  const clearFilters = () => {
    setQuery("");
    setMinScore("any");
    setMinExp("any");
    setTagFilter("ALL");
    setSelectedIds([]);
  };

  const renderTalentCards = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sortedResults.map((app) => {
        const score =
          typeof app.match_result?.match_score === "number"
            ? Math.round(app.match_result.match_score)
            : null;
        const allSkills = getCandidateSkills(app);
        const visibleSkills = allSkills.slice(0, 5);
        const remainingSkills = Math.max(0, allSkills.length - visibleSkills.length);
        const isSelected = activeSelectedIds.includes(app.id);
        const candidateLabel = getCandidateDisplayName(app, anonymize);

        return (
          <Card
            key={app.id}
            data-state={isSelected ? "selected" : undefined}
            className="flex flex-col justify-between border border-border transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-sm data-[state=selected]:border-primary/40 data-[state=selected]:bg-secondary/20"
          >
            <CardHeader className="space-y-2 p-5 pb-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(app.id)}
                  aria-label={`Select ${app.candidate_code}`}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="min-w-0 text-base leading-snug">
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => onSelectApplication(app, sortedResults)}
                          className="h-auto max-w-full justify-start p-0 text-left text-base font-bold text-foreground hover:text-primary"
                        >
                          <span className="truncate">{candidateLabel}</span>
                        </Button>
                      </CardTitle>
                      <CardDescription className="mt-0.5 truncate text-sm">
                        Applied for{" "}
                        <Link
                          href={`/admin/jobs/${app.job}`}
                          className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
                          title={app.job_title || `Job #${app.job}`}
                        >
                          {app.job_title || `Job #${app.job}`}
                        </Link>
                      </CardDescription>
                    </div>
                    {score !== null ? (
                      <Badge
                        variant={score >= 85 ? "success" : "info"}
                        className="shrink-0 tabular-nums"
                      >
                        <Sparkles className="mr-1 size-3.5" aria-hidden="true" />
                        {score}%
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-4">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <Badge variant="secondary" className="tabular-nums">
                  {app.candidate_code}
                </Badge>
                <ApplicationStatusBadge status={app.status} />
                {typeof app.resume?.extracted_experience_years === "number" ? (
                  <Badge variant="outline" className="tabular-nums">
                    {formatExperienceYears(app.resume.extracted_experience_years)} exp
                  </Badge>
                ) : null}
              </div>

              {visibleSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {visibleSkills.map((skill, idx) => (
                    <Badge key={`${skill}-${idx}`} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                  {remainingSkills > 0 ? (
                    <Badge variant="secondary" className="tabular-nums">
                      +{remainingSkills}
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              {app.tags?.length ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Tag className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {app.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="justify-between border-t border-border px-5 py-3.5">
              <span className="truncate text-sm text-muted-foreground">
                {app.job_department || "General"}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onSelectApplication(app, sortedResults)}
                className="shrink-0"
              >
                <span>Inspect profile</span>
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
          <PageHeaderTitle>Talent pool &amp; rediscovery</PageHeaderTitle>
          <PageHeaderDescription>
            Rediscover strong past applicants and silver medalists across requisitions by verified skills, tenure, score, or tags.
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
        label="Talent pool controls"
        search={
          <SearchInput
            aria-label="Search skills, roles, or tags"
            placeholder="Search skill (e.g. Python, CPA, RN), role, or tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            containerClassName="w-full sm:w-72 lg:w-80"
          />
        }
        filters={
          <>
            <Select value={minScore} onValueChange={setMinScore}>
              <SelectTrigger aria-label="Minimum match score" className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any match score</SelectItem>
                <SelectItem value="85">85%+ (Strong)</SelectItem>
                <SelectItem value="70">70%+ (Good+)</SelectItem>
                <SelectItem value="50">50%+ (Partial+)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={minExp} onValueChange={setMinExp}>
              <SelectTrigger aria-label="Minimum experience" className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any experience</SelectItem>
                <SelectItem value="1">1+ years</SelectItem>
                <SelectItem value="3">3+ years</SelectItem>
                <SelectItem value="5">5+ years</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger aria-label="Filter by tag" className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All tags</SelectItem>
                <SelectItem value="Silver Medalist">Silver Medalist</SelectItem>
                <SelectItem value="Strong Technical">Strong Technical</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
                <SelectItem value="Culture Add">Culture Add</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger aria-label="Sort talent pool" className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score_desc">Highest AI match</SelectItem>
                <SelectItem value="exp_desc">Most experience</SelectItem>
                <SelectItem value="newest">Newest applied</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        hasActiveFilters={hasFilters}
        onClearFilters={clearFilters}
        viewMode={displayMode}
        onViewModeChange={setDisplayMode}
      />

      <SelectionActionBar
        count={activeSelectedIds.length}
        label="Selected talent pool actions"
        disabled={bulkWorking}
        onClear={() => setSelectedIds([])}
        secondaryActions={
          activeSelectedIds.length >= 2 && activeSelectedIds.length <= 4 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCompareOpen(true)}
            >
              <Scale className="size-4" aria-hidden="true" />
              Compare ({activeSelectedIds.length})
            </Button>
          ) : null
        }
        actions={
          <>
            <Select
              value={bulkStatus}
              onValueChange={(value) => setBulkStatus(value as ApplicationStatus)}
              disabled={bulkWorking}
            >
              <SelectTrigger className="h-9 w-full bg-card sm:w-44" aria-label="Bulk target status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BULK_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_META[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              onClick={handleBulkMoveClick}
              disabled={bulkWorking}
            >
              Move selected
            </Button>
          </>
        }
      />

      {loading ? (
        <ContextualLoading label="Searching talent pool" />
      ) : error ? (
        <ErrorState
          title="Talent pool unavailable"
          description={error}
          onAction={() => void searchPool()}
        />
      ) : sortedResults.length === 0 ? (
        <EmptyState
          title="No matching talent profiles found"
          description="Broaden your skill keywords or lower the minimum match score to explore more past applicants."
          actionLabel={hasFilters ? "Reset search" : undefined}
          onAction={hasFilters ? clearFilters : undefined}
          className="rounded-2xl border border-dashed border-border bg-muted/30"
        />
      ) : displayMode === "cards" ? (
        renderTalentCards()
      ) : (
        <>
          <div className="md:hidden">{renderTalentCards()}</div>
          <section
            aria-label="Talent pool table"
            className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block"
          >
            <Table density="compact">
              <TableHeader>
                <TableRow>
                  <TableHead size="fit">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all visible talent pool candidates"
                    />
                  </TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Prior Role</TableHead>
                  <TableHead size="wide">Skills &amp; Tags</TableHead>
                  <TableHead size="fit" className="text-center">
                    Experience
                  </TableHead>
                  <TableHead size="fit" className="text-center">
                    AI Match
                  </TableHead>
                  <TableHead size="fit" className="text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResults.map((app) => {
                  const score =
                    typeof app.match_result?.match_score === "number"
                      ? Math.round(app.match_result.match_score)
                      : null;
                  const allSkills = getCandidateSkills(app);
                  const visibleSkills = allSkills.slice(0, 3);
                  const remainingSkills = Math.max(0, allSkills.length - visibleSkills.length);
                  const visibleTags = (app.tags || []).slice(0, 2);
                  const remainingTags = Math.max(0, (app.tags?.length || 0) - visibleTags.length);
                  const isSelected = activeSelectedIds.includes(app.id);
                  const jobTitle = app.job_title || `Job Requisition #${app.job}`;
                  const department = app.job_department || "General";

                  return (
                    <TableRow
                      key={app.id}
                      data-state={isSelected ? "selected" : undefined}
                      onClick={() => onSelectApplication(app, sortedResults)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(app.id)}
                          aria-label={`Select ${app.candidate_code}`}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="min-w-0">
                          <Button
                            type="button"
                            variant="link"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectApplication(app, sortedResults);
                            }}
                            className="h-auto max-w-full justify-start p-0 text-left text-sm font-bold tabular-nums text-foreground hover:text-primary"
                          >
                            <span className="truncate">{app.candidate_code}</span>
                          </Button>
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {anonymize
                              ? "Blind screening active"
                              : app.applicant_name || "Applicant record"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/jobs/${app.job}`}
                            onClick={(event) => event.stopPropagation()}
                            className="block truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
                            title={jobTitle}
                          >
                            {jobTitle}
                          </Link>
                          <p className="mt-0.5 truncate text-sm text-muted-foreground" title={department}>
                            {department}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        {visibleSkills.length === 0 && visibleTags.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {visibleSkills.map((skill, idx) => (
                              <Badge key={`${skill}-${idx}`} variant="outline">
                                {skill}
                              </Badge>
                            ))}
                            {remainingSkills > 0 ? (
                              <Badge variant="secondary" className="tabular-nums">
                                +{remainingSkills}
                              </Badge>
                            ) : null}
                            {visibleTags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                <Tag className="mr-1 size-3.5 text-muted-foreground" aria-hidden="true" />
                                {tag}
                              </Badge>
                            ))}
                            {remainingTags > 0 ? (
                              <Badge variant="secondary" className="tabular-nums">
                                +{remainingTags} tags
                              </Badge>
                            ) : null}
                          </div>
                        )}
                      </TableCell>

                      <TableCell
                        overflow="nowrap"
                        className="text-center text-sm font-medium tabular-nums text-foreground"
                      >
                        {formatExperienceYears(app.resume?.extracted_experience_years)}
                      </TableCell>

                      <TableCell
                        overflow="nowrap"
                        className={
                          score !== null && score >= 85
                            ? "text-center text-sm font-bold tabular-nums text-success"
                            : "text-center text-sm font-bold tabular-nums text-foreground"
                        }
                      >
                        {score !== null ? `${score}%` : "—"}
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
        onApplicationUpdated={syncUpdatedApplication}
        onReviewCandidate={(app) => onSelectApplication(app, sortedResults)}
      />

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reject {activeSelectedIds.length} selected candidate
              {activeSelectedIds.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This updates each selected application to Rejected and records the selected reason in their activity history.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="talent-pool-bulk-reject-reason">Rejection reason</Label>
            <Select
              value={bulkRejectionReason}
              onValueChange={(value) => setBulkRejectionReason(value as RejectionReason)}
              disabled={bulkWorking}
            >
              <SelectTrigger id="talent-pool-bulk-reject-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkWorking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={bulkWorking}
              onClick={(event) => {
                event.preventDefault();
                void executeBulkMove("REJECTED", bulkRejectionReason);
              }}
            >
              Reject selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
