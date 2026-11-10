"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Job, ArchivedJob } from "@/types/job";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmJobActionModal, JobActionType } from "./ConfirmJobActionModal";
import { fetchApi } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { useRecruiter } from "@/context/RecruiterContext";

function getDepartmentMonogram(department?: string, title?: string): string {
  const dept = (department || "").toLowerCase();
  const t = (title || "").toLowerCase();
  if (dept.includes("information") || dept.includes("tech") || t.includes("software") || t.includes("engineer")) return "IT";
  if (dept.includes("finance") || dept.includes("account")) return "FA";
  if (dept.includes("health") || dept.includes("medical") || t.includes("nurse")) return "HC";
  if (dept.includes("civil") || dept.includes("construct") || dept.includes("engineering")) return "ENG";
  if (dept.includes("sales") || dept.includes("business")) return "BD";
  if (dept.includes("bpo") || dept.includes("support") || dept.includes("customer")) return "CS";
  return (department || "HR").slice(0, 2).toUpperCase();
}

export function JobsView() {
  const router = useRouter();
  const {
    jobs,
    applications,
    onJobUpdated,
    onJobArchived,
  } = useRecruiter();

  const [displayMode, setDisplayMode] = useState<"cards" | "table">("cards");
  const [jobTab, setJobTab] = useState<"ACTIVE" | "CLOSED" | "ARCHIVED">("ACTIVE");

  const [archivedJobs, setArchivedJobs] = useState<ArchivedJob[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  // Action Confirmation Modal State
  const [actionModalType, setActionModalType] = useState<JobActionType | null>(null);
  const [actionJob, setActionJob] = useState<Job | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadArchivedJobs = useCallback(async () => {
    setArchivedLoading(true);
    try {
      const data = await fetchApi<ArchivedJob[]>("/archived-jobs/");
      setArchivedJobs(data);
    } catch (err) {
      console.error("Failed to fetch archived jobs:", err);
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (jobTab === "ARCHIVED") {
      const timer = setTimeout(() => {
        void loadArchivedJobs();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [jobTab, loadArchivedJobs]);

  const activeJobs = jobs.filter((j) => j.status === "PUBLISHED" || (!j.status && j.status !== "CLOSED"));
  const closedJobs = jobs.filter((j) => j.status === "CLOSED");

  const handleRestoreArchivedJob = async (archivedJob: ArchivedJob) => {
    setIsActionLoading(true);
    try {
      const restored = await fetchApi<Job>(`/archived-jobs/${archivedJob.id}/restore/`, { method: "POST" });
      setArchivedJobs((prev) => prev.filter((j) => j.id !== archivedJob.id));
      onJobUpdated(restored);
      toast.success("Position Restored", { description: `"${archivedJob.title}" has been restored to active requisitions.` });
    } catch (err: unknown) {
      console.error("Failed to restore archived job:", err);
      toast.error("Restore Failed", { description: "Failed to restore requisition." });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionModalType) return;
    setIsActionLoading(true);
    try {
      if (actionModalType === "close" && actionJob) {
        const updated = await fetchApi<Job>(`/jobs/${actionJob.id}/close/`, { method: "POST" });
        onJobUpdated(updated);
        toast.success("Position Closed", { description: `"${actionJob.title}" is now closed.` });
      } else if (actionModalType === "reopen" && actionJob) {
        const updated = await fetchApi<Job>(`/jobs/${actionJob.id}/reopen/`, { method: "POST" });
        onJobUpdated(updated);
        toast.success("Position Reopened", { description: `"${actionJob.title}" is published.` });
      } else if (actionModalType === "archive" && actionJob) {
        await fetchApi(`/jobs/${actionJob.id}/archive/`, { method: "POST" });
        onJobArchived(actionJob.id);
        toast.success("Position Archived", { description: `"${actionJob.title}" moved to archive.` });
        void loadArchivedJobs();
      }
    } catch (err: unknown) {
      console.error("Job action failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to execute action. Please try again.";
      toast.error("Action Failed", { description: msg });
    } finally {
      setIsActionLoading(false);
      setActionModalType(null);
      setActionJob(null);
    }
  };

  const displayedJobs = jobTab === "ACTIVE" ? activeJobs : closedJobs;

  return (
    <div className="space-y-4">
      {/* Canvas-Level Control Toolbar: Tabs & View Mode (De-containerized) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab Selector: Active | Closed | Archived */}
        <Tabs value={jobTab} onValueChange={(v) => setJobTab(v as "ACTIVE" | "CLOSED" | "ARCHIVED")}>
          <TabsList className="bg-slate-200/60 p-1 rounded-xl">
            <TabsTrigger
              value="ACTIVE"
              className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Active Roles</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white text-slate-700 font-mono text-[11px] font-bold shadow-2xs">
                {activeJobs.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="CLOSED"
              className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs"
            >
              <span>Closed</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white text-slate-700 font-mono text-[11px] font-bold shadow-2xs">
                {closedJobs.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="ARCHIVED"
              className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs"
            >
              <span>Archived</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white text-slate-700 font-mono text-[11px] font-bold shadow-2xs">
                {archivedJobs.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setDisplayMode("cards")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              displayMode === "cards"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Cards Grid View"
            aria-label="Cards Grid View"
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("table")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              displayMode === "table"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Dense Data Table View"
            aria-label="Dense Data Table View"
          >
            Table
          </button>
        </div>
      </div>

      {/* Content Area: Cards or Table directly on canvas */}
      <div>
        {jobTab !== "ARCHIVED" && (
          <div>
            {displayedJobs.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 text-sm">
                  {jobTab === "ACTIVE" ? "No active positions found" : "No closed positions"}
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {jobTab === "ACTIVE"
                    ? "Click Post New Job above to create your first objective evaluation rubric."
                    : "Closed jobs will appear here when you close an active role."}
                </p>
              </div>
            ) : displayMode === "cards" ? (
              /* CARDS GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {displayedJobs.map((job) => {
                  const jobApps = applications.filter((a) => a.job === job.id);
                  const topScore = jobApps.reduce((max, a) => {
                    const s = a.match_result?.match_score || 0;
                    return s > max ? s : max;
                  }, 0);

                  const avgScore =
                    jobApps.length > 0
                      ? Math.round(
                          jobApps.reduce((acc, a) => acc + (a.match_result?.match_score || 0), 0) /
                            jobApps.length
                        )
                      : 0;

                  return (
                    <div
                      key={job.id}
                      onClick={() => router.push(`/admin/jobs/${job.id}`)}
                      className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#2196F3]/40 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        {/* Top Monogram, Title, Status */}
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#2196F3] font-bold text-base flex items-center justify-center shrink-0 border border-blue-100">
                            {getDepartmentMonogram(job.department, job.title)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 text-base group-hover:text-[#2196F3] transition-colors truncate">
                              {job.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {job.department || "Operations"} &bull; {job.location || "Makati City"}
                            </p>
                          </div>
                          {job.status === "CLOSED" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-amber-200 bg-amber-50 text-amber-800 shrink-0">
                              Closed
                            </span>
                          )}
                        </div>

                        {/* Metadata Tag Row */}
                        <div className="flex flex-wrap gap-1.5 my-3.5 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {job.location || "Manila"} &bull; {job.employment_type || "Full time"}
                          </span>
                        </div>

                        {/* Candidate Metrics Strip */}
                        <div className="grid grid-cols-3 divide-x divide-slate-100 py-2.5 my-3 border-y border-slate-100 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                              Total
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                              {jobApps.length}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                              Top Match
                            </span>
                            <span className="font-mono font-bold text-emerald-600 text-sm tabular-nums">
                              {topScore > 0 ? `${topScore}%` : "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                              Average
                            </span>
                            <span className="font-mono font-bold text-slate-700 text-sm tabular-nums">
                              {avgScore > 0 ? `${avgScore}%` : "-"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div
                        className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          {job.status === "CLOSED" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActionJob(job);
                                setActionModalType("reopen");
                              }}
                              className="h-7 text-xs text-emerald-700 hover:bg-emerald-50 px-2 font-medium"
                            >
                              Reopen
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActionJob(job);
                                setActionModalType("close");
                              }}
                              className="h-7 text-xs text-amber-700 hover:bg-amber-50 px-2 font-medium"
                            >
                              Close
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActionJob(job);
                              setActionModalType("archive");
                            }}
                            className="h-7 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 font-medium"
                          >
                            Archive
                          </Button>
                        </div>

                        <Button
                          onClick={() => router.push(`/admin/jobs/${job.id}`)}
                          className="h-8 text-xs font-semibold bg-blue-50 text-[#1976D2] hover:bg-[#2196F3] hover:text-white transition-colors px-3 rounded-lg cursor-pointer"
                        >
                          Candidate Roster &rarr;
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* DENSE DATA TABLE VIEW */
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-700">Role Title &amp; Department</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Department</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Work Setup</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-center w-[110px]">Candidates</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-center w-[110px]">Top Score</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-center w-[110px]">Avg Score</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-center w-[100px]">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedJobs.map((job) => {
                      const jobApps = applications.filter((a) => a.job === job.id);
                      const topScore =
                        jobApps.length > 0
                          ? Math.max(...jobApps.map((a) => a.match_result?.match_score || 0))
                          : null;
                      const avgScore =
                        jobApps.length > 0
                          ? Math.round(
                              jobApps.reduce((acc, a) => acc + (a.match_result?.match_score || 0), 0) /
                                jobApps.length
                            )
                          : null;

                      return (
                        <TableRow
                          key={job.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/admin/jobs/${job.id}`)}
                          className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                        >
                          <TableCell className="font-semibold text-slate-900 text-xs sm:text-sm">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#2196F3] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                                {getDepartmentMonogram(job.department, job.title)}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900">{job.title}</div>
                                <div className="text-[11px] text-slate-400 font-mono">ID: #{job.id}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs font-medium text-slate-700">
                            {job.department || "Operations"}
                          </TableCell>

                          <TableCell className="text-xs text-slate-600">
                            {job.location} &bull; {job.employment_type}
                          </TableCell>

                          <TableCell className="text-center font-mono font-bold text-slate-900 text-xs tabular-nums">
                            {jobApps.length}
                          </TableCell>

                          <TableCell className="text-center font-mono font-bold text-emerald-600 text-xs tabular-nums">
                            {topScore !== null ? `${topScore}%` : "-"}
                          </TableCell>

                          <TableCell className="text-center font-mono font-bold text-slate-700 text-xs tabular-nums">
                            {avgScore !== null ? `${avgScore}%` : "-"}
                          </TableCell>

                          <TableCell className="text-center">
                            {job.status === "CLOSED" ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-amber-200 bg-amber-50 text-amber-800">
                                Closed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                                Active
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/jobs/${job.id}`)}
                              className="h-8 text-xs font-semibold text-[#2196F3] hover:bg-blue-50"
                            >
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* ARCHIVED TAB */}
        {jobTab === "ARCHIVED" && (
          <div>
            {archivedLoading ? (
              <div className="text-center py-12 text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#2196F3]" />
                <span className="text-xs font-mono">Loading archived requisitions...</span>
              </div>
            ) : archivedJobs.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 text-sm">No archived requisitions</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Archived requisitions are preserved for audit and historical record.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-700">Requisition Title</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Department</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Archived Date</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Archive Reason</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedJobs.map((archived) => (
                      <TableRow key={archived.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell className="font-semibold text-slate-900 text-xs sm:text-sm">
                          <div className="font-bold text-slate-900">{archived.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: #{archived.id}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-700">
                          {archived.department || "Operations"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {new Date(archived.archived_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 truncate max-w-xs">
                          {archived.description || "Requisition fulfilled or archived"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleRestoreArchivedJob(archived)}
                              className="h-7 text-xs border-blue-200 text-[#1976D2] hover:bg-blue-50 font-medium"
                            >
                              Restore
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Job Actions */}
      <ConfirmJobActionModal
        isOpen={actionModalType !== null}
        onClose={() => {
          setActionModalType(null);
          setActionJob(null);
            }}
        onConfirm={handleConfirmAction}
        actionType={actionModalType}
        jobTitle={actionJob?.title || ""}
        isLoading={isActionLoading}
      />
    </div>
  );
}
