"use client";

import React, { useMemo, useState } from "react";
import { BriefcaseBusiness, CheckSquare2, Clock3, FileDown, Search, UserRoundCheck } from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { fetchApi } from "@/lib/api";
import { getCandidateDisplayName } from "@/lib/candidate-identity";
import { Application, ApplicationStatus } from "@/types/application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { CandidateWorkflowPanel } from "./CandidateWorkflowPanel";
import { PipelineReportDialog } from "./PipelineReportDialog";

const PIPELINE: Array<{ status: ApplicationStatus; label: string; description: string }> = [
  { status: "SUBMITTED", label: "New", description: "Awaiting first review" },
  { status: "UNDER_REVIEW", label: "Review", description: "Evidence being assessed" },
  { status: "SHORTLISTED", label: "Shortlist", description: "Ready for team decision" },
  { status: "INTERVIEW", label: "Interview", description: "In active conversations" },
  { status: "HIRED", label: "Hired", description: "Accepted candidates" },
  { status: "REJECTED", label: "Rejected", description: "Application not progressing" },
];

function normalizeStage(status: ApplicationStatus): ApplicationStatus {
  if (status === "PROCESSING") return "SUBMITTED";
  return status;
}

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-700 bg-emerald-50";
  if (score >= 70) return "text-blue-700 bg-blue-50";
  return "text-slate-600 bg-slate-100";
}

export function RecruitmentPipelineView() {
  const { applications, jobs, anonymize, onApplicationUpdated } = useRecruiter();
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus>("UNDER_REVIEW");
  const [working, setWorking] = useState(false);
  const [workspaceApplication, setWorkspaceApplication] = useState<Application | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const visibleApplications = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesJob = jobFilter === "all" || String(application.job) === jobFilter;
      const matchesQuery = !needle || [
        application.candidate_code,
        application.applicant_name,
        application.email,
        application.job_title,
      ].some((value) => value?.toLowerCase().includes(needle));
      return matchesJob && matchesQuery;
    });
  }, [applications, jobFilter, query]);

  const moveApplication = async (application: Application, status: ApplicationStatus) => {
    if (application.status === status) return;
    setWorking(true);
    try {
      const updated = await fetchApi<Application>(`/applications/${application.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onApplicationUpdated(updated);
      toast.success(`Moved ${application.candidate_code}`, {
        description: `Candidate is now in ${PIPELINE.find((stage) => stage.status === status)?.label || status}.`,
      });
    } catch (error) {
      toast.error("Candidate was not moved", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setWorking(false);
    }
  };

  const applyBulkMove = async () => {
    if (selectedIds.length === 0) return;
    setWorking(true);
    try {
      const updated = await fetchApi<Application[]>("/applications/bulk/", {
        method: "POST",
        body: JSON.stringify({ application_ids: selectedIds, status: bulkStatus }),
      });
      updated.forEach(onApplicationUpdated);
      toast.success(`${updated.length} candidate${updated.length === 1 ? "" : "s"} moved`);
      setSelectedIds([]);
    } catch (error) {
      toast.error("Bulk action failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setWorking(false);
    }
  };

  const toggleSelected = (applicationId: number) => {
    setSelectedIds((current) =>
      current.includes(applicationId)
        ? current.filter((id) => id !== applicationId)
        : [...current, applicationId]
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Recruitment pipeline</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Keep ownership and next actions visible from first review through the final decision.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <UserRoundCheck className="h-4 w-4 text-blue-600" />
            <span><strong className="font-semibold text-slate-900">{visibleApplications.length}</strong> active records in this view</span>
          </div>
          <Button variant="outline" onClick={() => setReportOpen(true)} disabled={jobFilter === "all"} title={jobFilter === "all" ? "Select a job to generate a report" : undefined} className="gap-2">
            <FileDown className="h-4 w-4" />Generate report
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center" aria-label="Pipeline controls">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidate, role, or email" className="pl-9" />
        </div>
        <Select value={jobFilter} onValueChange={(value) => { setJobFilter(value); setSelectedIds([]); }}>
          <SelectTrigger className="w-full lg:w-64" aria-label="Filter by job"><SelectValue placeholder="All jobs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All job requisitions</SelectItem>
            {jobs.map((job) => <SelectItem key={job.id} value={String(job.id)}>{job.title}</SelectItem>)}
          </SelectContent>
        </Select>

        {selectedIds.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-blue-700"><CheckSquare2 className="h-4 w-4" />{selectedIds.length} selected</span>
            <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as ApplicationStatus)}>
              <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Bulk destination"><SelectValue /></SelectTrigger>
              <SelectContent>{PIPELINE.map((stage) => <SelectItem key={stage.status} value={stage.status}>{stage.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" onClick={applyBulkMove} disabled={working}>Move selected</Button>
          </div>
        )}
      </section>

      <div className="overflow-x-auto pb-3 [scrollbar-color:#cbd5e1_transparent]" aria-label="Candidate pipeline board">
        <div className="grid min-w-[1180px] grid-cols-6 gap-3">
          {PIPELINE.map((stage) => {
            const stageApplications = visibleApplications.filter(
              (application) => normalizeStage(application.status) === stage.status
            );
            return (
              <section
                key={stage.status}
                className="min-h-[540px] rounded-2xl bg-slate-100/80 p-2.5"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  const application = applications.find((item) => item.id === draggedId);
                  if (application) void moveApplication(application, stage.status);
                  setDraggedId(null);
                }}
                aria-labelledby={`pipeline-${stage.status}`}
              >
                <div className="px-1.5 pb-3 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id={`pipeline-${stage.status}`} className="text-sm font-bold text-slate-900">{stage.label}</h2>
                    <span className="rounded-full bg-white px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-slate-600">{stageApplications.length}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">{stage.description}</p>
                </div>

                <div className="space-y-2.5">
                  {stageApplications.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs leading-5 text-slate-500">Drop a candidate here</div>
                  ) : stageApplications.map((application) => {
                    const score = Math.round(application.match_result?.match_score || 0);
                    const selected = selectedIds.includes(application.id);
                    return (
                      <article
                        key={application.id}
                        draggable
                        onDragStart={() => setDraggedId(application.id)}
                        onDragEnd={() => setDraggedId(null)}
                        className={`rounded-xl bg-white p-3 shadow-xs transition-shadow hover:shadow-sm ${selected ? "ring-2 ring-blue-500" : "ring-1 ring-slate-200"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => setWorkspaceApplication(application)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md">
                            <span className="block truncate text-sm font-semibold text-slate-950">{getCandidateDisplayName(application, anonymize)}</span>
                            <span className="mt-0.5 block truncate text-[11px] text-slate-500">{application.job_title || `Job #${application.job}`}</span>
                          </button>
                          <input type="checkbox" checked={selected} onChange={() => toggleSelected(application.id)} aria-label={`Select ${application.candidate_code}`} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className={`rounded-md px-2 py-1 font-mono text-xs font-bold tabular-nums ${scoreColor(score)}`}>{score}%</span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500"><Clock3 className="h-3.5 w-3.5" />{application.open_task_count || 0} tasks</span>
                        </div>

                        <div className="mt-3 border-t border-slate-100 pt-2">
                          <Select value={normalizeStage(application.status)} onValueChange={(value) => void moveApplication(application, value as ApplicationStatus)} disabled={working}>
                            <SelectTrigger className="h-8 w-full border-0 bg-slate-50 px-2 text-xs shadow-none" aria-label={`Move ${application.candidate_code}`}><SelectValue /></SelectTrigger>
                            <SelectContent>{PIPELINE.map((destination) => <SelectItem key={destination.status} value={destination.status}>{destination.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {applications.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <BriefcaseBusiness className="h-8 w-8 text-slate-400" />
          <h2 className="mt-4 font-semibold text-slate-900">The pipeline is ready</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">Candidates will appear here when applications are submitted to an active job.</p>
        </div>
      )}

      <CandidateWorkflowPanel key={workspaceApplication?.id ?? "empty"} application={workspaceApplication} anonymize={anonymize} onClose={() => setWorkspaceApplication(null)} onApplicationUpdated={onApplicationUpdated} />
      <PipelineReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        job={jobs.find((job) => String(job.id) === jobFilter) || null}
        applications={applications}
        selectedIds={selectedIds}
      />
    </div>
  );
}
