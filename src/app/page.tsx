"use client";

import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { fetchApi, type PaginatedResponse } from "@/lib/api";
import { Job } from "@/types/job";
import { SALARY_RANGES } from "@/lib/salary";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  FeaturedJobCard,
  StandardJobCard,
} from "@/components/landing/LandingJobCards";

const CATEGORIES = [
  "All",
  "Information Technology",
  "Finance & Accounting",
  "Engineering & Construction",
  "Sales & Business Development",
  "Healthcare & Medical",
  "BPO & Customer Support",
];

const JOB_TYPES = [
  "All",
  "Full time",
  "Part time",
  "Remote",
  "Hybrid",
  "Contract",
];

const QUICK_SEARCHES = [
  { label: "Software Engineer", q: "Software Engineer", category: "All", type: "All" },
  { label: "Accountant / CPA", q: "CPA", category: "Finance & Accounting", type: "All" },
  { label: "Registered Nurse", q: "Nurse", category: "Healthcare & Medical", type: "All" },
  { label: "Network Engineer", q: "Network", category: "Information Technology", type: "All" },
  { label: "Remote Roles", q: "", category: "All", type: "Remote" },
];

const FALLBACK_JOBS: Job[] = [
  {
    id: 101,
    title: "Senior Full-Stack Software Engineer",
    department: "Information Technology",
    location: "Makati City, Metro Manila",
    employment_type: "Full time",
    minimum_experience: "5+ yrs",
    education_requirement: "BS Computer Science or related field",
    description:
      "Architect and maintain scalable Next.js and Python services.\nCollaborate with product and engineering leads on core platform delivery.",
    job_overview:
      "Join a product engineering team building dependable tools that help recruiters make structured, evidence-led hiring decisions.",
    required_skills: ["TypeScript", "React / Next.js", "Python", "PostgreSQL"],
    preferred_skills: ["Docker", "Tailwind CSS", "Redis"],
    salary_min: 75_000,
    salary_max: 110_000,
    status: "PUBLISHED",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 102,
    title: "Senior Certified Public Accountant (CPA)",
    department: "Finance & Accounting",
    location: "Makati / Hybrid",
    employment_type: "Full time",
    minimum_experience: "3+ yrs",
    education_requirement: "BS Accountancy with active PRC CPA license",
    description:
      "Lead statutory financial reporting, internal audit compliance, and tax reviews.\nPartner with operational units on monthly closing and variance analysis.",
    job_overview:
      "Guide financial accuracy and compliance while partnering with operational leaders across a growing organization.",
    required_skills: ["PRC CPA", "Financial Reporting", "Tax Compliance", "SAP"],
    preferred_skills: ["Oracle Financials", "QuickBooks"],
    salary_min: 75_000,
    salary_max: 110_000,
    status: "PUBLISHED",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 103,
    title: "Civil Site Project Engineer",
    department: "Engineering & Construction",
    location: "Taguig (BGC) / Site",
    employment_type: "Full time",
    minimum_experience: "2-3 yrs",
    education_requirement: "BS Civil Engineering with PRC license",
    description:
      "Supervise structural site execution, contractor schedules, and quality assurance.\nPrepare quantity takeoffs, progress billing, and AutoCAD revisions.",
    job_overview:
      "Help deliver complex construction projects by coordinating safe, accurate, and timely work across the project site.",
    required_skills: ["PRC Civil Engineer", "AutoCAD", "Site Supervision", "Project Estimation"],
    preferred_skills: ["Primavera P6", "Revit"],
    salary_min: 60_000,
    salary_max: 95_000,
    status: "PUBLISHED",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 104,
    title: "B2B Corporate Sales & Account Executive",
    department: "Sales & Business Development",
    location: "Mandaluyong / Hybrid",
    employment_type: "Full time",
    minimum_experience: "2+ yrs",
    education_requirement: "Bachelor's Degree in Business or related field",
    description:
      "Manage full-cycle enterprise client acquisition and strategic account expansion.\nConduct executive product briefings, commercial proposals, and contract closures.",
    job_overview:
      "Build lasting enterprise partnerships and help customers adopt solutions that support measurable business growth.",
    required_skills: ["B2B Sales", "Lead Generation", "Pipeline Management", "Negotiation"],
    preferred_skills: ["HubSpot CRM", "Enterprise Software Sales"],
    salary_min: 50_000,
    salary_max: 75_000,
    status: "PUBLISHED",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 105,
    title: "Registered Staff Nurse (Emergency & Critical Care)",
    department: "Healthcare & Medical",
    location: "Quezon City / On-site",
    employment_type: "Full time",
    minimum_experience: "1-2 yrs",
    education_requirement: "BS Nursing with active PRC RN & BLS/ACLS certification",
    description:
      "Deliver acute patient triage, vital telemetry monitoring, and emergency care protocols.\nCoordinate multidisciplinary treatment plans with attending physicians.",
    job_overview:
      "Join a multidisciplinary clinical team providing responsive, compassionate care in critical patient moments.",
    required_skills: ["PRC Registered Nurse", "BLS / ACLS", "Emergency Triage", "Patient Telemetry"],
    preferred_skills: ["IV Therapy Certified", "Hospital Information Systems"],
    salary_min: 35_000,
    salary_max: 60_000,
    status: "PUBLISHED",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function matchesCategory(job: Job, category: string): boolean {
  if (category === "All") return true;
  const dept = (job.department || "").toLowerCase();
  const cat = category.toLowerCase();
  return dept.includes(cat.split(" ")[0]);
}

export default function HomePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSalary, setSelectedSalary] = useState("All");

  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set<number>();
    try {
      const saved = localStorage.getItem("talentmatch_bookmarked_jobs");
      return saved ? new Set<number>(JSON.parse(saved)) : new Set<number>();
    } catch {
      return new Set<number>();
    }
  });

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const cached = sessionStorage.getItem("tm_cached_jobs");
        if (cached) setJobs(JSON.parse(cached));
      } catch {
        // Ignore storage read errors
      }
      try {
        const data = await fetchApi<PaginatedResponse<Job>>("/jobs/?page=1&page_size=6");
        setJobs(data.results);
        try {
          sessionStorage.setItem("tm_cached_jobs", JSON.stringify(data.results));
        } catch {
          // Ignore storage write errors
        }
      } catch {
        // Fallback jobs remain available when backend is unreachable
      }
    };
    loadJobs();
  }, []);

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

  const buildPortalUrl = (
    q: string,
    type: string = selectedJobType,
    category: string = selectedCategory,
    salary: string = selectedSalary
  ) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (type && type !== "All") params.set("type", type);
    if (category && category !== "All") params.set("category", category);
    if (salary && salary !== "All") params.set("salary", salary);
    const qs = params.toString();
    return qs ? `/careers?${qs}` : "/careers";
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildPortalUrl(searchQuery, selectedJobType, selectedCategory, selectedSalary));
  };

  const allOpenJobs = useMemo(() => {
    return jobs.length > 0
      ? jobs
          .filter((j) => j.status !== "ARCHIVED" && j.status !== "DRAFT" && j.status !== "CLOSED")
          .sort((a, b) => {
            const aIsTest = a.title.toLowerCase().includes("test") ? 1 : 0;
            const bIsTest = b.title.toLowerCase().includes("test") ? 1 : 0;
            if (aIsTest !== bIsTest) return aIsTest - bIsTest;
            return (b.required_skills?.length || 0) - (a.required_skills?.length || 0);
          })
      : FALLBACK_JOBS;
  }, [jobs]);

  const activeJobs = useMemo(() => {
    return allOpenJobs.filter((j) => matchesCategory(j, selectedCategory)).slice(0, 5);
  }, [allOpenJobs, selectedCategory]);

  const getTargetHref = (job: Job) =>
    jobs.length > 0
      ? `/careers?jobId=${job.id}`
      : `/careers?q=${encodeURIComponent(job.title)}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* ============================================================== */}
      {/* 1. TOP NAVBAR (Center Nav revealed when scrolled)              */}
      {/* ============================================================== */}
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-40 transition-all duration-200",
          isScrolled
            ? "bg-card/95 backdrop-blur-md border-b border-border shadow-xs"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Identity */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div
              className={cn(
                "grid size-8 place-items-center rounded-lg font-bold text-sm tracking-tight transition-colors",
                isScrolled
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-primary"
              )}
            >
              TM
            </div>
            <span
              className={cn(
                "whitespace-nowrap font-bold text-lg sm:text-xl tracking-tight transition-colors",
                isScrolled ? "text-foreground" : "text-primary-foreground"
              )}
            >
              TalentMatch
            </span>
          </Link>

          {/* Center Navigation: Revealed when scrolled */}
          <nav
            className={cn(
              "hidden md:flex items-center gap-8 h-full transition-all duration-200",
              isScrolled
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-2 pointer-events-none"
            )}
            aria-label="Primary navigation"
          >
            <Link
              href="/"
              className="text-primary font-bold text-sm relative h-full flex items-center px-1"
            >
              <span>Home</span>
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />
            </Link>
            <Link
              href="/careers"
              className="text-muted-foreground hover:text-foreground font-semibold text-sm h-full flex items-center px-1 transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/careers?tab=BOOKMARK"
              className="text-muted-foreground hover:text-foreground font-semibold text-sm h-full flex items-center gap-1.5 px-1 transition-colors"
            >
              <span>Bookmarks</span>
              {mounted && bookmarkedIds.size > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-full px-2 py-0.5 tabular-nums"
                >
                  {bookmarkedIds.size}
                </Badge>
              )}
            </Link>
          </nav>

          {/* Right Auth Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                !isScrolled &&
                  "text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
              )}
            >
              <Link href="/applicant/login">Log in</Link>
            </Button>
            <Button
              asChild
              variant={isScrolled ? "default" : "secondary"}
              size="sm"
              className={cn(
                !isScrolled && "bg-card text-primary hover:bg-card/90 shadow-xs"
              )}
            >
              <Link href="/applicant/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-background">
        {/* ============================================================== */}
        {/* 2. BRAND-BLUE HERO BANNER                                      */}
        {/* ============================================================== */}
        <section className="relative bg-primary text-primary-foreground pt-24 pb-20 sm:pt-28 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Subtle architectural grid lines permitted on saturated brand-blue hero fields */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:48px_48px]"
          />

          <div className="relative max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-primary-foreground leading-[1.1] text-balance animate-fade-in-up">
              Find the job that fits your skills, not just your keywords.
            </h1>

            <p className="mt-4 text-sm sm:text-lg text-blue-50 max-w-[65ch] mx-auto leading-relaxed">
              Search verified openings across technology, finance, healthcare, and engineering. Pick a role below or search to jump straight into the Applicant Portal.
            </p>

            {/* Quick-Search Chips */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-blue-50 font-medium mr-1">Popular:</span>
              {QUICK_SEARCHES.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(buildPortalUrl(item.q, item.type, item.category, "All"))
                  }
                  className="rounded-full bg-white/15 text-primary-foreground hover:bg-card hover:text-primary"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. FLOATING CANONICAL SEARCH & FILTER CARD                     */}
        {/* ============================================================== */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-10 relative z-20">
          <Card className="p-3 sm:p-4 shadow-md">
            <form
              onSubmit={handleSearchSubmit}
              aria-label="Search open jobs and redirect to Applicant Portal"
              className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3"
            >
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
                placeholder="Search by job title, skill, or city..."
                aria-label="Search by job title, skill, or city"
                containerClassName="flex-1 min-w-0"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:items-center gap-2.5">
                {/* Job Type */}
                <Select
                  value={selectedJobType}
                  onValueChange={(val) => setSelectedJobType(val || "All")}
                >
                  <SelectTrigger
                    aria-label="Filter by job type"
                    className="w-full lg:w-36"
                  >
                    <SelectValue placeholder="Job Type">
                      {selectedJobType === "All" ? "All Job Types" : selectedJobType}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type === "All" ? "All Job Types" : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Category */}
                <Select
                  value={selectedCategory}
                  onValueChange={(val) => setSelectedCategory(val || "All")}
                >
                  <SelectTrigger
                    aria-label="Filter by category"
                    className="w-full lg:w-48"
                  >
                    <SelectValue placeholder="Category">
                      {selectedCategory === "All" ? "All Categories" : selectedCategory}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "All" ? "All Categories" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Salary Range */}
                <Select
                  value={selectedSalary}
                  onValueChange={(val) => setSelectedSalary(val || "All")}
                >
                  <SelectTrigger
                    aria-label="Filter by salary range"
                    className="w-full lg:w-44"
                  >
                    <SelectValue placeholder="Salary range">
                      {selectedSalary === "All" ? "All Salary Ranges" : selectedSalary}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_RANGES.map((sal) => (
                      <SelectItem key={sal} value={sal}>
                        {sal === "All" ? "All Salary Ranges" : sal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="shrink-0">
                <Search aria-hidden="true" />
                <span>Search</span>
              </Button>
            </form>
          </Card>
        </div>

        {/* ============================================================== */}
        {/* 4. OPEN POSITIONS STAGE                                        */}
        {/* ============================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Open Positions
                </h2>
                <StatusBadge status="info" className="tabular-nums">
                  {allOpenJobs.length} Open Roles
                </StatusBadge>
              </div>
              <p className="text-sm text-muted-foreground max-w-[70ch]">
                Select any role below to view full qualifications and apply in the Applicant Portal.
              </p>
            </div>

            <Button asChild variant="outline" className="self-start sm:self-auto shrink-0">
              <Link
                href={buildPortalUrl(
                  searchQuery,
                  selectedJobType,
                  selectedCategory,
                  selectedSalary
                )}
              >
                <span>View all in Applicant Portal</span>
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {activeJobs.length === 0 ? (
            <Card>
              <EmptyState
                title="No open roles in this department"
                description="There are currently no published openings in this category. View all departments or explore the full Applicant Portal."
                actionLabel="Show all departments"
                onAction={() => setSelectedCategory("All")}
              />
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Featured Spotlight Role */}
              <FeaturedJobCard
                job={activeJobs[0]}
                targetHref={getTargetHref(activeJobs[0])}
                isBookmarked={mounted && bookmarkedIds.has(activeJobs[0].id)}
                onToggleBookmark={toggleBookmark}
              />

              {/* 2-Column Grid of Remaining Open Roles */}
              {activeJobs.length > 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {activeJobs.slice(1, 5).map((job) => (
                    <StandardJobCard
                      key={job.id}
                      job={job}
                      targetHref={getTargetHref(job)}
                      isBookmarked={mounted && bookmarkedIds.has(job.id)}
                      onToggleBookmark={toggleBookmark}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* ============================================================== */}
      {/* 5. SHARED CANONICAL PUBLIC FOOTER & LEGAL MODAL                */}
      {/* ============================================================== */}
      <PublicFooter />
    </div>
  );
}
