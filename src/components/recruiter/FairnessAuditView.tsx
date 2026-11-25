"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Play, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { CounterfactualAuditResult, FairnessAuditData } from "@/types/application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { ErrorState } from "@/components/ui/feedback";
import { MetricSummary } from "@/components/ui/metric-summary";
import { Section, SectionDescription, SectionHeader, SectionTitle } from "@/components/ui/section";
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FairnessAuditViewProps {
  jobId: number;
}

const fairnessAuditCache = new Map<number, FairnessAuditData>();

const COHORT_LABELS: Record<string, string> = {
  "Early Career (0-2y)": "Early career (0–2 yrs)",
  "Mid-Level (3-6y)": "Mid-level (3–6 yrs)",
  "Senior (7y+)": "Senior (7+ yrs)",
  "Unspecified Tenure": "Experience not listed",
};

const VARIANT_LABELS: Record<string, string> = {
  "Female pronoun & name swap": "Changed name and pronouns",
  "Regional university & provincial address swap": "Changed to regional school and provincial city",
  "Elite university prestige swap": "Changed to top Metro Manila university and city",
};

function formatCohortLabel(cohort: string): string {
  return COHORT_LABELS[cohort] ?? cohort;
}

function formatVariantLabel(label: string): string {
  return VARIANT_LABELS[label] ?? label;
}

function formatSampleSource(source: string): string {
  if (source === "Synthetic benchmark resume") return "Sample resume";
  if (source.startsWith("Application ")) {
    return `Candidate ${source.slice("Application ".length)}`;
  }
  return source;
}

export function FairnessAuditView({ jobId }: FairnessAuditViewProps) {
  const cached = fairnessAuditCache.get(jobId) ?? null;
  const [data, setData] = useState<FairnessAuditData | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState("");
  const [runningCf, setRunningCf] = useState(false);
  const [cfResult, setCfResult] = useState<CounterfactualAuditResult | null>(null);

  const loadAudit = useCallback(async (force = false) => {
    if (!force && fairnessAuditCache.has(jobId)) {
      setData(fairnessAuditCache.get(jobId)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi<FairnessAuditData>(`/jobs/${jobId}/fairness-audit/`);
      fairnessAuditCache.set(jobId, res);
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading this report. Try again."
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAudit(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAudit]);

  const runCounterfactual = async () => {
    setRunningCf(true);
    try {
      const res = await fetchApi<CounterfactualAuditResult>(
        `/jobs/${jobId}/fairness-audit/counterfactual/`,
        { method: "POST", body: JSON.stringify({}) }
      );
      setCfResult(res);
      toast.success("Bias test complete", {
        description: res.is_invariant
          ? `Passed — scores stayed within ${res.max_counterfactual_gap}% (limit: 2%).`
          : `Needs review — scores shifted by up to ${res.max_counterfactual_gap}%.`,
      });
    } catch (err) {
      toast.error("Couldn’t run bias test", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setRunningCf(false);
    }
  };

  if (loading) return <ContextualLoading label="Checking fairness metrics…" />;
  if (error || !data) {
    return (
      <ErrorState
        title="Couldn’t load fairness check"
        description={error || "Something went wrong while loading this report. Try again."}
        onAction={() => void loadAudit()}
      />
    );
  }

  const cohorts = Object.keys(data.adverse_impact.rates || {});
  const flagCount = data.jd_lint.flag_count;
  const flagLabel = `${flagCount} ${flagCount === 1 ? "issue" : "issues"} to review`;

  return (
    <div className="space-y-6">
      <Section>
        <SectionHeader>
          <div>
            <SectionTitle>Fairness summary</SectionTitle>
            <SectionDescription>
              Check that personal details are hidden, the job post uses fair language, and candidates are shortlisted based on match score.
            </SectionDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadAudit(true)}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        </SectionHeader>

        <div className="grid grid-cols-2 gap-6 border-t border-border pt-5 sm:grid-cols-4">
          <MetricSummary
            label="Personal info hidden"
            value={`${data.redaction_coverage_percent}%`}
            description={
              data.total_applicants === 0
                ? "No resumes screened yet"
                : `${data.evaluated_count} of ${data.total_applicants} resumes screened`
            }
            tone="success"
          />
          <MetricSummary
            label="Job post language"
            value={data.jd_lint.is_clean ? "Looks good" : flagLabel}
            description={data.jd_lint.is_regulated ? "Requires license" : "No license required"}
            tone={data.jd_lint.is_clean ? "success" : "neutral"}
          />
          <MetricSummary
            label="Selection balance"
            value={data.adverse_impact.adverse_impact_detected ? "Needs review" : "Balanced"}
            description="Checks balance across experience levels"
            tone={data.adverse_impact.adverse_impact_detected ? "neutral" : "success"}
          />
          <MetricSummary
            label="Bias test"
            value={cfResult ? (cfResult.is_invariant ? "Passed" : "Needs review") : "Not run yet"}
            description={cfResult ? `Max change: ${cfResult.max_counterfactual_gap}%` : "Run test below"}
            tone={cfResult?.is_invariant ? "success" : "brand"}
          />
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section>
          <SectionHeader>
            <div>
              <SectionTitle>Score vs. shortlist rate</SectionTitle>
              <SectionDescription>
                Checks whether higher-scoring candidates move forward more often.
              </SectionDescription>
            </div>
          </SectionHeader>
          <Table density="compact">
            <TableHeader>
              <TableRow>
                <TableHead>Match level</TableHead>
                <TableHead className="text-center">Applicants</TableHead>
                <TableHead className="text-center">Moved forward</TableHead>
                <TableHead className="text-right">Shortlist rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.band_alignment.map((row) => (
                <TableRow key={row.band}>
                  <TableCell className="font-semibold text-foreground">{row.band}</TableCell>
                  <TableCell className="text-center tabular-nums">{row.total}</TableCell>
                  <TableCell className="text-center tabular-nums">{row.shortlisted}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {row.shortlist_rate}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section>
          <SectionHeader>
            <div>
              <SectionTitle>Selection balance by experience</SectionTitle>
              <SectionDescription>
                Compares shortlist rates across experience levels. A score of 0.80 or higher is considered balanced.
              </SectionDescription>
            </div>
            <StatusBadge status={data.adverse_impact.adverse_impact_detected ? "warning" : "success"} dot>
              {data.adverse_impact.adverse_impact_detected ? "Needs review" : "Balanced"}
            </StatusBadge>
          </SectionHeader>

          {cohorts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No applicant data yet. Experience groups will appear here once candidates apply.
            </p>
          ) : (
            <Table density="compact">
              <TableHeader>
                <TableRow>
                  <TableHead>Experience level</TableHead>
                  <TableHead className="text-center">Shortlist rate</TableHead>
                  <TableHead className="text-right">Balance score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohorts.map((cohort) => {
                  const rate = data.adverse_impact.rates[cohort] ?? 0;
                  const ratio = data.adverse_impact.impact_ratios[cohort] ?? 1;
                  const violating = data.adverse_impact.violating_groups.includes(cohort);
                  return (
                    <TableRow key={cohort}>
                      <TableCell className="font-medium text-foreground">
                        {formatCohortLabel(cohort)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {(rate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <StatusBadge status={violating ? "warning" : "success"}>
                          {ratio.toFixed(2)}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Section>
      </div>

      <Section>
        <SectionHeader>
          <div>
            <SectionTitle>Name &amp; background bias test</SectionTitle>
            <SectionDescription>
              Swaps a resume’s name, pronouns, city, and school to confirm personal details don’t change the match score.
            </SectionDescription>
          </div>
          <Button type="button" onClick={() => void runCounterfactual()} disabled={runningCf}>
            <Play className="size-4" aria-hidden="true" />
            {runningCf ? "Running test…" : "Run bias test"}
          </Button>
        </SectionHeader>

        {cfResult ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
              {cfResult.is_invariant ? (
                <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
              )}
              <span className="font-semibold text-foreground">
                {cfResult.is_invariant
                  ? "No bias detected — scores stayed consistent"
                  : "Score changed when personal details were swapped"}
              </span>
              <Badge variant="secondary" className="tabular-nums">
                Original score: {cfResult.base_score}%
              </Badge>
              <Badge variant="outline" className="tabular-nums">
                Largest change: {cfResult.max_counterfactual_gap}%
              </Badge>
              {cfResult.sample_source ? (
                <span className="text-muted-foreground">
                  Tested on: {formatSampleSource(cfResult.sample_source)}
                </span>
              ) : null}
            </div>

            <Table density="compact">
              <TableHeader>
                <TableRow>
                  <TableHead>What was changed</TableHead>
                  <TableHead className="text-center">New score</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cfResult.variants.map((v) => (
                  <TableRow key={v.variant_label}>
                    <TableCell className="font-medium text-foreground">
                      {formatVariantLabel(v.variant_label)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{v.score}%</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <StatusBadge status={v.score_gap <= 2 ? "success" : "warning"}>
                        ±{v.score_gap}%
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            Run this test to confirm that changing a candidate’s name, pronouns, city, or school does not affect their match score.
          </p>
        )}
      </Section>
    </div>
  );
}
