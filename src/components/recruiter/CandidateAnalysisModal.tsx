"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  FileText,
  Download,
  RotateCcw,
  ShieldCheck,
  User,
} from "lucide-react";
import { Application, ApplicationStatus } from "@/types/application";
import { fetchApi } from "@/lib/api";

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

  if (!isOpen || !application) return null;

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

  const match = application.match_result;
  const resume = application.resume;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {application.candidate_code}
              </span>
              {anonymize ? (
                <span className="flex items-center gap-1 text-xs text-violet-400 font-medium px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Demographics Anonymized
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {application.applicant_name} ({application.email})
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Applied for: {application.job_title}
            </h2>
            <div className="text-xs text-slate-400">
              Department: {application.job_department} · Applied:{" "}
              {new Date(application.applied_at).toLocaleDateString()}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* AI Screening Summary Card */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Score Gauge */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 border border-indigo-500/30 flex flex-col items-center justify-center text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              AI Match Score
            </div>
            <div className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-300 to-white bg-clip-text text-transparent font-mono">
              {match ? `${match.match_score}%` : "Pending"}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              {match && match.match_score >= 80
                ? "🌟 High Alignment Candidate"
                : match && match.match_score >= 60
                ? "⚡ Moderate Alignment"
                : "⚠️ Requires Closer Review"}
            </div>
          </div>

          {/* Sub Score Breakdown (Philippines Market Weighting) */}
          <div className="md:col-span-2 p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5 justify-center flex flex-col">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Deterministic Weights (PH Market)</span>
              <span className="text-[10px] text-indigo-400 font-mono">40% Exp · 35% Skills · 15% Semantic · 10% Edu</span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Experience Fit (40% weight)</span>
                  <span className="font-mono text-teal-300">{match?.experience_match_score || 0}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${match?.experience_match_score || 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Skill Alignment (35% weight)</span>
                  <span className="font-mono text-indigo-300">{match?.skill_match_score || 0}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${match?.skill_match_score || 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Semantic & Role Fit (15% weight)</span>
                  <span className="font-mono text-sky-300">{match?.semantic_match_score || 0}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                    style={{ width: `${match?.semantic_match_score || 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Education & Credentials (10% weight)</span>
                  <span className="font-mono text-violet-300">{match?.education_match_score || 0}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${match?.education_match_score || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Comparison */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Matched Skills ({match?.matched_skills.length || 0})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {match && match.matched_skills.length > 0 ? (
                match.matched_skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs"
                  >
                    ✓ {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">None detected</span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 mb-2">
              <XCircle className="h-4 w-4" />
              Missing Required Skills ({match?.missing_skills.length || 0})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {match && match.missing_skills.length > 0 ? (
                match.missing_skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs"
                  >
                    ✕ {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">All required skills present</span>
              )}
            </div>
          </div>
        </div>

        {/* Extracted Experience & Education */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-slate-400 font-medium">Extracted Experience:</div>
              <div className="text-slate-200 mt-0.5">
                {resume?.extracted_experience_years !== undefined && resume?.extracted_experience_years !== null
                  ? resume.extracted_experience_years === 0
                    ? "Fresh Graduate / Entry Level (0.0 years)"
                    : `${resume.extracted_experience_years} year(s)`
                  : "0.0 years"}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <GraduationCap className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-slate-400 font-medium">Extracted Education:</div>
              <div className="text-slate-200 mt-0.5">
                {resume?.extracted_education && resume.extracted_education.length > 0
                  ? resume.extracted_education.join(", ")
                  : "Academic Degree"}
              </div>
            </div>
          </div>
        </div>

        {/* Explanation / Gemini Insights */}
        {match?.explanation && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-indigo-500/20 text-xs">
            <div className="font-semibold text-indigo-300 mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              AI Recruiter Insights & Grounded Evidence
            </div>
            <div className="font-sans text-slate-300 whitespace-pre-line leading-relaxed text-xs space-y-1">
              {match.explanation}
            </div>
          </div>
        )}

        {/* Resume Actions & Raw Text Toggle */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {resume?.file_url && (
              <a
                href={resume.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition"
              >
                <Download className="h-3.5 w-3.5 text-indigo-400" />
                <span>Download Resume ({resume.original_filename})</span>
              </a>
            )}

            <button
              onClick={() => setShowRawText(!showRawText)}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition"
            >
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>{showRawText ? "Hide Extracted Text" : "View Extracted Text"}</span>
            </button>

            <button
              onClick={handleReprocess}
              disabled={reprocessing}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${reprocessing ? "animate-spin text-indigo-400" : ""}`} />
              <span>Re-analyze</span>
            </button>
          </div>

          {/* Status Changer Actions */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Decision:</span>
            <button
              onClick={() => handleStatusChange("UNDER_REVIEW")}
              disabled={updating}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition ${
                application.status === "UNDER_REVIEW"
                  ? "bg-sky-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Review
            </button>
            <button
              onClick={() => handleStatusChange("SHORTLISTED")}
              disabled={updating}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition ${
                application.status === "SHORTLISTED"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Shortlist
            </button>
            <button
              onClick={() => handleStatusChange("REJECTED")}
              disabled={updating}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition ${
                application.status === "REJECTED"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Reject
            </button>
          </div>
        </div>

        {/* Raw Text Drawer */}
        {showRawText && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto font-mono text-[11px] text-slate-400 whitespace-pre-wrap">
            {resume?.extracted_text || "No extracted text available."}
          </div>
        )}
      </div>
    </div>
  );
}
