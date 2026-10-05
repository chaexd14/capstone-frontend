"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  RotateCcw,
  ShieldCheck,
  User,
} from "lucide-react";
import { Application, ApplicationStatus } from "@/types/application";
import { fetchApi } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    if (isOpen && application) {
      const match = application.match_result;
      const explanation = match?.explanation || "";
      const isAiEvaluated =
        explanation.includes("Candidate Alignment & Strengths") ||
        explanation.includes("Gaps & Missing Requirements") ||
        explanation.includes("Recruiter Summary") ||
        explanation.includes("CANDIDATE EXECUTIVE BRIEF");

      console.group(`[TALENTMATCH EVALUATION] Candidate: ${application.candidate_code}`);
      console.log(`Job Position:`, application.job_title);
      console.log(`Evaluated by AI:`, isAiEvaluated ? "✅ YES (Gemini AI)" : "⚙️ Rule-based Fallback");
      console.log(`Overall Match Score:`, `${match?.match_score ?? 0}%`);
      console.groupEnd();
    }
  }, [isOpen, application]);

  if (!application) return null;

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    setUpdating(true);
    try {
      const updated = await fetchApi<Application>(`/applications/${application.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusUpdated(updated);
    } catch (err) {
      console.error("Error updating status:", err);
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
    } catch (err) {
      console.error("Error reprocessing:", err);
    } finally {
      setReprocessing(false);
    }
  };

  const resume = application.resume;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="max-w-4xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="pb-4 border-b border-border space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Badge variant="outline" className="font-mono font-bold text-sm px-3 py-1 text-primary">
                {application.candidate_code}
              </Badge>
              {anonymize ? (
                <Badge variant="secondary" className="gap-1.5 text-xs py-1">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Demographics Masked
                </Badge>
              ) : (
                <span className="text-sm text-foreground font-semibold flex items-center gap-1.5">
                  <User className="h-4 w-4 text-primary" />
                  {application.applicant_name} ({application.email})
                </span>
              )}
            </div>

            <Badge variant="secondary" className="text-xs px-3 py-1 font-semibold">
              Current Status: {application.status}
            </Badge>
          </div>

          <DialogTitle className="text-xl sm:text-2xl mt-1">
            {application.job_title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {application.job_department} · Applied on {new Date(application.applied_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {/* 10-Second Candidate Pinpoint Dossier */}
        <CandidatePinpointDossier
          application={application}
          anonymize={anonymize}
        />

        {/* Raw Text Drawer */}
        {showRawText && (
          <div className="p-4 rounded-xl border border-border bg-muted/30 text-xs space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Redacted Text Fed to AI Scorer (PII Protected)</span>
            </div>
            <pre className="max-h-48 overflow-y-auto font-mono text-xs text-muted-foreground whitespace-pre-wrap p-3 rounded-lg bg-background border border-border">
              {resume?.redacted_text || resume?.extracted_text || "No text available."}
            </pre>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {resume?.file_url && (
              <Button asChild variant="outline" size="default" className="gap-2">
                <a href={resume.file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                  <span>Resume File</span>
                </a>
              </Button>
            )}

            <Button
              variant="outline"
              size="default"
              onClick={() => setShowRawText(!showRawText)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              <span>{showRawText ? "Hide Text" : "Redacted Text"}</span>
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={handleReprocess}
              disabled={reprocessing}
              className="gap-2"
            >
              <RotateCcw className={`h-4 w-4 ${reprocessing ? "animate-spin" : ""}`} />
              <span>Re-analyze</span>
            </Button>
          </div>

          {/* Decision Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium pr-1">Decision:</span>
            <Button
              size="default"
              variant={application.status === "UNDER_REVIEW" ? "default" : "outline"}
              disabled={updating}
              onClick={() => handleStatusChange("UNDER_REVIEW")}
              className="px-4 font-semibold text-xs"
            >
              Review
            </Button>
            <Button
              size="default"
              variant={application.status === "SHORTLISTED" ? "default" : "outline"}
              disabled={updating}
              onClick={() => handleStatusChange("SHORTLISTED")}
              className="px-4 font-semibold text-xs"
            >
              Shortlist
            </Button>
            <Button
              size="default"
              variant={application.status === "REJECTED" ? "destructive" : "outline"}
              disabled={updating}
              onClick={() => handleStatusChange("REJECTED")}
              className="px-4 font-semibold text-xs"
            >
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
