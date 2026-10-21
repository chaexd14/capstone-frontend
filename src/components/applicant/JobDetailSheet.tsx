"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Job, RubricWeights } from "@/types/job";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Lock,
  Bookmark,
  Share2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Scale,
  MapPin,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

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

function parseJobDetails(job: Job) {
  let narrative = "";
  if (job.description) {
    const paragraphs = job.description
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20 && !p.startsWith("•") && !p.startsWith("-") && !p.startsWith("*"));
    if (paragraphs.length > 0) {
      narrative = paragraphs.join("\n\n");
    } else {
      narrative = job.description.replace(/^[-*•\s]+/gm, "").split(/\n/)[0]?.trim() || "";
    }
  }

  if (!narrative || narrative.length < 20) {
    narrative = `We are seeking a qualified ${job.title} to join our team in ${job.location || "Metro Manila, Philippines"
      }. This role will collaborate with cross-functional talent in our merit-evaluated candidate calibration workflow.`;
  }

  const responsibilities: string[] = [];
  if (job.description) {
    const rawLines = job.description
      .split(/\r?\n|•|\* /)
      .map((l) => l.trim().replace(/^[-*•\s]+/, ""))
      .filter((l) => l.length > 15);
    for (const line of rawLines) {
      if (!responsibilities.includes(line)) {
        responsibilities.push(line);
      }
    }
  }

  const qualifications: string[] = [];
  if (job.education_requirement) {
    qualifications.push(`Degree: ${job.education_requirement}`);
  }
  if (job.minimum_experience) {
    qualifications.push(`Experience: ${job.minimum_experience} relevant professional background`);
  }

  return { narrative, responsibilities, qualifications };
}

function resolveRubricWeights(weights?: RubricWeights): RubricWeights {
  if (weights && weights.required_skills > 0) {
    return weights;
  }
  return {
    required_skills: 35,
    experience: 30,
    education: 15,
    projects: 10,
    preferred_skills: 10,
  };
}

function distillExperience(exp?: string): string {
  if (!exp) return "1-3 yrs";
  const match = exp.match(/(\d+\+?(?:\s*-\s*\d+)?)\s*(?:years?|yrs?)/i);
  if (match) {
    return `${match[1]} yrs`;
  }
  if (exp.length > 14) {
    return exp.slice(0, 12) + "…";
  }
  return exp;
}

function parseSalary(range: string) {
  const parts = range.split("/");
  const amount = parts[0]?.trim() || range;
  const frequency = parts[1] ? `/${parts[1].trim()}` : "/ mo";
  return { amount, frequency };
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
  salaryRange = "₱50,000 - ₱75,000 / mo",
  onNavigateJob,
  hasPrevJob = false,
  hasNextJob = false,
}: JobDetailSheetProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAllResponsibilities, setShowAllResponsibilities] = useState(false);

  // Keyboard navigation & accelerators
  useEffect(() => {
    if (!isOpen || !job) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "a" || e.key === "A") {
        if (job.status === "PUBLISHED" && !hasApplied) {
          e.preventDefault();
          onClose();
          onApply(job);
        }
      } else if (e.key === "b" || e.key === "B") {
        if (onToggleBookmark) {
          e.preventDefault();
          onToggleBookmark(job.id, job.title);
        }
      } else if ((e.key === "ArrowLeft" || e.key === "k" || e.key === "K") && onNavigateJob && hasPrevJob) {
        e.preventDefault();
        onNavigateJob("prev");
      } else if ((e.key === "ArrowRight" || e.key === "j" || e.key === "J") && onNavigateJob && hasNextJob) {
        e.preventDefault();
        onNavigateJob("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, job, hasApplied, onClose, onApply, onToggleBookmark, onNavigateJob, hasPrevJob, hasNextJob]);

  // Memoize parsed details
  const { narrative, responsibilities, qualifications } = useMemo(() => {
    if (!job) return { narrative: "", responsibilities: [], qualifications: [] };
    return parseJobDetails(job);
  }, [job]);

  const visibleResponsibilities = useMemo(() => {
    if (showAllResponsibilities || responsibilities.length <= 6) {
      return responsibilities;
    }
    return responsibilities.slice(0, 6);
  }, [responsibilities, showAllResponsibilities]);

  const salaryData = useMemo(() => parseSalary(salaryRange), [salaryRange]);
  const distilledExp = useMemo(() => distillExperience(job?.minimum_experience), [job?.minimum_experience]);

  if (!job) return null;

  const isClosed = job.status !== "PUBLISHED";
  const weights = resolveRubricWeights(job.rubric_weights);

  const handleShare = async () => {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/careers?jobId=${job.id}`
          : "";
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        toast.success("Job Link Copied", {
          description: `Direct share link for "${job.title}" copied to clipboard.`,
        });
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      toast.info("Job Link", {
        description: `Position ID ${job.id}: ${job.title} (${job.department})`,
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        [&>button:last-child]:hidden hides Radix Sheet's built-in top-right close button, 
        leaving only our customized, accessible action bar.
      */}
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-white text-slate-900 border-l border-slate-200/90 shadow-2xl focus:outline-none z-50 overflow-hidden [&>button:last-child]:hidden"
      >
        {/* ============================================================== */}
        {/* 1. STICKY TOP APP BAR: Status + Primary CTA Prominently Placed  */}
        {/* ============================================================== */}
        <div className="shrink-0 px-5 sm:px-8 lg:px-10 py-3.5 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between gap-4">
          {/* Left: Department & Status Indicators */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200/60">
              {job.department}
            </span>

            {hasApplied ? (
              <Badge className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1 px-2.5 py-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Applied
              </Badge>
            ) : isClosed ? (
              <Badge
                variant="outline"
                className="text-xs font-semibold border-amber-200 bg-amber-50 text-amber-700 gap-1 px-2.5 py-0.5"
              >
                <Lock className="w-3 h-3 text-amber-600" />
                {job.status === "CLOSED" ? "Closed" : job.status === "ARCHIVED" ? "Archived" : "Draft"}
              </Badge>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                Actively Hiring
              </span>
            )}
          </div>

          {/* Right: Shortcuts Hint + Navigation & Close Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Keyboard shortcut hint pill */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-500 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200 select-none">
              <span className="font-semibold text-slate-700">[A] Apply</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-slate-700">[B] Save</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-slate-700">[J/K] Cycle</span>
            </div>

            {/* Intra-job cycling (Previous / Next) */}
            {onNavigateJob && (hasPrevJob || hasNextJob) && (
              <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!hasPrevJob}
                  onClick={() => onNavigateJob("prev")}
                  className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 cursor-pointer"
                  title="Previous Job (Left Arrow or K)"
                  aria-label="Previous job"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!hasNextJob}
                  onClick={() => onNavigateJob("next")}
                  className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 cursor-pointer"
                  title="Next Job (Right Arrow or J)"
                  aria-label="Next job"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Sheet Close Trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              title="Close drawer (Esc)"
              aria-label="Close job details drawer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. SCROLLABLE BODY CONTENT (Clean, Minimalist, High Contrast)  */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 lg:px-10 py-7 space-y-7 focus:outline-none selection:bg-blue-600/15 selection:text-blue-700">
          {/* Header Title & Subtitle */}
          <SheetHeader className="space-y-6 text-left">
            <div className="flex items-start gap-4 sm:gap-5">
              {/* Company / Position Avatar Badge */}
              {/* Title & Metadata */}
              <div className="space-y-1.5 min-w-0 flex-1">
                <SheetTitle className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {job.title}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Detailed job specifications, responsibilities, and requirements for {job.title}
                </SheetDescription>
                <div className="flex items-center gap-1.5 text-sm sm:text-base text-slate-600 font-medium flex-wrap">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>{job.location || "Makati City, Metro Manila"}</span>
                  {job.company_name && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-800 font-semibold">{job.company_name}</span>
                    </>
                  )}
                  {job.department && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{job.department}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Key Metadata Strip: Hero Salary + Clean Classification Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-2xs">
              {/* Primary Salary Spotlight */}
              <div className="space-y-0.5 shrink-0">
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Target Compensation
                </div>
                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono tabular-nums tracking-tight">
                    {salaryData.amount}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 font-mono">
                    {salaryData.frequency}
                  </span>
                </div>
              </div>

              {/* Secondary Attribute Pills (Employment, Workplace, Experience) */}
              <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                {/* Category / Commitment */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-800 shadow-2xs whitespace-nowrap">
                  <span className="text-slate-400 font-normal">Type:</span>
                  <span>{job.employment_type || "Full Time"}</span>
                </span>

                {/* Workplace */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-800 shadow-2xs whitespace-nowrap">
                  <span className="text-slate-400 font-normal">Workplace:</span>
                  <span>{job.location?.toLowerCase().includes("remote") ? "Remote" : "On-site / Hybrid"}</span>
                </span>

                {/* Experience */}
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-800 shadow-2xs whitespace-nowrap"
                  title={job.minimum_experience || "Experience requirement"}
                >
                  <span className="text-slate-400 font-normal">Exp:</span>
                  <span>{distilledExp}</span>
                </span>
              </div>
            </div>

            {/* 3. Primary & Secondary Action Buttons (Directly below metadata row) */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              {hasApplied ? (
                <Button
                  onClick={() => {
                    onClose();
                    if (onViewApplication) onViewApplication();
                  }}
                  className="h-11 px-6 rounded-xl font-bold text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 gap-2 cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>View Application Status</span>
                </Button>
              ) : isClosed ? (
                <Button
                  disabled
                  className="h-11 px-6 rounded-xl font-semibold text-sm bg-slate-100 text-slate-400 gap-2 cursor-not-allowed opacity-75"
                >
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Position Closed</span>
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    onClose();
                    onApply(job);
                  }}
                  className="h-11 px-7 rounded-xl font-bold text-sm bg-primary hover:bg-blue-700 text-primary-foreground gap-2 cursor-pointer shadow-sm hover:shadow active:scale-[0.98] transition-all"
                  title="Apply for this role (Keyboard shortcut: A)"
                >
                  <span>Apply this job</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {/* Save / Bookmark Button */}
              {onToggleBookmark && (
                <Button
                  variant="outline"
                  onClick={() => onToggleBookmark(job.id, job.title)}
                  className={`h-11 px-5 rounded-xl font-semibold text-sm border-slate-200 gap-2 cursor-pointer transition-all ${isBookmarked
                    ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  title={isBookmarked ? "Remove bookmark (B)" : "Save job (B)"}
                >
                  <Bookmark
                    className={`w-4 h-4 ${isBookmarked ? "fill-blue-600 text-blue-600" : "text-slate-500"}`}
                  />
                  <span>{isBookmarked ? "Saved" : "Save"}</span>
                </Button>
              )}

              {/* Share Position Button */}
              <Button
                variant="ghost"
                onClick={handleShare}
                className="h-11 px-4 rounded-xl font-semibold text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-2 cursor-pointer transition-all"
                title="Copy direct share link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Link Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>Share</span>
                  </>
                )}
              </Button>
            </div>

            {/* Accessible screen reader announcement for clipboard */}
            <div className="sr-only" aria-live="polite">
              {copiedLink ? `Share link for ${job.title} copied to clipboard.` : ""}
            </div>

            {/* Horizontal rule dividing hero from content */}
            <hr className="border-slate-200/90 my-1" />
          </SheetHeader>

          {/* Contextual Status Banner: Already Applied */}
          {hasApplied && (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Application on File: </span>
                  <span>Your profile is actively indexed in the merit screening pipeline.</span>
                </div>
              </div>
              {onViewApplication && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onViewApplication();
                  }}
                  className="border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 shrink-0 text-xs font-semibold h-7 px-2.5 rounded-md cursor-pointer"
                >
                  View Details
                </Button>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* SECTION 1: JOB DESCRIPTION                                    */}
          {/* ============================================================== */}
          <div className="space-y-3 pt-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Job Description
            </h3>
            <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line max-w-3xl">
              {narrative}
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 2: KEY RESPONSIBILITIES                                */}
          {/* ============================================================== */}
          {responsibilities.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Key Responsibilities
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {responsibilities.length} items
                </span>
              </div>
              <ul className="space-y-2.5 text-sm sm:text-base text-slate-700 leading-relaxed max-w-3xl">
                {visibleResponsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-slate-400 font-bold shrink-0 leading-tight mt-0.5" aria-hidden="true">
                      •
                    </span>
                    <span className="flex-1">{resp}</span>
                  </li>
                ))}
              </ul>
              {responsibilities.length > 6 && (
                <div className="pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllResponsibilities(!showAllResponsibilities)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 h-8 rounded-lg cursor-pointer"
                  >
                    {showAllResponsibilities
                      ? "Show fewer responsibilities"
                      : `+ Show all ${responsibilities.length} responsibilities (${responsibilities.length - 6} more)`}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* SECTION 3: QUALIFICATIONS                                      */}
          {/* ============================================================== */}
          <div className="space-y-4 pt-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Qualifications
            </h3>

            {/* Baseline bullets: Education & Experience */}
            {qualifications.length > 0 && (
              <ul className="space-y-2 text-sm sm:text-base text-slate-700">
                {qualifications.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-slate-400 font-bold shrink-0" aria-hidden="true">•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Core Required Skills / Qualifications */}
            {job.required_skills && job.required_skills.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Must-Have Competencies &amp; State Licenses</span>
                  <span className="text-slate-400 font-normal">
                    {job.required_skills.length} {job.required_skills.length === 1 ? "criterion" : "criteria"}
                  </span>
                </div>
                {job.required_skills.some((s) => s.length > 32 || s.trim().split(/\s+/).length > 4) ? (
                  <ul className="space-y-2">
                    {job.required_skills.map((skill, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl bg-blue-50/70 text-slate-800 border border-blue-200/80 leading-relaxed"
                      >
                        <span className="h-5 min-w-[22px] px-1.5 rounded-md bg-[#e3f1fe] text-[#1976D2] font-mono text-[10px] font-bold flex items-center justify-center mt-0.5 shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="break-words">{skill}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/90 shadow-2xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Preferred Skills / Qualifications */}
            {job.preferred_skills && job.preferred_skills.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Preferred Qualifications &amp; Bonus Assets</span>
                  <span className="text-slate-400 font-normal">
                    {job.preferred_skills.length} {job.preferred_skills.length === 1 ? "item" : "items"}
                  </span>
                </div>
                {job.preferred_skills.some((s) => s.length > 32 || s.trim().split(/\s+/).length > 4) ? (
                  <ul className="space-y-2">
                    {job.preferred_skills.map((skill, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm font-normal px-3.5 py-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/80 leading-relaxed"
                      >
                        <span className="h-5 min-w-[22px] px-1.5 rounded-md bg-slate-200/70 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center mt-0.5 shrink-0">
                          +{idx + 1}
                        </span>
                        <span className="break-words">{skill}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {job.preferred_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/80"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* SECTION 4: EXPLAINABLE 5-COMPONENT MERIT EVALUATION RUBRIC     */}
            {/* ============================================================== */}
            <div className="space-y-4 pt-6 border-t border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-[#2196F3]" />
                    <span>Explainable Merit Evaluation Rubric</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    How your qualifications and resume evidence are mathematically evaluated.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-[#1976D2] border border-blue-200 shrink-0 self-start sm:self-auto">
                  100% Calibrated
                </span>
              </div>

              {/* Rubric Weights Stack */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                {/* 1. Required Skills */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">1. Required Skills & Hands-On Competencies</span>
                    <span className="font-mono text-[#2196F3] font-bold">{weights.required_skills}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className="h-full bg-[#2196F3] rounded-full transition-all duration-500"
                      style={{ width: `${weights.required_skills}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Sentence-grounded qualification verification across required competencies.
                  </p>
                </div>

                {/* 2. Experience Tenure */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">2. Relevant Experience Tenure</span>
                    <span className="font-mono text-[#2196F3] font-bold">{weights.experience}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className="h-full bg-[#2196F3] rounded-full transition-all duration-500"
                      style={{ width: `${weights.experience}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Demonstrated depth in relevant roles with progressive domain responsibility.
                  </p>
                </div>

                {/* 3. Education Credentials */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">3. Education & Regulatory Licensing</span>
                    <span className="font-mono text-[#2196F3] font-bold">{weights.education}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className="h-full bg-[#2196F3] rounded-full transition-all duration-500"
                      style={{ width: `${weights.education}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Degree baseline and mandatory PRC board license verification where applicable.
                  </p>
                </div>

                {/* 4 & 5 Grid: Projects & Preferred Skills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">4. Projects & Portfolio</span>
                      <span className="font-mono text-slate-900 font-bold">{weights.projects}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-slate-600 rounded-full"
                        style={{ width: `${Math.min(weights.projects * 4, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">5. Preferred Skills</span>
                      <span className="font-mono text-slate-900 font-bold">{weights.preferred_skills}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-slate-600 rounded-full"
                        style={{ width: `${Math.min(weights.preferred_skills * 4, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Anti-Bias & Blind Screening Assurance */}
                <div className="pt-3 border-t border-slate-200/70 flex items-start sm:items-center gap-2 text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1 sm:mt-0" />
                  <div>
                    <span className="font-semibold text-slate-800">Demographic Blind Screening Active: </span>
                    <span className="text-slate-500">
                      Candidate names, contact data, gender, age, and university prestige are redacted prior to recruiter review.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
