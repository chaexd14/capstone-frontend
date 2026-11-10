"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import type { User } from "@supabase/supabase-js";
import {
  Search,
  Bookmark,
  ChevronDown,
  CheckCircle2,
  Lock,
  FileText,
  Clock,
  ArrowRight,
  LogOut,
  LogIn,
  UserCheck,
  Briefcase,
  ExternalLink,
  X,
  MapPin,
  RotateCcw,
  Sparkles,
  Calendar,
  WifiOff,
} from "lucide-react";
import { ApplyModal } from "./ApplyModal";
import { JobDetailSheet } from "./JobDetailSheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface ApplicantPortalProps {
  jobs: Job[];
  applications: Application[];
  onApplicationCreated: (app: Application) => void;
  currentUser?: User | null;
  onLogout?: () => void;
  backendOnline?: boolean;
}

const CATEGORIES = [
  "All",
  "Information Technology",
  "Healthcare & Medical",
  "Finance & Accounting",
  "Engineering & Construction",
  "BPO & Customer Support",
  "Sales & Business Development",
];

const JOB_TYPES = [
  "All",
  "Full time",
  "Part time",
  "Remote",
  "Hybrid",
  "Contract",
];

const SALARY_RANGES = [
  "All",
  "₱25,000 - ₱45,000",
  "₱45,000 - ₱70,000",
  "₱70,000 - ₱100,000",
  "₱100,000+",
];

function getSalaryRange(job: Job): string {
  const title = (job.title || "").toLowerCase();
  const dept = (job.department || "").toLowerCase();
  if (title.includes("lead") || title.includes("director") || title.includes("principal")) {
    return "₱120,000 - ₱180,000 / mo";
  }
  if (title.includes("senior") || title.includes("sr.")) {
    return "₱75,000 - ₱110,000 / mo";
  }
  if (title.includes("entry") || title.includes("junior") || title.includes("associate") || title.includes("fresh")) {
    return "₱25,000 - ₱38,000 / mo";
  }
  if (dept.includes("tech") || dept.includes("engineer")) {
    return "₱60,000 - ₱95,000 / mo";
  }
  if (dept.includes("finance") || dept.includes("account")) {
    return "₱45,000 - ₱70,000 / mo";
  }
  if (dept.includes("health") || dept.includes("medical")) {
    return "₱35,000 - ₱60,000 / mo";
  }
  if (dept.includes("bpo") || dept.includes("support")) {
    return "₱28,000 - ₱45,000 / mo";
  }
  return "₱50,000 - ₱75,000 / mo";
}

function getExperiencePill(job: Job): string {
  if (job.minimum_experience) {
    const exp = job.minimum_experience.toLowerCase();
    if (exp.includes("1-2") || exp.includes("1 to 2")) return "1-2 yrs";
    if (exp.includes("2-3") || exp.includes("2 to 3") || exp.includes("2")) return "2 yrs";
    if (exp.includes("3-5") || exp.includes("3 to 5") || exp.includes("3")) return "3+ yrs";
    if (exp.includes("5") || exp.includes("senior")) return "5+ yrs";
    if (exp.includes("entry") || exp.includes("fresh")) return "Fresh";
    const firstWord = job.minimum_experience.split(" ")[0];
    if (firstWord && !isNaN(Number(firstWord))) return `${firstWord} yrs`;
    return job.minimum_experience;
  }
  const title = (job.title || "").toLowerCase();
  if (title.includes("senior") || title.includes("sr.")) return "5+ yrs";
  if (title.includes("lead") || title.includes("director")) return "7+ yrs";
  if (title.includes("junior") || title.includes("entry")) return "1 yr";
  return "2 yrs";
}

function getDepartmentMonogram(job: Job): { monogram: string; label: string } {
  const dept = (job.department || "").toLowerCase();
  const title = (job.title || "").toLowerCase();

  if (dept.includes("tech") || dept.includes("software") || dept.includes("engineer") || title.includes("developer")) {
    return { monogram: "IT", label: "Information Technology" };
  }
  if (dept.includes("fin") || dept.includes("account") || title.includes("cpa")) {
    return { monogram: "FA", label: "Finance & Accounting" };
  }
  if (dept.includes("health") || dept.includes("medical") || title.includes("nurse")) {
    return { monogram: "HC", label: "Healthcare & Medical" };
  }
  if (dept.includes("civil") || dept.includes("construct") || title.includes("civil")) {
    return { monogram: "ENG", label: "Engineering" };
  }
  if (dept.includes("sale") || dept.includes("market") || title.includes("sales")) {
    return { monogram: "BD", label: "Business Dev" };
  }
  if (dept.includes("bpo") || dept.includes("support") || title.includes("support")) {
    return { monogram: "CS", label: "Customer Support" };
  }

  const firstLetter = (job.department || job.title || "TM").trim().slice(0, 2).toUpperCase();
  return { monogram: firstLetter || "TM", label: job.department || "General" };
}

function getCardHighlights(job: Job): string[] {
  const points: string[] = [];

  if (job.description) {
    const rawLines = job.description
      .split(/\r?\n|•|\?|\* /)
      .map((l) => l.trim().replace(/^[-*•\?\s]+/, ""))
      .filter(
        (l) =>
          l.length > 20 &&
          !l.toLowerCase().includes("apply") &&
          !l.toLowerCase().includes("qualification") &&
          !l.toLowerCase().includes("requirement")
      );

    for (const line of rawLines) {
      if (points.length < 2 && !points.includes(line)) {
        points.push(line);
      }
    }
  }

  if (points.length < 1 && job.description) {
    const firstSentence = job.description.replace(/^[-*•\s]+/gm, "").split(/\.\s+/)[0]?.trim();
    if (firstSentence && firstSentence.length > 15) {
      points.push(firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`);
    }
  }

  if (job.education_requirement) {
    points.push(`Degree: ${job.education_requirement}`);
  } else if (job.minimum_experience) {
    points.push(`Experience: ${job.minimum_experience} hands-on professional background.`);
  }

  return points.slice(0, 2);
}

function getRelativeTime(dateString?: string): string {
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
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks}w ago`;
  } catch {
    return "Just now";
  }
}

interface ApplicationStatusConfig {
  label: string;
  sublabel: string;
  badgeClass: string;
  stepIndex: number;
  stepColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getApplicationStatusConfig(status?: string): ApplicationStatusConfig {
  const norm = (status || "").toUpperCase();
  if (norm === "SHORTLISTED") {
    return {
      label: "Shortlisted",
      sublabel: "Congratulations! You have been shortlisted for this position based on transparent merit scoring.",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/90",
      stepIndex: 2,
      stepColor: "bg-emerald-500",
      icon: CheckCircle2,
    };
  }
  if (norm === "INTERVIEW") {
    return {
      label: "Interview Scheduled",
      sublabel: "The hiring team will reach out to coordinate your interview schedule.",
      badgeClass: "bg-blue-50 text-[#1976D2] border-blue-200/90",
      stepIndex: 2,
      stepColor: "bg-[#2196F3]",
      icon: Calendar,
    };
  }
  if (norm === "HIRED") {
    return {
      label: "Offer Extended",
      sublabel: "An offer has been extended for this role.",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      stepIndex: 2,
      stepColor: "bg-emerald-600",
      icon: Sparkles,
    };
  }
  if (norm === "REJECTED") {
    return {
      label: "Not Selected",
      sublabel: "Evaluation completed. Specific required skill or credential thresholds were not met for this requisition.",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200/90",
      stepIndex: 2,
      stepColor: "bg-slate-400",
      icon: Lock,
    };
  }
  if (norm === "UNDER_REVIEW" || norm === "PROCESSING") {
    return {
      label: "Under Review",
      sublabel: "The hiring team is actively evaluating your qualifications and experience.",
      badgeClass: "bg-blue-50 text-[#1976D2] border-blue-200/90",
      stepIndex: 1,
      stepColor: "bg-[#2196F3]",
      icon: Clock,
    };
  }
  return {
    label: "Application Received",
    sublabel: "Your application has been received and queued for merit-based review.",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200/90",
    stepIndex: 0,
    stepColor: "bg-[#2196F3]",
    icon: FileText,
  };
}

export function ApplicantPortal({
  jobs,
  applications,
  onApplicationCreated,
  currentUser,
  onLogout,
  backendOnline = true,
}: ApplicantPortalProps) {
  const searchParams = useSearchParams();

  // Active top navigation tab: "Explore" | "Bookmark" | "My Applications"
  const tabParam = searchParams.get("tab");
  const initialNavTab =
    tabParam === "MY_APPLICATIONS"
      ? "My Applications"
      : tabParam === "BOOKMARK"
        ? "Bookmark"
        : "Explore";
  const [navTab, setNavTab] = useState<"Explore" | "Bookmark" | "My Applications">(initialNavTab);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (tabParam === "MY_APPLICATIONS") {
        setNavTab("My Applications");
      } else if (tabParam === "BOOKMARK") {
        setNavTab("Bookmark");
      } else if (tabParam === "EXPLORE") {
        setNavTab("Explore");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [tabParam]);

  // Search and Filter states
  const queryParam = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const categoryParam = searchParams.get("category") ?? "All";
  const typeParam = searchParams.get("type") ?? "All";
  const salaryParam = searchParams.get("salary") ?? "All";

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [selectedJobType, setSelectedJobType] = useState(
    JOB_TYPES.includes(typeParam) ? typeParam : "All"
  );
  const [selectedCategory, setSelectedCategory] = useState(
    CATEGORIES.includes(categoryParam) ? categoryParam : "All"
  );
  const [selectedSalary, setSelectedSalary] = useState(
    SALARY_RANGES.includes(salaryParam) ? salaryParam : "All"
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const nextQ = searchParams.get("q") ?? searchParams.get("search");
      const nextCat = searchParams.get("category");
      const nextType = searchParams.get("type");
      const nextSal = searchParams.get("salary");
      if (nextQ !== null) setSearchQuery(nextQ);
      if (nextCat !== null && CATEGORIES.includes(nextCat)) setSelectedCategory(nextCat);
      if (nextType !== null && JOB_TYPES.includes(nextType)) setSelectedJobType(nextType);
      if (nextSal !== null && SALARY_RANGES.includes(nextSal)) setSelectedSalary(nextSal);
    });
    return () => cancelAnimationFrame(frame);
  }, [searchParams]);

  // User menu dropdown
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Sheet drawer state for full job details
  const [selectedJobForSheet, setSelectedJobForSheet] = useState<Job | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Apply Modal state
  const [selectedJobForApply, setSelectedJobForApply] = useState<Job | null>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  // Bookmarks stored in localStorage
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("talentmatch_bookmarked_jobs");
        if (saved) {
          return new Set<number>(JSON.parse(saved));
        }
      } catch { }
    }
    return new Set<number>();
  });

  const toggleBookmark = (jobId: number, jobTitle: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
        toast.info("Bookmark Removed", {
          description: `Removed "${jobTitle}" from your saved positions.`,
        });
      } else {
        next.add(jobId);
        toast.success("Job Saved", {
          description: `Added "${jobTitle}" to your bookmarks.`,
        });
      }
      try {
        localStorage.setItem("talentmatch_bookmarked_jobs", JSON.stringify(Array.from(next)));
      } catch { }
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setOpenUserMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const appliedJobIds = useMemo(() => {
    const ids = new Set<number>();
    applications.forEach((app) => {
      if (typeof app.job === "number") {
        ids.add(app.job);
      } else if (app.job && typeof app.job === "object" && "id" in (app.job as Record<string, unknown>)) {
        ids.add(Number((app.job as { id: number | string }).id));
      }
    });
    return ids;
  }, [applications]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (job.status === "ARCHIVED" || job.status === "DRAFT") return false;

      if (navTab === "Bookmark" && !bookmarkedIds.has(job.id)) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.department.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        (job.required_skills && job.required_skills.some((s) => s.toLowerCase().includes(q)));

      const matchesCategory =
        selectedCategory === "All" ||
        job.department.toLowerCase() === selectedCategory.toLowerCase() ||
        (selectedCategory.includes("Healthcare") && job.department.toLowerCase().includes("health")) ||
        (selectedCategory.includes("Finance") &&
          (job.department.toLowerCase().includes("fin") || job.department.toLowerCase().includes("account"))) ||
        (selectedCategory.includes("Engineering") && job.department.toLowerCase().includes("engineer")) ||
        (selectedCategory.includes("BPO") &&
          (job.department.toLowerCase().includes("bpo") || job.department.toLowerCase().includes("support"))) ||
        (selectedCategory.includes("Sales") &&
          (job.department.toLowerCase().includes("sales") || job.department.toLowerCase().includes("market"))) ||
        (selectedCategory.includes("Technology") &&
          (job.department.toLowerCase().includes("tech") || job.department.toLowerCase().includes("it")));

      const matchesJobType =
        selectedJobType === "All" ||
        (selectedJobType === "Remote" &&
          (job.location.toLowerCase().includes("remote") || job.employment_type.toLowerCase().includes("remote"))) ||
        (selectedJobType === "Full time" && job.employment_type.toLowerCase().includes("full")) ||
        (selectedJobType === "Part time" && job.employment_type.toLowerCase().includes("part")) ||
        (selectedJobType === "Contract" && job.employment_type.toLowerCase().includes("contract")) ||
        (selectedJobType === "Hybrid" && job.location.toLowerCase().includes("hybrid"));

      const salary = getSalaryRange(job);
      const matchesSalary =
        selectedSalary === "All" ||
        (selectedSalary === "₱25,000 - ₱45,000" &&
          (salary.includes("25,000") || salary.includes("28,000") || salary.includes("35,000"))) ||
        (selectedSalary === "₱45,000 - ₱70,000" &&
          (salary.includes("45,000") || salary.includes("50,000") || salary.includes("60,000"))) ||
        (selectedSalary === "₱70,000 - ₱100,000" &&
          (salary.includes("60,000") || salary.includes("75,000") || salary.includes("95,000"))) ||
        (selectedSalary === "₱100,000+" &&
          (salary.includes("110,000") || salary.includes("120,000") || salary.includes("180,000")));

      return matchesSearch && matchesCategory && matchesJobType && matchesSalary;
    });
  }, [jobs, navTab, bookmarkedIds, searchQuery, selectedCategory, selectedJobType, selectedSalary]);

  // Deep link auto-sheet open
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const jobIdParam = searchParams.get("jobId");
      if (jobIdParam) {
        const targetId = Number(jobIdParam);
        const targetJob = jobs.find((j) => j.id === targetId);
        if (targetJob) {
          setSelectedJobForSheet(targetJob);
          setIsSheetOpen(true);
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [searchParams, jobs]);

  // Intra-sheet cycling
  const currentSheetIndex = useMemo(() => {
    if (!selectedJobForSheet) return -1;
    return filteredJobs.findIndex((j) => j.id === selectedJobForSheet.id);
  }, [filteredJobs, selectedJobForSheet]);

  const hasPrevJob = currentSheetIndex > 0;
  const hasNextJob = currentSheetIndex >= 0 && currentSheetIndex < filteredJobs.length - 1;

  const handleNavigateJob = (direction: "next" | "prev") => {
    if (currentSheetIndex === -1) return;
    const targetIndex = direction === "next" ? currentSheetIndex + 1 : currentSheetIndex - 1;
    if (targetIndex >= 0 && targetIndex < filteredJobs.length) {
      const targetJob = filteredJobs[targetIndex];
      setSelectedJobForSheet(targetJob);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        params.set("jobId", targetJob.id.toString());
        window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
      }
    }
  };

  const hasActiveFilters =
    searchQuery !== "" || selectedJobType !== "All" || selectedCategory !== "All" || selectedSalary !== "All";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedJobType("All");
    setSelectedCategory("All");
    setSelectedSalary("All");
  };

  const handleOpenJobDetails = (job: Job) => {
    setSelectedJobForSheet(job);
    setIsSheetOpen(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("jobId", job.id.toString());
      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    }
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSelectedJobForSheet(null);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("jobId");
      const newQuery = params.toString();
      window.history.replaceState(
        {},
        "",
        newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname
      );
    }
  };

  const openApply = (job: Job) => {
    if (job.status === "CLOSED") return;
    setSelectedJobForApply(job);
    setIsApplyOpen(true);
  };

  const displayName =
    currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Applicant";
  const userInitial = displayName.charAt(0).toUpperCase();

  const shortlistedCount = useMemo(
    () => applications.filter((a) => a.status === "SHORTLISTED" || a.status === "INTERVIEW" || a.status === "HIRED").length,
    [applications]
  );
  const pendingCount = useMemo(
    () => applications.filter((a) => !a.status || a.status === "SUBMITTED" || a.status === "PROCESSING" || a.status === "UNDER_REVIEW" || (a.status as string) === "PENDING").length,
    [applications]
  );

  return (
    <div className="min-h-screen bg-[#e3f1fe] text-slate-900 flex flex-col font-sans selection:bg-[#2196F3] selection:text-white relative">
      {/* Blueprint Background Texture: Fine Dot Mesh + Architectural 48px Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(rgba(33,150,243,0.15)_1px,transparent_1px)] [background-size:24px_24px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,rgba(33,150,243,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(33,150,243,0.035)_1px,transparent_1px)] [background-size:48px_48px]"
      />

      {/* ============================================================== */}
      {/* 1. TOP NAVBAR: Canonical TM Brand & Navigation                 */}
      {/* ============================================================== */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
          {/* Left: Canonical TM Brand Badge */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#2196F3] text-white font-bold text-sm flex items-center justify-center tracking-tight shadow-2xs transition-transform group-hover:scale-105">
                TM
              </div>
              <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-[#2196F3] transition-colors leading-none">
                TalentMatch
              </span>
            </Link>
          </div>

          {/* Center: Desktop Navigation Tabs with Active Underline */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10 h-full" aria-label="Portal Navigation">
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3] rounded-md"
            >
              Home
            </Link>

            <button
              onClick={() => setNavTab("Explore")}
              className={`font-semibold text-sm transition-colors relative py-6 flex flex-col items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3] rounded-md min-h-[44px] justify-center ${navTab === "Explore" ? "text-[#2196F3] font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>Explore</span>
              {navTab === "Explore" && (
                <span className="absolute bottom-0 w-12 h-0.5 bg-[#2196F3] rounded-full transition-all" />
              )}
            </button>

            <button
              onClick={() => setNavTab("Bookmark")}
              className={`font-semibold text-sm transition-colors relative py-6 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3] rounded-md min-h-[44px] ${navTab === "Bookmark" ? "text-[#2196F3] font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>Bookmark</span>
              {bookmarkedIds.size > 0 && (
                <span className="h-4.5 px-1.5 rounded-full bg-blue-50 text-[#2196F3] text-[10px] font-bold border border-blue-200 flex items-center justify-center font-mono">
                  {bookmarkedIds.size}
                </span>
              )}
              {navTab === "Bookmark" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2196F3] rounded-full transition-all" />
              )}
            </button>

            <button
              onClick={() => setNavTab("My Applications")}
              className={`font-semibold text-sm transition-colors relative py-6 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3] rounded-md min-h-[44px] ${navTab === "My Applications" ? "text-[#2196F3] font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>My Applications</span>
              {applications.length > 0 && (
                <span className="h-4.5 px-1.5 rounded-full bg-blue-50 text-[#1976D2] text-[10px] font-bold border border-blue-200 flex items-center justify-center font-mono">
                  {applications.length}
                </span>
              )}
              {navTab === "My Applications" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2196F3] rounded-full transition-all" />
              )}
            </button>
          </nav>

          {/* Right: Reusable Notification Bell & User Account Menu */}
          <div className="flex items-center gap-3">
            {/* Reusable NotificationBell Component */}
            {currentUser && (
              <NotificationBell role="applicant" userId={currentUser.id} />
            )}

            {/* User Account Avatar Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setOpenUserMenu(!openUserMenu)}
                aria-expanded={openUserMenu}
                aria-haspopup="menu"
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer select-none min-h-[40px] min-w-[40px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3]"
                aria-label="User account menu"
              >
                <Avatar className="w-8 h-8 border border-slate-200/90 shadow-2xs">
                  <AvatarFallback className="bg-[#2196F3] text-white font-bold text-xs">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openUserMenu ? "rotate-180" : ""}`}
                />
              </button>

              {openUserMenu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-2"
                >
                  <div className="p-3 bg-slate-50/80 rounded-xl space-y-1 border border-slate-100">
                    <div className="font-bold text-sm text-slate-900 truncate">{displayName}</div>
                    <div className="text-xs text-slate-500 font-mono truncate">
                      {currentUser?.email || "Guest Session"}
                    </div>
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1976D2] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        <UserCheck className="w-3 h-3" />
                        Candidate Profile
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 space-y-0.5 text-xs">
                    <button
                      role="menuitem"
                      onClick={() => {
                        setNavTab("My Applications");
                        setOpenUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between cursor-pointer"
                    >
                      <span>Submitted Applications</span>
                      <span className="font-mono text-slate-400 font-bold">{applications.length}</span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setNavTab("Bookmark");
                        setOpenUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between cursor-pointer"
                    >
                      <span>Saved Positions</span>
                      <span className="font-mono text-slate-400 font-bold">{bookmarkedIds.size}</span>
                    </button>
                    <Link
                      role="menuitem"
                      href="/admin"
                      className="w-full text-left px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between"
                    >
                      <span>Switch to Recruiter Portal</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    {currentUser ? (
                      <button
                        role="menuitem"
                        onClick={() => {
                          setOpenUserMenu(false);
                          if (onLogout) onLogout();
                        }}
                        className="w-full px-3 py-2 rounded-lg font-semibold text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    ) : (
                      <Link
                        role="menuitem"
                        href="/applicant/login"
                        className="w-full px-3 py-2 rounded-lg font-semibold text-xs text-[#2196F3] hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors text-center"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign In to Account</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs (< md viewports, guaranteed 44px touch height) */}
        <div className="flex md:hidden items-center justify-around border-t border-slate-100 bg-white px-2 py-1 text-xs font-semibold">
          <button
            onClick={() => setNavTab("Explore")}
            className={`flex-1 min-h-[44px] flex items-center justify-center px-3 py-2 rounded-xl transition-colors cursor-pointer ${navTab === "Explore" ? "bg-blue-50 text-[#2196F3] font-bold" : "text-slate-600"
              }`}
          >
            Explore
          </button>
          <button
            onClick={() => setNavTab("Bookmark")}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${navTab === "Bookmark" ? "bg-blue-50 text-[#2196F3] font-bold" : "text-slate-600"
              }`}
          >
            <span>Bookmark</span>
            {bookmarkedIds.size > 0 && (
              <span className="h-4.5 px-1.5 rounded-full bg-blue-100 text-[#2196F3] text-[10px] font-bold font-mono">
                {bookmarkedIds.size}
              </span>
            )}
          </button>
          <button
            onClick={() => setNavTab("My Applications")}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${navTab === "My Applications" ? "bg-blue-50 text-[#2196F3] font-bold" : "text-slate-600"
              }`}
          >
            <span>Applications</span>
            {applications.length > 0 && (
              <span className="h-4.5 px-1.5 rounded-full bg-blue-100 text-[#1976D2] text-[10px] font-bold font-mono">
                {applications.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Offline Alert Banner (when backend is disconnected) */}
      {!backendOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-800 text-center flex items-center justify-center gap-2 font-medium">
          <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>TalentMatch API is operating in offline mode. Live evaluations may be delayed until reconnect.</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MAIN CONTENT: Full-Bleed on Sky-Blue Canvas                 */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* ============================================================== */}
        {/* FLOATING PILL SEARCH & FILTER BAR (Landing Page Style)         */}
        {/* ============================================================== */}
        {navTab !== "My Applications" && (
          <div className="max-w-5xl mx-auto mb-6 relative z-20">
            <div className="bg-white rounded-3xl lg:rounded-full border border-blue-200/80 p-2 sm:px-4 sm:py-2.5 shadow-[0_16px_40px_rgba(25,136,245,0.14)] focus-within:border-[#2196F3] focus-within:ring-4 focus-within:ring-[#2196F3]/15 transition-all flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Left: Pill Search Input with Circular #2196F3 Search Button */}
              <div className="relative flex-1 flex items-center min-w-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by job title, skill, or city..."
                  aria-label="Search by job title, skill, or city"
                  className="w-full pl-5 pr-20 py-2.5 rounded-full border border-slate-300/80 bg-slate-50/50 focus:bg-white text-sm sm:text-base text-[#1e293b] placeholder:text-slate-400 focus:outline-none focus:border-[#2196F3] transition-colors"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title="Clear search"
                    aria-label="Clear search input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
                <div
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#2196F3] text-white flex items-center justify-center shadow-xs select-none pointer-events-none"
                  aria-hidden="true"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>

              {/* Right: Inline Dropdown Filters */}
              <div className="flex items-center justify-around sm:justify-end gap-1 sm:gap-2 flex-nowrap px-1">
                {/* 1. Job Type */}
                <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                  <SelectTrigger
                    className="!w-auto shrink-0 inline-flex border-0 shadow-none bg-transparent hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm px-2.5 h-9 rounded-lg gap-1 cursor-pointer focus:ring-0 focus:ring-offset-0 whitespace-nowrap"
                    aria-label="Filter by job type"
                  >
                    <span className={selectedJobType !== "All" ? "text-[#2196F3] font-semibold" : "text-slate-700"}>
                      {selectedJobType === "All" ? "Job Type" : selectedJobType}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl shadow-xl border border-slate-200 p-1 z-50">
                    {JOB_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs font-semibold rounded-xl cursor-pointer">
                        {type === "All" ? "All Job Types" : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="h-4.5 w-px bg-slate-300 mx-0.5 shrink-0" aria-hidden="true" />

                {/* 2. Category */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger
                    className="!w-auto shrink-0 inline-flex border-0 shadow-none bg-transparent hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm px-2.5 h-9 rounded-lg gap-1 cursor-pointer focus:ring-0 focus:ring-offset-0 whitespace-nowrap"
                    aria-label="Filter by category"
                  >
                    <span className={`truncate max-w-[140px] sm:max-w-[180px] ${selectedCategory !== "All" ? "text-[#2196F3] font-semibold" : "text-slate-700"}`}>
                      {selectedCategory === "All" ? "Category" : selectedCategory}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl shadow-xl border border-slate-200 p-1 z-50">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs font-semibold rounded-xl cursor-pointer">
                        {cat === "All" ? "All Categories" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="h-4.5 w-px bg-slate-300 mx-0.5 shrink-0" aria-hidden="true" />

                {/* 3. Salary Range */}
                <Select value={selectedSalary} onValueChange={setSelectedSalary}>
                  <SelectTrigger
                    className="!w-auto shrink-0 inline-flex border-0 shadow-none bg-transparent hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm px-2.5 h-9 rounded-lg gap-1 cursor-pointer focus:ring-0 focus:ring-offset-0 whitespace-nowrap"
                    aria-label="Filter by salary range"
                  >
                    <span className={selectedSalary !== "All" ? "text-[#2196F3] font-semibold" : "text-slate-700"}>
                      {selectedSalary === "All" ? "Salary range" : selectedSalary}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl shadow-xl border border-slate-200 p-1 z-50">
                    {SALARY_RANGES.map((sal) => (
                      <SelectItem key={sal} value={sal} className="text-xs font-semibold rounded-xl cursor-pointer">
                        {sal === "All" ? "All Salary Ranges" : sal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 h-8 rounded-lg hover:bg-rose-50 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-1 whitespace-nowrap"
                    title="Reset all filters"
                    aria-label="Reset all search filters"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {navTab !== "My Applications" && (
          <div className="space-y-6">
            {navTab === "Bookmark" && (
              <div className="bg-white/85 backdrop-blur-xs rounded-2xl border border-blue-200/70 p-5 sm:p-6 shadow-[0_4px_20px_rgba(25,136,245,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2196F3] flex items-center justify-center border border-blue-100 shadow-2xs">
                      <Bookmark className="w-5 h-5 fill-[#2196F3] text-[#2196F3]" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      Saved Positions
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100/90 text-[#1976D2] font-mono text-xs font-bold border border-blue-200/80">
                      {bookmarkedIds.size} saved
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Roles you have bookmarked for comparison, rubric evaluation review, and application.
                  </p>
                </div>
                <Button
                  onClick={() => setNavTab("Explore")}
                  className="bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold text-xs px-4 h-9 rounded-xl transition-all shadow-2xs cursor-pointer gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Browse All Positions</span>
                </Button>
              </div>
            )}

            {filteredJobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-blue-200/80 p-12 text-center space-y-4 max-w-lg mx-auto my-12 shadow-[0_4px_20px_rgba(25,136,245,0.06)]">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2196F3] flex items-center justify-center mx-auto shadow-2xs border border-blue-100">
                  {navTab === "Bookmark" ? <Bookmark className="w-7 h-7" /> : <Briefcase className="w-7 h-7" />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {navTab === "Bookmark" ? "No bookmarked positions yet" : "No positions found"}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {navTab === "Bookmark"
                      ? "Click the bookmark ribbon on any role card to save it for quick reference and tracking."
                      : "We couldn't find any job postings matching your current search or filters. Try adjusting your keywords."}
                  </p>
                </div>
                {navTab === "Bookmark" ? (
                  <Button
                    onClick={() => setNavTab("Explore")}
                    className="bg-[#2196F3] hover:bg-[#1976D2] text-white rounded-xl text-xs font-semibold px-5 h-10 shadow-2xs"
                  >
                    Browse Open Positions
                  </Button>
                ) : (
                  <Button
                    onClick={resetFilters}
                    variant="outline"
                    className="rounded-xl text-xs font-semibold h-10"
                  >
                    Reset Search Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Results Count & Removable Filter Pills Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                      {navTab === "Bookmark" ? "Saved Roles" : "Available Positions"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100/90 text-[#1976D2] font-mono text-xs font-bold border border-blue-200/80">
                      {filteredJobs.length} {filteredJobs.length === 1 ? "role" : "roles"}
                    </span>
                    <span className="hidden sm:inline text-slate-300">·</span>
                    <span className="text-slate-500 font-medium hidden sm:inline">
                      {hasActiveFilters ? "Filtered results" : "Evaluated on explainable merit rubrics"}
                    </span>
                  </div>

                  {/* Removable Active Filter Chips */}
                  {hasActiveFilters && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {searchQuery && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-blue-200/90 text-slate-700 text-xs shadow-2xs font-medium">
                          <span className="text-slate-400 font-normal">Search:</span>
                          <span className="font-semibold">&ldquo;{searchQuery}&rdquo;</span>
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="hover:text-rose-600 transition-colors cursor-pointer p-0.5"
                            aria-label="Remove search filter"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {selectedJobType !== "All" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-blue-200/90 text-slate-700 text-xs shadow-2xs font-medium">
                          <span className="font-semibold">{selectedJobType}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedJobType("All")}
                            className="hover:text-rose-600 transition-colors cursor-pointer p-0.5"
                            aria-label="Remove job type filter"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {selectedCategory !== "All" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-blue-200/90 text-slate-700 text-xs shadow-2xs font-medium">
                          <span className="truncate max-w-[120px] font-semibold">{selectedCategory}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedCategory("All")}
                            className="hover:text-rose-600 transition-colors cursor-pointer p-0.5"
                            aria-label="Remove category filter"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {selectedSalary !== "All" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-blue-200/90 text-slate-700 text-xs shadow-2xs font-medium">
                          <span className="font-semibold">{selectedSalary}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedSalary("All")}
                            className="hover:text-rose-600 transition-colors cursor-pointer p-0.5"
                            aria-label="Remove salary filter"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-1 cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>

                {/* 2-COLUMN CARDS GRID: Full-Bleed on Sky-Blue Canvas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {filteredJobs.map((job) => {
                    const salary = getSalaryRange(job);
                    const timeAgo = getRelativeTime(job.created_at);
                    const isBookmarked = bookmarkedIds.has(job.id);
                    const isApplied = appliedJobIds.has(job.id);
                    const monogram = getDepartmentMonogram(job);
                    const highlights = getCardHighlights(job);
                    const isClosed = job.status === "CLOSED";
                    const expPill = getExperiencePill(job);

                    return (
                      <article
                        key={job.id}
                        tabIndex={0}
                        onClick={() => handleOpenJobDetails(job)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleOpenJobDetails(job);
                          }
                        }}
                        aria-label={`View role specifications for ${job.title} in ${monogram.label}`}
                        className="bg-white rounded-2xl p-6 sm:p-7 border border-blue-200/70 shadow-[0_4px_20px_rgba(25,136,245,0.06)] hover:shadow-[0_16px_36px_rgba(25,136,245,0.12)] hover:border-[#2196F3]/60 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3] focus-visible:ring-offset-2"
                      >
                        <div className="space-y-4">
                          {/* Top: Monogram + Title & Location + Bookmark */}
                          <div className="flex items-start justify-between gap-3.5">
                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                              {/* Canonical Brand Monogram Badge */}
                              <div className="w-11 h-11 rounded-xl bg-blue-50/90 text-[#2196F3] font-bold text-sm sm:text-base flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                                {monogram.monogram}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3
                                  className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#2196F3] tracking-tight leading-snug truncate transition-colors"
                                  title={job.title}
                                >
                                  {job.title}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                                  {monogram.label} &bull; {job.location || "Makati City, Metro Manila"}
                                </p>
                              </div>
                            </div>

                            {/* Bookmark Ribbon */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark(job.id, job.title);
                              }}
                              aria-label={isBookmarked ? `Remove bookmark for ${job.title}` : `Bookmark ${job.title}`}
                              className="p-1.5 text-slate-400 hover:text-[#2196F3] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3] rounded-lg cursor-pointer relative z-10"
                            >
                              <Bookmark
                                className={`w-5 h-5 transition-colors ${isBookmarked ? "fill-[#2196F3] text-[#2196F3]" : ""
                                  }`}
                              />
                            </button>
                          </div>

                          {/* Attribute Badges Row + Monospace Green Salary */}
                          <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-1 rounded-lg bg-blue-50/80 text-[#1976D2] text-xs font-semibold border border-blue-100">
                                {job.employment_type || "Full time"}
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200">
                                {job.location.toLowerCase().includes("remote") ? "Remote" : "On-site / Hybrid"}
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200">
                                {expPill}
                              </span>
                            </div>

                            <div className="font-mono font-bold text-emerald-600 text-xs sm:text-sm tracking-tight shrink-0 tabular-nums">
                              {salary}
                            </div>
                          </div>

                          {/* Genuine Bullets & Skill Tags (No AI Hallucinated Fluff) */}
                          <div className="space-y-2 pt-1">
                            {highlights.length > 0 && (
                              <ul className="space-y-1.5 text-xs text-slate-600">
                                {highlights.map((point, idx) => (
                                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                    <span className="text-[#2196F3] font-bold shrink-0">&bull;</span>
                                    <span className="line-clamp-1">{point}</span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {/* Real Required Skill Badges */}
                            {job.required_skills && job.required_skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {job.required_skills.slice(0, 3).map((skill, idx) => (
                                  <span
                                    key={idx}
                                    title={skill}
                                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70 max-w-[260px] truncate"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {job.required_skills.length > 3 && (
                                  <span className="text-[10px] font-mono text-slate-400 py-0.5 self-center">
                                    +{job.required_skills.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer Actions: Reusable Button + Neutral Relative Time */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4 mt-4">
                          <div className="flex items-center gap-2 relative z-10">
                            {isApplied ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNavTab("My Applications");
                                }}
                                className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Applied</span>
                              </button>
                            ) : isClosed ? (
                              <span className="bg-slate-100 text-slate-500 font-medium text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                                <Lock className="w-3 h-3 text-amber-500" />
                                <span>Closed</span>
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openApply(job);
                                }}
                                className="h-9 px-4 bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold rounded-xl shadow-2xs hover:shadow-xs transition-all text-xs cursor-pointer active:scale-[0.99]"
                              >
                                Apply this job
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenJobDetails(job);
                              }}
                              className="h-9 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
                            >
                              Details
                            </Button>
                          </div>

                          {/* Neutral Relative Time (Not emerald) */}
                          <div
                            className="text-xs font-medium text-slate-400 select-none font-mono"
                            title={job.created_at ? new Date(job.created_at).toLocaleDateString() : "Posted recently"}
                          >
                            {timeAgo}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. VIEW: MY APPLICATIONS TAB (De-containerized on Sky-Blue)     */}
        {/* ============================================================== */}
        {navTab === "My Applications" && (
          <div className="space-y-6">
            {/* Header: Direct on Sky-Blue Canvas */}
            <div className="bg-white/85 backdrop-blur-xs rounded-2xl border border-blue-200/70 p-6 sm:p-7 shadow-[0_4px_20px_rgba(25,136,245,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2196F3] flex items-center justify-center border border-blue-100 shadow-2xs">
                    <UserCheck className="w-5 h-5 text-[#2196F3]" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    My Applications
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  Track the progress, review stage, and explainable decision updates for your submitted applications.
                </p>
              </div>
              <Button
                onClick={() => setNavTab("Explore")}
                className="bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold text-xs px-5 h-10 rounded-xl transition-all shadow-2xs cursor-pointer gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Explore Open Roles</span>
              </Button>
            </div>

            {/* Status Metrics Strip: Individual White Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-blue-200/70 shadow-[0_4px_20px_rgba(25,136,245,0.06)] hover:shadow-[0_8px_24px_rgba(25,136,245,0.10)] transition-all space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Applications
                </div>
                <div className="font-mono font-extrabold text-2xl sm:text-3xl text-slate-900 tabular-nums">
                  {applications.length}
                </div>
                <p className="text-xs text-slate-500">Submitted positions</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-blue-200/70 shadow-[0_4px_20px_rgba(25,136,245,0.06)] hover:shadow-[0_8px_24px_rgba(25,136,245,0.10)] transition-all space-y-1">
                <div className="text-[11px] font-semibold text-[#1976D2] uppercase tracking-wider">
                  In Review
                </div>
                <div className="font-mono font-extrabold text-2xl sm:text-3xl text-[#2196F3] tabular-nums">
                  {pendingCount}
                </div>
                <p className="text-xs text-slate-500">Active merit evaluation in progress</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-blue-200/70 shadow-[0_4px_20px_rgba(25,136,245,0.06)] hover:shadow-[0_8px_24px_rgba(25,136,245,0.10)] transition-all space-y-1">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                  Shortlisted / Next Steps
                </div>
                <div className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-600 tabular-nums">
                  {shortlistedCount}
                </div>
                <p className="text-xs text-slate-500">Advancing in candidate pipeline</p>
              </div>
            </div>

            {/* Application List or Empty State */}
            {applications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-blue-200/80 p-12 text-center space-y-4 max-w-lg mx-auto shadow-[0_4px_20px_rgba(25,136,245,0.06)]">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2196F3] flex items-center justify-center mx-auto border border-blue-100">
                  <FileText className="w-7 h-7 text-[#2196F3]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    No applications submitted yet
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                    You haven&apos;t submitted any applications yet. Browse open positions to find roles matching your experience and skills.
                  </p>
                </div>
                <Button
                  onClick={() => setNavTab("Explore")}
                  className="bg-[#2196F3] hover:bg-[#1976D2] text-white rounded-xl text-xs font-semibold px-6 h-10 gap-2 cursor-pointer shadow-2xs"
                >
                  <Search className="w-4 h-4" />
                  <span>Explore Open Roles</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {applications.map((app) => {
                  const statusCfg = getApplicationStatusConfig(app.status);
                  const StatusIcon = statusCfg.icon;
                  const targetJob = jobs.find((j) => {
                    if (typeof app.job === "number") return j.id === app.job;
                    if (app.job && typeof app.job === "object" && "id" in (app.job as Record<string, unknown>)) {
                      return j.id === Number((app.job as { id: number | string }).id);
                    }
                    return false;
                  });

                  const formattedDate = new Date(app.applied_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  const isRejected = app.status === "REJECTED";

                  return (
                    <div
                      key={app.id}
                      className="p-5 sm:p-6 rounded-2xl border border-blue-200/70 hover:border-[#2196F3]/50 transition-all bg-white shadow-[0_4px_20px_rgba(25,136,245,0.06)] hover:shadow-[0_12px_28px_rgba(25,136,245,0.10)] space-y-4"
                    >
                      {/* Top Row: Job Title, Badges, and Status Indicator */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                              {app.job_title}
                            </h3>
                            {app.job_department && (
                              <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200/70 px-2.5 py-0.5 rounded-lg">
                                {app.job_department}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Applied {formattedDate}</span>
                            </span>
                            {app.resume && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1.5 text-slate-600 truncate max-w-[220px]">
                                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate" title={app.resume.original_filename}>
                                    {app.resume.original_filename}
                                  </span>
                                </span>
                              </>
                            )}
                            {targetJob?.location && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1.5 text-slate-500">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{targetJob.location}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Prominent Status Badge */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs border ${statusCfg.badgeClass} shadow-2xs`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{statusCfg.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Lightweight 3-Stage Progress Rail */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
                            <span className={statusCfg.stepIndex >= 0 ? "text-slate-900" : "text-slate-400"}>
                              1. Submitted
                            </span>
                            <span className={statusCfg.stepIndex >= 1 ? "text-slate-900" : "text-slate-400"}>
                              2. Under Review
                            </span>
                            <span
                              className={
                                statusCfg.stepIndex >= 2
                                  ? app.status === "SHORTLISTED"
                                    ? "text-emerald-700 font-bold"
                                    : "text-slate-900"
                                  : "text-slate-400"
                              }
                            >
                              3. {app.status === "SHORTLISTED" ? "Shortlisted" : app.status === "REJECTED" ? "Decision Made" : "Decision"}
                            </span>
                          </div>
                          {/* Visual Progress Bar */}
                          <div className="grid grid-cols-3 gap-1.5 h-1.5 rounded-full overflow-hidden bg-slate-100">
                            <div className={`h-full rounded-full ${statusCfg.stepIndex >= 0 ? "bg-[#2196F3]" : "bg-slate-200"}`} />
                            <div
                              className={`h-full rounded-full ${statusCfg.stepIndex >= 1 ? statusCfg.stepColor : "bg-slate-200"
                                }`}
                            />
                            <div
                              className={`h-full rounded-full ${statusCfg.stepIndex >= 2 ? statusCfg.stepColor : "bg-slate-200"
                                }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Contextual Status Message & Transparent Recovery */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <p className="text-xs text-slate-500">
                          {statusCfg.sublabel}
                        </p>

                        <div className="flex items-center gap-2 shrink-0">
                          {isRejected && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setNavTab("Explore")}
                              className="rounded-xl text-xs font-semibold h-9 px-3.5 border-slate-200 text-[#2196F3] hover:bg-blue-50/50 cursor-pointer"
                            >
                              Browse Similar Roles
                            </Button>
                          )}

                          {targetJob && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenJobDetails(targetJob)}
                              className="rounded-xl text-xs font-semibold h-9 px-4 gap-1.5 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                            >
                              <span>View Role Specs</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 5. MODALS & SHEET DRAWER                                       */}
      {/* ============================================================== */}
      <JobDetailSheet
        job={selectedJobForSheet}
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        onApply={(job) => {
          handleCloseSheet();
          openApply(job);
        }}
        hasApplied={selectedJobForSheet ? appliedJobIds.has(selectedJobForSheet.id) : false}
        isBookmarked={selectedJobForSheet ? bookmarkedIds.has(selectedJobForSheet.id) : false}
        onToggleBookmark={toggleBookmark}
        onViewApplication={() => setNavTab("My Applications")}
        salaryRange={selectedJobForSheet ? getSalaryRange(selectedJobForSheet) : undefined}
        onNavigateJob={handleNavigateJob}
        hasPrevJob={hasPrevJob}
        hasNextJob={hasNextJob}
      />

      <ApplyModal
        job={selectedJobForApply}
        isOpen={isApplyOpen}
        onClose={() => {
          setIsApplyOpen(false);
          setSelectedJobForApply(null);
        }}
        onApplicationCreated={(newApp) => {
          onApplicationCreated(newApp);
        }}
        onComplete={() => {
          setIsApplyOpen(false);
          setSelectedJobForApply(null);
          setNavTab("My Applications");
        }}
      />

      {/* ============================================================== */}
      {/* 6. MINIMALIST FOOTER                                           */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">TalentMatch</span>
            <span>&bull;</span>
            <span>Explainable AI Candidate Calibration & Merit Screening</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Philippine Multi-Industry Benchmark</span>
            <span>&bull;</span>
            <Link href="/" className="hover:text-slate-600 transition-colors">
              Platform Overview
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
