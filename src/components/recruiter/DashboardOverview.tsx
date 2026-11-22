"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckSquare2,
  Clock3,
  Plus,
  RefreshCcw,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { fetchApi } from "@/lib/api";
import { Application, RecruiterAnalytics } from "@/types/application";
import { Job } from "@/types/job";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { MetricSummary } from "@/components/ui/metric-summary";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Section, SectionDescription, SectionHeader, SectionTitle } from "@/components/ui/section";
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";

interface DashboardOverviewProps {
  jobs: Job[];
  applications: Application[];
  anonymize: boolean;
  onSelectApplication: (app: Application, queue?: Application[]) => void;
}

function departmentMonogram(department?: string, title?: string) {
  const value = `${department || ""} ${title || ""}`.toLowerCase();
  if (/information|tech|software|engineer/.test(value)) return "IT";
  if (/finance|account/.test(value)) return "FA";
  if (/health|medical|nurse/.test(value)) return "HC";
  if (/civil|construct/.test(value)) return "ENG";
  if (/sales|business/.test(value)) return "BD";
  if (/bpo|support|customer/.test(value)) return "CS";
  return (department || "HR").slice(0, 2).toUpperCase();
}

function statusTone(status: string): "neutral" | "processing" | "success" | "danger" | "warning" {
  if (status === "SHORTLISTED" || status === "HIRED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "INTERVIEW") return "warning";
  if (status === "UNDER_REVIEW" || status === "PROCESSING") return "processing";
  return "neutral";
}

export function DashboardOverview({
  jobs,
  applications,
  anonymize,
  onSelectApplication,
}: DashboardOverviewProps) {
  const router = useRouter();
  const { setIsCreateJobOpen, onApplicationUpdated } = useRecruiter();
  const [analytics, setAnalytics] = useState<RecruiterAnalytics | null>(null);
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await fetchApi<RecruiterAnalytics>("/applications/analytics/");
      setAnalytics(data);
    } catch {
      // Non-blocking enrichment
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAnalytics, applications.length]);

  const activeJobs = jobs.filter(
    (job) => job.status === "PUBLISHED" || (!job.status && job.status !== "CLOSED")
  );
  const closedJobs = jobs.filter((job) => job.status === "CLOSED");
  const inReview = applications.filter(
    (app) => app.status === "UNDER_REVIEW" || app.status === "PROCESSING"
  ).length;
  const shortlisted = applications.filter(
    (app) => app.status === "SHORTLISTED" || app.status === "INTERVIEW" || app.status === "HIRED"
  ).length;
  const activeSnapshot = activeJobs.slice(0, 4);
  const recentApplications = useMemo(
    () => [...applications].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5),
    [applications]
  );
  const jobStatsById = useMemo(() => {
    const map = new Map<number, { count: number; topScore: number }>();
    for (const app of applications) {
      const existing = map.get(app.job);
      const score = Math.round(app.match_result?.match_score || 0);
      if (existing) {
        existing.count += 1;
        if (score > existing.topScore) existing.topScore = score;
      } else {
        map.set(app.job, { count: 1, topScore: score });
      }
    }
    return map;
  }, [applications]);

  const attention = analytics?.needs_attention;
  const hasAttentionItems = Boolean(
    attention &&
      (attention.high_match_unreviewed.length > 0 ||
        attention.stale_in_review.length > 0 ||
        attention.failed_parses.length > 0 ||
        attention.overdue_tasks_count > 0)
  );

  const handleRetryParse = async (appId: number) => {
    setReprocessingId(appId);
    try {
      const updated = await fetchApi<Application>(`/applications/${appId}/reprocess/`, {
        method: "POST",
      });
      onApplicationUpdated(updated);
      toast.success("Resume re-queued for analysis");
      void loadAnalytics();
    } catch {
      toast.error("Could not retry resume analysis");
    } finally {
      setReprocessingId(null);
    }
  };

  const scoreDistTotal = analytics
    ? Object.values(analytics.score_distribution).reduce((acc, n) => acc + n, 0)
    : 0;

  return (
    <div className="space-y-7">
      <PageHeader>
        <div>
          <PageHeaderTitle>Recruiter dashboard</PageHeaderTitle>
          <PageHeaderDescription>
            Monitor hiring funnel conversion, resolve urgent candidate actions, and jump straight into active requisitions.
          </PageHeaderDescription>
        </div>
        <PageHeaderActions>
          <Button onClick={() => setIsCreateJobOpen(true)}>
            <Plus aria-hidden="true" />
            Post a new job
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <section
        aria-label="Recruiting summary"
        className="grid grid-cols-2 gap-x-5 gap-y-6 border-y border-border py-5 sm:grid-cols-4 sm:gap-x-8"
      >
        <MetricSummary
          label="Active requisitions"
          value={activeJobs.length}
          description={closedJobs.length ? `${closedJobs.length} closed roles` : "All published roles are live"}
        />
        <MetricSummary
          label="Total candidates"
          value={applications.length}
          description={
            analytics?.median_review_hours !== null && analytics?.median_review_hours !== undefined
              ? `Median review ${analytics.median_review_hours}h`
              : "Resumes evaluated"
          }
        />
        <MetricSummary
          label="In review"
          value={inReview}
          description="Candidates needing attention"
          tone="brand"
        />
        <MetricSummary
          label="Shortlisted+"
          value={shortlisted}
          description="Shortlisted, interview & hired"
          tone="success"
        />
      </section>

      {/* Actionable Needs Attention Strip */}
      {hasAttentionItems && attention ? (
        <Section aria-labelledby="needs-attention-heading">
          <SectionHeader>
            <div>
              <SectionTitle id="needs-attention-heading">Needs attention</SectionTitle>
              <SectionDescription>
                High-priority candidates, overdue follow-ups, and stuck items requiring recruiter action.
              </SectionDescription>
            </div>
            {attention.overdue_tasks_count > 0 ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin?view=tasks">
                  <CheckSquare2 className="size-4" aria-hidden="true" />
                  {attention.overdue_tasks_count} overdue task{attention.overdue_tasks_count === 1 ? "" : "s"}
                </Link>
              </Button>
            ) : null}
          </SectionHeader>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attention.high_match_unreviewed.slice(0, 3).map((item) => {
              const target = applications.find((a) => a.id === item.id);
              return (
                <div
                  key={`high-${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 shrink-0 text-success" aria-hidden="true" />
                      <span className="truncate text-sm font-bold text-foreground">{item.candidate_code}</span>
                      <Badge variant="success" className="tabular-nums">{item.match_score}%</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      Unreviewed strong fit · {item.job_title}
                    </p>
                  </div>
                  {target ? (
                    <Button type="button" size="sm" variant="secondary" onClick={() => onSelectApplication(target, recentApplications)}>
                      Review
                    </Button>
                  ) : null}
                </div>
              );
            })}

            {attention.stale_in_review.slice(0, 3).map((item) => {
              const target = applications.find((a) => a.id === item.id);
              return (
                <div
                  key={`stale-${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Clock3 className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
                      <span className="truncate text-sm font-bold text-foreground">{item.candidate_code}</span>
                      <StatusBadge status="warning">{item.days_waiting}d waiting</StatusBadge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      In review · {item.job_title}
                    </p>
                  </div>
                  {target ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => onSelectApplication(target)}>
                      Decide
                    </Button>
                  ) : null}
                </div>
              );
            })}

            {attention.failed_parses.slice(0, 2).map((item) => (
              <div
                key={`failed-${item.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-rose-50/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                    <span className="truncate text-sm font-bold text-foreground">{item.candidate_code}</span>
                    <StatusBadge status="danger">Parse failed</StatusBadge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.job_title}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={reprocessingId === item.id}
                  onClick={() => void handleRetryParse(item.id)}
                >
                  <RefreshCcw className={reprocessingId === item.id ? "animate-spin" : ""} aria-hidden="true" />
                  Retry
                </Button>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Hiring Funnel & Score Quality Distribution */}
      {analytics && analytics.total_applications > 0 ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Section>
            <SectionHeader>
              <div>
                <SectionTitle>Hiring funnel conversion</SectionTitle>
                <SectionDescription>Stage progression across all active requisitions.</SectionDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin?view=pipeline">
                  Open pipeline <ArrowRight />
                </Link>
              </Button>
            </SectionHeader>
            <div className="space-y-3.5">
              {analytics.funnel.map((step) => (
                <div key={step.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-foreground">{step.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      <strong className="text-foreground">{step.count}</strong> ({step.conversion_percent}%)
                    </span>
                  </div>
                  <Progress value={step.conversion_percent} aria-label={`${step.label} ${step.conversion_percent}%`} />
                </div>
              ))}
            </div>
          </Section>

          <Section>
            <SectionHeader>
              <div>
                <SectionTitle>Applicant match quality</SectionTitle>
                <SectionDescription>Distribution of AI rubric scores across evaluated resumes.</SectionDescription>
              </div>
            </SectionHeader>
            <div className="space-y-3.5">
              {(["Strong", "Good", "Partial", "Weak", "Pending"] as const).map((band) => {
                const count = analytics.score_distribution[band] || 0;
                const pct = scoreDistTotal > 0 ? Math.round((count / scoreDistTotal) * 100) : 0;
                return (
                  <div key={band} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-foreground">{band}</span>
                      <span className="tabular-nums text-muted-foreground">
                        <strong className="text-foreground">{count}</strong> ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} aria-label={`${band} ${pct}%`} />
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Section className="p-0 sm:p-0">
          <SectionHeader className="mb-0 px-5 py-5 sm:px-6">
            <div>
              <SectionTitle>Active requisitions</SectionTitle>
              <SectionDescription>Roles currently collecting and evaluating candidates.</SectionDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin?view=jobs">
                View all <ArrowRight />
              </Link>
            </Button>
          </SectionHeader>
          {activeSnapshot.length ? (
            <div className="divide-y divide-border/70">
              {activeSnapshot.map((job) => {
                const stats = jobStatsById.get(job.id) ?? { count: 0, topScore: 0 };
                const topScore = stats.topScore;
                return (
                  <Button
                    key={job.id}
                    type="button"
                    variant="ghost"
                    onClick={() => router.push(`/admin/jobs/${job.id}`)}
                    className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)] justify-start gap-x-3 gap-y-2 rounded-none px-5 py-4 text-left hover:bg-muted/60 sm:flex sm:px-6"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-primary">
                      {departmentMonogram(job.department, job.title)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{job.title}</span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {job.department || "Operations"} · {job.location || "Remote"}
                      </span>
                    </span>
                    <span className="col-start-2 flex min-w-0 items-center gap-3 text-left sm:block sm:shrink-0 sm:text-right">
                      <span className="text-sm font-bold tabular-nums text-foreground sm:block">
                        {stats.count} candidates
                      </span>
                      <span className="text-sm text-emerald-700 sm:mt-0.5 sm:block">
                        Top {topScore ? `${topScore}%` : "—"}
                      </span>
                    </span>
                    <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                  </Button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No active requisitions"
              description="Publish a job to begin collecting candidate applications."
              actionLabel="Post a new job"
              onAction={() => setIsCreateJobOpen(true)}
            />
          )}
        </Section>

        <Section className="p-0 sm:p-0">
          <SectionHeader className="mb-0 px-5 py-5 sm:px-6">
            <div>
              <SectionTitle>Recent candidates</SectionTitle>
              <SectionDescription>Latest submissions across active requisitions.</SectionDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin?view=applicants">
                View all <ArrowRight />
              </Link>
            </Button>
          </SectionHeader>
          {recentApplications.length ? (
            <div className="divide-y divide-border/70">
              {recentApplications.map((app) => {
                const score = Math.round(app.match_result?.match_score || 0);
                const label = anonymize
                  ? app.candidate_code || `Candidate #${app.id}`
                  : app.applicant_name || app.candidate_code || `Candidate #${app.id}`;
                return (
                  <Button
                    key={app.id}
                    type="button"
                    variant="ghost"
                    onClick={() => onSelectApplication(app, recentApplications)}
                    className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)] justify-start gap-x-3 gap-y-2 rounded-none px-5 py-4 text-left hover:bg-muted/60 sm:flex sm:px-6"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <UsersRound className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold text-foreground">{label}</span>
                        <StatusBadge status={statusTone(app.status)}>
                          {app.status.replace(/_/g, " ")}
                        </StatusBadge>
                      </span>
                      <span className="mt-1 block truncate text-sm text-muted-foreground">
                        {app.job_title || "General application"}
                      </span>
                    </span>
                    <span className="col-start-2 flex min-w-0 items-center gap-2 text-left sm:block sm:shrink-0 sm:text-right">
                      <span className="text-sm font-extrabold tabular-nums text-foreground sm:block">
                        {score}%
                      </span>
                      <span className="text-sm text-muted-foreground">AI match</span>
                    </span>
                    <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                  </Button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No candidate submissions"
              description="New applications will appear here after candidates submit their resumes."
            />
          )}
        </Section>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <BriefcaseBusiness className="size-3.5" />
          {activeJobs.length} roles currently active
        </span>
        <span aria-hidden="true">·</span>
        <span>Candidate identities follow the current blind-screening setting.</span>
      </div>
    </div>
  );
}
