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
  Filter,
  Eye,
  FileText,
  ShieldCheck,
  Building2,
  MapPin,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
} from "lucide-react";
import { CreateJobModal } from "./CreateJobModal";
import { CandidateAnalysisModal } from "./CandidateAnalysisModal";
import { JobProfileView } from "./JobProfileView";

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Open Jobs</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-2 font-mono">{totalJobs}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active benchmark positions</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Applicants</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-2 font-mono">{totalApplicants}</div>
          <div className="text-[11px] text-slate-500 mt-1">Resumes screened by AI</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Under Review</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-sky-400 mt-2 font-mono">{inReviewCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting decision</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Shortlisted</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-2 font-mono">
            {shortlistedCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Top qualified talent</div>
        </div>
      </div>

      {/* Posted Jobs Section (Job Profile Gallery) */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <span>Posted Job Profiles</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {jobs.length} Positions
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any job below to view its full profile, specifications, applicant roster, and AI ranking leaderboard.
            </p>
          </div>

          <button
            onClick={() => setIsCreateJobOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Post New Job</span>
          </button>
        </div>

        {/* Job Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                className="group p-5 rounded-2xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 shadow-lg hover:shadow-indigo-500/5"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {job.department}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      {job.location}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition line-clamp-1">
                    {job.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/80 text-xs">
                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                      <div className="text-[10px] text-slate-400">Applicants</div>
                      <div className="font-mono font-bold text-white text-sm">{jobApps.length}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                      <div className="text-[10px] text-emerald-400">Top Match</div>
                      <div className="font-mono font-bold text-emerald-300 text-sm">
                        {topScore !== null ? `${topScore}%` : "-"}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                      <div className="text-[10px] text-sky-400">Avg Score</div>
                      <div className="font-mono font-bold text-sky-300 text-sm">
                        {avgScore !== null ? `${avgScore}%` : "-"}
                      </div>
                    </div>
                  </div>

                  {/* Open Job Profile CTA */}
                  <div className="flex items-center justify-between text-indigo-400 group-hover:text-indigo-300 font-semibold text-xs pt-1">
                    <span>View Profile & Rankings</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Cross-Job Candidate Directory */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>All Received Applications</span>
              {anonymize && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Bias Reduced
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive applicant log across all positions with direct contact info and AI match scores.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate, email, job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Global Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Candidate ID</th>
                <th className="px-4 py-3.5">Applicant & Contact</th>
                <th className="px-4 py-3.5">Applied Position</th>
                <th className="px-4 py-3.5">AI Match Score</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
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
                    <tr
                      key={app.id}
                      className="hover:bg-slate-800/30 transition cursor-pointer"
                      onClick={() => openAnalysis(app)}
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-400">
                        {app.candidate_code}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-200">
                          {anonymize ? "Demographics Masked" : app.applicant_name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap gap-2">
                          <span>{anonymize ? "hidden@email.com" : app.email}</span>
                          {app.phone && <span>· {anonymize ? "+63 ••• ••• ••••" : app.phone}</span>}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-200">{app.job_title}</div>
                        <div className="text-[10px] text-slate-500">{app.job_department}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        {app.match_result ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md border ${
                                score >= 80
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : score >= 60
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                              }`}
                            >
                              {score}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Processing...</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            app.status === "SHORTLISTED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : app.status === "UNDER_REVIEW"
                              ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                              : app.status === "REJECTED"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openAnalysis(app)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 border border-slate-700/60 transition shadow-sm"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                          <span>View Analysis</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

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

