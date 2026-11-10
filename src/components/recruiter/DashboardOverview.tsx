"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { Button } from "@/components/ui/button";

interface DashboardOverviewProps {
  jobs: Job[];
  applications: Application[];
  anonymize: boolean;
  onSelectApplication: (app: Application) => void;
}

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

export function DashboardOverview({
  jobs,
  applications,
  anonymize,
  onSelectApplication,
}: DashboardOverviewProps) {
  const router = useRouter();

  const activeJobs = jobs.filter(
    (j) => j.status === "PUBLISHED" || (!j.status && j.status !== "CLOSED")
  );
  const closedJobs = jobs.filter((j) => j.status === "CLOSED");
  const inReviewCount = applications.filter(
    (a) => a.status === "UNDER_REVIEW" || a.status === "PROCESSING"
  ).length;
  const shortlistedCount = applications.filter((a) => a.status === "SHORTLISTED").length;

  // Snapshot: top 4 active jobs
  const activeJobsSnapshot = activeJobs.slice(0, 4);

  // Recent 5 applicant submissions
  const recentApplications = [...applications]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
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

  return (
    <div className="space-y-6">
      {/* 1. Global Metrics Strip: Clean Enterprise Typographic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Requisitions */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Active Requisitions
          </span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight tabular-nums">
            {activeJobs.length}
          </div>
          <p className="text-xs text-slate-400">
            {closedJobs.length > 0 ? `${closedJobs.length} closed roles` : "All roles live"}
          </p>
        </div>

        {/* Metric 2: Total Candidates */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Candidates
          </span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight tabular-nums">
            {applications.length}
          </div>
          <p className="text-xs text-slate-400">Screened resumes</p>
        </div>

        {/* Metric 3: In Review */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-1">
          <span className="text-xs font-semibold text-[#1976D2] uppercase tracking-wider block">
            In Review
          </span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-[#2196F3] tracking-tight tabular-nums">
            {inReviewCount}
          </div>
          <p className="text-xs text-slate-400">Active evaluations</p>
        </div>

        {/* Metric 4: Shortlisted */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-1">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
            Shortlisted
          </span>
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-600 tracking-tight tabular-nums">
            {shortlistedCount}
          </div>
          <p className="text-xs text-slate-400">Qualified talent</p>
        </div>
      </div>

      {/* 2. Command Center: Active Requisitions Snapshot & Recent Candidate Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Active Requisitions Snapshot */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Active Requisitions Snapshot
                </h2>
                <p className="text-xs text-slate-500">
                  Top performing requisitions by applicant volume
                </p>
              </div>

              <Link
                href="/admin?view=jobs"
                className="text-xs font-semibold text-[#2196F3] hover:text-[#1976D2] transition-colors"
              >
                View all ({jobs.length}) &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {activeJobsSnapshot.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No active requisitions found. Click &quot;Post New Job&quot; to begin.
                </div>
              ) : (
                activeJobsSnapshot.map((job) => {
                  const jobApps = applications.filter((a) => a.job === job.id);
                  const topScore = jobApps.reduce((max, a) => {
                    const s = a.match_result?.match_score || 0;
                    return s > max ? s : max;
                  }, 0);

                  return (
                    <div
                      key={job.id}
                      onClick={() => router.push(`/admin/jobs/${job.id}`)}
                      className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2196F3] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                          {getDepartmentMonogram(job.department, job.title)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-[#2196F3] transition-colors truncate">
                            {job.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 truncate">
                            {job.department || "Operations"} &bull; {job.location || "Remote"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-slate-800 tabular-nums block">
                            {jobApps.length} candidates
                          </span>
                          <span className="font-mono text-[10px] text-emerald-600 font-semibold block">
                            Top: {topScore > 0 ? `${topScore}%` : "-"}
                          </span>
                        </div>
                        <span className="text-slate-300 group-hover:text-[#2196F3] transition-colors">
                          &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3 sm:px-6 bg-slate-50/50 border-t border-slate-100 text-right">
            <Link
              href="/admin?view=jobs"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Open Requisitions Manager &rarr;
            </Link>
          </div>
        </div>

        {/* Right Column: Recent Candidate Submissions */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Recent Candidate Submissions
                </h2>
                <p className="text-xs text-slate-500">
                  Latest applicant evaluations across all active requisitions
                </p>
              </div>

              <Link
                href="/admin?view=applicants"
                className="text-xs font-semibold text-[#2196F3] hover:text-[#1976D2] transition-colors"
              >
                View all ({applications.length}) &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {recentApplications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No candidate submissions recorded yet.
                </div>
              ) : (
                recentApplications.map((app) => {
                  const score = app.match_result?.match_score || 0;
                  const candidateLabel = anonymize
                    ? app.candidate_code || `Candidate #${app.id}`
                    : app.applicant_name || app.candidate_code || `Candidate #${app.id}`;

                  return (
                    <div
                      key={app.id}
                      onClick={() => onSelectApplication(app)}
                      className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-[#2196F3] transition-colors">
                            {candidateLabel}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(
                              app.status
                            )}`}
                          >
                            {app.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {app.job_title || "General Application"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-mono text-xs font-extrabold text-slate-900 tabular-nums block">
                            {score}%
                          </span>
                          <span className="text-[10px] text-slate-400 block">AI Match</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectApplication(app);
                          }}
                          className="h-7.5 px-3 text-xs font-semibold text-[#1976D2] border-blue-200 bg-blue-50/50 hover:bg-[#2196F3] hover:text-white hover:border-[#2196F3] transition-all rounded-lg cursor-pointer"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3 sm:px-6 bg-slate-50/50 border-t border-slate-100 text-right">
            <Link
              href="/admin?view=applicants"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Open Global Talent Directory &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
