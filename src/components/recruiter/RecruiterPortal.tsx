"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Job, ArchivedJob } from "@/types/job";
import { Application } from "@/types/application";
import {
  Plus,
  Search,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { CreateJobModal } from "./CreateJobModal";
import { CandidateAnalysisModal } from "./CandidateAnalysisModal";
import { JobProfileView } from "./JobProfileView";
import { ConfirmJobActionModal, JobActionType } from "./ConfirmJobActionModal";
import { fetchApi } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface RecruiterPortalProps {
  jobs: Job[];
  applications: Application[];
  anonymize: boolean;
  onJobCreated: (job: Job) => void;
  onJobUpdated?: (job: Job) => void;
  onJobDeleted?: (jobId: number) => void;
  onJobArchived?: (jobId: number) => void;
  onRefreshData?: () => void;
  onApplicationUpdated: (app: Application) => void;
}

export function RecruiterPortal({
  jobs,
  applications,
  anonymize,
  onJobCreated,
  onJobUpdated,
  onJobDeleted,
  onJobArchived,
  onApplicationUpdated,
}: RecruiterPortalProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  // Requisitions Display Mode: Cards Grid vs Dense HR Data Table
  const [displayMode, setDisplayMode] = useState<"cards" | "table">("cards");

  // Tabs for job management: ACTIVE | CLOSED | ARCHIVED
  const [jobTab, setJobTab] = useState<"ACTIVE" | "CLOSED" | "ARCHIVED">("ACTIVE");
  const [archivedJobs, setArchivedJobs] = useState<ArchivedJob[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  // Action Confirmation Modal State
  const [actionModalType, setActionModalType] = useState<JobActionType | null>(null);
  const [actionJob, setActionJob] = useState<Job | null>(null);
  const [actionArchivedJob, setActionArchivedJob] = useState<ArchivedJob | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadArchivedJobs = useCallback(async () => {
    setArchivedLoading(true);
    try {
      const data = await fetchApi<ArchivedJob[]>("/archived-jobs/");
      setArchivedJobs(data);
    } catch (err) {
      console.error("Failed to fetch archived jobs:", err);
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (jobTab === "ARCHIVED") {
      const timer = setTimeout(() => {
        void loadArchivedJobs();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [jobTab, loadArchivedJobs]);

  // Deep-link from notifications: auto-open job if ?jobId=... is in the URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const jobIdParam = params.get("jobId");
      if (jobIdParam && jobs.length > 0) {
        const target = jobs.find((j) => String(j.id) === String(jobIdParam));
        if (target) {
          const timer = setTimeout(() => {
            setSelectedJob(target);
          }, 0);
          return () => clearTimeout(timer);
        }
      }
    } catch {}
  }, [jobs]);

  const activeJobs = jobs.filter((j) => j.status === "PUBLISHED" || (!j.status && j.status !== "CLOSED"));
  const closedJobs = jobs.filter((j) => j.status === "CLOSED");

  const handleConfirmAction = async () => {
    if (!actionModalType) return;
    setIsActionLoading(true);
    try {
      if (actionModalType === "close" && actionJob) {
        const updated = await fetchApi<Job>(`/jobs/${actionJob.id}/close/`, { method: "POST" });
        if (onJobUpdated) onJobUpdated(updated);
        toast.success("Position Closed", { description: `"${actionJob.title}" is now closed.` });
      } else if (actionModalType === "reopen" && actionJob) {
        const updated = await fetchApi<Job>(`/jobs/${actionJob.id}/reopen/`, { method: "POST" });
        if (onJobUpdated) onJobUpdated(updated);
        toast.success("Position Reopened", { description: `"${actionJob.title}" is published.` });
      } else if (actionModalType === "archive" && actionJob) {
        await fetchApi(`/jobs/${actionJob.id}/archive/`, { method: "POST" });
        if (onJobArchived) onJobArchived(actionJob.id);
        toast.success("Requisition Archived", { description: `"${actionJob.title}" archived.` });
        void loadArchivedJobs();
      } else if (actionModalType === "delete" && actionJob) {
        await fetchApi(`/jobs/${actionJob.id}/`, { method: "DELETE" });
        if (onJobDeleted) onJobDeleted(actionJob.id);
        toast.success("Position Deleted", { description: `"${actionJob.title}" deleted.` });
      } else if (actionModalType === "delete_archived" && actionArchivedJob) {
        await fetchApi(`/archived-jobs/${actionArchivedJob.id}/`, { method: "DELETE" });
        setArchivedJobs((prev) => prev.filter((j) => j.id !== actionArchivedJob.id));
        toast.success("Archived Requisition Deleted");
      }
    } catch (err: unknown) {
      console.error("Action error:", err);
      const message = err instanceof Error ? err.message : "Failed to execute action.";
      toast.error("Action Failed", { description: message });
    } finally {
      setIsActionLoading(false);
      setActionModalType(null);
      setActionJob(null);
      setActionArchivedJob(null);
    }
  };

  const handleRestoreArchivedJob = async (archivedJob: ArchivedJob) => {
    setIsActionLoading(true);
    try {
      const restored = await fetchApi<Job>(`/archived-jobs/${archivedJob.id}/restore/`, { method: "POST" });
      setArchivedJobs((prev) => prev.filter((j) => j.id !== archivedJob.id));
      if (onJobCreated) onJobCreated(restored);
      toast.success("Job Restored", { description: `"${restored.title}" is now open and published.` });
      setJobTab("ACTIVE");
    } catch (err: unknown) {
      console.error("Failed to restore archived job:", err);
      const message = err instanceof Error ? err.message : "Failed to restore archived job.";
      toast.error("Restore Failed", { description: message });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Global Metrics
  const totalJobs = jobs.length;
  const totalApplicants = applications.length;
  const inReviewCount = applications.filter(
    (a) => a.status === "UNDER_REVIEW" || a.status === "SUBMITTED" || a.status === "PROCESSING"
  ).length;
  const shortlistedCount = applications.filter((a) => a.status === "SHORTLISTED").length;

  const openAnalysis = (app: Application) => {
    setSelectedApplication(app);
    setIsAnalysisOpen(true);
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "SHORTLISTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "UNDER_REVIEW":
      case "PROCESSING":
        return "bg-blue-50 text-[#1976D2] border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // If a specific job profile is selected, render its dedicated profile page
  if (selectedJob) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <JobProfileView
          job={selectedJob}
          applications={applications}
          anonymize={anonymize}
          onBack={() => setSelectedJob(null)}
          onApplicationUpdated={onApplicationUpdated}
          onJobUpdated={(updated) => {
            if (onJobUpdated) onJobUpdated(updated);
            setSelectedJob(updated);
          }}
          onJobArchived={(jobId) => {
            if (onJobArchived) onJobArchived(jobId);
            setSelectedJob(null);
            void loadArchivedJobs();
          }}
          onJobDeleted={(jobId) => {
            if (onJobDeleted) onJobDeleted(jobId);
            setSelectedJob(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Global Metrics Strip: Clean Enterprise Typographic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Open Jobs */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Open Positions</span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight tabular-nums">
            {totalJobs}
          </div>
          <p className="text-xs text-slate-400">Active benchmark roles</p>
        </div>

        {/* Metric 2: Total Applicants */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Candidates</span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight tabular-nums">
            {totalApplicants}
          </div>
          <p className="text-xs text-slate-400">Screened resumes</p>
        </div>

        {/* Metric 3: In Review */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-1">
          <span className="text-xs font-semibold text-[#1976D2] uppercase tracking-wider block">In Review</span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-[#2196F3] tracking-tight tabular-nums">
            {inReviewCount}
          </div>
          <p className="text-xs text-slate-400">Active evaluations</p>
        </div>

        {/* Metric 4: Shortlisted */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-1">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Shortlisted</span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-600 tracking-tight tabular-nums">
            {shortlistedCount}
          </div>
          <p className="text-xs text-slate-400">Qualified talent</p>
        </div>
      </div>

      {/* 2. Posted Job Profiles Section: White Enterprise Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Section Header with Actions & View Mode Toggle */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Posted Job Profiles
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200/80">
                {jobs.length} requisitions
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage requisition lifecycles, inspect candidate rosters, and audit AI ranking leaderboards.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setDisplayMode("cards")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  displayMode === "cards"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Cards Grid View"
                aria-label="Cards Grid View"
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  displayMode === "table"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Dense Data Table View"
                aria-label="Dense Data Table View"
              >
                Table
              </button>
            </div>

            {/* Post New Job CTA */}
            <Button
              onClick={() => setIsCreateJobOpen(true)}
              className="bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold text-xs px-4 h-9 rounded-xl shadow-2xs gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Job</span>
            </Button>
          </div>
        </div>

        {/* Tab Selector: Active | Closed | Archived */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
          <Tabs value={jobTab} onValueChange={(v) => setJobTab(v as "ACTIVE" | "CLOSED" | "ARCHIVED")}>
            <TabsList className="bg-slate-100/90 p-1 rounded-xl">
              <TabsTrigger value="ACTIVE" className="gap-2 text-xs font-semibold rounded-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Active Roles</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white text-slate-700 font-mono text-[11px] font-bold shadow-2xs">
                  {activeJobs.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="CLOSED" className="gap-2 text-xs font-semibold rounded-lg">
                <span>Closed Positions</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white text-slate-700 font-mono text-[11px] font-bold shadow-2xs">
                  {closedJobs.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="ARCHIVED" className="gap-2 text-xs font-semibold rounded-lg">
                <span>Archived Requisitions</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white text-slate-700 font-mono text-[11px] font-bold shadow-2xs">
                  {archivedJobs.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {jobTab === "ARCHIVED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadArchivedJobs}
              disabled={archivedLoading}
              className="gap-1.5 text-xs text-slate-600 h-8 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${archivedLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {/* ACTIVE & CLOSED TABS */}
          {(jobTab === "ACTIVE" || jobTab === "CLOSED") && (
            <div>
              {(jobTab === "ACTIVE" ? activeJobs : closedJobs).length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="text-sm font-semibold text-slate-900">
                    {jobTab === "ACTIVE" ? "No active positions found" : "No closed positions"}
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {jobTab === "ACTIVE"
                      ? "Create and publish a new job opening to start receiving and screening candidate resumes."
                      : "Positions closed by recruiters will appear here. Candidates can view closed roles, but cannot submit new applications."}
                  </p>
                </div>
              ) : displayMode === "cards" ? (
                /* 3-COLUMN CARDS GRID: Interactive Requisitions */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(jobTab === "ACTIVE" ? activeJobs : closedJobs).map((job) => {
                    const jobApps = applications.filter((a) => a.job === job.id || a.job_title === job.title);
                    const scores = jobApps
                      .map((a) => a.match_result?.match_score)
                      .filter((s): s is number => typeof s === "number");
                    const topScore = scores.length > 0 ? Math.max(...scores) : null;
                    const avgScore =
                      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                    const monogram = getDepartmentMonogram(job.department, job.title);

                    return (
                      <div
                        key={job.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedJob(job)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedJob(job);
                          }
                        }}
                        aria-label={`View candidate roster and metrics for ${job.title}`}
                        className="group p-5 rounded-2xl border border-slate-200/90 hover:border-[#2196F3]/50 transition-all duration-200 flex flex-col justify-between space-y-4 bg-white hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3]"
                      >
                        <div className="space-y-3">
                          {/* Top Monogram + Status */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2196F3] font-bold text-sm flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs group-hover:scale-105 transition-transform">
                                {monogram}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-slate-700 block truncate">
                                  {job.department || "General"}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  ID: #{job.id}
                                </span>
                              </div>
                            </div>

                            {job.status === "CLOSED" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border border-amber-200 bg-amber-50 text-amber-800">
                                Closed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>Active</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-slate-900 group-hover:text-[#2196F3] transition-colors line-clamp-1 leading-snug">
                            {job.title}
                          </h3>

                          <div className="text-xs text-slate-500 truncate">
                            {job.location || "Makati City"} &bull; {job.employment_type || "Full time"}
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {job.description}
                          </p>
                        </div>

                        {/* Bottom Stats Mini Bar + Actions */}
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Applicants</div>
                              <div className="font-mono font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                                {jobApps.length}
                              </div>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="text-[10px] text-emerald-700 uppercase tracking-wider font-semibold">Top Match</div>
                              <div className="font-mono font-bold text-emerald-600 text-sm mt-0.5 tabular-nums">
                                {topScore !== null ? `${topScore}%` : "-"}
                              </div>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Avg Score</div>
                              <div className="font-mono font-bold text-slate-700 text-sm mt-0.5 tabular-nums">
                                {avgScore !== null ? `${avgScore}%` : "-"}
                              </div>
                            </div>
                          </div>

                          {/* Action Links & Lifecycle Controls */}
                          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-[#2196F3] group-hover:text-[#1976D2] transition-colors">
                              Candidate Roster &rarr;
                            </span>

                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {job.status === "CLOSED" ? (
                                <button
                                  type="button"
                                  title="Reopen position"
                                  aria-label={`Reopen ${job.title}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionJob(job);
                                    setActionModalType("reopen");
                                  }}
                                  className="h-7 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer transition-colors"
                                >
                                  Reopen
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="Close position"
                                  aria-label={`Close ${job.title}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionJob(job);
                                    setActionModalType("close");
                                  }}
                                  className="h-7 px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 rounded-lg border border-amber-200 cursor-pointer transition-colors"
                                >
                                  Close
                                </button>
                              )}

                              <button
                                type="button"
                                title="Archive requisition"
                                aria-label={`Archive ${job.title}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionJob(job);
                                  setActionModalType("archive");
                                }}
                                className="h-7 px-2.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                              >
                                Archive
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* DENSE HR DATA TABLE: For high-volume requisition audits */
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-slate-700">Requisition</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700">Department</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700">Location &amp; Type</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-center">Applicants</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-center">Top Match</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-center">Avg Match</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-center">Status</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(jobTab === "ACTIVE" ? activeJobs : closedJobs).map((job) => {
                        const jobApps = applications.filter((a) => a.job === job.id || a.job_title === job.title);
                        const scores = jobApps
                          .map((a) => a.match_result?.match_score)
                          .filter((s): s is number => typeof s === "number");
                        const topScore = scores.length > 0 ? Math.max(...scores) : null;
                        const avgScore =
                          scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                        const monogram = getDepartmentMonogram(job.department, job.title);

                        return (
                          <TableRow
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                          >
                            <TableCell className="font-semibold text-slate-900 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#2196F3] font-bold text-xs flex items-center justify-center border border-blue-100 shrink-0">
                                  {monogram}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-900">{job.title}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">ID: #{job.id}</div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-xs font-medium text-slate-700">
                              {job.department || "Operations"}
                            </TableCell>

                            <TableCell className="text-xs text-slate-600">
                              {job.location} &bull; {job.employment_type}
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold text-slate-900 text-xs tabular-nums">
                              {jobApps.length}
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold text-emerald-600 text-xs tabular-nums">
                              {topScore !== null ? `${topScore}%` : "-"}
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold text-slate-700 text-xs tabular-nums">
                              {avgScore !== null ? `${avgScore}%` : "-"}
                            </TableCell>

                            <TableCell className="text-center">
                              {job.status === "CLOSED" ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-amber-200 bg-amber-50 text-amber-800">
                                  Closed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                                  Active
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedJob(job)}
                                  className="h-8 text-xs font-semibold text-[#2196F3] hover:bg-blue-50"
                                >
                                  Review
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* ARCHIVED TAB */}
          {jobTab === "ARCHIVED" && (
            <div>
              {archivedLoading ? (
                <div className="text-center py-12 text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2196F3]" />
                  <span className="text-xs font-mono">Loading archived requisitions...</span>
                </div>
              ) : archivedJobs.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="text-sm font-semibold text-slate-900">No archived requisitions</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Requisitions moved to archive are safely kept here for compliance auditing and historical reference.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-slate-700">Position &amp; Department</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700">Location</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-center">Archived Date</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedJobs.map((aj) => (
                        <TableRow key={aj.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-semibold text-slate-900 text-sm">
                            <div>{aj.title}</div>
                            <div className="text-xs text-slate-500 font-normal">{aj.department}</div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{aj.location || "N/A"}</TableCell>
                          <TableCell className="text-center text-xs text-slate-500 font-mono">
                            {new Date(aj.archived_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreArchivedJob(aj)}
                                disabled={isActionLoading}
                                className="h-8 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
                              >
                                Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setActionArchivedJob(aj);
                                  setActionModalType("delete_archived");
                                }}
                                disabled={isActionLoading}
                                className="h-8 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Global Cross-Job Candidate Directory */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                All Received Candidate Applications
              </h2>
              {anonymize && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#1976D2] border border-blue-100">
                  Demographics Masked
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Cross-job applicant repository with instant AI match verification and candidate contact info.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate, email, job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#2196F3] focus:ring-4 focus:ring-[#2196F3]/15 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700 w-[120px]">Candidate ID</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Applicant &amp; Contact</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Applied Position</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center w-[140px]">AI Match Score</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center w-[140px]">Status</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right w-[140px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const filtered = applications.filter((app) => {
                  const q = searchQuery.toLowerCase();
                  return (
                    (app.applicant_name && app.applicant_name.toLowerCase().includes(q)) ||
                    (app.candidate_code && app.candidate_code.toLowerCase().includes(q)) ||
                    (app.job_title && app.job_title.toLowerCase().includes(q)) ||
                    (app.email && app.email.toLowerCase().includes(q)) ||
                    (app.phone && app.phone.includes(q))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                        {searchQuery
                          ? `No applicants found matching "${searchQuery}".`
                          : "No applications recorded yet."}
                      </TableCell>
                    </TableRow>
                  );
                }

                return filtered.map((app) => {
                  const score = app.match_result?.match_score || 0;
                  return (
                    <TableRow
                      key={app.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer hover:bg-blue-50/30 transition-colors focus-visible:outline-none focus-visible:bg-blue-50/50"
                      onClick={() => openAnalysis(app)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openAnalysis(app);
                        }
                      }}
                    >
                      <TableCell className="font-mono font-bold text-[#1976D2] text-xs">
                        {app.candidate_code}
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-slate-900 text-sm">
                          {anonymize ? "Demographics Masked" : app.applicant_name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 flex flex-wrap gap-2">
                          <span>{anonymize ? "hidden@email.com" : app.email}</span>
                          {app.phone && <span>&bull; {anonymize ? "+63 ••• ••• ••••" : app.phone}</span>}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">{app.job_title}</div>
                        <div className="text-xs text-slate-500">{app.job_department}</div>
                      </TableCell>

                      <TableCell className="text-center">
                        {app.match_result ? (
                          <span
                            className={`inline-block font-mono font-bold text-xs px-2.5 py-1 rounded-lg border tabular-nums ${
                              score >= 85
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : score >= 70
                                ? "bg-blue-50 text-[#1976D2] border-blue-200"
                                : score >= 50
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {score}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">Processing...</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg border ${getStatusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                      </TableCell>

                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAnalysis(app)}
                          className="text-xs font-semibold h-8 px-3 rounded-lg border-blue-200 bg-blue-50/50 hover:bg-[#2196F3] hover:text-white hover:border-[#2196F3] text-[#1976D2] cursor-pointer transition-all"
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modals */}
      <CreateJobModal
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        onJobCreated={onJobCreated}
      />

      <CandidateAnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        application={selectedApplication}
        anonymize={anonymize}
        onStatusUpdated={onApplicationUpdated}
      />

      <ConfirmJobActionModal
        isOpen={actionModalType !== null}
        onClose={() => {
          setActionModalType(null);
          setActionJob(null);
          setActionArchivedJob(null);
        }}
        onConfirm={handleConfirmAction}
        actionType={actionModalType}
        jobTitle={actionJob?.title || actionArchivedJob?.title || ""}
        isLoading={isActionLoading}
      />
    </div>
  );
}
