"use client";

import React, { useState, useEffect, useCallback, useRef, useId } from "react";
import { Job } from "@/types/job";
import { Application, ApplicationStatus } from "@/types/application";
import {
  Search,
  Mail,
  Phone,
  FileText,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  X,
  SlidersHorizontal,
  RotateCcw,
  ArrowLeft,
  Settings,
  Lock,
  Unlock,
  Archive,
} from "lucide-react";
import { CandidateAnalysisModal } from "./CandidateAnalysisModal";
import { JobReportPanel } from "./JobReportPanel";
import { CandidatePinpointDossier } from "./CandidatePinpointDossier";
import { ConfirmJobActionModal, JobActionType } from "./ConfirmJobActionModal";
import { fetchApi } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface JobProfileViewProps {
  job: Job;
  applications: Application[];
  anonymize: boolean;
  onBack: () => void;
  onApplicationUpdated: (updatedApp: Application) => void;
  onJobUpdated?: (updatedJob: Job) => void;
  onJobArchived?: (jobId: number) => void;
}

export function JobProfileView({
  job,
  applications,
  anonymize,
  onBack,
  onApplicationUpdated,
  onJobUpdated,
  onJobArchived,
}: JobProfileViewProps) {
  const [currentJob, setCurrentJob] = useState<Job>(job);
  const [prevJob, setPrevJob] = useState<Job>(job);
  const [actionModalType, setActionModalType] = useState<JobActionType | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  if (job !== prevJob) {
    setPrevJob(job);
    setCurrentJob(job);
  }

  const [activeTab, setActiveTab] = useState<"rankings" | "all">("rankings");
  const [viewMode, setViewMode] = useState<"table" | "split">("table");
  const [mobileSplitView, setMobileSplitView] = useState<"roster" | "dossier">("roster");
  const [activeCandidateId, setActiveCandidateId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [bandFilter, setBandFilter] = useState<string>("ALL");
  const [hasFlagsOnly, setHasFlagsOnly] = useState<boolean>(false);
  const [needsVerifyOnly, setNeedsVerifyOnly] = useState<boolean>(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const reportPanelId = useId();
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<number>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Close settings menu on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSettingsMenuOpen(false);
      }
    }
    if (isSettingsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isSettingsMenuOpen]);

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "ALL" ||
    bandFilter !== "ALL" ||
    hasFlagsOnly ||
    needsVerifyOnly;

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setBandFilter("ALL");
    setHasFlagsOnly(false);
    setNeedsVerifyOnly(false);
    setSelectedCandidateIds(new Set());
  };

  // Filter applications for this specific job
  const jobApplications = applications.filter(
    (app) => app.job === currentJob.id || app.job_title === currentJob.title
  );

  const handleConfirmAction = async () => {
    if (!actionModalType) return;
    setIsActionLoading(true);
    try {
      if (actionModalType === "close") {
        const updated = await fetchApi<Job>(`/jobs/${currentJob.id}/close/`, { method: "POST" });
        setCurrentJob(updated);
        if (onJobUpdated) onJobUpdated(updated);
        toast.success("Position Closed", {
          description: `"${currentJob.title}" is now closed to new applications.`,
        });
      } else if (actionModalType === "reopen") {
        const updated = await fetchApi<Job>(`/jobs/${currentJob.id}/reopen/`, { method: "POST" });
        setCurrentJob(updated);
        if (onJobUpdated) onJobUpdated(updated);
        toast.success("Position Reopened", {
          description: `"${currentJob.title}" is published and accepting applications.`,
        });
      } else if (actionModalType === "archive") {
        await fetchApi(`/jobs/${currentJob.id}/archive/`, { method: "POST" });
        if (onJobArchived) onJobArchived(currentJob.id);
        toast.success("Requisition Archived", {
          description: `"${currentJob.title}" has been moved to archives.`,
        });
        onBack();
      }
    } catch (err: unknown) {
      console.error("Action error:", err);
      const message = err instanceof Error ? err.message : "An error occurred while executing this action.";
      toast.error("Action Failed", {
        description: message,
      });
    } finally {
      setIsActionLoading(false);
      setActionModalType(null);
    }
  };

  // Compute metrics
  const totalCount = jobApplications.length;
  const shortlistedCount = jobApplications.filter((a) => a.status === "SHORTLISTED").length;

  const validScores = jobApplications
    .map((a) => a.match_result?.match_score)
    .filter((s): s is number => typeof s === "number");
  const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  const topScore = validScores.length > 0 ? Math.max(...validScores) : 0;

  const isRegulatedRole = [
    "nurse", "nursing", "physician", "doctor", "medical", "healthcare", "hospital",
    "pharmacist", "pharmacy", "accountant", "cpa", "civil engineer", "mechanical engineer",
    "electrical engineer", "attorney", "lawyer", "teacher", "lpt"
  ].some(kw => (job.title || "").toLowerCase().includes(kw) || (job.department || "").toLowerCase().includes(kw));

  // Filtered and Sorted Applicants
  const filteredApps = jobApplications.filter((app) => {
    const matchesSearch =
      (app.applicant_name && app.applicant_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.candidate_code && app.candidate_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.email && app.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.phone && app.phone.includes(searchQuery));
    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;

    const score = app.match_result?.match_score ?? 0;
    const band = app.match_result?.ai_insights?.band || (score >= 85 ? "Strong" : score >= 70 ? "Good" : score >= 50 ? "Partial" : "Weak");
    const matchesBand = bandFilter === "ALL" || band === bandFilter;

    const flags = app.match_result?.ai_insights?.flags || [];
    const matchesFlags = !hasFlagsOnly || flags.length > 0;

    const hardReq = app.match_result?.ai_insights?.hard_requirement_status || "";
    const matchesVerify = !needsVerifyOnly || hardReq === "Stated, verify document";

    return matchesSearch && matchesStatus && matchesBand && matchesFlags && matchesVerify;
  });

  // AI Leaderboard: sorted strictly descending by match score
  const rankedApplicants = [...filteredApps].sort((a, b) => {
    const scoreA = a.match_result?.match_score ?? -1;
    const scoreB = b.match_result?.match_score ?? -1;
    return scoreB - scoreA;
  });

  // All Applicants: sorted by application date descending
  const rosterApplicants = [...filteredApps].sort((a, b) => {
    return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
  });

  // Direct status update handler (works for button clicks or keyboard shortcuts)
  const handleDirectStatusChange = useCallback(async (app: Application, newStatus: ApplicationStatus) => {
    setUpdatingId(app.id);
    try {
      const updated = await fetchApi<Application>(`/applications/${app.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      onApplicationUpdated(updated);
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status", {
        description: err instanceof Error ? err.message : "Network error updating candidate status.",
      });
    } finally {
      setUpdatingId(null);
    }
  }, [onApplicationUpdated]);

  const handleQuickStatusChange = async (app: Application, newStatus: ApplicationStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    await handleDirectStatusChange(app, newStatus);
  };

  const toggleSelectCandidate = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (candidates: Application[]) => {
    const allSelected = candidates.length > 0 && candidates.every((a) => selectedCandidateIds.has(a.id));
    if (allSelected) {
      setSelectedCandidateIds(new Set());
    } else {
      const next = new Set(selectedCandidateIds);
      candidates.forEach((a) => next.add(a.id));
      setSelectedCandidateIds(next);
    }
  };

  const handleBulkStatusChange = async (newStatus: ApplicationStatus) => {
    if (selectedCandidateIds.size === 0 || isBulkUpdating) return;
    setIsBulkUpdating(true);
    const targetIds = Array.from(selectedCandidateIds);
    let successCount = 0;
    try {
      const updates = targetIds.map(async (id) => {
        try {
          const updated = await fetchApi<Application>(`/applications/${id}/status/`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus }),
          });
          onApplicationUpdated(updated);
          successCount++;
        } catch (err) {
          console.error(`Failed to update candidate #${id}:`, err);
        }
      });
      await Promise.all(updates);
      const formattedStatus =
        newStatus === "SHORTLISTED"
          ? "Shortlisted"
          : newStatus === "UNDER_REVIEW"
          ? "Moved to Review"
          : "Rejected";
      toast.success(`${successCount} Candidates Updated`, {
        description: `Successfully marked as ${formattedStatus}.`,
      });
      setSelectedCandidateIds(new Set());
    } catch (err) {
      console.error("Bulk update error:", err);
      toast.error("Bulk Status Update Failed", {
        description: err instanceof Error ? err.message : "Error executing bulk status change.",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Keyboard navigation for high-velocity screening in Split Mode
  useEffect(() => {
    if (viewMode !== "split" || rankedApplicants.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in inputs or selects
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const currentIndex = rankedApplicants.findIndex(
        (a) => a.id === (activeCandidateId || rankedApplicants[0]?.id)
      );
      if (currentIndex === -1) return;

      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, rankedApplicants.length - 1);
        setActiveCandidateId(rankedApplicants[nextIndex].id);
      } else if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        setActiveCandidateId(rankedApplicants[prevIndex].id);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        const currentApp = rankedApplicants[currentIndex];
        if (currentApp) handleDirectStatusChange(currentApp, "SHORTLISTED");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        const currentApp = rankedApplicants[currentIndex];
        if (currentApp) handleDirectStatusChange(currentApp, "REJECTED");
      } else if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        const currentApp = rankedApplicants[currentIndex];
        if (currentApp) handleDirectStatusChange(currentApp, "UNDER_REVIEW");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, rankedApplicants, activeCandidateId, handleDirectStatusChange]);

  const openAnalysis = (app: Application) => {
    setSelectedApplication(app);
    setIsAnalysisOpen(true);
  };

  const activeCandidate = rankedApplicants.find((a) => a.id === activeCandidateId) || rankedApplicants[0] || null;

  const getStatusBadgeVariant = (status: string): "success" | "destructive" | "info" | "secondary" => {
    switch (status) {
      case "SHORTLISTED":
        return "success";
      case "REJECTED":
        return "destructive";
      case "UNDER_REVIEW":
      case "PROCESSING":
        return "info";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Requisition Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/90">
        {/* Left: Prominent Back to Jobs Button + Context Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-8.5 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 rounded-xl shadow-2xs gap-1.5 cursor-pointer shrink-0"
            title="Return to Job Requisitions List"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Back to Jobs</span>
          </Button>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          <div className="flex items-center gap-2 text-xs min-w-0 text-slate-500">
            <span className="font-mono text-slate-500 font-semibold shrink-0">#{currentJob.id}</span>
            <span className="text-slate-300 shrink-0">·</span>
            <span className="font-medium text-slate-600 truncate max-w-[200px] sm:max-w-md">
              {currentJob.title}
            </span>
          </div>
        </div>

        {/* Right: Status Badges & Protected Requisition Settings */}
        <div className="flex flex-wrap items-center gap-2.5">
          {currentJob.status === "CLOSED" ? (
            <Badge variant="outline" className="py-1 px-2.5 text-xs font-semibold border-amber-200 text-amber-800 bg-amber-50">
              Closed · Submissions Locked
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-semibold border-emerald-200 text-emerald-800 bg-emerald-50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Active · Published</span>
            </Badge>
          )}

          {anonymize && (
            <Badge variant="secondary" className="py-1 px-2.5 text-xs text-[#1976D2] bg-blue-50 border border-blue-100 font-semibold hidden sm:inline-flex">
              Demographics Masked
            </Badge>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowReport((open) => !open)}
            aria-expanded={showReport}
            aria-controls={reportPanelId}
          >
            <Download aria-hidden="true" />
            Generate report
          </Button>

          {/* Protected Settings Dropdown Menu */}
          <div className="relative" ref={settingsMenuRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
              className={`h-8.5 px-3 text-xs font-semibold gap-1.5 rounded-xl border-slate-200/90 transition-all cursor-pointer ${
                isSettingsMenuOpen ? "bg-slate-100 text-slate-900 border-slate-300" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
              aria-expanded={isSettingsMenuOpen}
              aria-haspopup="menu"
              aria-label="Requisition settings"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Settings</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isSettingsMenuOpen ? "rotate-180" : ""}`} />
            </Button>

            {isSettingsMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900 text-sm">Requisition Settings</p>
                  <p className="text-[11px] text-slate-500 font-mono">Job #{currentJob.id} · {currentJob.department || "Operations"}</p>
                </div>

                <div className="py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetails(!showDetails);
                      setIsSettingsMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer font-medium transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                      <span>{showDetails ? "Hide Scope & Rubric" : "View Scope & Rubric"}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>

                <div className="border-t border-slate-100 my-1" />

                {/* Danger Zone */}
                <div className="p-1 space-y-1">
                  <p className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-500">
                    Lifecycle Controls
                  </p>

                  {currentJob.status === "CLOSED" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActionModalType("reopen");
                        setIsSettingsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-xl text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium transition-colors"
                    >
                      <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-xs">Reopen Requisition</div>
                        <div className="text-[10px] text-emerald-600/80">Allow new candidate submissions</div>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActionModalType("close");
                        setIsSettingsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-xl text-amber-800 hover:bg-amber-50 cursor-pointer font-medium transition-colors"
                    >
                      <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-xs">Close Requisition</div>
                        <div className="text-[10px] text-amber-700/80">Prevent new applications</div>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActionModalType("archive");
                      setIsSettingsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer font-medium transition-colors"
                  >
                    <Archive className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs">Archive Requisition</div>
                      <div className="text-[10px] text-slate-500">Hide from active dashboard lists</div>
                    </div>
                  </button>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div id={reportPanelId} hidden={!showReport}>
        {showReport && <JobReportPanel key={currentJob.id} jobId={currentJob.id} />}
      </div>

      {/* 2. Requisition Title, Meta & Compact Metrics Hero */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold border-slate-200 text-slate-700 bg-slate-50">
                {currentJob.department || "Operations"}
              </Badge>
              <span className="text-xs text-slate-400 font-mono">
                Posted on {new Date(currentJob.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {currentJob.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">
                {currentJob.location || "Remote"} ({currentJob.employment_type || "Full time"})
              </span>
              <span className="text-slate-300">·</span>
              <span>
                Min Experience: <strong className="text-slate-800 font-semibold">{currentJob.minimum_experience || "Any"}</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                Education: <strong className="text-slate-800 font-semibold">{currentJob.education_requirement || "Degree"}</strong>
              </span>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-2xs p-1 shrink-0 text-center">
            <div className="px-4 py-2.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Candidates</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">{totalCount}</div>
            </div>
            <div className="px-4 py-2.5">
              <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Top Match</div>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-0.5 tabular-nums">{topScore > 0 ? `${topScore}%` : "-"}</div>
            </div>
            <div className="px-4 py-2.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Score</div>
              <div className="text-xl font-bold font-mono text-slate-700 mt-0.5 tabular-nums">{avgScore > 0 ? `${avgScore}%` : "-"}</div>
            </div>
            <div className="px-4 py-2.5">
              <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Shortlisted</div>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-0.5 tabular-nums">{shortlistedCount}</div>
            </div>
          </div>
        </div>

        {/* Collapsible Requisition Details & Rubric Trigger */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-semibold text-[#1976D2] hover:text-[#2196F3] flex items-center gap-1.5 transition-colors cursor-pointer group"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showDetails ? "Hide Requisition Scope & Scoring Rubric" : "View Requisition Scope & Scoring Rubric"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Collapsible Requisition Details Drawer */}
        {showDetails && (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                Job Description &amp; Scope
              </span>
              <p className="text-slate-600 leading-relaxed mt-1 whitespace-pre-line text-xs max-w-4xl">
                {currentJob.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                  Must-Have Qualifications &amp; Licensure
                </span>
                {currentJob.required_skills && currentJob.required_skills.length > 0 ? (
                  currentJob.required_skills.some((s) => s.length > 32 || s.trim().split(/\s+/).length > 4) ? (
                    <ul className="space-y-1.5 mt-2">
                      {currentJob.required_skills.map((skill, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-blue-50/70 text-slate-800 border border-blue-100 leading-relaxed"
                        >
                          <span className="text-[#1976D2] font-mono font-bold text-[10px] mt-0.5 shrink-0">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="break-words">{skill}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {currentJob.required_skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-xs font-medium px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#1976D2] border border-blue-100"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )
                ) : (
                  <span className="text-slate-400 text-xs mt-2 block">None specified</span>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                  Preferred Qualifications &amp; Bonus Assets
                </span>
                {currentJob.preferred_skills && currentJob.preferred_skills.length > 0 ? (
                  currentJob.preferred_skills.some((s) => s.length > 32 || s.trim().split(/\s+/).length > 4) ? (
                    <ul className="space-y-1.5 mt-2">
                      {currentJob.preferred_skills.map((skill, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs font-normal px-3 py-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/80 leading-relaxed"
                        >
                          <span className="text-slate-400 font-mono font-bold text-[10px] mt-0.5 shrink-0">
                            +{idx + 1}
                          </span>
                          <span className="break-words">{skill}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {currentJob.preferred_skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-xs font-normal px-2.5 py-0.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )
                ) : (
                  <span className="text-slate-400 text-xs mt-2 block">None specified</span>
                )}
              </div>
            </div>

            {/* Calibrated Scoring Rubric Breakdown */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Calibrated Scoring Rubric
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentJob.rubric_weights ? "Custom Recruiter Weights" : "Default 40/25/15/10/10 Weights"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-slate-100 rounded-xl border border-slate-200/90 bg-slate-50/50 overflow-hidden text-center text-xs">
                <div className="p-2.5 space-y-0.5">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Required Skills</div>
                  <div className="font-bold text-[#2196F3] text-sm font-mono tabular-nums">
                    {currentJob.rubric_weights?.required_skills ?? 40}%
                  </div>
                  <div className="text-[10px] text-slate-400">Must-have fit</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Experience</div>
                  <div className="font-bold text-slate-900 text-sm font-mono tabular-nums">
                    {currentJob.rubric_weights?.experience ?? 25}%
                  </div>
                  <div className="text-[10px] text-slate-400">Tenure fit</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Education</div>
                  <div className="font-bold text-slate-900 text-sm font-mono tabular-nums">
                    {currentJob.rubric_weights?.education ?? 15}%
                  </div>
                  <div className="text-[10px] text-slate-400">Degree + license</div>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bonus Tools</div>
                  <div className="font-bold text-slate-900 text-sm font-mono tabular-nums">
                    {currentJob.rubric_weights?.preferred_skills ?? 10}%
                  </div>
                  <div className="text-[10px] text-slate-400">Preferred assets</div>
                </div>
                <div className="p-2.5 space-y-0.5 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Projects / Duties</div>
                  <div className="font-bold text-slate-900 text-sm font-mono tabular-nums">
                    {currentJob.rubric_weights?.projects ?? 10}%
                  </div>
                  <div className="text-[10px] text-slate-400">Hands-on tasks</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Candidate Evaluation Workspace */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Workspace Toolbar: Tabs, Views & Reusable Filters */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tabs: Leaderboard vs All Applicants */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "rankings" | "all")}>
              <TabsList className="bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="rankings" className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                  <span>Leaderboard</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#1976D2] font-mono text-[11px] font-bold border border-blue-200/60">
                    {jobApplications.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                  <span>All Applicants</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[11px] font-bold">
                    {jobApplications.length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* View Mode Switcher (Leaderboard only) */}
            {activeTab === "rankings" && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`h-7.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Table View (Full list)"
                >
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("split")}
                  className={`h-7.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "split"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="High-Velocity Fast-Screening Split View"
                >
                  Split View
                </button>
              </div>
            )}
          </div>

          {/* Reusable Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter (Reusable Select) */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[145px] text-xs font-semibold bg-white border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-colors">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SHORTLISTED">Shortlisted</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
              </SelectContent>
            </Select>

            {/* Score Band Filter (Reusable Select) */}
            <Select value={bandFilter} onValueChange={setBandFilter}>
              <SelectTrigger className="h-9 w-[150px] text-xs font-semibold bg-white border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-colors">
                <SelectValue placeholder="All Bands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Bands</SelectItem>
                <SelectItem value="Strong">Strong (85%+)</SelectItem>
                <SelectItem value="Good">Good (70-84%)</SelectItem>
                <SelectItem value="Partial">Partial (50-69%)</SelectItem>
                <SelectItem value="Weak">Weak (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick Verification & Flag Toggles */}
            <button
              type="button"
              onClick={() => setNeedsVerifyOnly(!needsVerifyOnly)}
              className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                needsVerifyOnly
                  ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="Filter candidates requiring license / document verification"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${needsVerifyOnly ? "bg-amber-500" : "bg-slate-300"}`} />
              <span>Needs Verification</span>
            </button>

            <button
              type="button"
              onClick={() => setHasFlagsOnly(!hasFlagsOnly)}
              className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                hasFlagsOnly
                  ? "bg-rose-50 text-rose-800 border-rose-300 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="Filter candidates with flagged evidence items"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${hasFlagsOnly ? "bg-rose-500" : "bg-slate-300"}`} />
              <span>Flags Only</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-9 px-2.5 text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset</span>
              </button>
            )}

            {/* Search Input */}
            <div className="relative w-full sm:w-64 ml-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search candidate, code, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white border-slate-200/90 focus:border-[#2196F3] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          {/* TAB 1: AI APPLICANT RANKINGS LEADERBOARD */}
          {activeTab === "rankings" && (
            <div>
              {/* FAST-SCREEN SPLIT MODE */}
              {viewMode === "split" ? (
                <div className="border-t border-border">
                  {/* High Velocity Guidance Bar */}
                  <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-800">Split-Screen Screening</span>
                      <span className="hidden sm:inline text-slate-400"> · Fast triage mode</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="hidden md:inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                        <span className="font-semibold text-slate-700">J/K</span>
                        <span className="text-slate-400">Cycle</span>
                      </span>
                      <span className="hidden md:inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-emerald-800 shadow-2xs font-semibold">
                        <span>S</span>
                        <span className="text-emerald-700 font-normal">Shortlist</span>
                      </span>
                      <span className="hidden md:inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[#2196F3] shadow-2xs font-semibold">
                        <span>U</span>
                        <span className="text-[#2196F3]/80 font-normal">Review</span>
                      </span>
                      <span className="hidden md:inline-flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-rose-800 shadow-2xs font-semibold">
                        <span>R</span>
                        <span className="text-rose-700 font-normal">Reject</span>
                      </span>
                      <span className="font-bold text-slate-900 ml-1.5">
                        {rankedApplicants.length} Candidates
                      </span>
                    </div>
                  </div>

                  {rankedApplicants.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground text-sm">
                      No applicants found matching this filter.
                    </div>
                  ) : (
                    <div className="min-h-[700px]">
                      {/* Mobile Split View Segmented Switcher */}
                      <div className="flex lg:hidden items-center justify-between p-3 bg-muted/20 border-b border-border">
                        <div className="flex items-center gap-1.5 p-1 bg-background rounded-lg border border-border w-full">
                          <button
                            type="button"
                            onClick={() => setMobileSplitView("roster")}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                              mobileSplitView === "roster"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Candidate Roster ({rankedApplicants.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMobileSplitView("dossier")}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              mobileSplitView === "dossier"
                                ? "bg-[#2196F3] text-white shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Evaluation {activeCandidate ? `(${activeCandidate.candidate_code})` : ""}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[700px]">
                        {/* Left Roster Panel (40% width on desktop) */}
                        <div className={`lg:col-span-5 xl:col-span-4 border-r border-border max-h-[820px] overflow-y-auto divide-y divide-border bg-card/50 ${mobileSplitView === "dossier" ? "hidden lg:block" : "block"}`}>
                          {rankedApplicants.map((app, index) => {
                            const isSelected = activeCandidate?.id === app.id;
                            const score = app.match_result?.match_score ?? 0;
                            const insights = app.match_result?.ai_insights;
                            return (
                              <div
                                key={app.id}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSelected}
                                onClick={() => {
                                  setActiveCandidateId(app.id);
                                  setMobileSplitView("dossier");
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setActiveCandidateId(app.id);
                                    setMobileSplitView("dossier");
                                  }
                                }}
                                className={`p-4 transition-all cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                  isSelected
                                    ? "bg-secondary/70 ring-1 ring-inset ring-primary/25 shadow-xs"
                                    : "hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedCandidateIds.has(app.id)}
                                      onChange={(e) => toggleSelectCandidate(app.id, e as unknown as React.MouseEvent)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#2196F3] focus:ring-[#2196F3] accent-[#2196F3] cursor-pointer"
                                      aria-label={`Select candidate ${app.candidate_code}`}
                                    />
                                    <span className="font-mono text-xs font-bold text-muted-foreground">
                                      #{index + 1}
                                    </span>
                                    <span className="font-mono font-bold text-primary text-sm">
                                      {app.candidate_code}
                                    </span>
                                    {index < 3 && score > 0 && (
                                      <Badge variant="outline" className="text-[10px] py-0 h-4 font-bold">
                                        Top {index + 1}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant={
                                        score >= 85
                                          ? "success"
                                          : score >= 70
                                          ? "info"
                                          : score >= 50
                                          ? "warning"
                                          : "secondary"
                                      }
                                      className="font-mono font-bold text-xs px-2 py-0.5"
                                    >
                                      {score}%
                                    </Badge>
                                    <Badge variant={getStatusBadgeVariant(app.status)} className="text-[10px] py-0 h-5 font-semibold">
                                      {app.status}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="font-semibold text-foreground text-sm mt-1">
                                  {anonymize && app.status !== "SHORTLISTED" ? "Demographics Masked" : app.applicant_name}
                                </div>

                                {/* Instant Pinpoint 1-liner */}
                                {insights?.executive_headline ? (
                                  <p className="text-xs text-muted-foreground line-clamp-1 italic mt-1 font-medium">
                                    &ldquo;{insights.executive_headline}&rdquo;
                                  </p>
                                ) : insights?.key_pinpoints?.[0] ? (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                    ⭐ {insights.key_pinpoints[0].headline}
                                  </p>
                                ) : (
                                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                    <span>{app.resume?.extracted_experience_years || 0} yrs exp</span>
                                    <span>·</span>
                                    <span>{app.match_result?.matched_skills.length || 0} skills matched</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Right Active Candidate Dossier Panel (60% width) */}
                        <div className={`lg:col-span-7 xl:col-span-8 p-4 sm:p-6 max-h-[820px] overflow-y-auto space-y-4 bg-background ${mobileSplitView === "roster" ? "hidden lg:block" : "block"}`}>
                          {activeCandidate ? (
                            <>
                              {/* Fast-Triage Action Bar */}
                              <div className="p-3 rounded-xl border border-border bg-card shadow-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 backdrop-blur-md bg-card/95">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setMobileSplitView("roster")}
                                    className="lg:hidden h-8.5 px-2.5 text-xs font-semibold text-primary"
                                  >
                                    &larr; Roster
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const cIdx = rankedApplicants.findIndex((a) => a.id === activeCandidate.id);
                                      if (cIdx > 0) setActiveCandidateId(rankedApplicants[cIdx - 1].id);
                                    }}
                                    disabled={rankedApplicants.findIndex((a) => a.id === activeCandidate.id) <= 0}
                                    className="h-8.5 px-2.5 gap-1 text-xs"
                                    title="Previous candidate (or press K)"
                                    aria-label="Previous candidate"
                                  >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                    <span>Prev (K)</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const cIdx = rankedApplicants.findIndex((a) => a.id === activeCandidate.id);
                                      if (cIdx < rankedApplicants.length - 1) {
                                        setActiveCandidateId(rankedApplicants[cIdx + 1].id);
                                      }
                                    }}
                                    disabled={
                                      rankedApplicants.findIndex((a) => a.id === activeCandidate.id) >=
                                      rankedApplicants.length - 1
                                    }
                                    className="h-8.5 px-2.5 gap-1 text-xs"
                                    title="Next candidate (or press J)"
                                    aria-label="Next candidate"
                                  >
                                    <span>Next (J)</span>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </Button>
                                  <span className="text-xs font-mono text-muted-foreground ml-1">
                                    Candidate {rankedApplicants.findIndex((a) => a.id === activeCandidate.id) + 1} of{" "}
                                    {rankedApplicants.length}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={updatingId === activeCandidate.id}
                                    onClick={() => handleDirectStatusChange(activeCandidate, "SHORTLISTED")}
                                    className={`h-8.5 px-3 text-xs font-semibold gap-1.5 transition-all ${
                                      activeCandidate.status === "SHORTLISTED"
                                        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white"
                                        : "text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                                    }`}
                                  >
                                    Shortlist (S)
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={updatingId === activeCandidate.id}
                                    onClick={() => handleDirectStatusChange(activeCandidate, "UNDER_REVIEW")}
                                    className={`h-8.5 px-3 text-xs font-semibold transition-all cursor-pointer ${
                                      activeCandidate.status === "UNDER_REVIEW" || activeCandidate.status === "PROCESSING"
                                        ? "bg-[#2196F3] text-white border-[#2196F3] hover:bg-[#1976D2]"
                                        : "text-[#1976D2] border-blue-200 bg-blue-50/50 hover:bg-blue-100/70"
                                    }`}
                                  >
                                    <span>Review (U)</span>
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={updatingId === activeCandidate.id}
                                    onClick={() => handleDirectStatusChange(activeCandidate, "REJECTED")}
                                    className={`h-8.5 px-3 text-xs font-semibold gap-1.5 transition-all ${
                                      activeCandidate.status === "REJECTED"
                                        ? "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90"
                                        : "text-rose-800 border-rose-300 hover:bg-rose-50"
                                    }`}
                                  >
                                    Reject (R)
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openAnalysis(activeCandidate)}
                                    className="h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Open full dialog modal"
                                  >
                                    Full Modal
                                  </Button>
                                </div>
                              </div>

                              {/* Instant Candidate Dossier */}
                              <CandidatePinpointDossier
                                application={activeCandidate}
                                anonymize={anonymize}
                              />
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* STANDARD TABLE VIEW (Aligned with TalentMatch Pool Table Row Spec) */
                <div>
                  <div className="px-6 py-2.5 bg-slate-50/75 border-y border-border flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>Evaluation Rubric: <strong className="text-slate-800 font-semibold">{isRegulatedRole ? "Regulated Professional" : "Professional / Technical"}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 font-medium">Auto-Calibrated</span>
                    </div>
                    <span className="font-mono font-bold text-slate-700">Showing {rankedApplicants.length} Candidates</span>
                  </div>

                  <div className="w-full overflow-x-auto">
                    <Table className="min-w-[880px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <input
                            type="checkbox"
                            checked={rankedApplicants.length > 0 && rankedApplicants.every((a) => selectedCandidateIds.has(a.id))}
                            onChange={() => toggleSelectAll(rankedApplicants)}
                            className="h-4 w-4 rounded border-slate-300 text-[#2196F3] focus:ring-[#2196F3] accent-[#2196F3] cursor-pointer"
                            aria-label="Select all ranked candidates"
                          />
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold">Rank</TableHead>
                        <TableHead className="w-56 font-bold">Candidate ID</TableHead>
                        <TableHead className="w-24 font-bold">Match</TableHead>
                        <TableHead className="w-28 font-bold">Band</TableHead>
                        <TableHead className="w-28 font-bold">Must-haves</TableHead>
                        <TableHead className="w-48 font-bold">Hard requirement</TableHead>
                        <TableHead className="min-w-[180px] font-bold">Flags</TableHead>
                        <TableHead className="text-right w-44 font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankedApplicants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-14 text-muted-foreground text-sm">
                            No applicants found matching this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rankedApplicants.map((app, index) => {
                          const score = app.match_result?.match_score ?? 0;
                          const insights = app.match_result?.ai_insights;
                          const band =
                            insights?.band ||
                            (score >= 85 ? "Strong" : score >= 70 ? "Good" : score >= 50 ? "Partial" : "Weak");
                          const mustHavesSummary =
                            insights?.must_haves_summary ||
                            (insights?.must_have_breakdown
                              ? `${insights.must_have_breakdown.filter((m) => m.status === "met").length} / ${insights.must_have_breakdown.length}`
                              : `${app.match_result?.matched_skills.length || 0} Met`);
                          const hardReqStatus =
                            insights?.hard_requirement_status ||
                            (insights?.action_needed ? "Stated, verify document" : "None required");
                          const flags = insights?.flags || [];

                          return (
                            <TableRow
                              key={app.id}
                              role="button"
                              tabIndex={0}
                              className={`cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-muted/50 ${
                                selectedCandidateIds.has(app.id) ? "bg-blue-50/60 hover:bg-blue-50/80" : "hover:bg-muted/40"
                              }`}
                              onClick={() => openAnalysis(app)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openAnalysis(app);
                                }
                              }}
                            >
                              {/* Selection Checkbox */}
                              <TableCell className="w-12 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedCandidateIds.has(app.id)}
                                  onChange={(e) => toggleSelectCandidate(app.id, e as unknown as React.MouseEvent)}
                                  className="h-4 w-4 rounded border-slate-300 text-[#2196F3] focus:ring-[#2196F3] accent-[#2196F3] cursor-pointer"
                                  aria-label={`Select candidate ${app.candidate_code}`}
                                />
                              </TableCell>

                              {/* Rank */}
                              <TableCell className="text-center font-mono font-bold text-xs whitespace-nowrap">
                                {index === 0 && score > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                                    #1
                                  </span>
                                ) : index === 1 && score > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    #2
                                  </span>
                                ) : index === 2 && score > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-100/50 text-amber-900 border border-amber-200/60">
                                    #3
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-mono text-xs">
                                    #{index + 1}
                                  </span>
                                )}
                              </TableCell>

                              {/* Candidate ID & Blind Name (Spec Note 1) */}
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-extrabold text-primary text-sm bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                    {app.candidate_code}
                                  </span>
                                  {app.status === "SHORTLISTED" && (
                                    <Badge variant="outline" className="text-[10px] py-0 text-emerald-800 bg-emerald-500/10 border-emerald-500/20 font-medium">
                                      Revealed
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-foreground font-semibold mt-1 truncate max-w-[200px]">
                                  {app.status === "SHORTLISTED" || !anonymize ? app.applicant_name : "Demographics Masked"}
                                </div>
                                {insights?.why_this_score ? (
                                  <p className="text-[11px] text-muted-foreground line-clamp-1 italic max-w-[220px] mt-0.5" title={insights.why_this_score}>
                                    &ldquo;{insights.why_this_score}&rdquo;
                                  </p>
                                ) : null}
                              </TableCell>

                              {/* Match Score */}
                              <TableCell>
                                <div className="space-y-1">
                                  <span className="font-mono font-extrabold text-base text-foreground">
                                    {score}%
                                  </span>
                                  <div className="w-16">
                                    <Progress value={score} className="h-1.5" />
                                  </div>
                                </div>
                              </TableCell>

                              {/* Band */}
                              <TableCell>
                                <Badge
                                  variant={
                                    band === "Strong"
                                      ? "success"
                                      : band === "Good"
                                      ? "info"
                                      : band === "Partial"
                                      ? "warning"
                                      : "secondary"
                                  }
                                  className="font-bold text-xs px-2.5 py-0.5"
                                >
                                  {band}
                                </Badge>
                              </TableCell>

                              {/* Must-haves */}
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`font-mono font-bold text-xs px-2.5 py-0.5 ${
                                    mustHavesSummary.startsWith("All") || (mustHavesSummary.includes("/") && mustHavesSummary.split("/")[0].trim() === mustHavesSummary.split("/")[1].trim())
                                      ? "text-emerald-800 border-emerald-500/30 bg-emerald-500/10"
                                      : "text-amber-800 border-amber-500/30 bg-amber-500/10"
                                  }`}
                                >
                                  {mustHavesSummary}
                                </Badge>
                              </TableCell>

                              {/* Hard requirement */}
                              <TableCell>
                                {hardReqStatus === "Stated, verify document" ? (
                                  <Badge
                                    variant="outline"
                                    className="gap-1 text-xs font-semibold py-0.5 text-amber-800 border-amber-500/30 bg-amber-500/10 whitespace-nowrap"
                                  >
                                    <span>Stated, verify document</span>
                                  </Badge>
                                ) : hardReqStatus === "Verified" ? (
                                  <Badge
                                    variant="outline"
                                    className="gap-1 text-xs font-semibold py-0.5 text-emerald-800 border-emerald-500/30 bg-emerald-500/10 whitespace-nowrap"
                                  >
                                    <span>Verified</span>
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-mono">None required</span>
                                )}
                              </TableCell>

                              {/* Flags */}
                              <TableCell>
                                {flags && flags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-[220px]">
                                    {flags.map((f: string, fIdx: number) => (
                                      <Badge
                                        key={fIdx}
                                        variant="outline"
                                        className="text-[10px] font-normal py-0.5 px-2 text-rose-700 border-rose-500/30 bg-rose-500/10"
                                      >
                                        {f}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-mono">None</span>
                                )}
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setActiveCandidateId(app.id);
                                      setViewMode("split");
                                      setMobileSplitView("dossier");
                                    }}
                                    className="text-xs font-semibold h-8.5 px-3 cursor-pointer"
                                    title="Open split screen with this candidate"
                                  >
                                    Screen
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAnalysis(app)}
                                    className="text-xs font-semibold h-8.5 px-3 rounded-lg border-blue-200 bg-blue-50/50 hover:bg-[#2196F3] hover:text-white hover:border-[#2196F3] text-[#1976D2] cursor-pointer transition-all"
                                    title="Open candidate evaluation profile"
                                  >
                                    View Profile
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL APPLICANTS DIRECTORY ROSTER */}
          {activeTab === "all" && (
            <div>
              <div className="px-6 py-3 bg-muted/40 border-y border-border flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                <span>Chronological applicant submissions roster</span>
                <span className="font-mono font-bold text-foreground">Total: {rosterApplicants.length}</span>
              </div>

              <div className="w-full overflow-x-auto">
                <Table className="min-w-[880px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={rosterApplicants.length > 0 && rosterApplicants.every((a) => selectedCandidateIds.has(a.id))}
                        onChange={() => toggleSelectAll(rosterApplicants)}
                        className="h-4 w-4 rounded border-slate-300 text-[#2196F3] focus:ring-[#2196F3] accent-[#2196F3] cursor-pointer"
                        aria-label="Select all applicants"
                      />
                    </TableHead>
                    <TableHead className="w-[130px]">Candidate ID</TableHead>
                    <TableHead>Applicant Name</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Contact Number</TableHead>
                    <TableHead className="w-[120px]">Experience</TableHead>
                    <TableHead className="w-[120px]">Applied Date</TableHead>
                    <TableHead className="w-[220px]">Decision</TableHead>
                    <TableHead className="text-right w-[100px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rosterApplicants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-14 text-muted-foreground text-sm">
                        No applications recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rosterApplicants.map((app) => {
                      const expYears = app.resume?.extracted_experience_years;
                      return (
                        <TableRow
                          key={app.id}
                          role="button"
                          tabIndex={0}
                          className={`cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-muted/50 ${
                            selectedCandidateIds.has(app.id) ? "bg-blue-50/60 hover:bg-blue-50/80" : "hover:bg-muted/40"
                          }`}
                          onClick={() => openAnalysis(app)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openAnalysis(app);
                            }
                          }}
                        >
                          <TableCell className="w-12 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedCandidateIds.has(app.id)}
                              onChange={(e) => toggleSelectCandidate(app.id, e as unknown as React.MouseEvent)}
                              className="h-4 w-4 rounded border-slate-300 text-[#2196F3] focus:ring-[#2196F3] accent-[#2196F3] cursor-pointer"
                              aria-label={`Select applicant ${app.candidate_code}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono font-bold text-primary text-sm">
                            {app.candidate_code}
                          </TableCell>

                          <TableCell>
                            <div className="font-semibold text-foreground text-sm">
                              {anonymize ? "Demographics Masked" : app.applicant_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {app.match_result ? `Match: ${app.match_result.match_score}%` : "Pending"}
                            </div>
                          </TableCell>

                          <TableCell>
                            {anonymize ? (
                              <span className="text-muted-foreground text-sm">hidden@privacy</span>
                            ) : (
                              <a
                                href={`mailto:${app.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-foreground hover:underline flex items-center gap-1.5 text-sm"
                              >
                                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>{app.email}</span>
                              </a>
                            )}
                          </TableCell>

                          <TableCell>
                            {anonymize ? (
                              <span className="text-muted-foreground text-sm">+63 ••• ••••</span>
                            ) : app.phone ? (
                              <a
                                href={`tel:${app.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-foreground hover:underline flex items-center gap-1.5 text-sm"
                              >
                                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>{app.phone}</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>

                          <TableCell className="text-sm">
                            {expYears !== undefined && expYears !== null ? (
                              expYears === 0 ? (
                                <span className="text-muted-foreground">0 yrs</span>
                              ) : (
                                <span className="font-mono font-bold">{expYears} yrs</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(app.applied_at).toLocaleDateString()}
                          </TableCell>

                          {/* Quick Decision Changer */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant={app.status === "SHORTLISTED" ? "default" : "outline"}
                                disabled={updatingId === app.id}
                                onClick={(e) => handleQuickStatusChange(app, "SHORTLISTED", e)}
                                className="h-8.5 px-3 text-xs font-semibold"
                              >
                                Shortlist
                              </Button>
                              <Button
                                size="sm"
                                variant={app.status === "UNDER_REVIEW" ? "secondary" : "ghost"}
                                disabled={updatingId === app.id}
                                onClick={(e) => handleQuickStatusChange(app, "UNDER_REVIEW", e)}
                                className="h-8.5 px-3 text-xs font-semibold"
                              >
                                Review
                              </Button>
                              <Button
                                size="sm"
                                variant={app.status === "REJECTED" ? "destructive" : "ghost"}
                                disabled={updatingId === app.id}
                                onClick={(e) => handleQuickStatusChange(app, "REJECTED", e)}
                                className="h-8.5 px-3 text-xs font-semibold"
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAnalysis(app)}
                              className="h-8.5 w-8.5 p-0 text-xs font-medium inline-flex items-center justify-center"
                              title="View details"
                              aria-label={`View details for ${app.candidate_code}`}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedCandidateIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-xl bg-slate-900/95 backdrop-blur-md text-white px-4 sm:px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="h-6 min-w-6 px-1.5 rounded-full bg-[#2196F3] text-white text-xs font-bold font-mono flex items-center justify-center">
              {selectedCandidateIds.size}
            </span>
            <span className="text-xs font-medium text-slate-200">
              Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedCandidateIds(new Set())}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer ml-1"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              size="sm"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("SHORTLISTED")}
              className="h-8 px-2.5 sm:px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-none cursor-pointer"
            >
              Shortlist ({selectedCandidateIds.size})
            </Button>
            <Button
              size="sm"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("UNDER_REVIEW")}
              className="h-8 px-2.5 sm:px-3 text-xs font-semibold bg-[#2196F3] hover:bg-[#1976D2] text-white border-none cursor-pointer"
            >
              Review ({selectedCandidateIds.size})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("REJECTED")}
              className="h-8 px-2.5 sm:px-3 text-xs font-semibold cursor-pointer"
            >
              Reject ({selectedCandidateIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Candidate Analysis Modal */}
      <CandidateAnalysisModal
        application={selectedApplication}
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        anonymize={anonymize}
        onStatusUpdated={(updatedApp) => {
          setSelectedApplication(updatedApp);
          onApplicationUpdated(updatedApp);
        }}
      />

      {/* Confirm Job Action Modal */}
      <ConfirmJobActionModal
        isOpen={actionModalType !== null}
        actionType={actionModalType}
        jobTitle={currentJob.title}
        isLoading={isActionLoading}
        onConfirm={handleConfirmAction}
        onClose={() => setActionModalType(null)}
      />
    </div>
  );
}
