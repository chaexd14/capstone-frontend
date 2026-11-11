"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, downloadApiFile } from "@/lib/api";
import { Application, ApplicationStatus } from "@/types/application";
import { Job } from "@/types/job";

const STAGES: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "SUBMITTED", label: "New" },
  { value: "UNDER_REVIEW", label: "Review" },
  { value: "SHORTLISTED", label: "Shortlist" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
];

type ReportScope = "status" | "pipeline" | "selected";
type FileType = "pdf" | "xlsx";

function normalizedStatus(status: ApplicationStatus) {
  return status === "PROCESSING" ? "SUBMITTED" : status;
}

interface PipelineReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  applications: Application[];
  selectedIds: number[];
}

export function PipelineReportDialog({
  open,
  onOpenChange,
  job,
  applications,
  selectedIds,
}: PipelineReportDialogProps) {
  const [scope, setScope] = useState<ReportScope>("status");
  const [stage, setStage] = useState<ApplicationStatus>("UNDER_REVIEW");
  const [fileType, setFileType] = useState<FileType>("pdf");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const jobApplications = useMemo(
    () => applications.filter((application) => application.job === job?.id),
    [applications, job?.id]
  );
  const selectedJobIds = useMemo(() => {
    const available = new Set(jobApplications.map((application) => application.id));
    return selectedIds.filter((id) => available.has(id));
  }, [jobApplications, selectedIds]);
  const candidateCount = scope === "pipeline"
    ? jobApplications.length
    : scope === "selected"
      ? selectedJobIds.length
      : jobApplications.filter((application) => normalizedStatus(application.status) === stage).length;

  async function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job || downloading || candidateCount === 0) return;
    setDownloading(true);
    setError("");
    try {
      await downloadApiFile(
        `/jobs/${job.id}/report/`,
        `talentmatch-${job.id}-${scope}-report.${fileType}`,
        {
          method: "POST",
          body: JSON.stringify({
            file_type: fileType,
            scope,
            ...(scope === "status" && { status: stage }),
            ...(scope === "selected" && { application_ids: selectedJobIds }),
          }),
        }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate pipeline report</DialogTitle>
          <DialogDescription>
            {job ? `Create a private report for ${job.title}.` : "Choose a job from the pipeline filters first."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={generateReport} className="space-y-5">
          <fieldset disabled={downloading || !job} className="space-y-2">
            <legend className="text-sm font-semibold text-slate-900">Report coverage</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ["status", "One stage"],
                ["pipeline", "Entire pipeline"],
                ["selected", "Selected"],
              ] as const).map(([value, label]) => (
                <label key={value} className="relative">
                  <input
                    type="radio"
                    name="pipeline-report-scope"
                    value={value}
                    checked={scope === value}
                    disabled={value === "selected" && selectedJobIds.length === 0}
                    onChange={() => { setScope(value); setError(""); }}
                    className="peer absolute right-3 top-3 size-4 accent-blue-600"
                  />
                  <span className="flex min-h-16 cursor-pointer items-end rounded-xl border border-slate-200 p-3 pr-8 text-sm font-medium text-slate-700 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-900 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-45">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {scope === "status" && (
            <div className="space-y-2">
              <Label htmlFor="pipeline-report-stage">Pipeline stage</Label>
              <Select value={stage} onValueChange={(value) => { setStage(value as ApplicationStatus); setError(""); }} disabled={!job || downloading}>
                <SelectTrigger id="pipeline-report-stage"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          <fieldset disabled={downloading || !job} className="space-y-2">
            <legend className="text-sm font-semibold text-slate-900">File format</legend>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={fileType === "pdf" ? "secondary" : "outline"} onClick={() => setFileType("pdf")} className="justify-start">
                <FileText />PDF
              </Button>
              <Button type="button" variant={fileType === "xlsx" ? "secondary" : "outline"} onClick={() => setFileType("xlsx")} className="justify-start">
                <FileSpreadsheet />Excel
              </Button>
            </div>
          </fieldset>

          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {candidateCount} candidate{candidateCount === 1 ? "" : "s"} included
            </p>
            <p className="mt-1 flex gap-2 text-xs leading-5 text-slate-600">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-600" />
              Early-stage records use applicant numbers. Names appear only for shortlisted, interview, and hired candidates. Contact details are omitted.
            </p>
          </div>

          {candidateCount === 0 && job && (
            <p role="alert" className="text-sm text-amber-700">No candidates match this report selection.</p>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!job || candidateCount === 0 || downloading}>
              {downloading ? <Loader2 className="animate-spin" /> : <Download />}
              {downloading ? "Preparing report…" : `Download ${fileType === "pdf" ? "PDF" : "Excel"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
