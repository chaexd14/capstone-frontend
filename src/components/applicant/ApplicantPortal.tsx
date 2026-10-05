"use client";

import React, { useState, useMemo } from "react";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  Sparkles,
  ChevronRight,
  FileText,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Eye,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { ApplyModal } from "./ApplyModal";
import { JobDetailModal } from "./JobDetailModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface ApplicantPortalProps {
  jobs: Job[];
  applications: Application[];
  onApplicationCreated: (app: Application) => void;
}

const DEPARTMENTS = [
  "All",
  "Healthcare & Medical",
  "Finance & Accounting",
  "Engineering & Construction",
  "BPO & Customer Support",
  "Sales & Business Development",
  "Information Technology",
];

export function ApplicantPortal({ jobs, applications, onApplicationCreated }: ApplicantPortalProps) {
  const [activeTab, setActiveTab] = useState("JOBS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<Job | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  // Filter jobs by search and department
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.department.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        (job.required_skills && job.required_skills.some((s) => s.toLowerCase().includes(q)));

      const matchesDept =
        selectedDepartment === "All" ||
        job.department.toLowerCase() === selectedDepartment.toLowerCase() ||
        (selectedDepartment.includes("Healthcare") && job.department.toLowerCase().includes("health")) ||
        (selectedDepartment.includes("Finance") && (job.department.toLowerCase().includes("fin") || job.department.toLowerCase().includes("account"))) ||
        (selectedDepartment.includes("Engineering") && job.department.toLowerCase().includes("engineer")) ||
        (selectedDepartment.includes("BPO") && (job.department.toLowerCase().includes("bpo") || job.department.toLowerCase().includes("support"))) ||
        (selectedDepartment.includes("Sales") && (job.department.toLowerCase().includes("sales") || job.department.toLowerCase().includes("market"))) ||
        (selectedDepartment.includes("Technology") && (job.department.toLowerCase().includes("tech") || job.department.toLowerCase().includes("it")));

      return matchesSearch && matchesDept;
    });
  }, [jobs, searchQuery, selectedDepartment]);

  const openDetail = (job: Job) => {
    setSelectedJobForDetail(job);
    setIsDetailOpen(true);
  };

  const openApply = (job: Job) => {
    setSelectedJobForApply(job);
    setIsApplyOpen(true);
  };

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
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Career Portal Hero Section */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="outline" className="gap-2 px-3 py-1 text-xs rounded-full bg-secondary/50 font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Applicant & Careers Portal</span>
          </Badge>

          <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Demographic Bias-Free</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Instant AI Score</span>
            </span>
          </div>
        </div>

        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Explore Open Positions
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Discover verified roles across Healthcare, Finance, BPO, Engineering, Sales, and IT. Submit your resume for transparent qualification screening and receive objective AI match scores.
          </p>
        </div>

        {/* Quick Tabs & Switcher */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="JOBS" className="gap-2">
                <Briefcase className="h-4 w-4" />
                <span>Job Openings</span>
                <Badge variant="secondary" className="px-2 py-0 h-5 text-xs font-semibold">
                  {jobs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="MY_APPLICATIONS" className="gap-2">
                <FileText className="h-4 w-4" />
                <span>My Applications</span>
                <Badge variant="secondary" className="px-2 py-0 h-5 text-xs font-semibold">
                  {applications.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-xs sm:text-sm text-muted-foreground font-mono">
            <span>{filteredJobs.length} roles available</span>
          </div>
        </div>
      </div>

      {/* JOBS TAB */}
      {activeTab === "JOBS" && (
        <div className="space-y-6">
          {/* Search Bar & Department Filter Chips */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by role title, required skills, keywords, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-11 text-sm bg-card"
                />
              </div>

              {searchQuery && (
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setSearchQuery("")}
                  className="h-11 text-xs"
                >
                  Clear Search
                </Button>
              )}
            </div>

            {/* Department Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Department:
              </span>
              {DEPARTMENTS.map((dept) => {
                const isSelected = selectedDepartment === dept;
                return (
                  <Button
                    key={dept}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDepartment(dept)}
                    className="h-8 text-xs px-3 rounded-full font-medium shrink-0"
                  >
                    {dept}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Job Cards Grid */}
          {filteredJobs.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card space-y-3">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="text-lg font-bold text-foreground">No matching positions found</div>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                No job postings matched your current search filters. Try selecting &quot;All&quot; departments or adjusting keywords.
              </p>
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDepartment("All");
                }}
                className="mt-2"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  className="flex flex-col justify-between hover:border-foreground/30 transition-all hover:shadow-sm group bg-card"
                >
                  <CardHeader className="p-6 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-xs font-medium">
                        {job.department}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {job.applicant_count || 0} applicants
                      </span>
                    </div>

                    <CardTitle
                      onClick={() => openDetail(job)}
                      className="text-lg font-bold cursor-pointer group-hover:text-primary transition-colors leading-snug"
                    >
                      {job.title}
                    </CardTitle>

                    <CardDescription className="line-clamp-2 leading-relaxed text-sm">
                      {job.description}
                    </CardDescription>

                    {/* Metadata Items */}
                    <div className="flex flex-wrap gap-3.5 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span className="text-foreground">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>{job.minimum_experience}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-primary" />
                        <span className="line-clamp-1">{job.education_requirement}</span>
                      </div>
                    </div>

                    {/* Required Skills Tags */}
                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="pt-2">
                        <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                          Key Qualifications
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {job.required_skills.slice(0, 3).map((skill, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs font-normal px-2.5 py-0.5"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {job.required_skills.length > 3 && (
                            <span className="text-xs text-muted-foreground self-center pl-1 font-mono">
                              +{job.required_skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardHeader>

                  <CardFooter className="p-6 pt-4 border-t border-border flex items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetail(job)}
                      className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Details</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => openApply(job)}
                      className="gap-1.5 font-semibold text-xs"
                    >
                      <span>Apply Now</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MY APPLICATIONS TAB */}
      {activeTab === "MY_APPLICATIONS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-base font-bold text-foreground">
              Submitted Applications & Screening Status
            </h2>
            <span className="text-sm text-muted-foreground font-mono">
              Total: {applications.length}
            </span>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="text-lg font-bold text-foreground">No applications submitted yet</div>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Explore open positions and submit your resume to receive real-time explainable match scores.
              </p>
              <Button
                variant="default"
                size="default"
                onClick={() => setActiveTab("JOBS")}
                className="mt-2 gap-2"
              >
                <span>Browse Open Positions</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {applications.map((app) => {
                const score = app.match_result?.match_score ?? 0;
                return (
                  <Card key={app.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card">
                    <div className="space-y-2.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                          {app.candidate_code}
                        </Badge>
                        <span className="text-sm text-muted-foreground">·</span>
                        <h4 className="text-lg font-bold text-foreground">{app.job_title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {app.job_department}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                        <span>Applicant: <strong className="text-foreground">{app.applicant_name}</strong></span>
                        <span>Email: <strong className="text-foreground">{app.email}</strong></span>
                        <span>Applied: {new Date(app.applied_at).toLocaleDateString()}</span>
                      </div>

                      {app.resume && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground pt-1">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>Resume: <strong className="text-foreground">{app.resume.original_filename}</strong></span>
                          {app.resume.file_url && (
                            <a
                              href={app.resume.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium ml-1"
                            >
                              <span>View File</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Matched Skills Pills */}
                      {app.match_result && app.match_result.matched_skills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2">
                          <span className="text-xs text-muted-foreground uppercase font-bold mr-1">
                            Verified Skills:
                          </span>
                          {app.match_result.matched_skills.slice(0, 5).map((s, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs font-normal">
                              ✓ {s}
                            </Badge>
                          ))}
                          {app.match_result.matched_skills.length > 5 && (
                            <span className="text-xs text-muted-foreground font-mono">
                              +{app.match_result.matched_skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col md:items-end justify-between items-center gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Status:</span>
                        <Badge variant={getStatusBadgeVariant(app.status)} className="text-xs px-3 py-1 font-semibold">
                          {app.status}
                        </Badge>
                      </div>

                      {app.match_result && (
                        <div className="text-right space-y-1.5">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span>AI Screening Score:</span>
                            <strong className="text-foreground font-mono text-base font-bold">
                              {score}%
                            </strong>
                          </div>
                          <div className="w-32 ml-auto">
                            <Progress value={score} className="h-2" />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Job Detail Modal */}
      <JobDetailModal
        job={selectedJobForDetail}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onApply={(job) => openApply(job)}
      />

      {/* Apply Modal */}
      <ApplyModal
        job={selectedJobForApply}
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        onSuccess={(app) => {
          onApplicationCreated(app);
          setActiveTab("MY_APPLICATIONS");
        }}
      />
    </div>
  );
}
