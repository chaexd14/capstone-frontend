"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import type { User } from "@supabase/supabase-js";
import {
  Bookmark,
  ChevronDown,
  ExternalLink,
  Loader2,
  LogIn,
  LogOut,
  Search,
  UserCheck,
  WifiOff,
  X,
} from "lucide-react";
import { ApplicantJobCard } from "./ApplicantJobCard";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { formatSalary, matchesSalaryRange, SALARY_RANGES } from "@/lib/salary";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/feedback";
import { IconButton } from "@/components/ui/icon-button";
import { NavTabs, type NavTab } from "@/components/ui/nav-tabs";
import { SearchInput } from "@/components/ui/search-input";
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollectionToolbar } from "@/components/ui/toolbar";

const ApplyModal = dynamic(() => import("./ApplyModal").then((module) => module.ApplyModal));
const JobDetailSheet = dynamic(() =>
  import("./JobDetailSheet").then((module) => module.JobDetailSheet)
);
const MyApplicationsView = dynamic(() =>
  import("./MyApplicationsView").then((module) => module.MyApplicationsView)
);
const NotificationBell = dynamic(() =>
  import("@/components/notifications/NotificationBell").then((module) => module.NotificationBell)
);

interface ApplicantPortalProps {
  jobs: Job[];
  applications: Application[];
  onApplicationCreated: (app: Application) => void;
  currentUser?: User | null;
  onLogout?: () => void;
  backendOnline?: boolean;
  hasMoreJobs?: boolean;
  hasMoreApplications?: boolean;
  loadingMore?: boolean;
  onLoadMoreJobs?: () => void;
  onLoadMoreApplications?: () => void;
}

type NavTabValue = "Explore" | "Bookmark" | "My Applications";

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

export function ApplicantPortal({
  jobs,
  applications,
  onApplicationCreated,
  currentUser,
  onLogout,
  backendOnline = true,
  hasMoreJobs = false,
  hasMoreApplications = false,
  loadingMore = false,
  onLoadMoreJobs,
  onLoadMoreApplications,
}: ApplicantPortalProps) {
  const searchParams = useSearchParams();

  // Active top navigation tab
  const tabParam = searchParams.get("tab");
  const initialNavTab: NavTabValue =
    tabParam === "MY_APPLICATIONS"
      ? "My Applications"
      : tabParam === "BOOKMARK"
        ? "Bookmark"
        : "Explore";
  const [navTab, setNavTab] = useState<NavTabValue>(initialNavTab);

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
      } catch {
        // Ignore storage read errors
      }
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
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  };

  const appliedJobIds = useMemo(() => {
    const ids = new Set<number>();
    applications.forEach((app) => {
      if (typeof app.job === "number") {
        ids.add(app.job);
      } else if (
        app.job &&
        typeof app.job === "object" &&
        "id" in (app.job as Record<string, unknown>)
      ) {
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
          (job.department.toLowerCase().includes("fin") ||
            job.department.toLowerCase().includes("account"))) ||
        (selectedCategory.includes("Engineering") &&
          job.department.toLowerCase().includes("engineer")) ||
        (selectedCategory.includes("BPO") &&
          (job.department.toLowerCase().includes("bpo") ||
            job.department.toLowerCase().includes("support"))) ||
        (selectedCategory.includes("Sales") &&
          (job.department.toLowerCase().includes("sales") ||
            job.department.toLowerCase().includes("market"))) ||
        (selectedCategory.includes("Technology") &&
          (job.department.toLowerCase().includes("tech") ||
            job.department.toLowerCase().includes("it")));

      const matchesJobType =
        selectedJobType === "All" ||
        (selectedJobType === "Remote" &&
          (job.location.toLowerCase().includes("remote") ||
            job.employment_type.toLowerCase().includes("remote"))) ||
        (selectedJobType === "Full time" && job.employment_type.toLowerCase().includes("full")) ||
        (selectedJobType === "Part time" && job.employment_type.toLowerCase().includes("part")) ||
        (selectedJobType === "Contract" && job.employment_type.toLowerCase().includes("contract")) ||
        (selectedJobType === "Hybrid" && job.location.toLowerCase().includes("hybrid"));

      const matchesSalary = matchesSalaryRange(job, selectedSalary);

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
    searchQuery !== "" ||
    selectedJobType !== "All" ||
    selectedCategory !== "All" ||
    selectedSalary !== "All";

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
    () =>
      applications.filter(
        (a) => a.status === "SHORTLISTED" || a.status === "INTERVIEW" || a.status === "HIRED"
      ).length,
    [applications]
  );

  const pendingCount = useMemo(
    () =>
      applications.filter(
        (a) =>
          !a.status ||
          a.status === "SUBMITTED" ||
          a.status === "PROCESSING" ||
          a.status === "UNDER_REVIEW" ||
          (a.status as string) === "PENDING"
      ).length,
    [applications]
  );

  const desktopPortalTabs = useMemo<NavTab[]>(
    () => [
      { id: "Explore", label: "Explore" },
      {
        id: "Bookmark",
        label: "Bookmarks",
        count: bookmarkedIds.size > 0 ? bookmarkedIds.size : undefined,
      },
      {
        id: "My Applications",
        label: "My Applications",
        count: applications.length > 0 ? applications.length : undefined,
      },
    ],
    [bookmarkedIds.size, applications.length]
  );

  const mobilePortalTabs = useMemo<NavTab[]>(
    () => [
      { id: "Explore", label: "Explore" },
      {
        id: "Bookmark",
        label: "Saved",
        count: bookmarkedIds.size > 0 ? bookmarkedIds.size : undefined,
      },
      {
        id: "My Applications",
        label: "Applications",
        count: applications.length > 0 ? applications.length : undefined,
      },
    ],
    [bookmarkedIds.size, applications.length]
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* ============================================================== */}
      {/* 1. CANONICAL STICKY HEADER                                     */}
      {/* ============================================================== */}
      <header className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Identity */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-sm tracking-tight">
              TM
            </div>
            <span className="font-bold text-lg sm:text-xl tracking-tight text-foreground">
              TalentMatch
            </span>
          </Link>

          {/* Center: Desktop Home Link + Canonical NavTabs */}
          <div className="hidden md:flex items-center gap-6 h-full">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Home
            </Link>
            <NavTabs
              label="Portal navigation"
              value={navTab}
              onValueChange={(next) => setNavTab(next as NavTabValue)}
              tabs={desktopPortalTabs}
              className="border-b-0 w-auto"
            />
          </div>

          {/* Right: Notification Bell + Canonical Radix DropdownMenu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser && <NotificationBell role="applicant" userId={currentUser.id} />}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="User account menu"
                  className="rounded-full px-1.5 gap-1.5"
                >
                  <Avatar className="size-8 border border-border">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuLabel className="p-2.5 rounded-lg bg-muted/60 font-normal space-y-1">
                  <p className="font-bold text-sm text-foreground truncate">{displayName}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {currentUser?.email || "Guest Session"}
                  </p>
                  <div className="pt-1">
                    <Badge variant="secondary" className="gap-1">
                      <UserCheck className="size-3.5" aria-hidden="true" />
                      <span>Candidate Profile</span>
                    </Badge>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onSelect={() => setNavTab("My Applications")}
                  className="justify-between"
                >
                  <span>Submitted Applications</span>
                  <span className="font-semibold text-muted-foreground tabular-nums">
                    {applications.length}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={() => setNavTab("Bookmark")}
                  className="justify-between"
                >
                  <span>Saved Positions</span>
                  <span className="font-semibold text-muted-foreground tabular-nums">
                    {bookmarkedIds.size}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/admin" className="justify-between">
                    <span>Switch to Recruiter Portal</span>
                    <ExternalLink className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {currentUser ? (
                  <DropdownMenuItem asChild>
                    <Link href="/account">
                      <UserCheck aria-hidden="true" />
                      <span>Account settings</span>
                    </Link>
                  </DropdownMenuItem>
                ) : null}

                {currentUser ? (
                  <DropdownMenuItem
                    onSelect={() => {
                      if (onLogout) onLogout();
                    }}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 font-semibold"
                  >
                    <LogOut aria-hidden="true" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild className="text-primary font-semibold">
                    <Link href="/applicant/login">
                      <LogIn aria-hidden="true" />
                      <span>Sign In to Account</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Canonical NavTabs (< md viewports) */}
        <div className="md:hidden border-t border-border bg-card px-2">
          <NavTabs
            label="Mobile portal navigation"
            value={navTab}
            onValueChange={(next) => setNavTab(next as NavTabValue)}
            tabs={mobilePortalTabs}
            fullWidth
            className="border-b-0"
          />
        </div>
      </header>

      {/* Offline Alert Banner */}
      {!backendOnline && (
        <div
          role="status"
          className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-900 text-center flex items-center justify-center gap-2 font-medium"
        >
          <WifiOff className="size-4 text-warning shrink-0" aria-hidden="true" />
          <span>
            TalentMatch API is operating in offline mode. Live evaluations may be delayed until reconnect.
          </span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MAIN CONTENT                                                */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Canonical Floating Search & Filter Card */}
        {navTab !== "My Applications" && (
          <Card className="p-3 sm:p-4 shadow-md">
            <CollectionToolbar
              label="Open position filters"
              search={
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery("")}
                  placeholder="Search by job title, skill, or city..."
                  aria-label="Search by job title, skill, or city"
                  containerClassName="w-full md:min-w-64 md:flex-1"
                />
              }
              filterFields={[
                {
                  id: "jobType",
                  label: "Job type",
                  value: selectedJobType,
                  defaultValue: "All",
                  options: JOB_TYPES.map((type) => ({
                    value: type,
                    label: type === "All" ? "All job types" : type,
                  })),
                },
                {
                  id: "category",
                  label: "Category",
                  value: selectedCategory,
                  defaultValue: "All",
                  triggerClassName: "w-48",
                  options: CATEGORIES.map((category) => ({
                    value: category,
                    label: category === "All" ? "All categories" : category,
                  })),
                },
                {
                  id: "salary",
                  label: "Salary range",
                  value: selectedSalary,
                  defaultValue: "All",
                  triggerClassName: "w-44",
                  options: SALARY_RANGES.map((salary) => ({
                    value: salary,
                    label: salary === "All" ? "All salary ranges" : salary,
                  })),
                },
              ]}
              onFilterValuesChange={(values) => {
                setSelectedJobType(values.jobType);
                setSelectedCategory(values.category);
                setSelectedSalary(values.salary);
              }}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={resetFilters}
              clearLabel="Reset"
            />
          </Card>
        )}

        {/* Explore & Bookmark Views */}
        {navTab !== "My Applications" && (
          <div className="space-y-6">
            {navTab === "Bookmark" && (
              <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                      <Bookmark className="size-4 fill-primary text-primary" aria-hidden="true" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      Saved Positions
                    </h1>
                    <StatusBadge status="info" className="tabular-nums">
                      {bookmarkedIds.size} saved
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-[70ch]">
                    Roles you have bookmarked for comparison, rubric evaluation review, and application.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNavTab("Explore")}
                  className="self-start sm:self-auto shrink-0"
                >
                  <Search aria-hidden="true" />
                  <span>Browse All Positions</span>
                </Button>
              </Card>
            )}

            {filteredJobs.length === 0 ? (
              <Card className="rounded-3xl">
                <EmptyState
                  title={
                    navTab === "Bookmark"
                      ? "No bookmarked positions yet"
                      : "No positions found"
                  }
                  description={
                    navTab === "Bookmark"
                      ? "Click the bookmark icon on any role card to save it for quick reference and tracking."
                      : "We couldn't find any job postings matching your current search or filters. Try adjusting your keywords or resetting filters."
                  }
                  actionLabel={
                    navTab === "Bookmark" ? "Browse Open Positions" : "Reset Search Filters"
                  }
                  onAction={navTab === "Bookmark" ? () => setNavTab("Explore") : resetFilters}
                />
              </Card>
            ) : (
              <div className="space-y-5">
                {/* Results Count + Removable Active Filter Chips */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                      {navTab === "Bookmark" ? "Saved Roles" : "Available Positions"}
                    </h1>
                    <StatusBadge status="info" className="tabular-nums">
                      {filteredJobs.length} {filteredJobs.length === 1 ? "role" : "roles"}
                    </StatusBadge>
                    <span className="hidden sm:inline text-sm text-muted-foreground">
                      {hasActiveFilters
                        ? "Filtered results"
                        : "Evaluated on explainable merit rubrics"}
                    </span>
                  </div>

                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {searchQuery && (
                        <Badge
                          variant="secondary"
                          className="rounded-full gap-1 pl-3 pr-1 py-0.5"
                        >
                          <span>&ldquo;{searchQuery}&rdquo;</span>
                          <IconButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            label="Remove search filter"
                            onClick={() => setSearchQuery("")}
                            className="size-6 rounded-full text-muted-foreground hover:text-destructive"
                          >
                            <X aria-hidden="true" />
                          </IconButton>
                        </Badge>
                      )}
                      {selectedJobType !== "All" && (
                        <Badge
                          variant="secondary"
                          className="rounded-full gap-1 pl-3 pr-1 py-0.5"
                        >
                          <span>{selectedJobType}</span>
                          <IconButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            label="Remove job type filter"
                            onClick={() => setSelectedJobType("All")}
                            className="size-6 rounded-full text-muted-foreground hover:text-destructive"
                          >
                            <X aria-hidden="true" />
                          </IconButton>
                        </Badge>
                      )}
                      {selectedCategory !== "All" && (
                        <Badge
                          variant="secondary"
                          className="rounded-full gap-1 pl-3 pr-1 py-0.5"
                        >
                          <span className="truncate max-w-[140px]">{selectedCategory}</span>
                          <IconButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            label="Remove category filter"
                            onClick={() => setSelectedCategory("All")}
                            className="size-6 rounded-full text-muted-foreground hover:text-destructive"
                          >
                            <X aria-hidden="true" />
                          </IconButton>
                        </Badge>
                      )}
                      {selectedSalary !== "All" && (
                        <Badge
                          variant="secondary"
                          className="rounded-full gap-1 pl-3 pr-1 py-0.5"
                        >
                          <span>{selectedSalary}</span>
                          <IconButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            label="Remove salary filter"
                            onClick={() => setSelectedSalary("All")}
                            className="size-6 rounded-full text-muted-foreground hover:text-destructive"
                          >
                            <X aria-hidden="true" />
                          </IconButton>
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={resetFilters}
                        className="h-auto p-0 text-destructive hover:text-destructive/80"
                      >
                        Clear all
                      </Button>
                    </div>
                  )}
                </div>

                {/* 2-Column Enhanced Applicant Job Cards */}
                <div
                  className={
                    filteredJobs.length === 1
                      ? "mx-auto max-w-3xl"
                      : "grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
                  }
                >
                  {filteredJobs.map((job) => (
                    <ApplicantJobCard
                      key={job.id}
                      job={job}
                      isBookmarked={bookmarkedIds.has(job.id)}
                      isApplied={appliedJobIds.has(job.id)}
                      onOpenDetails={handleOpenJobDetails}
                      onApply={openApply}
                      onToggleBookmark={toggleBookmark}
                      onViewApplications={() => setNavTab("My Applications")}
                    />
                  ))}
                </div>

                {hasMoreJobs && navTab === "Explore" && onLoadMoreJobs ? (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onLoadMoreJobs}
                      disabled={loadingMore}
                    >
                      {loadingMore ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                      <span>{loadingMore ? "Loading positions…" : "Load more positions"}</span>
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* My Applications View */}
        {navTab === "My Applications" && (
          <MyApplicationsView
            applications={applications}
            jobs={jobs}
            pendingCount={pendingCount}
            shortlistedCount={shortlistedCount}
            hasMoreApplications={hasMoreApplications}
            loadingMore={loadingMore}
            onLoadMoreApplications={onLoadMoreApplications}
            onExplore={() => setNavTab("Explore")}
            onOpenJobDetails={handleOpenJobDetails}
          />
        )}
      </main>

      {/* ============================================================== */}
      {/* 3. MODALS & SHEET DRAWER                                       */}
      {/* ============================================================== */}
      {selectedJobForSheet && <JobDetailSheet
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
        salaryRange={selectedJobForSheet ? formatSalary(selectedJobForSheet) : undefined}
        onNavigateJob={handleNavigateJob}
        hasPrevJob={hasPrevJob}
        hasNextJob={hasNextJob}
      />}

      {selectedJobForApply && <ApplyModal
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
      />}

      {/* ============================================================== */}
      {/* 4. SHARED CANONICAL PUBLIC FOOTER                              */}
      {/* ============================================================== */}
      <PublicFooter />
    </div>
  );
}
