"use client";

import React, { useState, useEffect } from "react";
import {
  Briefcase,
  MapPin,
  Clock,
  GraduationCap,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { ErrorState } from "@/components/ui/feedback";
import { MetricSummary } from "@/components/ui/metric-summary";
import { StatusBadge } from "@/components/ui/status-badge";

interface JobDetailsReferencePaneProps {
  application: Application;
  job?: Job | null;
}

export function JobDetailsReferencePane({
  application,
  job: propJob,
}: JobDetailsReferencePaneProps) {
  const [retryKey, setRetryKey] = useState(0);
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

  const hasLoadError =
    !resolvedJob &&
    (!targetJobId ||
      (fetchedState.jobId === targetJobId && fetchedState.error));

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
  }, [propJob, targetJobId, retryKey]);

  if (isLoading) {
    return <ContextualLoading label="Loading job requirements" className="min-h-48" />;
  }

  if (hasLoadError) {
    return (
      <ErrorState
        title="Job details are unavailable"
        description="Candidate information is still available, but job criteria could not be loaded."
        actionLabel={targetJobId ? "Retry job details" : undefined}
        onAction={
          targetJobId
            ? () => {
                setFetchedState({ jobId: null, job: null, error: false });
                setRetryKey((value) => value + 1);
              }
            : undefined
        }
        className="min-h-48 rounded-xl border border-border bg-card"
      />
    );
  }

  const title = resolvedJob?.title || application.job_title || "Job details";
  const department = resolvedJob?.department || application.job_department || "Not specified";
  const location = resolvedJob?.location || application.job_location || "Not specified";
  const employmentType = resolvedJob?.employment_type || "Not specified";
  const minExperience = resolvedJob?.minimum_experience || "Not specified";
  const educationReq = resolvedJob?.education_requirement || "Not specified";
  const description = resolvedJob?.description || "";
  const requiredSkills = resolvedJob?.required_skills || [];
  const preferredSkills = resolvedJob?.preferred_skills || [];
  const weights = resolvedJob?.rubric_weights;

  const matchedSkillsLower = new Set(
    (application.match_result?.matched_skills || []).map((s) => s.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-foreground">
      {/* Requisition Header & Core Specs */}
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="tabular-nums">
                JOB #{resolvedJob?.id ?? application.job}
              </Badge>
              <Badge variant="outline">{department}</Badge>
              {resolvedJob?.status === "CLOSED" ? (
                <StatusBadge status="warning" dot>
                  Closed
                </StatusBadge>
              ) : (
                <StatusBadge status="success" dot>
                  Accepting applications
                </StatusBadge>
              )}
            </div>
            <h4 className="text-base font-bold leading-snug text-foreground sm:text-lg">
              {title}
            </h4>
          </div>

          {resolvedJob?.created_at ? (
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              Posted {new Date(resolvedJob.created_at).toLocaleDateString()}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{location}</p>
              <p className="text-muted-foreground">{employmentType}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{minExperience}</p>
              <p className="text-muted-foreground">Minimum experience</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3">
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{educationReq}</p>
              <p className="text-muted-foreground">Education requirement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Must-Have Qualifications */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-foreground">
            Must-have qualifications &amp; licensure
          </h4>
          <Badge variant="outline" className="tabular-nums">
            {requiredSkills.length} required
          </Badge>
        </div>

        {requiredSkills.length > 0 ? (
          <ul className="divide-y divide-border">
            {requiredSkills.map((skill, idx) => {
              const isMatched = matchedSkillsLower.has(skill.toLowerCase());
              return (
                <li
                  key={idx}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0 text-sm"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 font-bold tabular-nums text-primary">
                      {String(idx + 1).padStart(2, "0")}.
                    </span>
                    <span className="break-words font-medium leading-relaxed text-foreground">
                      {skill}
                    </span>
                  </div>

                  {isMatched ? (
                    <StatusBadge status="success" className="shrink-0">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Matched
                    </StatusBadge>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No required qualifications were added for this job.
          </p>
        )}
      </div>

      {/* Preferred Qualifications */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-foreground">
            Preferred qualifications &amp; bonus assets
          </h4>
          <Badge variant="outline" className="tabular-nums">
            {preferredSkills.length} preferred
          </Badge>
        </div>

        {preferredSkills.length > 0 ? (
          <ul className="divide-y divide-border">
            {preferredSkills.map((skill, idx) => {
              const isMatched = matchedSkillsLower.has(skill.toLowerCase());
              return (
                <li
                  key={idx}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0 text-sm"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 font-semibold tabular-nums text-muted-foreground">
                      +{idx + 1}
                    </span>
                    <span className="break-words leading-relaxed text-foreground">
                      {skill}
                    </span>
                  </div>

                  {isMatched ? (
                    <StatusBadge status="success" className="shrink-0">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Matched
                    </StatusBadge>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No preferred qualifications were added for this job.
          </p>
        )}
      </div>

      {/* Role Description */}
      <div className="space-y-2 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 text-primary" aria-hidden="true" />
          <h4 className="text-sm font-bold text-foreground">Core responsibilities</h4>
        </div>

        {description ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No detailed role description was added.
          </p>
        )}
      </div>

      {/* Rubric Weights */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
            <h4 className="text-sm font-bold text-foreground">How candidates are scored</h4>
          </div>
          <span className="text-sm text-muted-foreground">
            {weights ? "Custom scoring priorities" : "Standard scoring priorities"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-3 sm:grid-cols-5">
          <MetricSummary
            label="Required"
            value={`${weights?.required_skills ?? 40}%`}
            description="Must-haves"
            tone="brand"
          />
          <MetricSummary
            label="Experience"
            value={`${weights?.experience ?? 25}%`}
            description="Tenure fit"
          />
          <MetricSummary
            label="Education"
            value={`${weights?.education ?? 15}%`}
            description="Credentials"
          />
          <MetricSummary
            label="Preferred"
            value={`${weights?.preferred_skills ?? 10}%`}
            description="Bonus skills"
          />
          <MetricSummary
            label="Projects"
            value={`${weights?.projects ?? 10}%`}
            description="Duties"
          />
        </div>
      </div>
    </div>
  );
}
