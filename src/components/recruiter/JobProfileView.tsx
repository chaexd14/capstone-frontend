"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Job } from "@/types/job";
import { Application, ApplicationStatus } from "@/types/application";
import {
  ArrowLeft,
  MapPin,
  Clock,
  GraduationCap,
  Sparkles,
  Search,
  Mail,
  Phone,
  CheckCircle2,
  Trophy,
  Users,
  ShieldCheck,
  Filter,
  FileText,
  Zap,
  ChevronUp,
  ChevronDown,
  List,
  Keyboard,
  Check,
  X,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { CandidateAnalysisModal } from "./CandidateAnalysisModal";
import { CandidatePinpointDossier } from "./CandidatePinpointDossier";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
}

export function JobProfileView({
  job,
  applications,
  anonymize,
  onBack,
  onApplicationUpdated,
}: JobProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"rankings" | "all">("rankings");
  const [viewMode, setViewMode] = useState<"table" | "split">("table");
  const [activeCandidateId, setActiveCandidateId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [bandFilter, setBandFilter] = useState<string>("ALL");
  const [hasFlagsOnly, setHasFlagsOnly] = useState<boolean>(false);
  const [needsVerifyOnly, setNeedsVerifyOnly] = useState<boolean>(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Filter applications for this specific job
  const jobApplications = applications.filter((app) => app.job === job.id || app.job_title === job.title);

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
    } finally {
      setUpdatingId(null);
    }
  }, [onApplicationUpdated]);

  const handleQuickStatusChange = async (app: Application, newStatus: ApplicationStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    await handleDirectStatusChange(app, newStatus);
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
      {/* Top Breadcrumb & Job Header */}
      <Card className="bg-card">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
            <Button
              variant="outline"
              size="default"
              onClick={onBack}
              className="gap-2 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Positions</span>
            </Button>

            <div className="flex items-center gap-2.5">
              <Badge variant="outline" className="gap-1.5 py-1 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Benchmark
              </Badge>
              {anonymize && (
                <Badge variant="secondary" className="gap-1.5 py-1 text-xs text-primary font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  Demographics Masked
                </Badge>
              )}
            </div>
          </div>

          {/* Job Title & Meta Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold">
                  {job.department}
                </Badge>
                <span className="text-sm text-muted-foreground">· Posted on {new Date(job.created_at).toLocaleDateString()}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {job.title}
              </h1>

              <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  {job.location} ({job.employment_type})
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  Experience: <strong className="text-foreground">{job.minimum_experience}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Education: <strong className="text-foreground">{job.education_requirement}</strong>
                </span>
              </div>
            </div>

            {/* Quick Metrics Badge Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/30">
              <div className="text-center p-2.5 rounded-lg bg-background">
                <div className="text-xs text-muted-foreground font-medium">Total Applicants</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-foreground mt-0.5">{totalCount}</div>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-background">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Top Match</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{topScore}%</div>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-background">
                <div className="text-xs text-muted-foreground font-medium">Avg Score</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-foreground mt-0.5">{avgScore}%</div>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-background">
                <div className="text-xs text-muted-foreground font-medium">Shortlisted</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-foreground mt-0.5">{shortlistedCount}</div>
              </div>
            </div>
          </div>

          {/* Job Specifications & Requirements */}
          <div className="p-5 rounded-xl border border-border bg-muted/20 space-y-4 text-sm">
            <div>
              <span className="font-bold text-foreground uppercase tracking-wider text-xs">
                Job Description & Scope:
              </span>
              <p className="text-muted-foreground leading-relaxed mt-1.5 whitespace-pre-line text-sm">
                {job.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-border">
              <div>
                <span className="font-bold text-foreground uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Required Qualifications & Licensure:
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.required_skills && job.required_skills.length > 0 ? (
                    job.required_skills.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs font-medium px-3 py-1"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None specified</span>
                  )}
                </div>
              </div>

              <div>
                <span className="font-bold text-muted-foreground uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Preferred Assets:
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.preferred_skills && job.preferred_skills.length > 0 ? (
                    job.preferred_skills.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs font-normal px-3 py-1"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None specified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tables Section Header & Tab Controls */}
      <Card className="bg-card">
        <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs & View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "rankings" | "all")}>
              <TabsList>
                <TabsTrigger value="rankings" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  <span>AI Leaderboard</span>
                  <Badge variant="secondary" className="px-2 py-0 h-5 text-xs font-semibold">
                    {jobApplications.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span>All Applicants</span>
                  <Badge variant="secondary" className="px-2 py-0 h-5 text-xs font-semibold">
                    {jobApplications.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* View Mode Switcher (Leaderboard only) */}
            {activeTab === "rankings" && (
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
                <Button
                  type="button"
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-8 gap-1.5 text-xs font-semibold"
                  title="Table View (Full list)"
                >
                  <List className="h-3.5 w-3.5" />
                  <span>Table</span>
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "split" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("split")}
                  className="h-8 gap-1.5 text-xs font-semibold"
                  title="High-Velocity Fast-Screening Split View (No Modals, 10s Dossiers, Keyboard Triage)"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span>⚡ Fast-Screen</span>
                  <Badge variant="outline" className="text-[10px] py-0 h-4 font-mono">
                    Hot
                  </Badge>
                </Button>
              </div>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">All Statuses</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="REJECTED">Rejected</option>
                <option value="SUBMITTED">Submitted</option>
              </select>
            </div>

            {/* Official Spec Band Filter */}
            <div className="flex items-center gap-1.5">
              <select
                value={bandFilter}
                onChange={(e) => setBandFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">All Bands</option>
                <option value="Strong">Strong (85%+)</option>
                <option value="Good">Good (70-84%)</option>
                <option value="Partial">Partial (50-69%)</option>
                <option value="Weak">Weak (&lt;50%)</option>
              </select>
            </div>

            {/* Quick Spec Toggles */}
            <Button
              type="button"
              variant={needsVerifyOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setNeedsVerifyOnly(!needsVerifyOnly)}
              className="h-10 text-xs gap-1.5 font-medium"
              title="Filter candidates requiring license / document verification"
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span>Verify Doc</span>
            </Button>

            <Button
              type="button"
              variant={hasFlagsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setHasFlagsOnly(!hasFlagsOnly)}
              className="h-10 text-xs gap-1.5 font-medium"
              title="Filter candidates with flagged evidence items (e.g. skills list only)"
            >
              <span>Flags Only</span>
            </Button>

            <div className="relative w-full sm:w-64 ml-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search name, code, contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* TAB 1: AI APPLICANT RANKINGS LEADERBOARD */}
          {activeTab === "rankings" && (
            <div>
              {/* FAST-SCREEN SPLIT MODE */}
              {viewMode === "split" ? (
                <div className="border-t border-border">
                  {/* High Velocity Guidance Bar */}
                  <div className="px-6 py-2.5 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-semibold text-foreground">High-Velocity Split Screening Mode</span>
                      <span className="hidden sm:inline">· 10-Second Candidate Dossiers</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="hidden md:inline bg-background px-2 py-0.5 rounded border border-border">
                        <Keyboard className="inline h-3 w-3 mr-1 text-muted-foreground" />
                        J / ↓ Next · K / ↑ Prev
                      </span>
                      <span className="hidden md:inline bg-background px-2 py-0.5 rounded border border-border">
                        S: Shortlist · R: Reject
                      </span>
                      <span className="font-bold text-foreground">
                        {rankedApplicants.length} Candidates
                      </span>
                    </div>
                  </div>

                  {rankedApplicants.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground text-sm">
                      No applicants found matching this filter.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[700px]">
                      {/* Left Roster Panel (40% width on desktop) */}
                      <div className="lg:col-span-5 xl:col-span-4 border-r border-border max-h-[820px] overflow-y-auto divide-y divide-border bg-card/50">
                        {rankedApplicants.map((app, index) => {
                          const isSelected = activeCandidate?.id === app.id;
                          const score = app.match_result?.match_score ?? 0;
                          const insights = app.match_result?.ai_insights;
                          return (
                            <div
                              key={app.id}
                              onClick={() => setActiveCandidateId(app.id)}
                              className={`p-4 transition-all cursor-pointer relative ${
                                isSelected
                                  ? "bg-primary/5 dark:bg-primary/10 border-l-4 border-primary"
                                  : "hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
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
                                      score >= 75
                                        ? "success"
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
                                {anonymize ? "Demographics Masked" : app.applicant_name}
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
                      <div className="lg:col-span-7 xl:col-span-8 p-4 sm:p-6 max-h-[820px] overflow-y-auto space-y-4 bg-background">
                        {activeCandidate ? (
                          <>
                            {/* Fast-Triage Action Bar */}
                            <div className="p-3 rounded-xl border border-border bg-card shadow-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 backdrop-blur-md bg-card/95">
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const cIdx = rankedApplicants.findIndex((a) => a.id === activeCandidate.id);
                                    if (cIdx > 0) setActiveCandidateId(rankedApplicants[cIdx - 1].id);
                                  }}
                                  disabled={rankedApplicants.findIndex((a) => a.id === activeCandidate.id) <= 0}
                                  className="h-8 gap-1 text-xs"
                                  title="Previous candidate (or press K)"
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
                                  className="h-8 gap-1 text-xs"
                                  title="Next candidate (or press J)"
                                >
                                  <span>Next (J)</span>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-xs font-mono text-muted-foreground ml-2">
                                  Candidate {rankedApplicants.findIndex((a) => a.id === activeCandidate.id) + 1} of{" "}
                                  {rankedApplicants.length}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={activeCandidate.status === "SHORTLISTED" ? "default" : "outline"}
                                  disabled={updatingId === activeCandidate.id}
                                  onClick={() => handleDirectStatusChange(activeCandidate, "SHORTLISTED")}
                                  className="h-8 text-xs font-semibold gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Shortlist (S)</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant={activeCandidate.status === "UNDER_REVIEW" ? "default" : "outline"}
                                  disabled={updatingId === activeCandidate.id}
                                  onClick={() => handleDirectStatusChange(activeCandidate, "UNDER_REVIEW")}
                                  className="h-8 text-xs font-semibold"
                                >
                                  <span>Review (U)</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant={activeCandidate.status === "REJECTED" ? "destructive" : "outline"}
                                  disabled={updatingId === activeCandidate.id}
                                  onClick={() => handleDirectStatusChange(activeCandidate, "REJECTED")}
                                  className="h-8 text-xs font-semibold gap-1.5 text-destructive hover:text-destructive"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Reject (R)</span>
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAnalysis(activeCandidate)}
                                  className="h-8 text-xs text-muted-foreground gap-1"
                                  title="Open full dialog modal"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>Full Modal</span>
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
                  )}
                </div>
              ) : (
                /* STANDARD TABLE VIEW (Aligned with TalentMatch Pool Table Row Spec) */
                <div>
                  <div className="px-6 py-3 bg-muted/40 border-y border-border flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span>
                      Preset: <strong>{isRegulatedRole ? "Regulated Professional (Medical)" : "Professional / Technical (IT)"}</strong>
                      {" · "}
                      <span className="font-mono text-xs">
                        {isRegulatedRole 
                          ? "30% Req · 25% Exp · 25% Credential · 10% Pref · 10% Achiev" 
                          : "40% Req · 25% Exp · 15% Edu · 10% Pref · 10% Achiev"}
                      </span>
                    </span>
                    <span className="font-mono font-bold text-foreground">Showing: {rankedApplicants.length} Candidates</span>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
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
                          <TableCell colSpan={8} className="text-center py-14 text-muted-foreground text-sm">
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
                              className="cursor-pointer hover:bg-muted/40 transition-colors"
                              onClick={() => openAnalysis(app)}
                            >
                              {/* Rank */}
                              <TableCell className="text-center font-mono font-bold text-xs whitespace-nowrap">
                                {index === 0 && score > 0 ? (
                                  <span className="text-sm">🥇 1 of {rankedApplicants.length}</span>
                                ) : index === 1 && score > 0 ? (
                                  <span className="text-sm">🥈 2 of {rankedApplicants.length}</span>
                                ) : index === 2 && score > 0 ? (
                                  <span className="text-sm">🥉 3 of {rankedApplicants.length}</span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {index + 1} of {rankedApplicants.length}
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
                                    <Badge variant="outline" className="text-[10px] py-0 text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-medium">
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
                                      ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                                      : "text-amber-600 border-amber-500/30 bg-amber-500/10"
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
                                    className="gap-1 text-xs font-semibold py-0.5 text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10 whitespace-nowrap"
                                  >
                                    <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
                                    <span>Stated, verify document</span>
                                  </Badge>
                                ) : hardReqStatus === "Verified" ? (
                                  <Badge
                                    variant="outline"
                                    className="gap-1 text-xs font-semibold py-0.5 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 whitespace-nowrap"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
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
                                        className="text-[10px] font-normal py-0.5 px-2 text-rose-700 dark:text-rose-300 border-rose-500/30 bg-rose-500/10"
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
                                    }}
                                    className="gap-1 text-xs font-semibold h-8"
                                    title="Open high-velocity split screen with this candidate"
                                  >
                                    <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                                    <span>Screen</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAnalysis(app)}
                                    className="gap-1 text-xs font-semibold h-8"
                                    title="Open official TalentMatch candidate summary card"
                                  >
                                    <Sparkles className="h-3 w-3 text-primary" />
                                    <span>Card</span>
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

              <Table>
                <TableHeader>
                  <TableRow>
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
                      <TableCell colSpan={8} className="text-center py-14 text-muted-foreground text-sm">
                        No applications recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rosterApplicants.map((app) => {
                      const expYears = app.resume?.extracted_experience_years;
                      return (
                        <TableRow
                          key={app.id}
                          className="cursor-pointer"
                          onClick={() => openAnalysis(app)}
                        >
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
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant={app.status === "SHORTLISTED" ? "default" : "outline"}
                                disabled={updatingId === app.id}
                                onClick={(e) => handleQuickStatusChange(app, "SHORTLISTED", e)}
                                className="h-7 px-2.5 text-xs font-semibold"
                              >
                                Shortlist
                              </Button>
                              <Button
                                size="sm"
                                variant={app.status === "UNDER_REVIEW" ? "secondary" : "ghost"}
                                disabled={updatingId === app.id}
                                onClick={(e) => handleQuickStatusChange(app, "UNDER_REVIEW", e)}
                                className="h-7 px-2.5 text-xs font-semibold"
                              >
                                Review
                              </Button>
                              <Button
                                size="sm"
                                variant={app.status === "REJECTED" ? "destructive" : "ghost"}
                                disabled={updatingId === app.id}
                                onClick={(e) => handleQuickStatusChange(app, "REJECTED", e)}
                                className="h-7 px-2.5 text-xs font-semibold"
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
                              className="h-8 text-xs px-2.5 font-medium"
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
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
