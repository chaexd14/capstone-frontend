"use client";

import React from "react";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Lock,
  MapPin,
} from "lucide-react";
import { Job } from "@/types/job";
import { formatSalary } from "@/lib/salary";
import { getJobOverview, truncateJobOverview } from "@/lib/job-overview";
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
  const summary = truncateJobOverview(getJobOverview(job), 170);
  const location = job.location?.trim() || "Location not specified";
  const employmentType = job.employment_type?.trim() || "Employment type not specified";
  const experience = job.minimum_experience?.trim() || "Experience not specified";
  const hasDisclosedSalary = job.salary_min != null && job.salary_max != null;
  const isClosed = job.status === "CLOSED";

  return (
    <Card className="group relative flex h-full flex-col shadow-sm transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="min-w-0 flex-1 text-xl leading-snug sm:text-2xl">
            <Button
              type="button"
              variant="link"
              onClick={() => onOpenDetails(job)}
              className="h-auto p-0 text-left text-xl font-bold leading-snug tracking-[-0.02em] whitespace-normal text-card-foreground hover:no-underline after:absolute after:inset-0 after:rounded-2xl group-hover:text-primary sm:text-2xl"
              title={job.title}
            >
              <span className="line-clamp-2 text-balance">{job.title}</span>
            </Button>
          </CardTitle>

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
              "relative z-10 shrink-0 rounded-xl",
              isBookmarked
                ? "bg-secondary text-primary ring-1 ring-primary/30"
                : "text-muted-foreground hover:bg-secondary hover:text-primary"
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

      <CardContent className="flex-1 space-y-3.5 px-5 pt-0 pb-4 sm:px-6">
        <p
          className={cn(
            "tracking-[-0.02em] tabular-nums",
            hasDisclosedSalary
              ? "text-xl font-extrabold text-primary"
              : "text-base font-semibold text-muted-foreground"
          )}
        >
          {salary}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{location}</span>
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "rounded-lg border-transparent px-2.5 py-1 font-semibold",
              !job.employment_type && "bg-muted text-muted-foreground"
            )}
          >
            {employmentType}
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              "rounded-lg border-transparent px-2.5 py-1 font-semibold",
              !job.minimum_experience && "bg-muted text-muted-foreground"
            )}
          >
            {experience}
          </Badge>
        </div>

        <p className="line-clamp-2 max-w-[65ch] text-pretty text-sm leading-6 text-muted-foreground">
          {summary}
        </p>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-2 px-5 pt-0 pb-5 sm:px-6 sm:pb-6">
        {isApplied ? (
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={onViewApplications}
            className="relative z-10"
          >
            <CheckCircle2 aria-hidden="true" />
            <span>Applied</span>
          </Button>
        ) : isClosed ? (
          <StatusBadge status="warning" className="relative z-10">
            <Lock className="size-3.5" aria-hidden="true" />
            <span>Closed</span>
          </StatusBadge>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => onApply(job)}
            className="relative z-10"
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
          className="relative z-10"
        >
          Details
        </Button>
      </CardFooter>
    </Card>
  );
}
