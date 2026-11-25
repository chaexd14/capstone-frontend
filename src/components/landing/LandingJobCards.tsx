"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  GraduationCap,
  HardHat,
  Landmark,
  MapPin,
  Stethoscope,
  Terminal,
  TrendingUp,
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface DepartmentMeta {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export function getExperiencePill(job: Job): string {
  if (job.minimum_experience) {
    const exp = job.minimum_experience.toLowerCase();
    if (exp.includes("0-1") || exp.includes("entry") || exp.includes("fresh")) return "1 yr";
    if (exp.includes("1-2") || exp.includes("1 to 2")) return "1-2 yrs";
    if (exp.includes("2-3") || exp.includes("2 to 3") || exp.includes("2")) return "2 yrs";
    if (exp.includes("3-5") || exp.includes("3 to 5") || exp.includes("3")) return "3+ yrs";
    if (exp.includes("5") || exp.includes("senior")) return "5+ yrs";
    return job.minimum_experience;
  }
  return "2 yrs";
}

export function getDepartmentMeta(job: Job): DepartmentMeta {
  const dept = (job.department || "").toLowerCase();
  const title = (job.title || "").toLowerCase();

  if (
    title.includes("python") ||
    title.includes("react") ||
    title.includes("full stack") ||
    title.includes("full-stack") ||
    title.includes("software")
  ) {
    return { icon: Terminal, label: "Software Engineering" };
  }
  if (dept.includes("information technology") || dept.includes("network") || title.includes("network")) {
    return { icon: Terminal, label: "IT & Network Systems" };
  }
  if (dept.includes("sale") || dept.includes("business") || title.includes("sales")) {
    return { icon: TrendingUp, label: "Sales & Business Development" };
  }
  if (dept.includes("fin") || dept.includes("account") || title.includes("cpa") || title.includes("accountant")) {
    return { icon: Landmark, label: "Finance & Accounting" };
  }
  if (dept.includes("civil") || dept.includes("construct") || dept.includes("engineering") || title.includes("civil")) {
    return { icon: HardHat, label: "Engineering & Construction" };
  }
  if (dept.includes("health") || dept.includes("medical") || title.includes("nurs")) {
    return { icon: Stethoscope, label: "Healthcare & Medical" };
  }
  if (dept.includes("educat") || dept.includes("academ") || title.includes("teacher")) {
    return { icon: GraduationCap, label: "Education & Academics" };
  }
  return { icon: Briefcase, label: job.department || "Operations" };
}

export function getWorkMode(location?: string): string {
  const lower = (location || "").toLowerCase();
  if (lower.includes("remote")) return "Remote";
  if (lower.includes("hybrid")) return "Hybrid";
  return "On-site";
}

export function getRelativeTime(dateString?: string): string {
  if (!dateString) return "Just now";
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffMinutes < 120) return "Just now";
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    return "Just now";
  } catch {
    return "Just now";
  }
}

interface LandingJobCardProps {
  job: Job;
  targetHref: string;
  isBookmarked: boolean;
  onToggleBookmark: (jobId: number, jobTitle: string) => void;
}

export function FeaturedJobCard({
  job,
  targetHref,
  isBookmarked,
  onToggleBookmark,
}: LandingJobCardProps) {
  const salary = formatSalary(job);
  const timeAgo = getRelativeTime(job.created_at);
  const summary = truncateJobOverview(getJobOverview(job), 170);
  const expPill = getExperiencePill(job);
  const meta = getDepartmentMeta(job);
  const DeptIcon = meta.icon;
  const workMode = getWorkMode(job.location);
  const allSkills =
    job.required_skills && job.required_skills.length > 0
      ? job.required_skills
      : ["Domain Expertise", "Cross-Functional Execution", "Analytical Problem Solving"];
  const visibleSkills = allSkills.slice(0, 5);
  const extraSkillCount = Math.max(0, allSkills.length - visibleSkills.length);

  return (
    <Card className="relative group rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-[0_10px_28px_rgba(33,150,243,0.10)] hover:shadow-[0_18px_40px_rgba(33,150,243,0.16)] transition-[box-shadow,transform] duration-200">
      {/* Left Brand-Blue Spotlight Panel */}
      <div className="lg:col-span-4 bg-primary text-primary-foreground p-6 sm:p-7 flex flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-13 shrink-0 place-items-center rounded-2xl bg-white/15 border border-white/25">
            <DeptIcon className="size-6 text-primary-foreground" aria-hidden="true" />
          </div>
          <Badge className="rounded-full border-white/25 bg-white/15 text-primary-foreground hover:bg-white/20">
            {meta.label}
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-blue-50">Monthly Compensation</p>
            <p className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-primary-foreground tabular-nums leading-tight">
              {salary}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="rounded-full border-transparent bg-white/15 text-primary-foreground hover:bg-white/20">
              {job.employment_type || "Full-Time"}
            </Badge>
            <Badge className="rounded-full border-transparent bg-white/15 text-primary-foreground hover:bg-white/20">
              {workMode}
            </Badge>
            <Badge className="rounded-full border-transparent bg-white/15 text-primary-foreground hover:bg-white/20">
              {expPill}
            </Badge>
          </div>
        </div>
      </div>

      {/* Right Role Details Panel */}
      <div className="lg:col-span-8 flex flex-col justify-between">
        <CardHeader className="p-6 sm:p-7 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold tracking-tight leading-tight">
                <Link
                  href={targetHref}
                  className="text-foreground group-hover:text-primary transition-colors after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                >
                  {job.title}
                </Link>
              </CardTitle>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <MapPin className="size-4 text-primary shrink-0" aria-hidden="true" />
                <span>{job.location || "Makati City, Metro Manila"}</span>
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

        <CardContent className="px-6 sm:px-7 pt-0 pb-5 space-y-4">
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-2 max-w-[70ch]">
            {summary}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {visibleSkills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="rounded-full border-transparent font-semibold"
              >
                {skill}
              </Badge>
            ))}
            {extraSkillCount > 0 && (
              <Badge
                variant="outline"
                className="rounded-full text-muted-foreground font-semibold tabular-nums"
              >
                +{extraSkillCount} more
              </Badge>
            )}
          </div>
        </CardContent>

        <div className="px-6 sm:px-7">
          <Separator />
        </div>

        <CardFooter className="px-6 sm:px-7 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-sm font-semibold text-success shrink-0">
              {timeAgo}
            </span>
            {job.education_requirement && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-muted-foreground font-medium min-w-0 truncate">
                <GraduationCap className="size-4 text-primary shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {job.education_requirement.replace(/\.$/, "")}
                </span>
              </span>
            )}
          </div>

          <Button asChild className="relative z-10">
            <Link href={targetHref}>
              <span>Apply this job</span>
              <ArrowRight
                className="transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}

export function StandardJobCard({
  job,
  targetHref,
  isBookmarked,
  onToggleBookmark,
}: LandingJobCardProps) {
  const salary = formatSalary(job);
  const timeAgo = getRelativeTime(job.created_at);
  const summary = truncateJobOverview(getJobOverview(job), 170);
  const expPill = getExperiencePill(job);
  const meta = getDepartmentMeta(job);
  const DeptIcon = meta.icon;
  const workMode = getWorkMode(job.location);
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
                <CardTitle className="text-xl sm:text-2xl font-bold leading-snug line-clamp-2">
                  <Link
                    href={targetHref}
                    className="text-foreground group-hover:text-primary transition-colors after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                    title={job.title}
                  >
                    {job.title}
                  </Link>
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
        <CardFooter className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Button asChild className="relative z-10">
            <Link href={targetHref}>
              <span>Apply this job</span>
              <ArrowRight
                className="transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Button>
          <span className="text-sm font-semibold text-success">{timeAgo}</span>
        </CardFooter>
      </div>
    </Card>
  );
}
