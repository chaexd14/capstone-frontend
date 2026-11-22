"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import {
  FileText,
  ExternalLink,
  Maximize2,
  Minimize2,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Application } from "@/types/application";
import {
  fetchApiBlob,
  fetchResumeDetail,
  fetchResumePreview,
  ResumePreviewPage,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { EmptyState } from "@/components/ui/feedback";
import { FormAlertNote } from "@/components/ui/form-error";
import { IconButton } from "@/components/ui/icon-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CandidateResumePreviewProps {
  application: Application;
  anonymize?: boolean;
  isIdentityRevealed?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

const MIN_ZOOM = 75;
const MAX_ZOOM = 200;
const ZOOM_STEP = 15;
const DOUBLE_CLICK_ZOOM = 145;
const DRAG_THRESHOLD_PX = 3;

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value)));
}

function getTouchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
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
          className="mt-2 border-b border-border pb-1.5 pt-4 text-sm font-bold uppercase tracking-wider text-foreground first:mt-0 first:pt-0"
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
          className="flex items-start gap-2.5 py-0.5 pl-2 text-sm leading-relaxed text-foreground"
        >
          <span
            className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground"
            aria-hidden="true"
          />
          <span className="flex-1 break-words">{bulletMatch[2]}</span>
        </div>
      );
    }

    return (
      <p
        key={idx}
        className="break-words py-0.5 text-sm leading-relaxed text-foreground"
      >
        {line}
      </p>
    );
  });
}

export function CandidateResumePreview({
  application,
  anonymize = false,
  isIdentityRevealed = false,
  isExpanded = false,
  onToggleExpand,
  className = "",
}: CandidateResumePreviewProps) {
  const resume = application.resume;
  const resumeId = resume?.id;
  const isPurged = Boolean(resume?.is_purged);
  const inlineExtractedText = resume?.extracted_text;
  const inlineRedactedText = resume?.redacted_text;
  const isBlindModeActive = Boolean(
    anonymize &&
    !isIdentityRevealed &&
    !["SHORTLISTED", "INTERVIEW", "HIRED"].includes(application.status)
  );

  // Lazily fetch & cache full extracted/redacted text when omitted from the slim list payload
  const [hydratedResume, setHydratedResume] = useState<{
    id: number;
    extracted_text?: string;
    redacted_text?: string;
  } | null>(null);
  const needsResumeText = Boolean(
    resumeId &&
    !isPurged &&
    inlineExtractedText === undefined &&
    inlineRedactedText === undefined &&
    hydratedResume?.id !== resumeId
  );

  useEffect(() => {
    if (!needsResumeText || !resumeId) return;
    let active = true;
    void fetchResumeDetail(resumeId)
      .then((detail) => {
        if (!active) return;
        setHydratedResume({
          id: resumeId,
          extracted_text: detail.extracted_text,
          redacted_text: detail.redacted_text,
        });
      })
      .catch(() => {
        if (!active) return;
        setHydratedResume({ id: resumeId, extracted_text: "", redacted_text: "" });
      });
    return () => {
      active = false;
    };
  }, [needsResumeText, resumeId]);

  const extractedText =
    inlineExtractedText !== undefined
      ? inlineExtractedText
      : hydratedResume && hydratedResume.id === resumeId
        ? hydratedResume.extracted_text
        : undefined;
  const redactedText =
    inlineRedactedText !== undefined
      ? inlineRedactedText
      : hydratedResume && hydratedResume.id === resumeId
        ? hydratedResume.redacted_text
        : undefined;
  const loadingResumeText = needsResumeText;

  const [retryCount, setRetryCount] = useState<number>(0);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const pdfStageRef = useRef<HTMLDivElement | null>(null);
  const zoomPercentRef = useRef<number>(100);
  const zoomAnchorRef = useRef<{
    ratioX: number;
    ratioY: number;
    vpX: number;
    vpY: number;
    hasViewportOffset: boolean;
    pending: boolean;
  }>({
    ratioX: 0.5,
    ratioY: 0.5,
    vpX: 0,
    vpY: 0,
    hasViewportOffset: false,
    pending: false,
  });

  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  }>({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });
  const suppressNextDblClickRef = useRef<boolean>(false);

  const pinchRef = useRef<{
    active: boolean;
    initialDistance: number;
    initialZoom: number;
  }>({
    active: false,
    initialDistance: 0,
    initialZoom: 100,
  });

  useEffect(() => {
    zoomPercentRef.current = zoomPercent;
  }, [zoomPercent]);

  const applyAnchoredZoom = useCallback(
    (nextZoom: number, clientX?: number, clientY?: number) => {
      const clamped = clampZoom(nextZoom);
      if (clamped === zoomPercentRef.current) return;

      const el = pdfStageRef.current;
      if (el && el.scrollWidth > 0 && el.scrollHeight > 0) {
        const rect = el.getBoundingClientRect();
        const hasPoint = clientX !== undefined && clientY !== undefined;
        const vpX = hasPoint ? clientX - rect.left : el.clientWidth / 2;
        const vpY = hasPoint ? clientY - rect.top : el.clientHeight / 2;
        zoomAnchorRef.current = {
          ratioX: (el.scrollLeft + vpX) / el.scrollWidth,
          ratioY: (el.scrollTop + vpY) / el.scrollHeight,
          vpX,
          vpY,
          hasViewportOffset: true,
          pending: true,
        };
      }

      zoomPercentRef.current = clamped;
      setZoomPercent(clamped);
    },
    []
  );

  const formatInfo = getFileFormatInfo(resume?.original_filename, resume?.file_type);

  const shouldFetchPreview = Boolean(
    resumeId &&
    !isPurged &&
    !isBlindModeActive &&
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

    const { ratioX, ratioY, vpX, vpY, hasViewportOffset } = zoomAnchorRef.current;
    const offsetX = hasViewportOffset ? vpX : el.clientWidth / 2;
    const offsetY = hasViewportOffset ? vpY : el.clientHeight / 2;

    el.scrollLeft = Math.max(0, ratioX * el.scrollWidth - offsetX);
    el.scrollTop = Math.max(0, ratioY * el.scrollHeight - offsetY);
  }, [zoomPercent, pdfPages.length]);

  useEffect(() => {
    const el = pdfStageRef.current;
    if (!el || pdfPages.length === 0) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 10 : -10;
      applyAnchoredZoom(zoomPercentRef.current + delta, e.clientX, e.clientY);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          active: true,
          initialDistance: getTouchDistance(e.touches),
          initialZoom: zoomPercentRef.current,
        };
      } else {
        pinchRef.current.active = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pinchRef.current.active || e.touches.length !== 2) return;
      if (pinchRef.current.initialDistance <= 0) return;
      e.preventDefault();
      const dist = getTouchDistance(e.touches);
      const nextZoom =
        pinchRef.current.initialZoom * (dist / pinchRef.current.initialDistance);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      applyAnchoredZoom(nextZoom, midX, midY);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchRef.current.active = false;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [pdfPages.length, applyAnchoredZoom]);

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    const el = e.currentTarget;
    el.focus({ preventScroll: true });

    dragRef.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: el.scrollLeft,
      startScrollTop: el.scrollTop,
    };

    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Ignore environments where pointer capture is unavailable
    }
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      setIsDragging(true);
    }

    e.currentTarget.scrollLeft = drag.startScrollLeft - dx;
    e.currentTarget.scrollTop = drag.startScrollTop - dy;
  };

  const handleStagePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    if (drag.moved) {
      suppressNextDblClickRef.current = true;
      window.setTimeout(() => {
        suppressNextDblClickRef.current = false;
      }, 250);
    }

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors when pointer capture already ended
    }

    dragRef.current = {
      active: false,
      moved: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      startScrollLeft: 0,
      startScrollTop: 0,
    };
    setIsDragging(false);
  };

  const handleStageDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressNextDblClickRef.current) return;
    const targetZoom = zoomPercent > 100 ? 100 : DOUBLE_CLICK_ZOOM;
    applyAnchoredZoom(targetZoom, e.clientX, e.clientY);
  };

  const documentText = isBlindModeActive
    ? redactedText || ""
    : extractedText || fallbackText || "";
  const displayFilename = isBlindModeActive
    ? `${application.candidate_code}_Redacted_Resume.${formatInfo.ext === "other" ? "txt" : formatInfo.ext}`
    : resume?.original_filename || `${application.candidate_code} Resume`;

  const handleOpenInNewTab = () => {
    if (pdfPages.length > 0) {
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

    if (documentText) {
      const textBlob = new Blob([documentText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(textBlob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  const hasPdfToolbarControls = Boolean(
    resume && !isPurged && !isBlindModeActive && formatInfo.ext === "pdf" && pdfPages.length > 0
  );
  const canOpenNewTab = Boolean(
    resume && !isPurged && !isBlindModeActive && (pdfPages.length > 0 || documentText)
  );

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden bg-muted/40 ${className}`}
    >
      {/* Single Clean Resume Header Bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="max-w-[220px] truncate text-sm font-semibold text-foreground sm:max-w-[340px]"
            title={displayFilename}
          >
            {displayFilename}
          </span>
          {isBlindModeActive ? (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
              PII redacted
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasPdfToolbarControls || canOpenNewTab || onToggleExpand ? (
            <ButtonGroup>
              {hasPdfToolbarControls ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => applyAnchoredZoom(zoomPercent - ZOOM_STEP)}
                        disabled={zoomPercent <= MIN_ZOOM}
                        label="Zoom out"
                      >
                        <ZoomOut />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent>Zoom out</TooltipContent>
                  </Tooltip>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyAnchoredZoom(100)}
                    title="Reset zoom to 100%"
                    className="h-8 px-2.5 tabular-nums"
                  >
                    {zoomPercent}%
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => applyAnchoredZoom(zoomPercent + ZOOM_STEP)}
                        disabled={zoomPercent >= MAX_ZOOM}
                        label="Zoom in"
                      >
                        <ZoomIn />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent>Zoom in</TooltipContent>
                  </Tooltip>
                </>
              ) : null}

              {canOpenNewTab ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      label="Open resume preview in new tab"
                      onClick={handleOpenInNewTab}
                    >
                      <ExternalLink />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent>Open in new tab</TooltipContent>
                </Tooltip>
              ) : null}

              {onToggleExpand ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={onToggleExpand}
                      label={
                        isExpanded
                          ? "Restore split view"
                          : "Expand resume preview"
                      }
                      className="hidden lg:inline-flex"
                    >
                      {isExpanded ? <Minimize2 /> : <Maximize2 />}
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isExpanded ? "Restore split view" : "Expand resume pane"}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </ButtonGroup>
          ) : null}
        </div>
      </div>

      {/* Main Document Viewport */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {!resume ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              title="No resume attached"
              description="This application does not have an associated resume record."
            />
          </div>
        ) : isPurged ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              title="Original resume file removed per retention policy"
              description="The physical resume file was removed in accordance with data privacy retention rules."
            />
          </div>
        ) : isBlindModeActive ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-auto overscroll-contain touch-pan-x touch-pan-y p-4 sm:p-6">
            <div className="mx-auto flex max-w-[740px] items-start gap-2.5 rounded-xl border border-primary/20 bg-secondary/70 px-4 py-3 text-sm text-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Blind screening is active. Candidate name, contact details, address, demographic markers, and school prestige have been redacted from this document view.
              </span>
            </div>

            {loadingResumeText ? (
              <div className="mx-auto max-w-[740px] rounded-xl border border-border bg-card p-6">
                <ContextualLoading label="Loading redacted resume preview" className="min-h-64" />
              </div>
            ) : documentText ? (
              <div className="mx-auto min-h-[640px] max-w-[740px] rounded-xl border border-border bg-card p-6 shadow-xs sm:p-10">
                {renderFormattedDocumentLines(documentText)}
              </div>
            ) : (
              <div className="mx-auto max-w-[740px] rounded-xl border border-dashed border-border bg-card">
                <EmptyState
                  title="Redacted preview pending"
                  description="The redacted text version of this resume is still processing. Shortlist the candidate or reveal identity to inspect the original file."
                />
              </div>
            )}
          </div>
        ) : formatInfo.ext === "pdf" ? (
          loadingFile ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <ContextualLoading label="Rendering resume pages" className="min-h-0" />
            </div>
          ) : pdfPages.length > 0 ? (
            <div
              ref={pdfStageRef}
              tabIndex={0}
              aria-label="Resume document viewer"
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerEnd}
              onPointerCancel={handleStagePointerEnd}
              onDoubleClick={handleStageDoubleClick}
              className={`min-h-0 flex-1 space-y-4 overflow-auto overscroll-contain touch-pan-x touch-pan-y bg-muted/60 p-3 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:p-5 ${isDragging ? "cursor-grabbing" : "cursor-grab"
                }`}
            >
              {pdfPages.map((page) => (
                <div
                  key={page.page_number}
                  style={{
                    width:
                      zoomPercent <= 100
                        ? `${zoomPercent}%`
                        : `${Math.round(9.2 * zoomPercent)}px`,
                    maxWidth: zoomPercent <= 100 ? "820px" : "none",
                  }}
                  className="mx-auto overflow-hidden rounded-xl border border-border bg-card shadow-xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={page.data_url}
                    width={page.width}
                    height={page.height}
                    draggable={false}
                    alt={`Applicant resume page ${page.page_number} of ${totalPageCount}`}
                    className="pointer-events-none block h-auto w-full select-none"
                  />
                  {totalPageCount > 1 ? (
                    <div className="border-t border-border bg-muted/40 px-3 py-1.5 text-right text-sm font-medium tabular-nums text-muted-foreground">
                      Page {page.page_number} of {totalPageCount}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-4 overflow-auto overscroll-contain touch-pan-x touch-pan-y p-4 sm:p-6">
              <div className="mx-auto max-w-[740px]">
                <FormAlertNote
                  variant="warning"
                  title="PDF preview unavailable"
                  description={
                    fileError ||
                    "Could not render PDF pages. Showing formatted resume text instead."
                  }
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRetryCount((c) => c + 1)}
                    >
                      <RotateCcw aria-hidden="true" />
                      Retry PDF
                    </Button>
                  }
                />
              </div>

              {documentText ? (
                <div className="mx-auto max-w-[740px] rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
                  {renderFormattedDocumentLines(documentText)}
                </div>
              ) : null}
            </div>
          )
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-auto overscroll-contain touch-pan-x touch-pan-y p-4 sm:p-6">
            <div className="mx-auto flex max-w-[740px] items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-xs">
              <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Formatted preview from uploaded{" "}
                <strong className="font-semibold text-foreground">
                  .{formatInfo.ext.toUpperCase()}
                </strong>{" "}
                resume
              </span>
            </div>

            {loadingFile || loadingResumeText ? (
              <ContextualLoading label="Rendering document preview" className="min-h-64" />
            ) : documentText ? (
              <div className="mx-auto min-h-[640px] max-w-[740px] rounded-xl border border-border bg-card p-6 shadow-xs sm:p-10">
                {renderFormattedDocumentLines(documentText)}
              </div>
            ) : (
              <div className="mx-auto max-w-[740px] rounded-xl border border-dashed border-border bg-card">
                <EmptyState
                  title="Document preview unavailable"
                  description={
                    resume.processing_status === "PENDING" ||
                      resume.processing_status === "PROCESSING"
                      ? "This resume is currently being parsed by the document pipeline."
                      : "Use Download resume below to view the original file on your device."
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
