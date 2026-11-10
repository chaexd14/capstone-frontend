"use client";

import { useId, useState, type FormEvent } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, downloadApiFile } from "@/lib/api";

const formats = [
  { value: "pdf", label: "PDF", detail: "Hiring review brief", icon: FileText },
  { value: "xlsx", label: "Excel", detail: "Filterable recruiter workbook", icon: FileSpreadsheet },
] as const;

type FileType = (typeof formats)[number]["value"];

export function JobReportPanel({ jobId }: { jobId: number }) {
  const id = useId();
  const [fileType, setFileType] = useState<FileType>("pdf");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (downloading) return;
    setFeedback(null);
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setFeedback({ kind: "error", text: "Choose an end date on or after the start date." });
      return;
    }
    setDownloading(true);
    try {
      await downloadApiFile(
        `/jobs/${jobId}/report/`,
        `talentmatch-job-${jobId}-pipeline-${today}.${fileType}`,
        {
          method: "POST",
          body: JSON.stringify({
            file_type: fileType,
            ...(dateFrom && { date_from: dateFrom }),
            ...(dateTo && { date_to: dateTo }),
          }),
        },
      );
      setFeedback({ kind: "success", text: "Your report download has started." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof ApiError && error.status < 500
          ? error.message
          : "The report couldn’t be downloaded. Try again.",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border border-border bg-card px-4 py-5 sm:px-6">
      <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
        Recruitment pipeline & shortlist
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Export this job’s current pipeline and recruiter shortlist.
      </p>
      <form onSubmit={generateReport} className="mt-5 space-y-4">
        <div className="grid gap-5 lg:grid-cols-2">
          <fieldset disabled={downloading} className="min-w-0">
            <legend className="mb-2 text-sm font-medium text-foreground">Application dates (UTC)</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${id}-from`} className="text-xs text-muted-foreground">From</Label>
                <Input id={`${id}-from`} type="date" max={dateTo || today} value={dateFrom}
                  onChange={(event) => { setDateFrom(event.target.value); setFeedback(null); }} />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${id}-to`} className="text-xs text-muted-foreground">Through</Label>
                <Input id={`${id}-to`} type="date" min={dateFrom || undefined} max={today} value={dateTo}
                  onChange={(event) => { setDateTo(event.target.value); setFeedback(null); }} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Leave both dates blank to include all applications.</p>
          </fieldset>
          <fieldset disabled={downloading} className="min-w-0">
            <legend className="mb-2 text-sm font-medium text-foreground">File format</legend>
            <div className="grid grid-cols-2 gap-2">
              {formats.map(({ value, label, detail, icon: Icon }) => (
                <label key={value} className="relative min-w-0">
                  <input
                    type="radio" name={`${id}-format`} value={value} checked={fileType === value}
                    onChange={() => { setFileType(value); setFeedback(null); }}
                    className="peer absolute right-3 top-3 size-4 cursor-pointer accent-primary"
                  />
                  <span className="flex h-full cursor-pointer flex-col gap-0.5 rounded-xl border border-border p-3 hover:bg-muted peer-checked:border-primary/50 peer-checked:bg-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-wait">
                    <span className="flex items-center gap-2 pr-5 text-sm font-semibold text-foreground">
                      <Icon aria-hidden="true" className="size-4 text-secondary-foreground" /> {label}
                    </span>
                    <span className="text-xs text-slate-700">{detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-secondary-foreground" />
            Uses candidate codes and omits contact details.
          </p>
          <Button type="submit" disabled={downloading} className="w-full sm:w-auto">
            {downloading ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
            {downloading ? "Preparing report…" : fileType === "pdf" ? "Download PDF" : "Download Excel"}
          </Button>
        </div>
        <p role="status" className="text-sm text-muted-foreground empty:sr-only">
          {feedback?.kind === "success" ? feedback.text : null}
        </p>
        {feedback?.kind === "error" && (
          <p role="alert" className="text-sm text-red-700">{feedback.text}</p>
        )}
      </form>
    </section>
  );
}
