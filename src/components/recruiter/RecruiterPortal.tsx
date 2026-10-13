"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Job, ArchivedJob } from "@/types/job";
import { Application } from "@/types/application";
import {
  Briefcase,
  Users,
  Clock,
  CheckCircle2,
  Plus,
  Sparkles,
  Search,
  ShieldCheck,
  MapPin,
  ChevronRight,
  Layers,
  Lock,
  RotateCcw,
  Archive,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { CreateJobModal } from "./CreateJobModal";
import { CandidateAnalysisModal } from "./CandidateAnalysisModal";
import { JobProfileView } from "./JobProfileView";
import { ConfirmJobActionModal, JobActionType } from "./ConfirmJobActionModal";
import { fetchApi } from "@/lib/api";
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
  onRefreshData,
  onApplicationUpdated,
}: RecruiterPortalProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

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
      void loadArchivedJobs();
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
          setSelectedJob(target);
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
      } else if (actionModalType === "reopen" && actionJob) {
        const updated = await fetchApi<Job>(`/jobs/${actionJob.id}/reopen/`, { method: "POST" });
        if (onJobUpdated) onJobUpdated(updated);
      } else if (actionModalType === "archive" && actionJob) {
        await fetchApi(`/jobs/${actionJob.id}/archive/`, { method: "POST" });
        if (onJobArchived) onJobArchived(actionJob.id);
        void loadArchivedJobs();
      } else if (actionModalType === "delete" && actionJob) {
        await fetchApi(`/jobs/${actionJob.id}/`, { method: "DELETE" });
        if (onJobDeleted) onJobDeleted(actionJob.id);
      } else if (actionModalType === "delete_archived" && actionArchivedJob) {
        await fetchApi(`/archived-jobs/${actionArchivedJob.id}/`, { method: "DELETE" });
        setArchivedJobs((prev) => prev.filter((j) => j.id !== actionArchivedJob.id));
      }
    } catch (err: any) {
      console.error("Action error:", err);
      alert(err.message || "Failed to execute action.");
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
      setJobTab("ACTIVE");
    } catch (err: any) {
      console.error("Failed to restore archived job:", err);
      alert(err.message || "Failed to restore archived job.");
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

  const getStatusBadgeVariant = (status: string): "success" | "destructive" | "info" | "secondary" => {
    switch (status) {
      case "SHORTLISTED":
        return "success";
      case "REJECTED":
        return "destructive";
      case "UNDER_REVIEW":
      case "PROCESSING":
        return "info";
      default:
        return "secondary";
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
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Open Jobs</span>
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-foreground">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-foreground mt-2">{totalJobs}</div>
            <div className="text-xs text-muted-foreground mt-1">Active benchmark roles</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Total Applicants</span>
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-foreground">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-foreground mt-2">{totalApplicants}</div>
            <div className="text-xs text-muted-foreground mt-1">Screened resumes</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">In Review</span>
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-foreground">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-foreground mt-2">{inReviewCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Pending recruiter decision</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Shortlisted</span>
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
              {shortlistedCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Top qualified talent</div>
          </CardContent>
        </Card>
      </div>

      {/* Posted Jobs Section */}
      <Card className="bg-card">
        <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-bold">Posted Job Profiles</CardTitle>
              <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                {jobs.length} Active/Closed Positions
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Manage requisition lifecycles, inspect candidate rosters, and audit AI ranking leaderboards.
            </CardDescription>
          </div>

          <Button
            size="default"
            onClick={() => setIsCreateJobOpen(true)}
            className="gap-2 font-semibold self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Post New Job</span>
          </Button>
        </CardHeader>

        {/* Tab Selector */}
        <div className="px-6 pb-2 border-b border-border flex items-center justify-between gap-4">
          <Tabs value={jobTab} onValueChange={(v) => setJobTab(v as any)}>
            <TabsList>
              <TabsTrigger value="ACTIVE" className="gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Roles</span>
                <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[11px] font-semibold">
                  {activeJobs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="CLOSED" className="gap-2">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span>Closed Positions</span>
                <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[11px] font-semibold">
                  {closedJobs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="ARCHIVED" className="gap-2">
                <Archive className="h-3.5 w-3.5 text-rose-500" />
                <span>Archived Requisitions</span>
                <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[11px] font-semibold">
                  {archivedJobs.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {jobTab === "ARCHIVED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadArchivedJobs}
              disabled={archivedLoading}
              className="gap-1.5 text-xs text-muted-foreground h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${archivedLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          )}
        </div>

        <CardContent className="p-6 pt-4">
          {/* ACTIVE & CLOSED TABS */}
          {(jobTab === "ACTIVE" || jobTab === "CLOSED") && (
            <div>
              {(jobTab === "ACTIVE" ? activeJobs : closedJobs).length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                    {jobTab === "ACTIVE" ? <Briefcase className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    {jobTab === "ACTIVE" ? "No active positions found" : "No closed positions"}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {jobTab === "ACTIVE"
                      ? "Create and publish a new job opening to start receiving and screening candidate resumes."
                      : "Positions closed by recruiters will appear here. Candidates can view closed roles, but cannot submit new applications."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(jobTab === "ACTIVE" ? activeJobs : closedJobs).map((job) => {
                    const jobApps = applications.filter((a) => a.job === job.id || a.job_title === job.title);
                    const scores = jobApps
                      .map((a) => a.match_result?.match_score)
                      .filter((s): s is number => typeof s === "number");
                    const topScore = scores.length > 0 ? Math.max(...scores) : null;
                    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

                    return (
                      <div
                        key={job.id}
                        className="group p-5 rounded-xl border border-border hover:border-foreground/40 transition-all flex flex-col justify-between space-y-4 bg-background hover:shadow-xs"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="text-xs font-semibold">
                              {job.department}
                            </Badge>

                            {job.status === "CLOSED" ? (
                              <Badge variant="outline" className="text-[11px] font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1">
                                <Lock className="h-3 w-3" />
                                <span>Closed</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px] font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active</span>
                              </Badge>
                            )}
                          </div>

                          <h3
                            onClick={() => setSelectedJob(job)}
                            className="text-base sm:text-lg font-bold text-foreground hover:text-primary transition-colors line-clamp-1 cursor-pointer"
                          >
                            {job.title}
                          </h3>

                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <span>{job.location} · {job.employment_type}</span>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {job.description}
                          </p>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-border">
                          {/* Stats Mini Bar */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded-lg bg-muted/60">
                              <div className="text-[11px] text-muted-foreground font-medium">Applicants</div>
                              <div className="font-mono font-bold text-foreground text-sm mt-0.5">{jobApps.length}</div>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/60">
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Top Match</div>
                              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                                {topScore !== null ? `${topScore}%` : "-"}
                              </div>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/60">
                              <div className="text-[11px] text-muted-foreground font-medium">Avg Score</div>
                              <div className="font-mono font-bold text-foreground text-sm mt-0.5">
                                {avgScore !== null ? `${avgScore}%` : "-"}
                              </div>
                            </div>
                          </div>

                          {/* Action Links & Lifecycle Controls */}
                          <div className="flex items-center justify-between pt-1 gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedJob(job)}
                              className="text-primary font-semibold text-xs h-7 px-2 gap-1"
                            >
                              <span>View Profile</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>

                            <div className="flex items-center gap-1">
                              {job.status === "CLOSED" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Reopen position"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionJob(job);
                                    setActionModalType("reopen");
                                  }}
                                  className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Reopen</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Close position"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionJob(job);
                                    setActionModalType("close");
                                  }}
                                  className="h-7 px-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1"
                                >
                                  <Lock className="h-3 w-3" />
                                  <span>Close</span>
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                title="Archive position"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionJob(job);
                                  setActionModalType("archive");
                                }}
                                className="h-7 px-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 gap-1"
                              >
                                <Archive className="h-3 w-3" />
                                <span>Archive</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete position"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionJob(job);
                                  setActionModalType("delete");
                                }}
                                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ARCHIVED TAB */}
          {jobTab === "ARCHIVED" && (
            <div>
              {archivedLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs">Loading archived requisitions...</span>
                </div>
              ) : archivedJobs.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                    <Archive className="h-5 w-5" />
                  </div>
                  <div className="text-base font-semibold text-foreground">No archived jobs</div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    When you archive a role, its applicant records and uploaded resumes are permanently purged,
                    and the role definition is stored here. You can reopen or delete archived roles anytime.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {archivedJobs.map((archivedJob) => (
                    <div
                      key={archivedJob.id}
                      className="p-5 rounded-xl border border-border/70 flex flex-col justify-between space-y-4 bg-muted/15"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-xs font-semibold">
                            {archivedJob.department}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 gap-1">
                            <Archive className="h-3 w-3" />
                            <span>Archived</span>
                          </Badge>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-1">
                          {archivedJob.title}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          <span>{archivedJob.location} · {archivedJob.employment_type}</span>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {archivedJob.description}
                        </p>

                        <div className="text-[11px] text-muted-foreground pt-1 space-y-0.5">
                          <div>
                            Archived on:{" "}
                            <strong className="text-foreground">
                              {new Date(archivedJob.archived_at).toLocaleDateString()}
                            </strong>
                          </div>
                          {archivedJob.original_created_at && (
                            <div>
                              Originally posted:{" "}
                              <span>{new Date(archivedJob.original_created_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => handleRestoreArchivedJob(archivedJob)}
                          className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-semibold gap-1.5 h-8"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reopen to Published</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => {
                            setActionArchivedJob(archivedJob);
                            setActionModalType("delete_archived");
                          }}
                          className="text-xs text-destructive hover:bg-destructive/10 font-semibold gap-1 h-8 px-2.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global Cross-Job Candidate Directory */}
      <Card className="bg-card">
        <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold">All Received Applications</CardTitle>
              {anonymize && (
                <Badge variant="outline" className="text-xs gap-1.5 text-primary py-0.5 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Demographics Masked
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm">
              Cross-job applicant repository with instant AI match verification and candidate contact info.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search candidate, email, job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 text-sm"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Candidate ID</TableHead>
                <TableHead>Applicant & Contact</TableHead>
                <TableHead>Applied Position</TableHead>
                <TableHead className="w-[140px]">AI Match Score</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="text-right w-[140px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications
                .filter((app) => {
                  const q = searchQuery.toLowerCase();
                  return (
                    (app.applicant_name && app.applicant_name.toLowerCase().includes(q)) ||
                    (app.candidate_code && app.candidate_code.toLowerCase().includes(q)) ||
                    (app.job_title && app.job_title.toLowerCase().includes(q)) ||
                    (app.email && app.email.toLowerCase().includes(q)) ||
                    (app.phone && app.phone.includes(q))
                  );
                })
                .map((app) => {
                  const score = app.match_result?.match_score || 0;
                  return (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer"
                      onClick={() => openAnalysis(app)}
                    >
                      <TableCell className="font-mono font-bold text-primary text-sm">
                        {app.candidate_code}
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-foreground text-sm">
                          {anonymize ? "Demographics Masked" : app.applicant_name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                          <span>{anonymize ? "hidden@email.com" : app.email}</span>
                          {app.phone && <span>· {anonymize ? "+63 ••• ••• ••••" : app.phone}</span>}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-foreground text-sm">{app.job_title}</div>
                        <div className="text-xs text-muted-foreground">{app.job_department}</div>
                      </TableCell>

                      <TableCell>
                        {app.match_result ? (
                          <Badge
                            variant={score >= 75 ? "success" : score >= 50 ? "warning" : "secondary"}
                            className="font-mono font-bold text-xs px-2.5 py-1"
                          >
                            {score}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Processing...</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(app.status)} className="text-xs px-2.5 py-1">
                          {app.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAnalysis(app)}
                          className="gap-1.5 text-xs font-semibold"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Analysis</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateJobModal
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        onJobCreated={onJobCreated}
      />

      <CandidateAnalysisModal
        application={selectedApplication}
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
        jobTitle={actionJob?.title || actionArchivedJob?.title || ""}
        applicantCount={
          actionJob
            ? applications.filter((a) => a.job === actionJob.id || a.job_title === actionJob.title).length
            : 0
        }
        isLoading={isActionLoading}
        onConfirm={handleConfirmAction}
        onClose={() => {
          setActionModalType(null);
          setActionJob(null);
          setActionArchivedJob(null);
        }}
      />
    </div>
  );
}
