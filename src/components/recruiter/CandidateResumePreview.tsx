"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  FileText,
  ShieldCheck,
  Download,
  ExternalLink,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Application } from "@/types/application";
import {
  downloadApiFile,
  fetchApiBlob,
  fetchResumePreview,
  ResumePreviewPage,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";

interface CandidateResumePreviewProps {
  application: Application;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function getFileFormatInfo(filename?: string, mimeType?: string): {
  ext: "pdf" | "docx" | "txt" | "other";
  label: string;
} {
  const lower = (filename || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (lower.endsWith(".pdf") || mime === "application/pdf") {
    return { ext: "pdf", label: "PDF" };
  }
  if (
    lower.endsWith(".docx") ||
    mime.includes("wordprocessingml") ||
    mime.includes("msword")
  ) {
    return { ext: "docx", label: "DOCX" };
  }
  if (lower.endsWith(".txt") || mime === "text/plain") {
    return { ext: "txt", label: "TXT" };
  }
  return { ext: "other", label: "DOC" };
}

const SECTION_HEADING_PATTERN =
  /^(PROFESSIONAL SUMMARY|EXECUTIVE SUMMARY|SUMMARY|OBJECTIVE|PROFILE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EXPERIENCE|EMPLOYMENT HISTORY|EDUCATION|ACADEMIC BACKGROUND|SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|COMPETENCIES|CERTIFICATIONS|LICENSES|LICENSURE|PROJECTS|KEY PROJECTS|ACHIEVEMENTS|AWARDS|REFERENCES|LANGUAGES|VOLUNTEER|PUBLICATIONS|TRAINING|SEMINARS)\b[:\s]*$/i;

function renderFormattedDocumentLines(rawText: string) {
  const lines = rawText.split(/\r?\n/);

  return lines.map((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      return <div key={idx} className="h-2.5" aria-hidden="true" />;
    }

    const isAllCapsHeading =
      SECTION_HEADING_PATTERN.test(line) ||
      (line.length >= 3 &&
        line.length <= 42 &&
        line === line.toUpperCase() &&
        /[A-Z]/.test(line) &&
        !/^\d/.test(line));

    if (isAllCapsHeading) {
      return (
        <h4
          key={idx}
          className="text-xs font-bold text-slate-900 tracking-wider uppercase pt-4 pb-1.5 mt-2 border-b border-slate-200 first:mt-0 first:pt-0"
        >
          {line.replace(/:$/, "")}
        </h4>
      );
    }

    const bulletMatch = line.match(/^([•●▪◦\-*])\s+(.*)$/);
    if (bulletMatch) {
      return (
        <div
          key={idx}
          className="flex items-start gap-2.5 pl-2 py-0.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
          <span className="flex-1 break-words">{bulletMatch[2]}</span>
        </div>
      );
    }

    return (
      <p
        key={idx}
        className="text-xs sm:text-[13px] text-slate-800 leading-relaxed py-0.5 break-words"
      >
        {line}
      </p>
    );
  });
}

export function CandidateResumePreview({
  application,
  isExpanded = false,
  onToggleExpand,
  className = "",
}: CandidateResumePreviewProps) {
  const resume = application.resume;
  const resumeId = resume?.id;
  const isPurged = Boolean(resume?.is_purged);
  const extractedText = resume?.extracted_text;

  const [previewTab, setPreviewTab] = useState<"original" | "redacted">("original");
  const [downloading, setDownloading] = useState<boolean>(false);
  const [copiedRedacted, setCopiedRedacted] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const pdfStageRef = useRef<HTMLDivElement | null>(null);
  const zoomAnchorRef = useRef<{ centerRatioY: number; pending: boolean }>({
    centerRatioY: 0.5,
    pending: false,
  });

  const handleZoomChange = (nextZoom: number) => {
    const clamped = Math.max(75, Math.min(175, nextZoom));
    if (clamped === zoomPercent) return;
    const el = pdfStageRef.current;
    if (el && el.scrollHeight > 0) {
      zoomAnchorRef.current = {
        centerRatioY: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
        pending: true,
      };
    }
    setZoomPercent(clamped);
  };

  const formatInfo = getFileFormatInfo(resume?.original_filename, resume?.file_type);
  const fileSizeStr = formatFileSize(resume?.file_size);

  const shouldFetchPreview = Boolean(
    resumeId &&
      !isPurged &&
      (formatInfo.ext === "pdf" || (formatInfo.ext === "txt" && !extractedText))
  );

  const requestKey = `${resumeId ?? "none"}:${formatInfo.ext}:${retryCount}`;

  const [fileState, setFileState] = useState<{
    key: string;
    pdfPages: ResumePreviewPage[];
    totalPageCount: number;
    fallbackText: string | null;
    fileError: string | null;
  }>({
    key: "",
    pdfPages: [],
    totalPageCount: 0,
    fallbackText: null,
    fileError: null,
  });

  useEffect(() => {
    if (!shouldFetchPreview || !resumeId) {
      return;
    }

    let active = true;

    if (formatInfo.ext === "pdf") {
      fetchResumePreview(resumeId, retryCount === 0)
        .then((res) => {
          if (!active) return;
          if (res.pages && res.pages.length > 0) {
            setFileState({
              key: requestKey,
              pdfPages: res.pages,
              totalPageCount: res.page_count || res.pages.length,
              fallbackText: null,
              fileError: null,
            });
          } else {
            setFileState({
              key: requestKey,
              pdfPages: [],
              totalPageCount: 0,
              fallbackText: null,
              fileError: "No renderable PDF pages returned.",
            });
          }
        })
        .catch((err: unknown) => {
          if (!active) return;
          const msg =
            err instanceof Error
              ? err.message
              : "Unable to render PDF pages. Showing formatted resume text instead.";
          setFileState({
            key: requestKey,
            pdfPages: [],
            totalPageCount: 0,
            fallbackText: null,
            fileError: msg,
          });
        });
    } else if (formatInfo.ext === "txt") {
      fetchApiBlob(
        `/resumes/${resumeId}/download/`,
        { redirect: "error" },
        retryCount === 0
      )
        .then(async (blob) => {
          const text = await blob.text();
          if (active) {
            setFileState({
              key: requestKey,
              pdfPages: [],
              totalPageCount: 1,
              fallbackText: text,
              fileError: null,
            });
          }
        })
        .catch((err: unknown) => {
          if (!active) return;
          const msg =
            err instanceof Error
              ? err.message
              : "Unable to load the original resume text file.";
          setFileState({
            key: requestKey,
            pdfPages: [],
            totalPageCount: 0,
            fallbackText: null,
            fileError: msg,
          });
        });
    }

    return () => {
      active = false;
    };
  }, [shouldFetchPreview, resumeId, formatInfo.ext, retryCount, requestKey]);

  const isCurrentKey = fileState.key === requestKey;
  const pdfPages = isCurrentKey ? fileState.pdfPages : [];
  const totalPageCount = isCurrentKey ? fileState.totalPageCount : 0;
  const fallbackText = isCurrentKey ? fileState.fallbackText : null;
  const fileError = isCurrentKey ? fileState.fileError : null;
  const loadingFile = shouldFetchPreview && !isCurrentKey;

  useLayoutEffect(() => {
    const el = pdfStageRef.current;
    if (!el || !zoomAnchorRef.current.pending) return;
    zoomAnchorRef.current.pending = false;

    // Keep horizontal scroll centered in the middle of the page
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);

    // Keep vertical scroll centered on the middle of the current viewport
    el.scrollTop = Math.max(
      0,
      zoomAnchorRef.current.centerRatioY * el.scrollHeight - el.clientHeight / 2
    );
  }, [zoomPercent, pdfPages.length]);

  const handleDownload = async () => {
    if (!resume) return;
    setDownloading(true);
    try {
      await downloadApiFile(
        `/resumes/${resume.id}/download/`,
        resume.original_filename || `${application.candidate_code}_resume`,
        { redirect: "error" }
      );
    } catch {
      toast.error("Download Failed", {
        description: "Unable to download this resume file. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (previewTab === "original" && pdfPages.length > 0) {
      const safeTitle = (
        resume?.original_filename || `${application.candidate_code} Resume`
      ).replace(/[<>&"']/g, "");
      const pagesHtml = pdfPages
        .map(
          (p) =>
            `<div class="page"><img src="${p.data_url}" alt="Page ${p.page_number}" /></div>`
        )
        .join("");
      const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>body{margin:0;padding:24px 16px;background:#e2e8f0;font-family:system-ui,-apple-system,sans-serif}.page{max-width:880px;margin:0 auto 20px;background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(15,23,42,0.12);overflow:hidden}img{display:block;width:100%;height:auto}</style></head><body>${pagesHtml}</body></html>`;
      const htmlBlob = new Blob([htmlDoc], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(htmlBlob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    const textToOpen =
      previewTab === "redacted"
        ? resume?.redacted_text || resume?.extracted_text || ""
        : resume?.extracted_text || fallbackText || "";

    if (textToOpen) {
      const textBlob = new Blob([textToOpen], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(textBlob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  const handleCopyText = () => {
    const text =
      previewTab === "redacted"
        ? resume?.redacted_text || resume?.extracted_text || ""
        : resume?.extracted_text || fallbackText || "";
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedRedacted(true);
    toast.success("Resume Text Copied", {
      description: `${
        previewTab === "redacted" ? "Redacted" : "Extracted"
      } resume text copied to clipboard.`,
    });
    window.setTimeout(() => setCopiedRedacted(false), 2000);
  };

  const documentText = resume?.extracted_text || fallbackText || "";
  const redactedText =
    resume?.redacted_text ||
    resume?.extracted_text ||
    "No redacted text available for this candidate.";

  return (
    <div
      className={`flex flex-col h-full min-h-0 bg-slate-100/80 border-r border-slate-200/90 overflow-hidden ${className}`}
    >
      {/* 1. Resume Preview Header Toolbar */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left: Document Identity & Format Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className="font-mono font-bold text-[10px] px-2 py-0.5 text-[#1976D2] border-blue-200 bg-blue-50/70 shrink-0"
          >
            {formatInfo.label}
          </Badge>

          <span
            className="text-xs font-bold text-slate-900 truncate max-w-[160px] sm:max-w-[220px]"
            title={resume?.original_filename || "Applicant Resume"}
          >
            {resume?.original_filename || `${application.candidate_code} Resume`}
          </span>

          {fileSizeStr && (
            <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0 hidden sm:inline">
              ({fileSizeStr})
            </span>
          )}
        </div>

        {/* Right: Mode Switcher & Document Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Segmented Mode Toggle: Original vs Redacted Text */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setPreviewTab("original")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                previewTab === "original"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="View applicant's actual uploaded resume document"
            >
              <FileText className="w-3 h-3 text-[#2196F3]" />
              <span>Actual Resume</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewTab("redacted")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                previewTab === "redacted"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="View PII-redacted text analyzed by the AI scorer"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Redacted Text</span>
            </button>
          </div>

          {/* Open in New Tab */}
          {resume && !resume.is_purged && (pdfPages.length > 0 || documentText) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
              className="h-7.5 w-7.5 p-0 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
              title="Open resume preview in new tab"
              aria-label="Open resume preview in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Download Original File */}
          {resume && !resume.is_purged && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="h-7.5 px-2.5 gap-1.5 rounded-lg border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-[11px] font-semibold cursor-pointer"
              title="Download original resume file"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden xl:inline">
                {downloading ? "Saving..." : "Download"}
              </span>
            </Button>
          )}

          {/* Expand / Restore Pane Button */}
          {onToggleExpand && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleExpand}
              className="h-7.5 w-7.5 p-0 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hidden lg:inline-flex items-center justify-center cursor-pointer"
              title={
                isExpanded
                  ? "Restore 50/50 split view"
                  : "Maximize resume preview pane"
              }
              aria-label={
                isExpanded
                  ? "Restore 50/50 split view"
                  : "Maximize resume preview pane"
              }
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 2. Main Document Viewport */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        {!resume ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <FileText className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-800">No Resume Attached</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              This application does not have an associated resume record.
            </p>
          </div>
        ) : resume.is_purged ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
            <p className="text-sm font-bold text-slate-800">
              Original File Purged per Retention Policy
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              The physical resume file was removed in accordance with data privacy retention rules. You can still inspect the redacted evaluation text.
            </p>
            {resume.redacted_text && previewTab !== "redacted" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewTab("redacted")}
                className="mt-4 text-xs font-semibold"
              >
                View Redacted Text
              </Button>
            )}
          </div>
        ) : previewTab === "redacted" ? (
          /* REDACTED TEXT VIEWPORT */
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="max-w-[740px] mx-auto bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-[#1976D2] shrink-0" />
                  <span>PII-Redacted Resume Text (Fed to AI Scorer)</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  className="h-7 px-2.5 text-[11px] font-semibold gap-1.5"
                >
                  {copiedRedacted ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copy Text</span>
                    </>
                  )}
                </Button>
              </div>
              <pre className="p-5 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {redactedText}
              </pre>
            </div>
          </div>
        ) : formatInfo.ext === "pdf" ? (
          /* CSP-SAFE HIGH-DPI PDF PAGE SHEETS VIEWPORT */
          loadingFile ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2.5">
              <Loader2 className="w-6 h-6 animate-spin text-[#2196F3]" />
              <span className="text-xs font-medium text-slate-600">
                Rendering actual PDF resume pages...
              </span>
            </div>
          ) : pdfPages.length > 0 ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Sub-toolbar: Page Counter & Zoom Controls */}
              <div className="px-4 py-1.5 bg-slate-200/75 border-b border-slate-300/80 flex items-center justify-between gap-2 text-xs shrink-0">
                <span className="font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
                  {totalPageCount} {totalPageCount === 1 ? "Page" : "Pages"}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleZoomChange(zoomPercent - 15)}
                    disabled={zoomPercent <= 75}
                    className="h-6 w-6 rounded-md bg-white border border-slate-300/90 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                    title="Zoom Out"
                    aria-label="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoomChange(100)}
                    className="h-6 px-2 rounded-md bg-white border border-slate-300/90 font-mono text-[11px] font-bold text-slate-800 hover:bg-slate-50 tabular-nums cursor-pointer"
                    title="Reset Zoom to 100%"
                  >
                    {zoomPercent}%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoomChange(zoomPercent + 15)}
                    disabled={zoomPercent >= 175}
                    className="h-6 w-6 rounded-md bg-white border border-slate-300/90 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                    title="Zoom In"
                    aria-label="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Multi-Page Document Stage (Centered on Zoom In / Out) */}
              <div
                ref={pdfStageRef}
                className="flex-1 min-h-0 overflow-auto p-3 sm:p-5 space-y-4 bg-slate-200/60 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/90 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                {pdfPages.map((page) => (
                  <div
                    key={page.page_number}
                    style={{
                      width: `${zoomPercent}%`,
                      maxWidth: `${Math.round(8.2 * zoomPercent)}px`,
                    }}
                    className="mx-auto bg-white rounded-lg border border-slate-300/80 shadow-sm overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.data_url}
                      width={page.width}
                      height={page.height}
                      alt={`Applicant resume page ${page.page_number} of ${totalPageCount}`}
                      className="w-full h-auto block select-none"
                    />
                    {totalPageCount > 1 && (
                      <div className="px-3 py-1 bg-slate-50 border-t border-slate-200/80 text-right font-mono text-[10px] font-semibold text-slate-500 tabular-nums">
                        Page {page.page_number} of {totalPageCount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* PDF Load Error -> Fallback to Formatted Document Sheet + Retry */
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="max-w-[740px] mx-auto p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium">
                    {fileError || "Could not render PDF pages. Showing formatted resume text instead."}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRetryCount((c) => c + 1)}
                    className="h-7 px-2.5 text-[11px] font-semibold bg-white border-amber-300 text-amber-900 hover:bg-amber-100/60 gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry PDF</span>
                  </Button>
                </div>
              </div>

              {documentText ? (
                <div className="max-w-[740px] mx-auto bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
                  {renderFormattedDocumentLines(documentText)}
                </div>
              ) : null}
            </div>
          )
        ) : (
          /* DOCX / TXT FORMATTED A4 PAPER-SHEET VIEWPORT */
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* Top Format Helper Strip */}
            <div className="max-w-[740px] mx-auto px-4 py-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <FileText className="w-3.5 h-3.5 text-[#2196F3] shrink-0" />
                <span>
                  Formatted document preview from uploaded{" "}
                  <strong className="text-slate-900 font-semibold">
                    .{formatInfo.ext.toUpperCase()}
                  </strong>{" "}
                  resume
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="text-xs font-semibold text-[#1976D2] hover:text-[#2196F3] underline underline-offset-2 cursor-pointer"
              >
                {downloading ? "Downloading..." : `Download Original .${formatInfo.ext.toUpperCase()}`}
              </button>
            </div>

            {loadingFile ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2.5">
                <Loader2 className="w-6 h-6 animate-spin text-[#2196F3]" />
                <span className="text-xs font-medium text-slate-600">
                  Rendering document preview...
                </span>
              </div>
            ) : documentText ? (
              <div className="max-w-[740px] mx-auto bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 sm:p-10 min-h-[640px]">
                {renderFormattedDocumentLines(documentText)}
              </div>
            ) : (
              <div className="max-w-[740px] mx-auto bg-white rounded-xl border border-slate-200/90 p-12 text-center space-y-2">
                <p className="text-sm font-bold text-slate-800">
                  Document Preview Unavailable
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {resume.processing_status === "PENDING" ||
                  resume.processing_status === "PROCESSING"
                    ? "This resume is currently being parsed by the document pipeline."
                    : "Download the original file above to view it in your desktop application."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
