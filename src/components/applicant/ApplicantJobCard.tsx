"use client";

import React from "react";
import { ArrowRight, Bookmark, CheckCircle2, Lock } from "lucide-react";
import { Job } from "@/types/job";
import { formatSalary } from "@/lib/salary";
import { getJobOverview, truncateJobOverview } from "@/lib/job-overview";
import {
  getDepartmentMeta,
  getExperiencePill,
  getRelativeTime,
  getWorkMode,
} from "@/components/landing/LandingJobCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface ApplicantJobCardProps {
  job: Job;
  isBookmarked: boolean;
  isApplied: boolean;
  onOpenDetails: (job: Job) => void;
  onApply: (job: Job) => void;
  onToggleBookmark: (jobId: number, jobTitle: string) => void;
  onViewApplications: () => void;
}

export function ApplicantJobCard({
  job,
  isBookmarked,
  isApplied,
  onOpenDetails,
  onApply,
  onToggleBookmark,
  onViewApplications,
}: ApplicantJobCardProps) {
  const salary = formatSalary(job);
  const timeAgo = getRelativeTime(job.created_at);
  const summary = truncateJobOverview(getJobOverview(job), 170);
  const expPill = getExperiencePill(job);
  const meta = getDepartmentMeta(job);
  const DeptIcon = meta.icon;
  const workMode = getWorkMode(job.location);
  const isClosed = job.status === "CLOSED";
  const allSkills =
    job.required_skills && job.required_skills.length > 0
      ? job.required_skills
      : ["Domain Expertise", "Cross-Functional Execution", "Analytical Problem Solving"];
  const visibleSkills = allSkills.slice(0, 4);
  const extraSkillCount = Math.max(0, allSkills.length - visibleSkills.length);

  return (
    <Card className="relative group rounded-3xl flex flex-col justify-between shadow-[0_8px_24px_rgba(33,150,243,0.07)] hover:shadow-[0_16px_36px_rgba(33,150,243,0.15)] hover:-translate-y-1 transition-[box-shadow,transform] duration-200">
      <div>
        <CardHeader className="p-5 sm:p-6 pb-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
                <DeptIcon className="size-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-bold leading-snug">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => onOpenDetails(job)}
                    className="h-auto p-0 text-left whitespace-normal font-bold text-xl sm:text-2xl leading-snug text-foreground group-hover:text-primary hover:no-underline after:absolute after:inset-0 after:rounded-3xl"
                    title={job.title}
                  >
                    <span className="line-clamp-2">{job.title}</span>
                  </Button>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground font-medium">
                  <span>{job.location || "Makati City, Metro Manila"}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-primary font-semibold">{meta.label}</span>
                </div>
              </div>
            </div>

            <IconButton
              type="button"
              variant={isBookmarked ? "secondary" : "subtle"}
              label={
                isBookmarked
                  ? `Remove bookmark for ${job.title}`
                  : `Bookmark ${job.title}`
              }
              aria-pressed={isBookmarked}
              onClick={() => onToggleBookmark(job.id, job.title)}
              className={cn(
                "relative z-10 rounded-xl shrink-0",
                isBookmarked
                  ? "bg-secondary text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:text-primary hover:bg-secondary"
              )}
            >
              <Bookmark
                className={cn(
                  "size-5 transition-colors",
                  isBookmarked && "fill-primary text-primary"
                )}
                aria-hidden="true"
              />
            </IconButton>
          </div>
        </CardHeader>

        <CardContent className="px-5 sm:px-6 pt-0 pb-4 space-y-3.5">
          {/* Metadata Pills + Bold Tabular Salary */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="rounded-full border-transparent font-semibold">
                {job.employment_type || "Full-Time"}
              </Badge>
              <Badge variant="secondary" className="rounded-full border-transparent font-semibold">
                {workMode}
              </Badge>
              <Badge variant="secondary" className="rounded-full border-transparent font-semibold">
                {expPill}
              </Badge>
            </div>

            <span className="text-base sm:text-lg font-extrabold tracking-tight text-foreground tabular-nums shrink-0">
              {salary}
            </span>
          </div>

          {/* Concise Role Summary */}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 max-w-[65ch]">
            {summary}
          </p>

          {/* Soft Sky-Blue Skill Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleSkills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="rounded-lg border-transparent bg-secondary/75 font-semibold"
              >
                {skill}
              </Badge>
            ))}
            {extraSkillCount > 0 && (
              <Badge
                variant="outline"
                className="rounded-lg text-muted-foreground font-semibold tabular-nums"
              >
                +{extraSkillCount} more
              </Badge>
            )}
          </div>
        </CardContent>
      </div>

      <div>
        <div className="px-5 sm:px-6">
          <Separator />
        </div>
        <CardFooter className="px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 relative z-10">
            {isApplied ? (
              <Button
                type="button"
                variant="success"
                size="sm"
                onClick={onViewApplications}
              >
                <CheckCircle2 aria-hidden="true" />
                <span>Applied</span>
              </Button>
            ) : isClosed ? (
              <StatusBadge status="warning">
                <Lock className="size-3.5" aria-hidden="true" />
                <span>Closed</span>
              </StatusBadge>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => onApply(job)}
              >
                <span>Apply this job</span>
                <ArrowRight
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenDetails(job)}
            >
              Details
            </Button>
          </div>

          <span
            className="text-sm font-semibold text-success shrink-0"
            title={job.created_at ? new Date(job.created_at).toLocaleDateString() : "Posted recently"}
          >
            {timeAgo}
          </span>
        </CardFooter>
      </div>
    </Card>
  );
}
