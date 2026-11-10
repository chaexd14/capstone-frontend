"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  RotateCcw,
  ShieldCheck,
  User,
  Columns2,
  ClipboardCheck,
  Briefcase,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Job } from "@/types/job";
import { Application, ApplicationStatus } from "@/types/application";
import { downloadApiFile, fetchApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { CandidatePinpointDossier } from "./CandidatePinpointDossier";
import { CandidateResumePreview } from "./CandidateResumePreview";
import { JobDetailsReferencePane } from "./JobDetailsReferencePane";

interface CandidateAnalysisModalProps {
  application: Application | null;
  job?: Job | null;
  isOpen: boolean;
  onClose: () => void;
  anonymize: boolean;
  onStatusUpdated: (updatedApp: Application) => void;
}

export function CandidateAnalysisModal({
  application,
  job,
  isOpen,
  onClose,
  anonymize,
  onStatusUpdated,
}: CandidateAnalysisModalProps) {
  const [updating, setUpdating] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [paneLayout, setPaneLayout] = useState<"split" | "resume" | "evaluation">("split");
  const [rightPaneView, setRightPaneView] = useState<"evaluation" | "job">("evaluation");
  const [mobilePane, setMobilePane] = useState<"resume" | "evaluation" | "job">("resume");

  if (!application) return null;

  const handleDownloadResume = async () => {
    if (!application.resume) return;
    setDownloadingResume(true);
    try {
      await downloadApiFile(
        `/resumes/${application.resume.id}/download/`,
        application.resume.original_filename,
        { redirect: "error" }
      );
    } catch {
      toast.error("Download Failed", {
        description: "Unable to download this resume. Please try again.",
      });
    } finally {
      setDownloadingResume(false);
    }
  };

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    setUpdating(true);
    const prevStatus = application.status;
    try {
      const updated = await fetchApi<Application>(
        `/applications/${application.id}/status/`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        }
      );
      onStatusUpdated(updated);
      if (newStatus === "SHORTLISTED") {
        toast.success("Candidate Shortlisted", {
          description: `${application.candidate_code} has been advanced to the Shortlist pipeline.`,
          action: {
            label: "Undo",
            onClick: () => void handleStatusChange(prevStatus),
          },
        });
      } else if (newStatus === "REJECTED") {
        toast.info("Candidate Rejected", {
          description: `${application.candidate_code} marked as rejected.`,
          action: {
            label: "Undo",
            onClick: () => void handleStatusChange(prevStatus),
          },
        });
      } else {
        toast.success("Status Updated", {
          description: `${application.candidate_code} status changed to ${newStatus.replace(
            /_/g,
            " "
          )}.`,
        });
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Update Failed", {
        description: "Could not update candidate status. Please try again.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      const updated = await fetchApi<Application>(
        `/applications/${application.id}/reprocess/`,
        {
          method: "POST",
        }
      );
      onStatusUpdated(updated);
      toast.success("AI Re-evaluation Queued", {
        description: `Scores and evidence for ${application.candidate_code} will update after processing.`,
      });
    } catch (err) {
      console.error("Error reprocessing:", err);
      toast.error("Reprocessing Failed", {
        description: "Could not re-evaluate candidate application.",
      });
    } finally {
      setReprocessing(false);
    }
  };

  const resume = application.resume;
  const matchScore = application.match_result?.match_score ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onClose={onClose}
        className="max-w-[1480px] w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white"
      >
        {/* 1. Compact Modal Header */}
        <div className="px-6 py-3.5 pr-14 border-b border-slate-200/90 bg-white shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <Badge
              variant="outline"
              className="font-mono font-bold text-xs px-2.5 py-1 text-[#1976D2] border-blue-200 bg-blue-50/60 shrink-0"
            >
              {application.candidate_code}
            </Badge>

            <DialogHeader className="p-0 space-y-0 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-base sm:text-lg text-slate-900 font-bold leading-snug">
                  {application.job_title}
                </DialogTitle>
                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                <DialogDescription className="text-xs text-slate-500">
                  {application.job_department || "Operations"} &middot; Applied{" "}
                  {new Date(application.applied_at).toLocaleDateString()}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="h-4 w-px bg-slate-200 hidden md:block shrink-0" />

            {anonymize && application.status !== "SHORTLISTED" ? (
              <Badge variant="secondary" className="gap-1.5 text-xs py-0.5 px-2.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1976D2]" />
                <span>Demographics Masked</span>
              </Badge>
            ) : (
              <span className="text-xs text-slate-800 font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#1976D2]" />
                <span>
                  {application.applicant_name} ({application.email})
                </span>
              </span>
            )}
          </div>

          {/* Right Header Controls: Desktop Layout Switcher & Status Badge */}
          <div className="flex items-center gap-2.5">
            <div
              className="hidden lg:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80"
              role="group"
              aria-label="Workspace pane layout"
            >
              <button
                type="button"
                onClick={() => setPaneLayout("split")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  paneLayout === "split"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Side-by-side 50/50 split: Resume Preview and Evaluated Result / Job Details"
              >
                <Columns2 className="w-3.5 h-3.5 text-[#2196F3]" />
                <span>Split View</span>
              </button>
              <button
                type="button"
                onClick={() => setPaneLayout("resume")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  paneLayout === "resume"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Maximize Applicant Resume Preview"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Resume Only</span>
              </button>
              <button
                type="button"
                onClick={() => setPaneLayout("evaluation")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  paneLayout === "evaluation"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Maximize Right Pane (Evaluated Result or Job Details)"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>{rightPaneView === "job" ? "Job Details Only" : "Evaluation Only"}</span>
              </button>
            </div>

            <Badge variant="secondary" className="text-xs px-2.5 py-1 font-semibold">
              {application.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        {/* Mobile / Tablet Segmented Switcher (< lg) */}
        <div className="flex lg:hidden items-center p-2.5 bg-slate-50 border-b border-slate-200/90 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200/90 w-full">
            <button
              type="button"
              onClick={() => setMobilePane("resume")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobilePane === "resume"
                  ? "bg-[#2196F3] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobilePane("evaluation");
                setRightPaneView("evaluation");
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobilePane === "evaluation"
                  ? "bg-[#2196F3] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Evaluation ({matchScore}%)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobilePane("job");
                setRightPaneView("job");
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobilePane === "job"
                  ? "bg-[#2196F3] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Job Details</span>
            </button>
          </div>
        </div>

        {/* 2. Side-by-Side Dual-Pane Body: [Applicant Actual Resume Preview] | [Evaluated Result / Job Details] */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT PANE: Applicant Actual Resume Preview */}
          <div
            className={`min-h-0 h-full overflow-hidden ${
              mobilePane === "resume" ? "flex flex-col" : "hidden"
            } ${
              paneLayout === "evaluation"
                ? "lg:hidden"
                : paneLayout === "resume"
                ? "lg:flex lg:col-span-12"
                : "lg:flex lg:col-span-6"
            }`}
          >
            <CandidateResumePreview
              application={application}
              isExpanded={paneLayout === "resume"}
              onToggleExpand={() =>
                setPaneLayout((prev) => (prev === "resume" ? "split" : "resume"))
              }
              className="h-full"
            />
          </div>

          {/* RIGHT PANE: Switchable [Evaluated Result] or [Job Details] */}
          <div
            className={`min-h-0 h-full flex-col bg-[#f8fafc] overflow-hidden ${
              mobilePane === "evaluation" || mobilePane === "job" ? "flex" : "hidden"
            } ${
              paneLayout === "resume"
                ? "lg:hidden"
                : paneLayout === "evaluation"
                ? "lg:flex lg:col-span-12"
                : "lg:flex lg:col-span-6"
            }`}
          >
            {/* Right Pane Sub-Header Toolbar with View Switcher */}
            <div className="px-4 py-2.5 bg-white border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
              {/* Segmented Switcher: Evaluated Result vs Job Details */}
              <div
                className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80"
                role="group"
                aria-label="Switch between Evaluated Result and Job Details"
              >
                <button
                  type="button"
                  onClick={() => {
                    setRightPaneView("evaluation");
                    if (mobilePane === "job") setMobilePane("evaluation");
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    rightPaneView === "evaluation"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="View AI Evaluated Result and Rubric Breakdown"
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-[#2196F3]" />
                  <span>Evaluated Result</span>
                  <span className="font-mono text-[11px] font-extrabold text-[#1976D2] bg-blue-50 px-1.5 py-0 rounded border border-blue-200/70 tabular-nums">
                    {matchScore}%
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRightPaneView("job");
                    if (mobilePane === "evaluation") setMobilePane("job");
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    rightPaneView === "job"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="View Job Requisition Details, Requirements, and Rubric Weights"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#2196F3]" />
                  <span>Job Details</span>
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPaneLayout((prev) =>
                    prev === "evaluation" ? "split" : "evaluation"
                  )
                }
                className="h-7.5 w-7.5 p-0 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hidden lg:inline-flex items-center justify-center cursor-pointer"
                title={
                  paneLayout === "evaluation"
                    ? "Restore 50/50 split view"
                    : "Maximize right pane"
                }
                aria-label={
                  paneLayout === "evaluation"
                    ? "Restore 50/50 split view"
                    : "Maximize right pane"
                }
              >
                {paneLayout === "evaluation" ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>

            {/* Scrollable Right Pane Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full">
              {rightPaneView === "job" ? (
                <JobDetailsReferencePane application={application} job={job} />
              ) : (
                <CandidatePinpointDossier
                  application={application}
                  anonymize={anonymize}
                />
              )}
            </div>
          </div>
        </div>

        {/* 3. Persistent Sticky Footer Actions */}
        <div className="py-3 px-6 border-t border-slate-200/90 bg-white shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {resume && !resume.is_purged && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadResume}
                disabled={downloadingResume}
                className="h-9 gap-2 text-xs font-semibold cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{downloadingResume ? "Retrieving..." : "Download File"}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleReprocess}
              disabled={reprocessing}
              className="h-9 gap-2 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${reprocessing ? "animate-spin" : ""}`}
              />
              <span>Re-analyze</span>
            </Button>
          </div>

          {/* Decision Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs font-semibold pr-1">
              Decision:
            </span>
            <Button
              size="sm"
              disabled={updating}
              onClick={() => handleStatusChange("UNDER_REVIEW")}
              className={`h-9 px-4 font-semibold text-xs rounded-xl transition-all cursor-pointer ${
                application.status === "UNDER_REVIEW" ||
                application.status === "PROCESSING"
                  ? "bg-[#2196F3] hover:bg-[#1976D2] text-white shadow-2xs"
                  : "bg-blue-50 text-[#1976D2] border border-blue-200 hover:bg-blue-100/80"
              }`}
            >
              Review
            </Button>
            <Button
              size="sm"
              disabled={updating}
              onClick={() => handleStatusChange("SHORTLISTED")}
              className={`h-9 px-4 font-semibold text-xs rounded-xl transition-all cursor-pointer ${
                application.status === "SHORTLISTED"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/80"
              }`}
            >
              Shortlist
            </Button>
            <Button
              size="sm"
              disabled={updating}
              onClick={() => handleStatusChange("REJECTED")}
              className={`h-9 px-4 font-semibold text-xs rounded-xl transition-all cursor-pointer ${
                application.status === "REJECTED"
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/80"
              }`}
            >
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
