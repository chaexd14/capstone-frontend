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
      setError(err instanceof Error ? err.message : "Could not load fairness audit data.");
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
      toast.success("Counterfactual invariance check complete", {
        description: res.is_invariant
          ? `Pass — max score delta is ${res.max_counterfactual_gap}% (threshold ≤ 2.0%).`
          : `Attention — max score delta is ${res.max_counterfactual_gap}%.`,
      });
    } catch (err) {
      toast.error("Counterfactual check failed", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setRunningCf(false);
    }
  };

  if (loading) return <ContextualLoading label="Running fairness & compliance audit" />;
  if (error || !data) {
    return (
      <ErrorState
        title="Fairness audit unavailable"
        description={error || "Could not load audit summary."}
        onAction={() => void loadAudit()}
      />
    );
  }

  const cohorts = Object.keys(data.adverse_impact.rates || {});

  return (
    <div className="space-y-6">
      <Section>
        <SectionHeader>
          <div>
            <SectionTitle>Screening fairness &amp; compliance summary</SectionTitle>
            <SectionDescription>
              Audit PII redaction coverage, job description bias linting, rubric-to-shortlist alignment, and EEOC Four-Fifths adverse impact ratios.
            </SectionDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadAudit(true)}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        </SectionHeader>

        <div className="grid grid-cols-2 gap-6 border-t border-border pt-5 sm:grid-cols-4">
          <MetricSummary
            label="PII redaction"
            value={`${data.redaction_coverage_percent}%`}
            description={`${data.evaluated_count} of ${data.total_applicants} evaluated`}
            tone="success"
          />
          <MetricSummary
            label="JD bias lint"
            value={data.jd_lint.is_clean ? "Clean" : `${data.jd_lint.flag_count} flags`}
            description={data.jd_lint.is_regulated ? "Regulated licensure role" : "Standard role"}
            tone={data.jd_lint.is_clean ? "success" : "neutral"}
          />
          <MetricSummary
            label="Four-Fifths rule"
            value={data.adverse_impact.adverse_impact_detected ? "Review" : "Compliant"}
            description="80% selection ratio check"
            tone={data.adverse_impact.adverse_impact_detected ? "neutral" : "success"}
          />
          <MetricSummary
            label="Invariance check"
            value={cfResult ? (cfResult.is_invariant ? "Pass" : "Flagged") : "Ready"}
            description={cfResult ? `Max gap ${cfResult.max_counterfactual_gap}%` : "Run counterfactual test below"}
            tone={cfResult?.is_invariant ? "success" : "brand"}
          />
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section>
          <SectionHeader>
            <div>
              <SectionTitle>Merit alignment (Score band vs. shortlist)</SectionTitle>
              <SectionDescription>Verifies that higher-scoring merit bands progress consistently.</SectionDescription>
            </div>
          </SectionHeader>
          <Table density="compact">
            <TableHeader>
              <TableRow>
                <TableHead>Match band</TableHead>
                <TableHead className="text-center">Applicants</TableHead>
                <TableHead className="text-center">Shortlisted+</TableHead>
                <TableHead className="text-right">Selection rate</TableHead>
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
              <SectionTitle>Adverse Impact Ratio (EEOC Four-Fifths)</SectionTitle>
              <SectionDescription>
                Selection rate ratios across tenure cohorts (≥ 0.80 meets the four-fifths threshold).
              </SectionDescription>
            </div>
            <StatusBadge status={data.adverse_impact.adverse_impact_detected ? "warning" : "success"} dot>
              {data.adverse_impact.adverse_impact_detected ? "Review recommended" : "Within threshold"}
            </StatusBadge>
          </SectionHeader>

          {cohorts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Not enough applicant cohort data yet.
            </p>
          ) : (
            <Table density="compact">
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort</TableHead>
                  <TableHead className="text-center">Selection rate</TableHead>
                  <TableHead className="text-right">Impact ratio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohorts.map((cohort) => {
                  const rate = data.adverse_impact.rates[cohort] ?? 0;
                  const ratio = data.adverse_impact.impact_ratios[cohort] ?? 1;
                  const violating = data.adverse_impact.violating_groups.includes(cohort);
                  return (
                    <TableRow key={cohort}>
                      <TableCell className="font-medium text-foreground">{cohort}</TableCell>
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
            <SectionTitle>Counterfactual demographic invariance test</SectionTitle>
            <SectionDescription>
              Perturbs candidate names, pronouns, addresses, and university prestige through TalentMatch’s redaction pipeline to verify zero scoring drift.
            </SectionDescription>
          </div>
          <Button type="button" onClick={() => void runCounterfactual()} disabled={runningCf}>
            <Play className="size-4" aria-hidden="true" />
            {runningCf ? "Running test…" : "Run invariance test"}
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
                  ? "Demographic invariance verified"
                  : "Counterfactual score variance detected"}
              </span>
              <Badge variant="secondary" className="tabular-nums">
                Base score: {cfResult.base_score}%
              </Badge>
              <Badge variant="outline" className="tabular-nums">
                Max gap: {cfResult.max_counterfactual_gap}%
              </Badge>
              {cfResult.sample_source ? (
                <span className="text-muted-foreground">Source: {cfResult.sample_source}</span>
              ) : null}
            </div>

            <Table density="compact">
              <TableHeader>
                <TableRow>
                  <TableHead>Counterfactual perturbation</TableHead>
                  <TableHead className="text-center">Variant score</TableHead>
                  <TableHead className="text-right">Score delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cfResult.variants.map((v) => (
                  <TableRow key={v.variant_label}>
                    <TableCell className="font-medium text-foreground">{v.variant_label}</TableCell>
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
            Click “Run invariance test” to verify that demographic and school-prestige changes do not alter candidate scores.
          </p>
        )}
      </Section>
    </div>
  );
}
