"use client";

import React, { useState } from "react";
import { Job } from "@/types/job";
import { Application, ApplicationStatus } from "@/types/application";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Clock,
  GraduationCap,
  Sparkles,
  Search,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Trophy,
  Users,
  ShieldCheck,
  User,
  Download,
  Filter,
  ArrowUpDown,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { CandidateAnalysisModal } from "./CandidateAnalysisModal";
import { fetchApi } from "@/lib/api";

interface JobProfileViewProps {
  job: Job;
  applications: Application[];
  anonymize: boolean;
  onBack: () => void;
  onApplicationUpdated: (updatedApp: Application) => void;
}

export function JobProfileView({
  job,
  applications,
  anonymize,
  onBack,
  onApplicationUpdated,
}: JobProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"rankings" | "all">("rankings");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Filter applications for this specific job
  const jobApplications = applications.filter((app) => app.job === job.id || app.job_title === job.title);

  // Compute metrics
  const totalCount = jobApplications.length;
  const shortlistedCount = jobApplications.filter((a) => a.status === "SHORTLISTED").length;
  const underReviewCount = jobApplications.filter(
    (a) => a.status === "UNDER_REVIEW" || a.status === "SUBMITTED" || a.status === "PROCESSING"
  ).length;

  const validScores = jobApplications
    .map((a) => a.match_result?.match_score)
    .filter((s): s is number => typeof s === "number");
  const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  const topScore = validScores.length > 0 ? Math.max(...validScores) : 0;

  // Filtered and Sorted Applicants
  const filteredApps = jobApplications.filter((app) => {
    const matchesSearch =
      (app.applicant_name && app.applicant_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.candidate_code && app.candidate_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.email && app.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.phone && app.phone.includes(searchQuery));
    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // AI Leaderboard: sorted strictly descending by match score
  const rankedApplicants = [...filteredApps].sort((a, b) => {
    const scoreA = a.match_result?.match_score ?? -1;
    const scoreB = b.match_result?.match_score ?? -1;
    return scoreB - scoreA;
  });

  // All Applicants: sorted by application date descending
  const rosterApplicants = [...filteredApps].sort((a, b) => {
    return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
  });

  const handleQuickStatusChange = async (app: Application, newStatus: ApplicationStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdatingId(app.id);
    try {
      const updated = await fetchApi<Application>(`/applications/${app.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      onApplicationUpdated(updated);
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const openAnalysis = (app: Application) => {
    setSelectedApplication(app);
    setIsAnalysisOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Job Header */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition group shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to All Jobs</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Job Profile
            </span>
            {anonymize && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Blind Screening Active
              </span>
            )}
          </div>
        </div>

        {/* Job Title & Meta Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {job.department}
              </span>
              <span className="text-xs text-slate-400">· Posted {new Date(job.created_at).toLocaleDateString()}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {job.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                {job.location} ({job.employment_type})
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-teal-400" />
                Experience: {job.minimum_experience}
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-violet-400" />
                Education: {job.education_requirement}
              </span>
            </div>
          </div>

          {/* Quick Metrics Badge Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-center p-2 rounded-lg bg-slate-900/50">
              <div className="text-[11px] text-slate-400 font-medium">Total Applicants</div>
              <div className="text-xl font-extrabold text-white font-mono mt-0.5">{totalCount}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-900/50">
              <div className="text-[11px] text-emerald-400 font-medium">Top Match</div>
              <div className="text-xl font-extrabold text-emerald-300 font-mono mt-0.5">{topScore}%</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-900/50">
              <div className="text-[11px] text-sky-400 font-medium">Avg Score</div>
              <div className="text-xl font-extrabold text-sky-300 font-mono mt-0.5">{avgScore}%</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-900/50">
              <div className="text-[11px] text-violet-400 font-medium">Shortlisted</div>
              <div className="text-xl font-extrabold text-violet-300 font-mono mt-0.5">{shortlistedCount}</div>
            </div>
          </div>
        </div>

        {/* Job Specifications & Requirements Collapse/Expand */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4 text-xs">
          <div>
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              Job Description & Responsibilities:
            </span>
            <p className="text-slate-300 leading-relaxed mt-1 whitespace-pre-line">
              {job.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <span className="font-semibold text-indigo-300 uppercase tracking-wider text-[11px] flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                Required Skills & Licensure:
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.required_skills && job.required_skills.length > 0 ? (
                  job.required_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-200 border border-indigo-500/30 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">None specified</span>
                )}
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                Preferred Skills:
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.preferred_skills && job.preferred_skills.length > 0 ? (
                  job.preferred_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">None specified</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Section Header & Tab Controls */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 w-fit">
            <button
              onClick={() => setActiveTab("rankings")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "rankings"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Trophy className="h-4 w-4 text-amber-300" />
              <span>AI Applicant Rankings</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-white text-[10px]">
                {jobApplications.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "all"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4 text-sky-400" />
              <span>All Applicants Roster</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                {jobApplications.length}
              </span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="REJECTED">Rejected</option>
                <option value="SUBMITTED">Submitted</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, phone, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* TAB 1: AI APPLICANT RANKINGS LEADERBOARD */}
        {activeTab === "rankings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Ranked by <strong>Multi-Industry AI Scoring Model</strong> (40% Experience, 35% Skills, 15% Semantic, 10% Education)
              </span>
              <span className="font-mono text-indigo-400">Total: {rankedApplicants.length}</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 text-center w-12">Rank</th>
                    <th className="px-4 py-3.5">Candidate Details & Contact</th>
                    <th className="px-4 py-3.5">AI Match Score</th>
                    <th className="px-4 py-3.5">Score Breakdown (PH Weights)</th>
                    <th className="px-4 py-3.5">Key Skills Matched</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {rankedApplicants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        No applicants found matching this criteria.
                      </td>
                    </tr>
                  ) : (
                    rankedApplicants.map((app, index) => {
                      const score = app.match_result?.match_score ?? 0;
                      const isTop3 = index < 3 && score > 0;
                      return (
                        <tr
                          key={app.id}
                          className="hover:bg-slate-800/30 transition cursor-pointer"
                          onClick={() => openAnalysis(app)}
                        >
                          {/* Rank Icon */}
                          <td className="px-4 py-3.5 text-center font-mono font-bold">
                            {index === 0 && score > 0 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/20 text-amber-300 text-sm">
                                🥇
                              </span>
                            ) : index === 1 && score > 0 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300/20 text-slate-200 text-sm">
                                🥈
                              </span>
                            ) : index === 2 && score > 0 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/20 text-amber-500 text-sm">
                                🥉
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">#{index + 1}</span>
                            )}
                          </td>

                          {/* Candidate Name & Contact */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-400">
                                {app.candidate_code}
                              </span>
                              {isTop3 && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold">
                                  Top Match
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-200 mt-0.5">
                              {anonymize ? "Demographics Masked" : app.applicant_name}
                            </div>
                            <div className="text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                              <span className="flex items-center gap-1 text-slate-300">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {anonymize ? "hidden@applicant.privacy" : app.email}
                              </span>
                              {app.phone && (
                                <span className="flex items-center gap-1 text-slate-300">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {anonymize ? "+63 ••• ••• ••••" : app.phone}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* AI Match Score */}
                          <td className="px-4 py-3.5">
                            {app.match_result ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border ${
                                      score >= 80
                                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                        : score >= 60
                                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                        : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                    }`}
                                  >
                                    {score}%
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {score >= 80
                                      ? "High Fit"
                                      : score >= 60
                                      ? "Moderate"
                                      : score === 0
                                      ? "Ineligible"
                                      : "Low Fit"}
                                  </span>
                                </div>
                                <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1.5">
                                  <div
                                    className={`h-full rounded-full ${
                                      score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Processing...</span>
                            )}
                          </td>

                          {/* Score Breakdown (Exp Duties, Exp Tenure, Skills, Edu) */}
                          <td className="px-4 py-3.5">
                            {app.match_result ? (
                              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono">
                                <span className="text-sky-400">
                                  Duties (35%): {app.match_result.semantic_match_score}%
                                </span>
                                <span className="text-teal-400">
                                  Tenure (25%): {app.match_result.experience_match_score}%
                                </span>
                                <span className="text-indigo-400">
                                  Skills (25%): {app.match_result.skill_match_score}%
                                </span>
                                <span className="text-violet-400">
                                  Edu (15%): {app.match_result.education_match_score}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          {/* Skills Matched */}
                          <td className="px-4 py-3.5">
                            {app.match_result ? (
                              <div className="space-y-1">
                                <div className="text-xs text-slate-300">
                                  <span className="text-emerald-400 font-bold">
                                    {app.match_result.matched_skills.length}
                                  </span>{" "}
                                  matched
                                  {app.match_result.missing_skills.length > 0 && (
                                    <span className="text-slate-500 text-[11px] ml-1">
                                      ({app.match_result.missing_skills.length} missing)
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {app.match_result.matched_skills.slice(0, 2).map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 text-[10px]"
                                    >
                                      ✓ {s}
                                    </span>
                                  ))}
                                  {app.match_result.matched_skills.length > 2 && (
                                    <span className="text-[10px] text-slate-500">
                                      +{app.match_result.matched_skills.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          {/* Status */}
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

                          {/* Action Button */}
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openAnalysis(app)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 border border-indigo-500/30 transition shadow-sm"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                              <span>View Insights</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ALL APPLICANTS DIRECTORY ROSTER */}
        {activeTab === "all" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Chronological list of all received candidate submissions.</span>
              <span className="font-mono text-indigo-400">Total: {rosterApplicants.length}</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Candidate ID</th>
                    <th className="px-4 py-3.5">Applicant Full Name</th>
                    <th className="px-4 py-3.5">Email Address</th>
                    <th className="px-4 py-3.5">Contact Number</th>
                    <th className="px-4 py-3.5">Experience</th>
                    <th className="px-4 py-3.5">Applied Date</th>
                    <th className="px-4 py-3.5">Status & Decision</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {rosterApplicants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-500">
                        No applications recorded yet.
                      </td>
                    </tr>
                  ) : (
                    rosterApplicants.map((app) => {
                      const expYears = app.resume?.extracted_experience_years;
                      return (
                        <tr
                          key={app.id}
                          className="hover:bg-slate-800/30 transition cursor-pointer"
                          onClick={() => openAnalysis(app)}
                        >
                          {/* Candidate Code */}
                          <td className="px-4 py-3.5 font-mono font-bold text-indigo-400">
                            {app.candidate_code}
                          </td>

                          {/* Applicant Name */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-200">
                              {anonymize ? "Demographics Masked" : app.applicant_name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {app.match_result ? `Match: ${app.match_result.match_score}%` : "Pending match"}
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3.5">
                            {anonymize ? (
                              <span className="text-slate-500">hidden@applicant.privacy</span>
                            ) : (
                              <a
                                href={`mailto:${app.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-300 hover:text-indigo-400 flex items-center gap-1.5 transition"
                              >
                                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{app.email}</span>
                              </a>
                            )}
                          </td>

                          {/* Contact Number */}
                          <td className="px-4 py-3.5">
                            {anonymize ? (
                              <span className="text-slate-500">+63 ••• ••• ••••</span>
                            ) : app.phone ? (
                              <a
                                href={`tel:${app.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-300 hover:text-teal-400 flex items-center gap-1.5 transition"
                              >
                                <Phone className="h-3 w-3 text-teal-400 shrink-0" />
                                <span>{app.phone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-500">Not provided</span>
                            )}
                          </td>

                          {/* Extracted Experience */}
                          <td className="px-4 py-3.5 text-slate-300">
                            {expYears !== undefined && expYears !== null ? (
                              expYears === 0 ? (
                                <span className="text-slate-400">Fresh Grad (0 yrs)</span>
                              ) : (
                                <span className="font-mono text-teal-300">{expYears} yrs</span>
                              )
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          {/* Applied Date */}
                          <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                            {new Date(app.applied_at).toLocaleDateString()}{" "}
                            <span className="text-slate-500">
                              {new Date(app.applied_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>

                          {/* Quick Decision Changer */}
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => handleQuickStatusChange(app, "SHORTLISTED", e)}
                                disabled={updatingId === app.id}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                  app.status === "SHORTLISTED"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                                }`}
                              >
                                Shortlist
                              </button>
                              <button
                                onClick={(e) => handleQuickStatusChange(app, "UNDER_REVIEW", e)}
                                disabled={updatingId === app.id}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                  app.status === "UNDER_REVIEW"
                                    ? "bg-sky-600 text-white"
                                    : "bg-slate-800 text-slate-400 hover:bg-sky-500/20 hover:text-sky-300"
                                }`}
                              >
                                Review
                              </button>
                              <button
                                onClick={(e) => handleQuickStatusChange(app, "REJECTED", e)}
                                disabled={updatingId === app.id}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                  app.status === "REJECTED"
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                                }`}
                              >
                                Reject
                              </button>
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openAnalysis(app)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-700/60 transition"
                            >
                              <FileText className="h-3.5 w-3.5 text-indigo-400" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Analysis Modal */}
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
