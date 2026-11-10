"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  RotateCcw,
  ShieldCheck,
  User,
} from "lucide-react";
import { Application, ApplicationStatus } from "@/types/application";
import { downloadApiFile, fetchApi } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { CandidatePinpointDossier } from "./CandidatePinpointDossier";

interface CandidateAnalysisModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  anonymize: boolean;
  onStatusUpdated: (updatedApp: Application) => void;
}

export function CandidateAnalysisModal({
  application,
  isOpen,
  onClose,
  anonymize,
  onStatusUpdated,
}: CandidateAnalysisModalProps) {
  const [updating, setUpdating] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);

  if (!application) return null;

  const handleDownloadResume = async () => {
    if (!application.resume) return;
    setDownloadingResume(true);
    try {
      await downloadApiFile(
        `/resumes/${application.resume.id}/download/`,
        application.resume.original_filename,
        { redirect: "error" },
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
      const updated = await fetchApi<Application>(`/applications/${application.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
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
          description: `${application.candidate_code} status changed to ${newStatus.replace(/_/g, " ")}.`,
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
      const updated = await fetchApi<Application>(`/applications/${application.id}/reprocess/`, {
        method: "POST",
      });
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="max-w-4xl h-[92vh] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
        {/* Header */}
        <div className="p-6 pb-3 border-b border-border space-y-2.5 shrink-0 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Badge variant="outline" className="font-mono font-bold text-sm px-3 py-1 text-[#1976D2] border-blue-200 bg-blue-50/50">
                {application.candidate_code}
              </Badge>
              {anonymize ? (
                <Badge variant="secondary" className="gap-1.5 text-xs py-1">
                  <ShieldCheck className="h-4 w-4 text-[#1976D2]" />
                  Demographics Masked
                </Badge>
              ) : (
                <span className="text-sm text-foreground font-semibold flex items-center gap-1.5">
                  <User className="h-4 w-4 text-[#1976D2]" />
                  {application.applicant_name} ({application.email})
                </span>
              )}
            </div>

            <Badge variant="secondary" className="text-xs px-3 py-1 font-semibold">
              Current Status: {application.status.replace(/_/g, " ")}
            </Badge>
          </div>

          <DialogHeader className="p-0 space-y-1">
            <DialogTitle className="text-xl sm:text-2xl mt-1 text-slate-900 font-bold">
              {application.job_title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {application.job_department} · Applied on {new Date(application.applied_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Dossier Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          <CandidatePinpointDossier
            application={application}
            anonymize={anonymize}
          />

          {/* Raw Text Drawer */}
          {showRawText && (
            <div className="p-4 rounded-xl border border-border bg-muted/30 text-xs space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#1976D2]" />
                <span>Redacted Text Fed to AI Scorer (PII Protected)</span>
              </div>
              <pre className="max-h-48 overflow-y-auto font-mono text-xs text-muted-foreground whitespace-pre-wrap p-3 rounded-lg bg-background border border-border">
                {resume?.redacted_text || resume?.extracted_text || "No text available."}
              </pre>
            </div>
          )}
        </div>

        {/* Persistent Sticky Footer Actions */}
        <div className="p-4 px-6 border-t border-border bg-slate-50/90 backdrop-blur-sm shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {resume && !resume.is_purged && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadResume}
                disabled={downloadingResume}
                className="h-9 gap-2 text-xs"
              >
                <Download className="h-4 w-4" />
                <span>{downloadingResume ? "Retrieving..." : "Resume File"}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawText(!showRawText)}
              className="h-9 gap-2 text-xs"
            >
              <FileText className="h-4 w-4" />
              <span>{showRawText ? "Hide Text" : "Redacted Text"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReprocess}
              disabled={reprocessing}
              className="h-9 gap-2 text-xs"
            >
              <RotateCcw className={`h-4 w-4 ${reprocessing ? "animate-spin" : ""}`} />
              <span>Re-analyze</span>
            </Button>
          </div>

          {/* Decision Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs font-semibold pr-1">Decision:</span>
            <Button
              size="sm"
              disabled={updating}
              onClick={() => handleStatusChange("UNDER_REVIEW")}
              className={`h-9 px-4 font-semibold text-xs rounded-xl transition-all cursor-pointer ${
                application.status === "UNDER_REVIEW" || application.status === "PROCESSING"
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
