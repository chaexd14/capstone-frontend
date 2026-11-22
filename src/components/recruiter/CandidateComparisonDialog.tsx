"use client";

import React, { useState } from "react";
import { Award, CheckCircle2, Scale, Star, XCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { getCandidateDisplayName } from "@/lib/candidate-identity";
import { Application, ApplicationStatus } from "@/types/application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface CandidateComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: Application[];
  anonymize: boolean;
  onApplicationUpdated: (updated: Application) => void;
  onReviewCandidate?: (app: Application) => void;
}

const RUBRIC_ROWS: Array<{
  label: string;
  getValue: (app: Application) => number | null;
}> = [
  {
    label: "Overall AI match",
    getValue: (a) => (typeof a.match_result?.match_score === "number" ? Math.round(a.match_result.match_score) : null),
  },
  {
    label: "Required skills",
    getValue: (a) => {
      const v = a.match_result?.ai_insights?.score_breakdown?.required_skills ?? a.match_result?.skill_match_score;
      return typeof v === "number" ? Math.round(v) : null;
    },
  },
  {
    label: "Experience tenure",
    getValue: (a) => {
      const v = a.match_result?.ai_insights?.score_breakdown?.experience ?? a.match_result?.experience_match_score;
      return typeof v === "number" ? Math.round(v) : null;
    },
  },
  {
    label: "Education & license",
    getValue: (a) => {
      const v = a.match_result?.ai_insights?.score_breakdown?.education ?? a.match_result?.education_match_score;
      return typeof v === "number" ? Math.round(v) : null;
    },
  },
  {
    label: "Preferred skills",
    getValue: (a) => {
      const v = a.match_result?.ai_insights?.score_breakdown?.preferred_skills ?? a.match_result?.preferred_skill_match_score;
      return typeof v === "number" ? Math.round(v) : null;
    },
  },
  {
    label: "Projects & duties",
    getValue: (a) => {
      const v =
        a.match_result?.ai_insights?.score_breakdown?.projects ??
        a.match_result?.project_match_score ??
        a.match_result?.semantic_match_score;
      return typeof v === "number" ? Math.round(v) : null;
    },
  },
];

export function CandidateComparisonDialog({
  open,
  onOpenChange,
  candidates,
  anonymize,
  onApplicationUpdated,
  onReviewCandidate,
}: CandidateComparisonDialogProps) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const compared = candidates.slice(0, 4);

  const allRequiredSkills = Array.from(
    new Set(
      compared.flatMap((app) => [
        ...(app.match_result?.ai_insights?.must_have_breakdown?.map((item) => item.skill) || []),
        ...(app.match_result?.matched_skills || []),
        ...(app.match_result?.missing_skills || []),
      ])
    )
  ).slice(0, 8);

  const updateStage = async (app: Application, status: ApplicationStatus) => {
    setUpdatingId(app.id);
    try {
      const updated = await fetchApi<Application>(`/applications/${app.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onApplicationUpdated(updated);
      toast.success(`${app.candidate_code} moved to ${status.replaceAll("_", " ").toLowerCase()}`);
    } catch (error) {
      toast.error("Could not update status", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <Scale className="size-5 text-primary" aria-hidden="true" />
            Side-by-side candidate comparison
          </DialogTitle>
          <DialogDescription>
            Compare up to 4 candidates across rubric dimensions, verified qualifications, logistics, and team scorecards.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto p-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table density="compact">
              <TableHeader>
                <TableRow>
                  <TableHead size="standard">Criterion</TableHead>
                  {compared.map((app) => (
                    <TableHead key={app.id} size="standard">
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">
                          {getCandidateDisplayName(app, anonymize)}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="tabular-nums">
                            {app.candidate_code}
                          </Badge>
                          <StatusBadge
                            status={
                              app.status === "SHORTLISTED" || app.status === "HIRED"
                                ? "success"
                                : app.status === "REJECTED"
                                  ? "danger"
                                  : app.status === "INTERVIEW"
                                    ? "warning"
                                    : "processing"
                            }
                          >
                            {app.status.replaceAll("_", " ")}
                          </StatusBadge>
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {RUBRIC_ROWS.map((row) => {
                  const values = compared.map((app) => row.getValue(app));
                  const maxVal = values.reduce<number>((best, val) => (val !== null && val > best ? val : best), -1);
                  return (
                    <TableRow key={row.label}>
                      <TableCell className="font-semibold text-foreground">{row.label}</TableCell>
                      {compared.map((app, idx) => {
                        const val = values[idx];
                        const isLeader = val !== null && val === maxVal && maxVal > 0;
                        return (
                          <TableCell key={app.id} className="tabular-nums">
                            <span
                              className={
                                isLeader
                                  ? "inline-flex items-center gap-1 font-bold text-success"
                                  : "font-medium text-foreground"
                              }
                            >
                              {isLeader ? <Award className="size-3.5" aria-hidden="true" /> : null}
                              {val !== null ? `${val}%` : "—"}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}

                <TableRow>
                  <TableCell className="font-semibold text-foreground">Experience extracted</TableCell>
                  {compared.map((app) => (
                    <TableCell key={app.id} className="tabular-nums text-foreground">
                      {typeof app.resume?.extracted_experience_years === "number"
                        ? `${app.resume.extracted_experience_years} yrs`
                        : "—"}
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-semibold text-foreground">Team scorecard</TableCell>
                  {compared.map((app) => (
                    <TableCell key={app.id} className="tabular-nums">
                      {app.scorecard_avg_rating ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Star className="size-3.5 text-amber-500" aria-hidden="true" />
                          {app.scorecard_avg_rating}/5 ({app.scorecard_count || 1})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None yet</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="font-semibold text-foreground">Bluff / review flags</TableCell>
                  {compared.map((app) => {
                    const count = app.match_result?.ai_insights?.flags?.length || 0;
                    return (
                      <TableCell key={app.id}>
                        {count > 0 ? (
                          <StatusBadge status="warning">{count} flag{count === 1 ? "" : "s"}</StatusBadge>
                        ) : (
                          <StatusBadge status="success">Clear</StatusBadge>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>

                <TableRow>
                  <TableCell className="font-semibold text-foreground">Tags</TableCell>
                  {compared.map((app) => (
                    <TableCell key={app.id}>
                      {app.tags?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {app.tags.map((tag) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>

                {allRequiredSkills.map((skill) => (
                  <TableRow key={skill}>
                    <TableCell className="text-sm text-muted-foreground">{skill}</TableCell>
                    {compared.map((app) => {
                      const breakdownItem = app.match_result?.ai_insights?.must_have_breakdown?.find(
                        (item) => item.skill.toLowerCase() === skill.toLowerCase()
                      );
                      const isMet =
                        breakdownItem?.status === "met" ||
                        app.match_result?.matched_skills?.some((s) => s.toLowerCase() === skill.toLowerCase());
                      const isMissing =
                        breakdownItem?.status === "not found" ||
                        app.match_result?.missing_skills?.some((s) => s.toLowerCase() === skill.toLowerCase());
                      return (
                        <TableCell key={app.id}>
                          {isMet ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                              <CheckCircle2 className="size-4" aria-hidden="true" /> Met
                            </span>
                          ) : isMissing ? (
                            <span className="inline-flex items-center gap-1 text-sm text-destructive">
                              <XCircle className="size-4" aria-hidden="true" /> Missing
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Verify</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}

                <TableRow>
                  <TableCell className="font-semibold text-foreground">Quick decision</TableCell>
                  {compared.map((app) => (
                    <TableCell key={app.id}>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          disabled={updatingId === app.id || app.status === "SHORTLISTED"}
                          onClick={() => void updateStage(app, "SHORTLISTED")}
                        >
                          Shortlist
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updatingId === app.id || app.status === "INTERVIEW"}
                          onClick={() => void updateStage(app, "INTERVIEW")}
                        >
                          Interview
                        </Button>
                        {onReviewCandidate ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onOpenChange(false);
                              onReviewCandidate(app);
                            }}
                          >
                            Open
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
