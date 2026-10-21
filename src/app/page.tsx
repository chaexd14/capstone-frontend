"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bookmark,
  ArrowRight,
  X,
  MapPin,
  GraduationCap,
  Terminal,
  Landmark,
  HardHat,
  TrendingUp,
  Stethoscope,
  Briefcase,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { Job } from "@/types/job";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

const SALARY_RANGES = [
  "All",
  "₱25,000 - ₱45,000",
  "₱45,000 - ₱70,000",
  "₱70,000 - ₱100,000",
  "₱100,000+",
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
    required_skills: ["TypeScript", "React / Next.js", "Python", "PostgreSQL"],
    preferred_skills: ["Docker", "Tailwind CSS", "Redis"],
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
    required_skills: ["PRC CPA", "Financial Reporting", "Tax Compliance", "SAP"],
    preferred_skills: ["Oracle Financials", "QuickBooks"],
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
    required_skills: ["PRC Civil Engineer", "AutoCAD", "Site Supervision", "Project Estimation"],
    preferred_skills: ["Primavera P6", "Revit"],
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
    required_skills: ["B2B Sales", "Lead Generation", "Pipeline Management", "Negotiation"],
    preferred_skills: ["HubSpot CRM", "Enterprise Software Sales"],
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
    required_skills: ["PRC Registered Nurse", "BLS / ACLS", "Emergency Triage", "Patient Telemetry"],
    preferred_skills: ["IV Therapy Certified", "Hospital Information Systems"],
    status: "PUBLISHED",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function getSalaryRange(job: Job): string {
  const title = (job.title || "").toLowerCase();
  const dept = (job.department || "").toLowerCase();
  if (dept.includes("bpo") || dept.includes("support")) {
    return "₱28,000 - ₱45,000";
  }
  if (title.includes("lead") || title.includes("director") || title.includes("principal")) {
    return "₱120,000 - ₱180,000";
  }
  if (title.includes("senior") || title.includes("sr.")) {
    return "₱75,000 - ₱110,000";
  }
  if (title.includes("entry") || title.includes("junior") || title.includes("associate") || title.includes("fresh")) {
    return "₱25,000 - ₱38,000";
  }
  if (dept.includes("tech") || dept.includes("engineer")) {
    return "₱60,000 - ₱95,000";
  }
  if (dept.includes("finance") || dept.includes("account")) {
    return "₱45,000 - ₱70,000";
  }
  if (dept.includes("health") || dept.includes("medical")) {
    return "₱35,000 - ₱60,000";
  }
  return "₱45,000 - ₱75,000";
}

function getExperiencePill(job: Job): string {
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

interface DepartmentMeta {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function getDepartmentMeta(job: Job): DepartmentMeta {
  const dept = (job.department || "").toLowerCase();
  const title = (job.title || "").toLowerCase();

  if (title.includes("python") || title.includes("react") || title.includes("full stack") || title.includes("full-stack") || title.includes("software")) {
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

function getRoleSummary(job: Job): string {
  if (job.description) {
    const clean = job.description
      .split(/\r?\n|•|\* |(?<=[.!?])\s+/)
      .map((l) => l.trim().replace(/^[-*•\s]+/, ""))
      .find((l) => l.length > 25 && !/^(qualifications?|requirements?|how to apply)/i.test(l));
    if (clean) return clean.endsWith(".") ? clean : `${clean}.`;
  }
  return `Drive core execution and high-impact project outcomes across the ${job.department || "specialized"} team.`;
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
    return "Just now";
  } catch {
    return "Just now";
  }
}

export default function HomePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSalary, setSelectedSalary] = useState("All");

  const [mounted, setMounted] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeModal, setActiveModal] = useState<"terms" | "privacy" | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("talentmatch_bookmarked_jobs");
      if (saved) setBookmarkedIds(new Set<number>(JSON.parse(saved)));
    } catch { }
  }, []);

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
      } catch { }
      try {
        const data = await fetchApi<Job[]>("/jobs/");
        setJobs(data);
        try {
          sessionStorage.setItem("tm_cached_jobs", JSON.stringify(data));
        } catch { }
      } catch { }
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
      } catch { }
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
    const filtered = allOpenJobs.filter((j) => {
      if (selectedCategory !== "All") {
        const dept = (j.department || "").toLowerCase();
        const cat = selectedCategory.toLowerCase();
        if (!dept.includes(cat.split(" ")[0])) return false;
      }
      return true;
    });
    return (filtered.length > 0 ? filtered : allOpenJobs).slice(0, 6);
  }, [allOpenJobs, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#e3f1fe] text-[#1e293b] flex flex-col font-sans selection:bg-[#2196F3] selection:text-white">
      {/* ============================================================== */}
      {/* 1. TOP NAVBAR (Center Nav revealed only when scrolled)         */}
      {/* ============================================================== */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-xs"
          : "bg-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
          {/* Left Brand Identity */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div
              className={`w-8 h-8 rounded-lg font-bold text-sm flex items-center justify-center tracking-tight shadow-2xs transition-colors duration-200 ${isScrolled ? "bg-[#2196F3] text-white" : "bg-white text-[#1988f5]"
                }`}
            >
              TM
            </div>
            <span
              className={`font-bold text-lg sm:text-xl tracking-tight transition-colors duration-200 ${isScrolled ? "text-[#1e293b]" : "text-white"
                }`}
            >
              Talent Match
            </span>
          </Link>

          {/* Center Navigation: ONLY visible when scrolled */}
          <nav
            className={`hidden md:flex items-center gap-9 h-full transition-all duration-300 transform ${isScrolled
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-2 pointer-events-none"
              }`}
            aria-label="Primary navigation"
          >
            <Link
              href="/"
              className="text-[#2196F3] font-bold text-sm relative h-full flex items-center px-1"
            >
              <span>Home</span>
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2196F3] rounded-t-full" />
            </Link>
            <Link
              href="/careers"
              className="text-slate-700 hover:text-[#1e293b] font-semibold text-sm h-full flex items-center px-1 transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/careers?tab=BOOKMARK"
              className="text-slate-700 hover:text-[#1e293b] font-semibold text-sm h-full flex items-center gap-1.5 px-1 transition-colors"
            >
              <span>Bookmark</span>
              {mounted && bookmarkedIds.size > 0 && (
                <span className="h-4.5 px-1.5 rounded-full bg-blue-50 text-[#2196F3] text-[10px] font-bold border border-blue-200 flex items-center justify-center tabular-nums">
                  {bookmarkedIds.size}
                </span>
              )}
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/applicant/login"
              className={`text-xs sm:text-sm font-semibold px-2.5 py-2 rounded-lg transition-colors duration-200 ${isScrolled ? "text-slate-700 hover:text-[#1e293b]" : "text-white hover:bg-white/10"
                }`}
            >
              Log in
            </Link>
            <Link
              href="/applicant/signup"
              className={`text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-200 shadow-2xs ${isScrolled
                ? "bg-[#2196F3] hover:bg-[#1976D2] text-white"
                : "bg-white hover:bg-white/90 text-[#1988f5]"
                }`}
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-[#e3f1fe]">
        {/* ============================================================== */}
        {/* 2. BOLD #2196F3 BLUE HERO BANNER (Matches Login.png Blue)      */}
        {/* ============================================================== */}
        <section className="relative bg-[#1988f5] text-white pt-24 pb-20 sm:pt-28 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Subtle architectural grid lines inside the blue field */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:48px_48px]"
          />

          <div className="relative max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-white leading-[1.1] text-balance animate-fade-in-up">
              Find the job that fits your skills, not just your keywords.
            </h1>

            <p className="mt-4 text-sm sm:text-lg text-[#e0f2fe] max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-75">
              Search verified openings across technology, finance, healthcare, and engineering. Pick a role below or search to jump straight into the Applicant Portal.
            </p>

            {/* Quick-Search Chips inside Hero */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm animate-fade-in animation-delay-150">
              <span className="text-[#e0f2fe] font-medium mr-1">Popular:</span>
              {QUICK_SEARCHES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    router.push(buildPortalUrl(item.q, item.type, item.category, "All"))
                  }
                  className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white text-white hover:text-[#1988f5] font-medium transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. FLOATING PILL SEARCH BAR (Bridges Hero & #e3f1fe Canvas)    */}
        {/* ============================================================== */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-9 sm:-mt-10 relative z-20 animate-float-in animation-delay-150">
          <form
            onSubmit={handleSearchSubmit}
            aria-label="Search open jobs and redirect to Applicant Portal"
            className="bg-white rounded-3xl lg:rounded-full border border-blue-200/90 p-3 sm:px-5 sm:py-3 shadow-[0_14px_36px_rgba(25,136,245,0.14)] focus-within:border-[#2196F3] focus-within:ring-4 focus-within:ring-[#2196F3]/15 transition-all flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3"
          >
            {/* Left: Pill Search Input with Circular #2196F3 Search Button */}
            <div className="relative flex-1 flex items-center min-w-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by job title, skill, or city..."
                aria-label="Search by job title, skill, or city"
                className="w-full pl-4 pr-20 py-2.5 rounded-full border border-slate-300/90 bg-slate-50/50 focus:bg-white text-sm sm:text-base text-[#1e293b] placeholder:text-slate-500 focus:outline-none focus:border-[#2196F3] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search input"
                  className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                aria-label="Search jobs in Applicant Portal"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#2196F3] hover:bg-[#1976D2] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Right: Inline Dropdown Filters (Matches Applicant portal.png) */}
            <div className="flex items-center justify-around sm:justify-end gap-1 sm:gap-2 flex-nowrap px-1">
              {/* Job Type */}
              <Select
                value={selectedJobType}
                onValueChange={(val) => setSelectedJobType(val ?? "All")}
              >
                <SelectTrigger
                  aria-label="Filter by job type"
                  className="!w-auto shrink-0 inline-flex border-0 shadow-none bg-transparent hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm px-2.5 h-9 rounded-lg gap-1 cursor-pointer focus:ring-0 focus:ring-offset-0 whitespace-nowrap"
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

              {/* Category */}
              <Select
                value={selectedCategory}
                onValueChange={(val) => setSelectedCategory(val ?? "All")}
              >
                <SelectTrigger
                  aria-label="Filter by category"
                  className="!w-auto shrink-0 inline-flex border-0 shadow-none bg-transparent hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm px-2.5 h-9 rounded-lg gap-1 cursor-pointer focus:ring-0 focus:ring-offset-0 whitespace-nowrap"
                >
                  <span className={`truncate max-w-[110px] sm:max-w-[160px] ${selectedCategory !== "All" ? "text-[#2196F3] font-semibold" : "text-slate-700"}`}>
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

              {/* Salary Range */}
              <Select
                value={selectedSalary}
                onValueChange={(val) => setSelectedSalary(val ?? "All")}
              >
                <SelectTrigger
                  aria-label="Filter by salary range"
                  className="!w-auto shrink-0 inline-flex border-0 shadow-none bg-transparent hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm px-2.5 h-9 rounded-lg gap-1 cursor-pointer focus:ring-0 focus:ring-offset-0 whitespace-nowrap"
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
            </div>
          </form>
        </div>

        {/* ============================================================== */}
        {/* 4. OPEN POSITIONS STAGE (Full-Bleed #e3f1fe Sky-Blue Canvas)   */}
        {/* ============================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-16 space-y-5">
          {/* Compact Section Header + Department Filter Toolbar Directly on #e3f1fe */}
          <div className="flex flex-col gap-4 animate-fade-in-up animation-delay-225">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1e293b]">
                  Open Positions
                </h2>
                <span className="px-3 py-1 rounded-full bg-white text-[#1988f5] border border-blue-200/90 text-xs font-bold tracking-tight tabular-nums shadow-2xs">
                  {allOpenJobs.length} Open Roles
                </span>
                <span className="hidden md:inline-block text-sm text-slate-600">
                  — Browse by department or select any role to open it in the Applicant Portal.
                </span>
              </div>

              <Link
                href={buildPortalUrl(searchQuery, selectedJobType, selectedCategory, selectedSalary)}
                className="self-start sm:self-auto px-4 py-2 rounded-full bg-white hover:bg-[#2196F3] text-[#1988f5] hover:text-white border border-blue-200/90 font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors shadow-2xs shrink-0"
              >
                <span>View all in Applicant Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Interactive Department Filter Strip */}
            <div
              className="flex flex-wrap items-center gap-1.5 sm:gap-2"
              role="tablist"
              aria-label="Filter open positions by department"
            >
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${isActive
                      ? "bg-[#2196F3] text-white shadow-[0_6px_16px_rgba(33,150,243,0.28)]"
                      : "bg-white hover:bg-blue-50 text-slate-700 hover:text-[#1988f5] border border-blue-200/80 shadow-2xs"
                      }`}
                  >
                    {cat === "All" ? "All Departments" : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Featured Spotlight Role (Login.png Blue-and-White Split Card Directly on #e3f1fe) */}
          {activeJobs.length > 0 && (() => {
            const spotlightJob = activeJobs[0];
            const salary = getSalaryRange(spotlightJob);
            const timeAgo = getRelativeTime(spotlightJob.created_at);
            const isBookmarked = mounted && bookmarkedIds.has(spotlightJob.id);
            const summary = getRoleSummary(spotlightJob);
            const expPill = getExperiencePill(spotlightJob);
            const meta = getDepartmentMeta(spotlightJob);
            const DeptIcon = meta.icon;
            const workMode = (spotlightJob.location || "").toLowerCase().includes("remote")
              ? "Remote"
              : (spotlightJob.location || "").toLowerCase().includes("hybrid")
                ? "Hybrid"
                : "On-site";
            const skills =
              spotlightJob.required_skills && spotlightJob.required_skills.length > 0
                ? spotlightJob.required_skills.slice(0, 5)
                : ["Domain Expertise", "Cross-Functional Execution", "Analytical Problem Solving"];
            const targetHref =
              jobs.length > 0
                ? `/careers?jobId=${spotlightJob.id}`
                : `/careers?q=${encodeURIComponent(spotlightJob.title)}`;

            return (
              <article
                onClick={() => router.push(targetHref)}
                role="button"
                tabIndex={0}
                aria-label={`View featured job details for ${spotlightJob.title}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(targetHref);
                  }
                }}
                className="bg-white rounded-3xl border border-blue-200/90 shadow-[0_10px_28px_rgba(25,136,245,0.10)] hover:shadow-[0_16px_38px_rgba(25,136,245,0.16)] hover:border-[#2196F3] transition-all duration-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 group cursor-pointer animate-fade-in-up animation-delay-300"
              >
                {/* Left Panel: Saturated #1988f5 Blue Panel (Matches Login.png) */}
                <div className="lg:col-span-4 bg-[#1988f5] text-white p-5 sm:p-7 flex flex-col justify-between gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-13 h-13 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                      <DeptIcon className="w-6 h-6 text-white stroke-[2.2]" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-semibold text-white">
                      {meta.label}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-[#e0f2fe]">
                      Monthly Compensation
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5 tabular-nums">
                      {salary}
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="bg-white/15 text-white font-semibold text-xs px-3 py-1 rounded-full">
                        {spotlightJob.employment_type || "Full-Time"}
                      </span>
                      <span className="bg-white/15 text-white font-semibold text-xs px-3 py-1 rounded-full">
                        {workMode}
                      </span>
                      <span className="bg-white/15 text-white font-semibold text-xs px-3 py-1 rounded-full">
                        {expPill}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Crisp White Role Details Panel */}
                <div className="lg:col-span-8 p-5 sm:p-7 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl sm:text-2xl lg:text-[1.7rem] font-bold text-[#1e293b] tracking-tight group-hover:text-[#2196F3] transition-colors leading-tight">
                          {spotlightJob.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 font-medium mt-1">
                          <MapPin className="w-4 h-4 text-[#2196F3] shrink-0" />
                          <span>{spotlightJob.location || "Makati City, Metro Manila"}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(spotlightJob.id, spotlightJob.title);
                        }}
                        aria-label={
                          isBookmarked
                            ? `Remove bookmark for ${spotlightJob.title}`
                            : `Bookmark ${spotlightJob.title}`
                        }
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${isBookmarked
                          ? "bg-[#e1f0fe] border-[#2196F3] text-[#2196F3]"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:text-[#2196F3] hover:border-blue-300"
                          }`}
                      >
                        <Bookmark
                          className={`w-5 h-5 transition-colors ${isBookmarked ? "fill-[#2196F3] text-[#2196F3]" : ""
                            }`}
                        />
                      </button>
                    </div>

                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed line-clamp-2">
                      {summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="bg-[#e1f0fe] text-[#0284c7] font-semibold text-xs px-3 py-1 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-semibold text-emerald-600 shrink-0">
                        {timeAgo}
                      </span>
                      {spotlightJob.education_requirement && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium min-w-0 truncate">
                          <GraduationCap className="w-4 h-4 text-[#2196F3] shrink-0" />
                          <span className="truncate">
                            {spotlightJob.education_requirement.replace(/\.$/, "")}
                          </span>
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2196F3] group-hover:bg-[#1976D2] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 shadow-2xs transition-colors shrink-0">
                      <span>Apply this job</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })()}

          {/* 2-Column Grid of Remaining Open Roles Directly on #e3f1fe (Matches Applicant portal.png) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch animate-fade-in-up animation-delay-375">
            {activeJobs.slice(1, 5).map((job) => {
              const salary = getSalaryRange(job);
              const timeAgo = getRelativeTime(job.created_at);
              const isBookmarked = mounted && bookmarkedIds.has(job.id);
              const summary = getRoleSummary(job);
              const expPill = getExperiencePill(job);
              const meta = getDepartmentMeta(job);
              const DeptIcon = meta.icon;
              const workMode = (job.location || "").toLowerCase().includes("remote")
                ? "Remote"
                : (job.location || "").toLowerCase().includes("hybrid")
                  ? "Hybrid"
                  : "On-site";
              const skills =
                job.required_skills && job.required_skills.length > 0
                  ? job.required_skills.slice(0, 4)
                  : ["Domain Expertise", "Cross-Functional Execution", "Analytical Problem Solving"];
              const targetHref =
                jobs.length > 0
                  ? `/careers?jobId=${job.id}`
                  : `/careers?q=${encodeURIComponent(job.title)}`;

              return (
                <article
                  key={job.id}
                  onClick={() => router.push(targetHref)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View job details for ${job.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(targetHref);
                    }
                  }}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-blue-200/80 shadow-[0_8px_24px_rgba(25,136,245,0.06)] hover:shadow-[0_16px_36px_rgba(25,136,245,0.14)] hover:border-[#2196F3] hover:-translate-y-1 transition-all duration-200 ease-out flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-3.5">
                    {/* Top Identity Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#1988f5] text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <DeptIcon className="w-6 h-6 stroke-[2.2]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3
                            className="text-xl sm:text-2xl font-bold text-[#1e293b] tracking-tight group-hover:text-[#2196F3] transition-colors leading-snug line-clamp-2"
                            title={job.title}
                          >
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                            <span>{job.location || "Makati City, Metro Manila"}</span>
                            <span className="text-slate-300" aria-hidden="true">•</span>
                            <span className="text-[#1988f5] font-semibold">{meta.label}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(job.id, job.title);
                        }}
                        aria-label={
                          isBookmarked
                            ? `Remove bookmark for ${job.title}`
                            : `Bookmark ${job.title}`
                        }
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${isBookmarked
                          ? "bg-[#e1f0fe] border-[#2196F3] text-[#2196F3]"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:text-[#2196F3] hover:border-blue-300"
                          }`}
                      >
                        <Bookmark
                          className={`w-5 h-5 transition-colors ${isBookmarked ? "fill-[#2196F3] text-[#2196F3]" : ""
                            }`}
                        />
                      </button>
                    </div>

                    {/* Pills + Salary Row (Matches Applicant portal.png) */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-[#e1f0fe] text-[#0284c7] font-semibold text-xs px-3 py-1 rounded-full">
                          {job.employment_type || "Full-Time"}
                        </span>
                        <span className="bg-[#e1f0fe] text-[#0284c7] font-semibold text-xs px-3 py-1 rounded-full">
                          {workMode}
                        </span>
                        <span className="bg-[#e1f0fe] text-[#0284c7] font-semibold text-xs px-3 py-1 rounded-full">
                          {expPill}
                        </span>
                      </div>

                      <div className="font-extrabold text-[#1e293b] text-base sm:text-lg tracking-tight shrink-0 tabular-nums">
                        {salary}
                      </div>
                    </div>

                    {/* Concise Role Summary + Sky-Blue Skill Chips */}
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="bg-[#f0f7ff] text-[#0369a1] font-semibold text-xs px-2.5 py-1 rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Row: "Apply this job" #2196F3 Button + Green Timestamp */}
                  <div className="pt-3.5 mt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <span className="inline-flex items-center justify-center rounded-xl bg-[#2196F3] group-hover:bg-[#1976D2] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 shadow-2xs transition-colors">
                      Apply this job
                    </span>

                    <span className="text-xs sm:text-sm font-semibold text-emerald-600">
                      {timeAgo}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {/* ============================================================== */}
      {/* 5. FOOTER (System Name, Navigation Links & Terms/Privacy)      */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-slate-200/90 py-8 px-4 sm:px-6 lg:px-8 text-xs sm:text-sm text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          {/* System Name & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#2196F3] text-white font-bold text-xs flex items-center justify-center tracking-tight shadow-2xs">
              TM
            </div>
            <span className="font-bold text-base text-[#1e293b] tracking-tight">
              Talent Match
            </span>
            <span className="text-slate-300 text-xs hidden sm:inline" aria-hidden="true">•</span>
            <span className="text-slate-500 text-xs hidden sm:inline">
              © {new Date().getFullYear()} Talent Match. All rights reserved.
            </span>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium text-slate-600">
            <Link href="/" className="hover:text-[#2196F3] transition-colors">
              Home
            </Link>
            <Link href="/careers" className="hover:text-[#2196F3] transition-colors">
              Explore Jobs
            </Link>
            <Link href="/careers?tab=BOOKMARK" className="hover:text-[#2196F3] transition-colors">
              Bookmarks
            </Link>
            <Link href="/applicant/login" className="hover:text-[#2196F3] transition-colors">
              Applicant Portal
            </Link>
            <Link href="/recruiter/login" className="hover:text-[#2196F3] transition-colors">
              Recruiter Portal
            </Link>
          </nav>

          {/* Legal: Terms of Service & Privacy Policy */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => setActiveModal("terms")}
              className="hover:text-[#2196F3] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <button
              type="button"
              onClick={() => setActiveModal("privacy")}
              className="hover:text-[#2196F3] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>

      {/* Accessible Terms of Service & Privacy Policy Dialog Modals */}
      <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1e293b] tracking-tight">
              {activeModal === "terms" ? "Terms of Service" : "Privacy Policy"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Talent Match Platform Agreement • Last updated October 2026
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {activeModal === "terms" ? (
              <>
                <p>
                  Welcome to <strong>Talent Match</strong>. By accessing or using our job discovery and applicant recruitment platform, you agree to comply with and be bound by these Terms of Service.
                </p>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">1. Platform Services</h4>
                  <p className="mt-1">
                    Talent Match provides verified job listings, applicant screening, and skills-based matching between candidates and verified hiring organizations. We do not guarantee employment offers or candidate hiring outcomes.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">2. Applicant & Recruiter Conduct</h4>
                  <p className="mt-1">
                    Users must submit accurate work histories, skills, and credential documents. Fraudulent profiles, duplicate spam submissions, and unauthorized automated scraping of verified listings are strictly prohibited.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">3. Account Integrity</h4>
                  <p className="mt-1">
                    Users are responsible for maintaining the confidentiality of their credentials. Any unauthorized use must be reported immediately to Talent Match support.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p>
                  At <strong>Talent Match</strong>, safeguarding your personal career data and privacy is our highest priority. This Privacy Policy outlines our data collection, usage, and protection practices.
                </p>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">1. Information We Collect</h4>
                  <p className="mt-1">
                    We collect profile information you provide directly, including contact details, resume documents, educational credentials, work experience, and job search preferences.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">2. Transparent Skills Matching</h4>
                  <p className="mt-1">
                    Career profiles and application materials are analyzed exclusively to calculate transparent skill alignment scores for verified job openings. We do not sell your personal data to third-party advertising networks.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">3. Data Retention & Control</h4>
                  <p className="mt-1">
                    You have the right to inspect, update, export, or permanently delete your career profile and application history at any time from your Applicant Portal settings.
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
