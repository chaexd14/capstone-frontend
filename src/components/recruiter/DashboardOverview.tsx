"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Plus, UsersRound } from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { MetricSummary } from "@/components/ui/metric-summary";
import { PageHeader, PageHeaderActions, PageHeaderDescription, PageHeaderTitle } from "@/components/ui/page-header";
import { Section, SectionDescription, SectionHeader, SectionTitle } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { Job } from "@/types/job";
import { Application } from "@/types/application";

interface DashboardOverviewProps { jobs: Job[]; applications: Application[]; anonymize: boolean; onSelectApplication: (app: Application) => void; }

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

function statusTone(status: string): "neutral" | "processing" | "success" | "danger" {
  if (status === "SHORTLISTED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "UNDER_REVIEW" || status === "PROCESSING") return "processing";
  return "neutral";
}

export function DashboardOverview({ jobs, applications, anonymize, onSelectApplication }: DashboardOverviewProps) {
  const router = useRouter();
  const { setIsCreateJobOpen } = useRecruiter();
  const activeJobs = jobs.filter((job) => job.status === "PUBLISHED" || (!job.status && job.status !== "CLOSED"));
  const closedJobs = jobs.filter((job) => job.status === "CLOSED");
  const inReview = applications.filter((app) => app.status === "UNDER_REVIEW" || app.status === "PROCESSING").length;
  const shortlisted = applications.filter((app) => app.status === "SHORTLISTED").length;
  const activeSnapshot = activeJobs.slice(0, 4);
  const recentApplications = [...applications].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5);

  return <div className="space-y-7">
    <PageHeader>
      <div><PageHeaderTitle>Recruiter dashboard</PageHeaderTitle><PageHeaderDescription>Review hiring activity, return to active requisitions, and identify candidates needing a decision.</PageHeaderDescription></div>
      <PageHeaderActions><Button onClick={() => setIsCreateJobOpen(true)}><Plus />Post a new job</Button></PageHeaderActions>
    </PageHeader>

    <section aria-label="Recruiting summary" className="grid grid-cols-2 gap-x-5 gap-y-6 border-y border-border py-5 sm:grid-cols-4 sm:gap-x-8">
      <MetricSummary label="Active requisitions" value={activeJobs.length} description={closedJobs.length ? `${closedJobs.length} closed roles` : "All published roles are live"} />
      <MetricSummary label="Total candidates" value={applications.length} description="Resumes evaluated" />
      <MetricSummary label="In review" value={inReview} description="Candidates needing attention" tone="brand" />
      <MetricSummary label="Shortlisted" value={shortlisted} description="Qualified talent" tone="success" />
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Section className="p-0 sm:p-0">
        <SectionHeader className="mb-0 px-5 py-5 sm:px-6"><div><SectionTitle>Active requisitions</SectionTitle><SectionDescription>Roles currently collecting and evaluating candidates.</SectionDescription></div><Button asChild variant="ghost" size="sm"><Link href="/admin?view=jobs">View all <ArrowRight /></Link></Button></SectionHeader>
        {activeSnapshot.length ? <div className="divide-y divide-border/70">{activeSnapshot.map((job) => {
          const jobApps = applications.filter((app) => app.job === job.id);
          const topScore = jobApps.reduce((maximum, app) => Math.max(maximum, app.match_result?.match_score || 0), 0);
          return <Button key={job.id} type="button" variant="ghost" onClick={() => router.push(`/admin/jobs/${job.id}`)} className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)] justify-start gap-x-3 gap-y-2 rounded-none px-5 py-4 text-left hover:bg-muted/60 sm:flex sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-primary">{departmentMonogram(job.department, job.title)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{job.title}</span><span className="mt-0.5 block truncate text-sm text-muted-foreground">{job.department || "Operations"} · {job.location || "Remote"}</span></span>
            <span className="col-start-2 flex min-w-0 items-center gap-3 text-left sm:block sm:shrink-0 sm:text-right"><span className="text-sm font-bold tabular-nums text-foreground sm:block">{jobApps.length} candidates</span><span className="text-sm text-emerald-700 sm:mt-0.5 sm:block">Top {topScore ? `${topScore}%` : "—"}</span></span>
            <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
          </Button>;
        })}</div> : <EmptyState title="No active requisitions" description="Publish a job to begin collecting candidate applications." actionLabel="Post a new job" onAction={() => setIsCreateJobOpen(true)} />}
      </Section>

      <Section className="p-0 sm:p-0">
        <SectionHeader className="mb-0 px-5 py-5 sm:px-6"><div><SectionTitle>Recent candidates</SectionTitle><SectionDescription>Latest submissions across active requisitions.</SectionDescription></div><Button asChild variant="ghost" size="sm"><Link href="/admin?view=applicants">View all <ArrowRight /></Link></Button></SectionHeader>
        {recentApplications.length ? <div className="divide-y divide-border/70">{recentApplications.map((app) => {
          const score = app.match_result?.match_score || 0;
          const label = anonymize ? app.candidate_code || `Candidate #${app.id}` : app.applicant_name || app.candidate_code || `Candidate #${app.id}`;
          return <Button key={app.id} type="button" variant="ghost" onClick={() => onSelectApplication(app)} className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)] justify-start gap-x-3 gap-y-2 rounded-none px-5 py-4 text-left hover:bg-muted/60 sm:flex sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><UsersRound className="size-4" /></span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-bold text-foreground">{label}</span><StatusBadge status={statusTone(app.status)}>{app.status.replace(/_/g, " ")}</StatusBadge></span><span className="mt-1 block truncate text-sm text-muted-foreground">{app.job_title || "General application"}</span></span>
            <span className="col-start-2 flex min-w-0 items-center gap-2 text-left sm:block sm:shrink-0 sm:text-right"><span className="text-sm font-extrabold tabular-nums text-foreground sm:block">{score}%</span><span className="text-sm text-muted-foreground">AI match</span></span>
            <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
          </Button>;
        })}</div> : <EmptyState title="No candidate submissions" description="New applications will appear here after candidates submit their resumes." />}
      </Section>
    </div>

    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><BriefcaseBusiness className="size-3.5" />{activeJobs.length} roles currently active</span><span aria-hidden="true">·</span><span>Candidate identities follow the current blind-screening setting.</span></div>
  </div>;
}
