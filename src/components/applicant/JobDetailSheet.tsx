"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Share2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DetailFact,
  DetailFacts,
  DetailLeadFact,
  DetailSection,
  ReadableList,
} from "@/components/ui/detail-content";
import { IconButton } from "@/components/ui/icon-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/sonner";
import { getJobOverview } from "@/lib/job-overview";
import { cn } from "@/lib/utils";
import { Job } from "@/types/job";

interface JobDetailSheetProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (job: Job) => void;
  hasApplied?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: (jobId: number, jobTitle: string) => void;
  onViewApplication?: () => void;
  salaryRange?: string;
  onNavigateJob?: (direction: "next" | "prev") => void;
  hasPrevJob?: boolean;
  hasNextJob?: boolean;
}

function normalizeLine(value: string) {
  return value
    .trim()
    .replace(/^[-*•\s]+/, "")
    .replace(/\s+/g, " ");
}

function comparisonKey(value: string) {
  return normalizeLine(value).replace(/[.!?]+$/, "").toLocaleLowerCase();
}

function uniqueLines(values: Array<string | null | undefined>) {
  const seen = new Set<string>();

  return values.reduce<string[]>((result, value) => {
    if (!value) return result;
    const line = normalizeLine(value);
    const key = comparisonKey(line);
    if (!line || seen.has(key)) return result;
    seen.add(key);
    result.push(line);
    return result;
  }, []);
}

function parseJobDetails(job: Job) {
  const overview = getJobOverview(job);
  const overviewKey = comparisonKey(overview);
  const descriptionLines = job.description
    ? job.description
        .split(/\r?\n|•|\*\s+/)
        .map(normalizeLine)
        .filter((line) => line.length > 15)
    : [];

  const responsibilities = uniqueLines(descriptionLines).filter((line) => {
    const key = comparisonKey(line);
    return key !== overviewKey && !overviewKey.includes(key) && !key.includes(overviewKey);
  });

  const essentials = uniqueLines([
    job.education_requirement
      ? `Education: ${job.education_requirement}`
      : null,
    ...(job.required_skills ?? []),
  ]);
  const preferred = uniqueLines(job.preferred_skills ?? []);

  return { overview, responsibilities, essentials, preferred };
}

function getStatusLabel(status: Job["status"]) {
  if (status === "CLOSED") return "Closed";
  if (status === "ARCHIVED") return "Archived";
  if (status === "DRAFT") return "Not accepting applications";
  return "Open";
}

export function JobDetailSheet({
  job,
  isOpen,
  onClose,
  onApply,
  hasApplied,
  isBookmarked,
  onToggleBookmark,
  onViewApplication,
  salaryRange = "Salary not disclosed",
  onNavigateJob,
  hasPrevJob = false,
  hasNextJob = false,
}: JobDetailSheetProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen || !job) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }

      if (
        (event.key === "a" || event.key === "A") &&
        job.status === "PUBLISHED" &&
        !hasApplied
      ) {
        event.preventDefault();
        onClose();
        onApply(job);
      } else if (
        (event.key === "b" || event.key === "B") &&
        onToggleBookmark
      ) {
        event.preventDefault();
        onToggleBookmark(job.id, job.title);
      } else if (
        (event.key === "ArrowLeft" || event.key === "k" || event.key === "K") &&
        onNavigateJob &&
        hasPrevJob
      ) {
        event.preventDefault();
        onNavigateJob("prev");
      } else if (
        (event.key === "ArrowRight" || event.key === "j" || event.key === "J") &&
        onNavigateJob &&
        hasNextJob
      ) {
        event.preventDefault();
        onNavigateJob("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hasApplied,
    hasNextJob,
    hasPrevJob,
    isOpen,
    job,
    onApply,
    onClose,
    onNavigateJob,
    onToggleBookmark,
  ]);

  const details = useMemo(
    () =>
      job
        ? parseJobDetails(job)
        : { overview: "", responsibilities: [], essentials: [], preferred: [] },
    [job]
  );

  if (!job) return null;

  const isClosed = job.status !== "PUBLISHED";
  const facts = {
    salary: salaryRange.trim() || "Not specified",
    department: job.department?.trim() || "Not specified",
    location: job.location?.trim() || "Not specified",
    employment: job.employment_type?.trim() || "Not specified",
    experience: job.minimum_experience?.trim() || "Not specified",
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/careers?jobId=${job.id}`;

    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success("Link copied", {
        description: `A direct link to ${job.title} is ready to share.`,
      });
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.info("Share this job", {
        description: url,
      });
    }
  };

  const handleViewApplication = () => {
    onClose();
    onViewApplication?.();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="z-50 flex h-full w-full flex-col gap-0 overflow-hidden border-l border-border bg-card p-0 text-foreground shadow-2xl focus:outline-none sm:max-w-2xl md:max-w-3xl lg:max-w-4xl [&>button:last-child]:hidden"
      >
        <div className="flex shrink-0 items-center justify-end gap-1 border-b border-border bg-card px-4 py-3 sm:px-7">
          {onNavigateJob && (hasPrevJob || hasNextJob) ? (
            <div className="mr-2 flex items-center gap-1 border-r border-border pr-3">
              <IconButton
                type="button"
                variant="ghost"
                size="icon-sm"
                label="Previous job"
                disabled={!hasPrevJob}
                onClick={() => onNavigateJob("prev")}
              >
                <ChevronLeft aria-hidden="true" />
              </IconButton>
              <IconButton
                type="button"
                variant="ghost"
                size="icon-sm"
                label="Next job"
                disabled={!hasNextJob}
                onClick={() => onNavigateJob("next")}
              >
                <ChevronRight aria-hidden="true" />
              </IconButton>
            </div>
          ) : null}

          <IconButton
            type="button"
            variant="ghost"
            size="icon-sm"
            label="Close job details"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-7 selection:bg-primary/15 selection:text-primary sm:px-8 sm:py-9 lg:px-10">
          <SheetHeader className="space-y-5 text-left">
            <div className="max-w-[70ch]">
              <SheetTitle className="text-balance text-3xl font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-4xl">
                {job.title}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Job details and application options for {job.title}
              </SheetDescription>
            </div>

            <DetailLeadFact label="Pay" value={facts.salary} hideLabel />

            <DetailFacts>
              <DetailFact label="Job type" value={facts.department} />
              <DetailFact label="Location" value={facts.location} />
              <DetailFact label="Employment" value={facts.employment} />
              <DetailFact label="Experience" value={facts.experience} />
            </DetailFacts>

            <div className="flex flex-wrap items-center gap-2.5">
              {hasApplied ? (
                <>
                  <StatusBadge status="success">Applied</StatusBadge>
                  {onViewApplication ? (
                    <Button type="button" size="lg" onClick={handleViewApplication}>
                      View application
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  ) : null}
                </>
              ) : isClosed ? (
                <StatusBadge status="warning">
                  <Lock aria-hidden="true" />
                  {getStatusLabel(job.status)}
                </StatusBadge>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    onClose();
                    onApply(job);
                  }}
                >
                  Apply this job
                  <ArrowRight aria-hidden="true" />
                </Button>
              )}

              {onToggleBookmark ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  aria-pressed={isBookmarked}
                  onClick={() => onToggleBookmark(job.id, job.title)}
                  className={cn(
                    isBookmarked && "border-primary/30 bg-secondary text-primary"
                  )}
                >
                  <Bookmark
                    className={cn(isBookmarked && "fill-current")}
                    aria-hidden="true"
                  />
                  {isBookmarked ? "Saved" : "Save"}
                </Button>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleShare}
              >
                {copiedLink ? (
                  <Check className="text-emerald-600" aria-hidden="true" />
                ) : (
                  <Share2 aria-hidden="true" />
                )}
                {copiedLink ? "Link copied" : "Share"}
              </Button>
            </div>

          </SheetHeader>

          <span className="sr-only" aria-live="polite">
            {copiedLink
              ? `Share link for ${job.title} copied to clipboard.`
              : ""}
          </span>

          <div className="mt-4 space-y-8 sm:mt-5 sm:space-y-10">
            <DetailSection title="About the role" className="pt-5 sm:pt-6">
              <p className="max-w-[70ch] whitespace-pre-line text-sm leading-6 text-foreground/85 sm:text-base sm:leading-7">
                {details.overview}
              </p>
            </DetailSection>

            {details.responsibilities.length > 0 ? (
              <DetailSection title="What you’ll do">
                <ReadableList
                  key={`responsibilities-${job.id}`}
                  items={details.responsibilities}
                  initialVisibleCount={6}
                  moreLabel={(count) =>
                    `Show ${count} more responsibilities`
                  }
                  lessLabel="Show fewer responsibilities"
                />
              </DetailSection>
            ) : null}

            {details.essentials.length > 0 ? (
              <DetailSection title="What you need">
                <ReadableList items={details.essentials} />
              </DetailSection>
            ) : null}

            {details.preferred.length > 0 ? (
              <DetailSection
                title="Nice to have"
                description="These are helpful, but you can still apply without every item."
              >
                <ReadableList items={details.preferred} />
              </DetailSection>
            ) : null}

            <DetailSection title="How applications are reviewed">
              <div className="max-w-[70ch] space-y-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                <p>
                  Your application is reviewed against the role’s required skills,
                  relevant experience, education, and examples of your work.
                </p>
                <p>
                  During the first review, recruiters focus on qualifications without
                  seeing personal details such as your name, contact information, age,
                  or school.
                </p>
              </div>
            </DetailSection>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
