"use client";

import React, { useState } from "react";
import { Job } from "@/types/job";
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
} from "lucide-react";
import { CreateJobModal } from "./CreateJobModal";
import { CandidateAnalysisModal } from "./CandidateAnalysisModal";
import { JobProfileView } from "./JobProfileView";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  onApplicationUpdated: (app: Application) => void;
}

export function RecruiterPortal({
  jobs,
  applications,
  anonymize,
  onJobCreated,
  onApplicationUpdated,
}: RecruiterPortalProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

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
                {jobs.length} Positions
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Select any role to inspect specifications, candidate roster, and AI ranking leaderboards.
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

        <CardContent className="p-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map((job) => {
              const jobApps = applications.filter((a) => a.job === job.id || a.job_title === job.title);
              const scores = jobApps
                .map((a) => a.match_result?.match_score)
                .filter((s): s is number => typeof s === "number");
              const topScore = scores.length > 0 ? Math.max(...scores) : null;
              const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className="group p-5 rounded-xl border border-border hover:border-foreground/40 transition-all cursor-pointer flex flex-col justify-between space-y-4 bg-background hover:shadow-xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {job.department}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {job.title}
                    </h3>

                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border">
                    {/* Stats Mini Bar */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-muted/60">
                        <div className="text-xs text-muted-foreground">Applicants</div>
                        <div className="font-mono font-bold text-foreground text-sm mt-0.5">{jobApps.length}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/60">
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Top Match</div>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                          {topScore !== null ? `${topScore}%` : "-"}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/60">
                        <div className="text-xs text-muted-foreground">Avg Score</div>
                        <div className="font-mono font-bold text-foreground text-sm mt-0.5">
                          {avgScore !== null ? `${avgScore}%` : "-"}
                        </div>
                      </div>
                    </div>

                    {/* Open Job Profile Link */}
                    <div className="flex items-center justify-between text-primary font-semibold text-xs sm:text-sm pt-1">
                      <span>View Profile & Rankings</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
    </div>
  );
}
