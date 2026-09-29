"use client";

import React, { useState } from "react";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { Search, MapPin, Briefcase, Clock, Sparkles, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { ApplyModal } from "./ApplyModal";

interface ApplicantPortalProps {
  jobs: Job[];
  applications: Application[];
  onApplicationCreated: (app: Application) => void;
}

export function ApplicantPortal({ jobs, applications, onApplicationCreated }: ApplicantPortalProps) {
  const [activeTab, setActiveTab] = useState<"JOBS" | "MY_APPLICATIONS">("JOBS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  const filteredJobs = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.required_skills && j.required_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const openApply = (job: Job) => {
    setSelectedJob(job);
    setIsApplyOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-8">
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("JOBS")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "JOBS"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Explore Open Positions ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab("MY_APPLICATIONS")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "MY_APPLICATIONS"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>My Applications</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {applications.length}
            </span>
          </button>
        </div>

        {activeTab === "JOBS" && (
          <div className="relative w-64 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, department, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        )}
      </div>

      {/* JOBS TAB */}
      {activeTab === "JOBS" && (
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
              <Briefcase className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-300">No matching positions found</div>
              <p className="text-xs text-slate-500 mt-1">Try refining your search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-6 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-indigo-500/5 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {job.department}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {job.applicant_count || 0} applicants
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                      {job.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Metadata items */}
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>{job.minimum_experience}</span>
                      </div>
                    </div>

                    {/* Required Skills tags */}
                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800/60">
                        <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5">
                          Required Skills
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {job.required_skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[11px] text-slate-300 border border-slate-700/60"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{job.employment_type}</span>
                    <button
                      onClick={() => openApply(job)}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/30 transition group-hover:translate-x-0.5"
                    >
                      <span>Apply Now</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MY APPLICATIONS TAB */}
      {activeTab === "MY_APPLICATIONS" && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
              <FileText className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-300">No applications submitted yet</div>
              <p className="text-xs text-slate-500 mt-1">Browse open positions and submit a resume to test the workflow.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {app.candidate_code}
                      </span>
                      <span className="text-xs text-slate-500">·</span>
                      <h4 className="text-sm font-bold text-white">{app.job_title}</h4>
                      <span className="text-xs text-slate-400">({app.job_department})</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Applicant: <strong className="text-slate-200">{app.applicant_name}</strong></span>
                      <span>Email: <strong className="text-slate-200">{app.email}</strong></span>
                      <span>Applied: {new Date(app.applied_at).toLocaleDateString()}</span>
                    </div>

                    {app.resume && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                        <FileText className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Resume: {app.resume.original_filename}</span>
                        {app.resume.file_url && (
                          <a
                            href={app.resume.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline text-[11px]"
                          >
                            [View File]
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col md:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Status:</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
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
                    </div>

                    {app.match_result && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Screening Match:</span>
                        <strong className="text-indigo-400 font-mono">
                          {app.match_result.match_score}%
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply Modal */}
      <ApplyModal
        job={selectedJob}
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        onSuccess={(app) => {
          onApplicationCreated(app);
          setActiveTab("MY_APPLICATIONS");
        }}
      />
    </div>
  );
}
