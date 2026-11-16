"use client";

import React, { useMemo, useState, type FormEvent } from "react";
import { Download, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
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
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MatchBand = "ALL" | "STRONG" | "GOOD" | "PARTIAL" | "WEAK";

const STATUS_OPTIONS: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PROCESSING", label: "Processing" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
];

const MATCH_BAND_OPTIONS: Array<{ value: MatchBand; label: string }> = [
  { value: "ALL", label: "All match scores" },
  { value: "STRONG", label: "Strong (85%+)" },
  { value: "GOOD", label: "Good (70%+)" },
  { value: "PARTIAL", label: "Partial (50%+)" },
  { value: "WEAK", label: "Below 50%" },
];

interface AllApplicationsReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: Application[];
  jobs: Job[];
  initialStatus?: string;
}

function toUtcDateKey(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function matchesBand(score: number | undefined, band: MatchBand): boolean {
  if (band === "ALL") return true;
  if (typeof score !== "number" || !Number.isFinite(score)) return false;
  if (band === "STRONG") return score >= 85;
  if (band === "GOOD") return score >= 70;
  if (band === "PARTIAL") return score >= 50;
  return score < 50;
}

export function AllApplicationsReportDialog({
  open,
  onOpenChange,
  applications,
  jobs,
  initialStatus = "ALL",
}: AllApplicationsReportDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || "ALL");
  const [matchBand, setMatchBand] = useState<MatchBand>("ALL");
  const [jobFilter, setJobFilter] = useState<string>("ALL");
  const [fileType, setFileType] = useState<ReportFileType>("pdf");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => a.title.localeCompare(b.title));
  }, [jobs]);

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
    const selectedJobId = jobFilter === "ALL" ? null : Number(jobFilter);

    return applications.filter((app) => {
      if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
      if (selectedJobId !== null && app.job !== selectedJobId) return false;
      if (!matchesBand(app.match_result?.match_score, matchBand)) return false;
      if (dateFrom || dateTo) {
        const appliedKey = toUtcDateKey(app.applied_at);
        if (!appliedKey) return false;
        if (dateFrom && appliedKey < dateFrom) return false;
        if (dateTo && appliedKey > dateTo) return false;
      }
      return true;
    }).length;
  }, [applications, dateFrom, dateTo, dateValidationError, jobFilter, matchBand, statusFilter]);

  const hasCustomFilters =
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    statusFilter !== "ALL" ||
    matchBand !== "ALL" ||
    jobFilter !== "ALL";

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("ALL");
    setMatchBand("ALL");
    setJobFilter("ALL");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (downloading || dateValidationError || matchingCount === 0) return;

    setDownloading(true);
    setError("");

    try {
      await downloadApiFile(
        "/applications/report/",
        `talentmatch-all-applications-${today}.${fileType}`,
        {
          method: "POST",
          body: JSON.stringify({
            file_type: fileType,
            date_from: dateFrom || null,
            date_to: dateTo || null,
            status: statusFilter === "ALL" ? null : statusFilter,
            match_band: matchBand,
            job_id: jobFilter === "ALL" ? null : Number(jobFilter),
          }),
        }
      );
      toast.success(`${fileType === "pdf" ? "PDF" : "Excel"} report downloaded`);
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
          <DialogTitle>Generate applications report</DialogTitle>
          <DialogDescription>
            Filter by application date, status, AI match score, and job requisition, then export as PDF or Excel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="From date (UTC)"
              htmlFor="all-apps-report-date-from"
              error={dateValidationError || undefined}
            >
              <Input
                id="all-apps-report-date-from"
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

            <FormField label="To date (UTC)" htmlFor="all-apps-report-date-to">
              <Input
                id="all-apps-report-date-to"
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
            <FormField label="Status" htmlFor="all-apps-report-status">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setError("");
                }}
                disabled={downloading}
              >
                <SelectTrigger id="all-apps-report-status">
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

            <FormField label="AI match score" htmlFor="all-apps-report-match-band">
              <Select
                value={matchBand}
                onValueChange={(value) => {
                  setMatchBand(value as MatchBand);
                  setError("");
                }}
                disabled={downloading}
              >
                <SelectTrigger id="all-apps-report-match-band">
                  <SelectValue placeholder="All match scores" />
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

          <FormField label="Job applied" htmlFor="all-apps-report-job">
            <Select
              value={jobFilter}
              onValueChange={(value) => {
                setJobFilter(value);
                setError("");
              }}
              disabled={downloading}
            >
              <SelectTrigger id="all-apps-report-job">
                <SelectValue placeholder="All jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All jobs</SelectItem>
                {sortedJobs.map((job) => (
                  <SelectItem key={job.id} value={String(job.id)}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

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
              <p className="text-sm font-semibold text-foreground">
                Report preview
              </p>
              <Badge variant={matchingCount > 0 ? "secondary" : "outline"} className="tabular-nums">
                {matchingCount} {matchingCount === 1 ? "application" : "applications"}
              </Badge>
            </div>
            <p className="mt-1.5 flex gap-2 text-sm leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Exported reports include full applicant names, applicant numbers, email addresses,
                phone numbers, applied jobs, AI match scores, dates applied, and statuses.
              </span>
            </p>
          </div>

          {!dateValidationError && matchingCount === 0 ? (
            <p role="alert" className="text-sm font-medium text-warning">
              No applications match the selected report filters.
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
