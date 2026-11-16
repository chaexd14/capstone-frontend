"use client";

import React, { useMemo, useState, type FormEvent } from "react";
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

const STAGES: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "SUBMITTED", label: "New" },
  { value: "UNDER_REVIEW", label: "Review" },
  { value: "SHORTLISTED", label: "Shortlist" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
];

type ReportScope = "pipeline" | "status" | "selected";

function normalizedStatus(status: ApplicationStatus) {
  return status === "PROCESSING" ? "SUBMITTED" : status;
}

function toUtcDateKey(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

interface PipelineReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Job[];
  initialJobId?: number | null;
  applications: Application[];
  selectedIds: number[];
}

export function PipelineReportDialog({
  open,
  onOpenChange,
  jobs,
  initialJobId = null,
  applications,
  selectedIds,
}: PipelineReportDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => a.title.localeCompare(b.title)),
    [jobs]
  );

  const defaultJobId = useMemo(() => {
    if (initialJobId && jobs.some((job) => job.id === initialJobId)) {
      return String(initialJobId);
    }
    return sortedJobs[0] ? String(sortedJobs[0].id) : "";
  }, [initialJobId, jobs, sortedJobs]);

  const [jobId, setJobId] = useState(defaultJobId);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scope, setScope] = useState<ReportScope>("pipeline");
  const [stage, setStage] = useState<ApplicationStatus>("UNDER_REVIEW");
  const [fileType, setFileType] = useState<ReportFileType>("pdf");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const activeJob = useMemo(
    () => jobs.find((item) => String(item.id) === jobId) || null,
    [jobId, jobs]
  );

  const dateValidationError = useMemo(() => {
    if ((dateFrom && dateFrom > today) || (dateTo && dateTo > today)) {
      return "Application dates must be today or earlier (UTC).";
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return "From date must be on or before To date.";
    }
    return "";
  }, [dateFrom, dateTo, today]);

  const dateFilteredJobApps = useMemo(() => {
    if (!activeJob || dateValidationError) return [];
    return applications.filter((application) => {
      if (application.job !== activeJob.id) return false;
      if (dateFrom || dateTo) {
        const appliedKey = toUtcDateKey(application.applied_at);
        if (!appliedKey) return false;
        if (dateFrom && appliedKey < dateFrom) return false;
        if (dateTo && appliedKey > dateTo) return false;
      }
      return true;
    });
  }, [activeJob, applications, dateFrom, dateTo, dateValidationError]);

  const selectedJobIds = useMemo(() => {
    const available = new Set(dateFilteredJobApps.map((application) => application.id));
    return selectedIds.filter((id) => available.has(id));
  }, [dateFilteredJobApps, selectedIds]);

  const candidateCount = useMemo(() => {
    if (!activeJob || dateValidationError) return 0;
    if (scope === "pipeline") return dateFilteredJobApps.length;
    if (scope === "selected") return selectedJobIds.length;
    return dateFilteredJobApps.filter(
      (application) => normalizedStatus(application.status) === stage
    ).length;
  }, [activeJob, dateFilteredJobApps, dateValidationError, scope, selectedJobIds.length, stage]);

  const hasCustomFilters =
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    scope !== "pipeline" ||
    stage !== "UNDER_REVIEW";

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setScope("pipeline");
    setStage("UNDER_REVIEW");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeJob || downloading || dateValidationError || candidateCount === 0) return;

    setDownloading(true);
    setError("");
    try {
      await downloadApiFile(
        `/jobs/${activeJob.id}/report/`,
        `talentmatch-${activeJob.id}-${scope}-report.${fileType}`,
        {
          method: "POST",
          body: JSON.stringify({
            file_type: fileType,
            scope,
            ...(dateFrom && { date_from: dateFrom }),
            ...(dateTo && { date_to: dateTo }),
            ...(scope === "status" && { status: stage }),
            ...(scope === "selected" && { application_ids: selectedJobIds }),
          }),
        }
      );
      toast.success(`${fileType === "pdf" ? "PDF" : "Excel"} pipeline report downloaded`);
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
          <DialogTitle>Generate pipeline report</DialogTitle>
          <DialogDescription>
            Filter by job requisition, application date, and pipeline scope, then export as PDF or Excel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="From date (UTC)"
              htmlFor="pipeline-report-date-from"
              error={dateValidationError || undefined}
            >
              <Input
                id="pipeline-report-date-from"
                type="date"
                max={today}
                value={dateFrom}
                disabled={downloading || !activeJob}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setError("");
                }}
              />
            </FormField>

            <FormField label="To date (UTC)" htmlFor="pipeline-report-date-to">
              <Input
                id="pipeline-report-date-to"
                type="date"
                min={dateFrom || undefined}
                max={today}
                value={dateTo}
                disabled={downloading || !activeJob}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setError("");
                }}
              />
            </FormField>
          </div>

          <FormField label="Job requisition" htmlFor="pipeline-report-job">
            <Select
              value={jobId}
              onValueChange={(value) => {
                setJobId(value);
                setError("");
              }}
              disabled={downloading || sortedJobs.length === 0}
            >
              <SelectTrigger id="pipeline-report-job">
                <SelectValue placeholder="Select a job requisition" />
              </SelectTrigger>
              <SelectContent>
                {sortedJobs.map((job) => (
                  <SelectItem key={job.id} value={String(job.id)}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <fieldset disabled={downloading || !activeJob} className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Report coverage</legend>
            <FilterTabs
              label="Report coverage"
              value={scope}
              onValueChange={(value) => {
                setScope(value as ReportScope);
                setError("");
              }}
              fullWidth
              tabs={[
                { id: "pipeline", label: "Entire pipeline" },
                { id: "status", label: "One stage" },
                { id: "selected", label: "Selected", count: selectedJobIds.length },
              ]}
            />
          </fieldset>

          {scope === "status" ? (
            <FormField label="Pipeline stage" htmlFor="pipeline-report-stage">
              <Select
                value={stage}
                onValueChange={(value) => {
                  setStage(value as ApplicationStatus);
                  setError("");
                }}
                disabled={!activeJob || downloading}
              >
                <SelectTrigger id="pipeline-report-stage">
                  <SelectValue placeholder="Select a pipeline stage" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

          <ReportFormatCards
            value={fileType}
            onValueChange={(value) => {
              setFileType(value);
              setError("");
            }}
            disabled={downloading || !activeJob}
          />

          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Report preview</p>
              <Badge variant={candidateCount > 0 ? "secondary" : "outline"} className="tabular-nums">
                {candidateCount} {candidateCount === 1 ? "candidate" : "candidates"}
              </Badge>
            </div>
            <p className="mt-1.5 flex gap-2 text-sm leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Early-stage records use applicant numbers. Names appear only for shortlisted,
                interview, and hired candidates. Contact details are omitted.
              </span>
            </p>
          </div>

          {!dateValidationError && activeJob && candidateCount === 0 ? (
            <p role="alert" className="text-sm font-medium text-warning">
              {scope === "selected" && selectedJobIds.length === 0
                ? "Select candidates on the pipeline board to export a selected-only report."
                : "No candidates match the selected report filters."}
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
                disabled={
                  !activeJob || Boolean(dateValidationError) || candidateCount === 0 || downloading
                }
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
