"use client";

import React, { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, RotateCcw, ShieldCheck } from "lucide-react";
import { ApiError, downloadApiFile } from "@/lib/api";
import { Application, ApplicationStatus } from "@/types/application";
import { Job } from "@/types/job";
import { ReportFormatCards, type ReportFileType } from "./ReportFormatCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/feedback";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

export type JobCandidatesReportView = "ranked" | "all";
export type CandidateMatchBand = "ALL" | "STRONG" | "GOOD" | "PARTIAL" | "WEAK";

const STATUS_OPTIONS: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PROCESSING", label: "Processing" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
];

const MATCH_BAND_OPTIONS: Array<{ value: CandidateMatchBand; label: string }> = [
  { value: "ALL", label: "All match strengths" },
  { value: "STRONG", label: "Strong (85%+)" },
  { value: "GOOD", label: "Good (70–84%)" },
  { value: "PARTIAL", label: "Partial (50–69%)" },
  { value: "WEAK", label: "Weak (below 50%)" },
];

export function mapBandFilterToReportBand(bandFilter: string): CandidateMatchBand {
  if (bandFilter === "Strong") return "STRONG";
  if (bandFilter === "Good") return "GOOD";
  if (bandFilter === "Partial") return "PARTIAL";
  if (bandFilter === "Weak") return "WEAK";
  return "ALL";
}

function toUtcDateKey(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function matchesBand(score: number | undefined, band: CandidateMatchBand): boolean {
  if (band === "ALL") return true;
  if (typeof score !== "number" || !Number.isFinite(score)) return false;
  if (band === "STRONG") return score >= 85;
  if (band === "GOOD") return score >= 70 && score < 85;
  if (band === "PARTIAL") return score >= 50 && score < 70;
  return score < 50;
}

interface JobCandidatesReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  applications: Application[];
  initialView?: JobCandidatesReportView;
  initialStatus?: string;
  initialBand?: string;
}

export function JobCandidatesReportDialog({
  open,
  onOpenChange,
  job,
  applications,
  initialView = "ranked",
  initialStatus = "ALL",
  initialBand = "ALL",
}: JobCandidatesReportDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [reportView, setReportView] = useState<JobCandidatesReportView>(initialView);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || "ALL");
  const [matchBand, setMatchBand] = useState<CandidateMatchBand>(() =>
    mapBandFilterToReportBand(initialBand)
  );
  const [fileType, setFileType] = useState<ReportFileType>("pdf");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setReportView(initialView);
      setStatusFilter(initialStatus || "ALL");
      setMatchBand(mapBandFilterToReportBand(initialBand));
      setError("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, initialView, initialStatus, initialBand]);

  const dateValidationError = useMemo(() => {
    if ((dateFrom && dateFrom > today) || (dateTo && dateTo > today)) {
      return "Application dates must be today or earlier (UTC).";
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return "From date must be on or before To date.";
    }
    return "";
  }, [dateFrom, dateTo, today]);

  const matchingCount = useMemo(() => {
    if (dateValidationError) return 0;
    return applications.filter((app) => {
      if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
      if (!matchesBand(app.match_result?.match_score, matchBand)) return false;
      if (dateFrom || dateTo) {
        const appliedKey = toUtcDateKey(app.applied_at);
        if (!appliedKey) return false;
        if (dateFrom && appliedKey < dateFrom) return false;
        if (dateTo && appliedKey > dateTo) return false;
      }
      return true;
    }).length;
  }, [applications, dateFrom, dateTo, dateValidationError, matchBand, statusFilter]);

  const hasCustomFilters =
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    statusFilter !== "ALL" ||
    matchBand !== "ALL";

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("ALL");
    setMatchBand("ALL");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (downloading || dateValidationError || matchingCount === 0) return;

    setDownloading(true);
    setError("");
    try {
      await downloadApiFile(
        `/jobs/${job.id}/candidates-report/`,
        `talentmatch-job-${job.id}-${reportView}-applicants.${fileType}`,
        {
          method: "POST",
          body: JSON.stringify({
            file_type: fileType,
            report_view: reportView,
            date_from: dateFrom || null,
            date_to: dateTo || null,
            status: statusFilter === "ALL" ? null : statusFilter,
            match_band: matchBand,
          }),
        }
      );
      toast.success(
        `${fileType === "pdf" ? "PDF" : "Excel"} ${
          reportView === "ranked" ? "ranked applicants" : "all applicants"
        } report downloaded`
      );
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status < 500
          ? caught.message
          : "The report could not be generated. Try again."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !downloading && onOpenChange(next)}>
      <DialogContent onClose={() => !downloading && onOpenChange(false)} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate candidates report</DialogTitle>
          <DialogDescription>
            Export applicants for {job.title} by date applied, status, match strength, and view mode.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset disabled={downloading} className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Applicant view</legend>
            <FilterTabs
              label="Applicant view"
              value={reportView}
              onValueChange={(value) => {
                setReportView(value as JobCandidatesReportView);
                setError("");
              }}
              fullWidth
              tabs={[
                { id: "ranked", label: "Ranked applicants" },
                { id: "all", label: "All applicants" },
              ]}
            />
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Date applied from (UTC)"
              htmlFor="job-candidates-report-date-from"
              error={dateValidationError || undefined}
            >
              <Input
                id="job-candidates-report-date-from"
                type="date"
                max={today}
                value={dateFrom}
                disabled={downloading}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setError("");
                }}
              />
            </FormField>

            <FormField
              label="Date applied to (UTC)"
              htmlFor="job-candidates-report-date-to"
            >
              <Input
                id="job-candidates-report-date-to"
                type="date"
                min={dateFrom || undefined}
                max={today}
                value={dateTo}
                disabled={downloading}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setError("");
                }}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Status" htmlFor="job-candidates-report-status">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setError("");
                }}
                disabled={downloading}
              >
                <SelectTrigger id="job-candidates-report-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Match strength" htmlFor="job-candidates-report-band">
              <Select
                value={matchBand}
                onValueChange={(value) => {
                  setMatchBand(value as CandidateMatchBand);
                  setError("");
                }}
                disabled={downloading}
              >
                <SelectTrigger id="job-candidates-report-band">
                  <SelectValue placeholder="All match strengths" />
                </SelectTrigger>
                <SelectContent>
                  {MATCH_BAND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <ReportFormatCards
            value={fileType}
            onValueChange={(value) => {
              setFileType(value);
              setError("");
            }}
            disabled={downloading}
          />

          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Report preview</p>
              <Badge variant={matchingCount > 0 ? "secondary" : "outline"} className="tabular-nums">
                {matchingCount} {matchingCount === 1 ? "candidate" : "candidates"}
              </Badge>
            </div>
            <p className="mt-1.5 flex gap-2 text-sm leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                {reportView === "ranked"
                  ? "Ranked by AI match score with match level and must-have breakdown. "
                  : "Ordered by application date with status and evaluation status. "}
                Early-stage records use candidate codes; names appear only for shortlisted, interview,
                and hired candidates. Contact details are omitted.
              </span>
            </p>
          </div>

          {!dateValidationError && matchingCount === 0 ? (
            <p role="alert" className="text-sm font-medium text-warning">
              No candidates match the selected report filters.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="sm:justify-between">
            <div>
              {hasCustomFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  disabled={downloading}
                >
                  <RotateCcw aria-hidden="true" />
                  Reset filters
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={downloading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={Boolean(dateValidationError) || matchingCount === 0 || downloading}
              >
                {downloading ? (
                  <Spinner className="text-current" label="Preparing report" />
                ) : (
                  <Download aria-hidden="true" />
                )}
                {downloading
                  ? "Preparing report…"
                  : `Download ${fileType === "pdf" ? "PDF" : "Excel"}`}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
