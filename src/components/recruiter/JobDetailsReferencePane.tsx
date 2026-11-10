"use client";

import React, { useState, useEffect } from "react";
import {
  Briefcase,
  MapPin,
  Clock,
  GraduationCap,
  CheckCircle2,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface JobDetailsReferencePaneProps {
  application: Application;
  job?: Job | null;
}
export function JobDetailsReferencePane({
  application,
  job: propJob,
}: JobDetailsReferencePaneProps) {
  const [fetchedState, setFetchedState] = useState<{
    jobId: number | null;
    job: Job | null;
    error: boolean;
  }>({
    jobId: null,
    job: null,
    error: false,
  });

  const targetJobId = application.job;
  const resolvedJob =
    propJob && propJob.id === targetJobId
      ? propJob
      : fetchedState.jobId === targetJobId
      ? fetchedState.job
      : null;

  const isLoading =
    !resolvedJob &&
    Boolean(targetJobId) &&
    fetchedState.jobId !== targetJobId;

  useEffect(() => {
    if (propJob && propJob.id === targetJobId) {
      return;
    }
    if (!targetJobId) {
      return;
    }

    let active = true;
    fetchApi<Job>(`/jobs/${targetJobId}/`)
      .then((data) => {
        if (active) {
          setFetchedState({ jobId: targetJobId, job: data, error: false });
        }
      })
      .catch(() => {
        if (active) {
          setFetchedState({ jobId: targetJobId, job: null, error: true });
        }
      });

    return () => {
      active = false;
    };
  }, [propJob, targetJobId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-2.5">
        <Loader2 className="w-6 h-6 animate-spin text-[#2196F3]" />
        <span className="text-xs font-medium text-slate-600">
          Loading job requisition details...
        </span>
      </div>
    );
  }

  const title = resolvedJob?.title || application.job_title || "Job Requisition";
  const department =
    resolvedJob?.department || application.job_department || "Operations";
  const location =
    resolvedJob?.location || application.job_location || "Remote / On-site";
  const employmentType = resolvedJob?.employment_type || "Full time";
  const minExperience = resolvedJob?.minimum_experience || "Any";
  const educationReq = resolvedJob?.education_requirement || "Degree";
  const description = resolvedJob?.description || "";
  const requiredSkills = resolvedJob?.required_skills || [];
  const preferredSkills = resolvedJob?.preferred_skills || [];
  const weights = resolvedJob?.rubric_weights;

  const matchedSkillsLower = new Set(
    (application.match_result?.matched_skills || []).map((s) => s.toLowerCase())
  );

  return (
    <div className="space-y-4 text-slate-900 font-sans">
      {/* 1. Job Requisition Header Summary */}
      <div className="p-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs text-[#1976D2] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/80 tabular-nums">
                JOB #{resolvedJob?.id ?? application.job}
              </span>
              <Badge
                variant="outline"
                className="text-xs font-semibold border-slate-200 text-slate-700 bg-slate-50"
              >
                {department}
              </Badge>
              {resolvedJob?.status === "CLOSED" ? (
                <Badge
                  variant="outline"
                  className="text-xs font-semibold border-amber-200 text-amber-800 bg-amber-50"
                >
                  Closed
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs font-semibold border-emerald-200 text-emerald-800 bg-emerald-50"
                >
                  Active Requisition
                </Badge>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug pt-0.5">
              {title}
            </h3>
          </div>

          {resolvedJob?.created_at && (
            <span className="text-xs text-slate-400 font-mono tabular-nums shrink-0">
              Posted {new Date(resolvedJob.created_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Core Role Requirements Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
            <MapPin className="w-4 h-4 text-[#2196F3] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate">{location}</div>
              <div className="text-slate-500">{employmentType}</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
            <Clock className="w-4 h-4 text-[#2196F3] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate">
                {minExperience}
              </div>
              <div className="text-slate-500">Minimum experience</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
            <GraduationCap className="w-4 h-4 text-[#2196F3] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate">
                {educationReq}
              </div>
              <div className="text-slate-500">Education requirement</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Must-Have Qualifications & Licensure */}
      <div className="p-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Must-Have Qualifications &amp; Licensure
          </h4>
          <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
            {requiredSkills.length} Required
          </span>
        </div>

        {requiredSkills.length > 0 ? (
          <ul className="space-y-2">
            {requiredSkills.map((skill, idx) => {
              const isMatched = matchedSkillsLower.has(skill.toLowerCase());
              return (
                <li
                  key={idx}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-[#1976D2] text-[11px] mt-0.5 tabular-nums shrink-0">
                      {String(idx + 1).padStart(2, "0")}.
                    </span>
                    <span className="font-semibold text-slate-800 leading-relaxed break-words">
                      {skill}
                    </span>
                  </div>

                  {isMatched && (
                    <Badge
                      variant="success"
                      className="text-[10px] py-0 px-2 shrink-0 gap-1 font-semibold"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Matched</span>
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">
            No specific must-have qualifications listed for this requisition.
          </p>
        )}
      </div>

      {/* 3. Preferred Qualifications & Bonus Assets */}
      <div className="p-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Preferred Qualifications &amp; Bonus Assets
          </h4>
          <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
            {preferredSkills.length} Preferred
          </span>
        </div>

        {preferredSkills.length > 0 ? (
          <ul className="space-y-2">
            {preferredSkills.map((skill, idx) => {
              const isMatched = matchedSkillsLower.has(skill.toLowerCase());
              return (
                <li
                  key={idx}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-slate-400 text-[11px] mt-0.5 tabular-nums shrink-0">
                      +{idx + 1}
                    </span>
                    <span className="font-medium text-slate-700 leading-relaxed break-words">
                      {skill}
                    </span>
                  </div>

                  {isMatched && (
                    <Badge
                      variant="success"
                      className="text-[10px] py-0 px-2 shrink-0 gap-1 font-semibold"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Matched</span>
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">
            No preferred qualifications specified for this requisition.
          </p>
        )}
      </div>

      {/* 4. Job Description & Role Scope */}
      <div className="p-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#2196F3]" />
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Job Description &amp; Scope
          </h4>
        </div>

        {description ? (
          <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">
            {description}
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            No detailed description provided for this requisition.
          </p>
        )}
      </div>

      {/* 5. Calibrated Scoring Rubric Weights */}
      <div className="p-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#2196F3]" />
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Calibrated Scoring Rubric Weights
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {weights ? "Custom Recruiter Weights" : "Default 40/25/15/10/10 Weights"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90">
            <div className="text-[11px] text-slate-600 font-bold">Required</div>
            <div className="font-mono font-extrabold text-base text-[#1976D2] mt-1 tabular-nums">
              {weights?.required_skills ?? 40}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90">
            <div className="text-[11px] text-slate-600 font-bold">Experience</div>
            <div className="font-mono font-extrabold text-base text-slate-900 mt-1 tabular-nums">
              {weights?.experience ?? 25}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90">
            <div className="text-[11px] text-slate-600 font-bold">Education</div>
            <div className="font-mono font-extrabold text-base text-slate-900 mt-1 tabular-nums">
              {weights?.education ?? 15}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90">
            <div className="text-[11px] text-slate-600 font-bold">Preferred</div>
            <div className="font-mono font-extrabold text-base text-slate-900 mt-1 tabular-nums">
              {weights?.preferred_skills ?? 10}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-slate-600 font-bold">Projects</div>
            <div className="font-mono font-extrabold text-base text-slate-900 mt-1 tabular-nums">
              {weights?.projects ?? 10}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
