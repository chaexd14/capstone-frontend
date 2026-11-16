"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Application,
  ApplicationStatus,
  SkillEvidenceItem,
} from "@/types/application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormAlertNote } from "@/components/ui/form-error";
import { StatusBadge, type StatusBadgeProps } from "@/components/ui/status-badge";

interface CandidatePinpointDossierProps {
  application: Application;
  anonymize: boolean;
  className?: string;
  compact?: boolean;
}

const IDENTITY_REVEAL_STATUSES = new Set<ApplicationStatus>([
  "SHORTLISTED",
  "INTERVIEW",
  "HIRED",
]);

function getBandStatus(band: string): NonNullable<StatusBadgeProps["status"]> {
  if (band === "Strong") return "success";
  if (band === "Good") return "info";
  if (band === "Partial") return "warning";
  return "neutral";
}

function getEvidenceBadge(status: string): {
  label: string;
  tone: NonNullable<StatusBadgeProps["status"]>;
} {
  if (status === "met") return { label: "Met", tone: "success" };
  if (status === "verify_in_screening") return { label: "Verify", tone: "info" };
  if (status === "unclear") return { label: "Needs review", tone: "warning" };
  return { label: "Missing", tone: "danger" };
}

export function CandidatePinpointDossier({
  application,
  anonymize,
  className = "",
}: CandidatePinpointDossierProps) {
  const [peekName, setPeekName] = useState(false);

  const match = application.match_result;
  const insights = match?.ai_insights;

  const score = match?.match_score ?? 0;
  const band =
    insights?.band ||
    (score >= 85 ? "Strong" : score >= 70 ? "Good" : score >= 50 ? "Partial" : "Weak");

  const isAutoRevealed = IDENTITY_REVEAL_STATUSES.has(application.status);
  const isNameRevealed = !anonymize || isAutoRevealed || peekName;

  const whyThisScore =
    insights?.why_this_score ||
    insights?.executive_headline ||
    insights?.summary ||
    `Candidate demonstrates ${score}% alignment with the core duties and qualifications for this role.`;

  const actionNeeded = insights?.action_needed;
  const hasPenalty = Boolean(
    insights?.penalty_note?.toLowerCase().includes("penalty") ||
      (score < 60 && match?.missing_skills && match.missing_skills.length > 0)
  );
  const penaltyNote =
    insights?.penalty_note ||
    (hasPenalty ? "Missing one or more required qualifications for this role." : "");

  const mustHaveBreakdown: SkillEvidenceItem[] =
    insights?.must_have_breakdown && insights.must_have_breakdown.length > 0
      ? insights.must_have_breakdown
      : [
          ...(match?.matched_skills?.map((skill) => ({
            skill,
            status: "met",
            evidence: "Demonstrated in candidate work experience.",
          })) || []),
          ...(match?.missing_skills?.map((skill) => ({
            skill,
            status: "not found",
            note: "No mention found in resume.",
          })) || []),
        ];

  const preferredBreakdown: SkillEvidenceItem[] =
    insights?.preferred_breakdown && insights.preferred_breakdown.length > 0
      ? insights.preferred_breakdown
      : insights?.strengths?.slice(2).map((s) => ({
          skill: s.skill,
          status: "met",
          evidence: s.evidence || `Demonstrated background in ${s.skill}.`,
        })) || [];

  const screeningQuestions: string[] =
    insights?.screening_questions && insights.screening_questions.length > 0
      ? insights.screening_questions
      : insights?.interview_guide && insights.interview_guide.length > 0
      ? insights.interview_guide.map((g) => g.question)
      : insights?.interview_focus && insights.interview_focus.length > 0
      ? insights.interview_focus.map(
          (f) => `Can you share an example of your hands-on experience with ${f}?`
        )
      : [
          `Can you walk us through your most relevant experience for ${application.job_title}?`,
          "Which parts of this role align closest with what you have handled recently?",
          "Tell us about a time you had to step up quickly to learn something new on the job.",
        ];

  const metCount = mustHaveBreakdown.filter((item) => item.status === "met").length;
  const totalReqCount =
    mustHaveBreakdown.filter((item) => item.status !== "verify_in_screening").length ||
    mustHaveBreakdown.length;

  return (
    <div className={`space-y-6 font-sans text-foreground ${className}`}>
      {/* 1. Candidate & Match Overview */}
      <section aria-labelledby="dossier-candidate-heading" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="tabular-nums">
                {application.candidate_code}
              </Badge>
              <StatusBadge status={getBandStatus(band)} dot>
                {band} match
              </StatusBadge>
            </div>

            {isNameRevealed ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <h3
                  id="dossier-candidate-heading"
                  className="text-lg font-bold text-foreground sm:text-xl"
                >
                  {application.applicant_name || `Applicant ${application.candidate_code}`}
                </h3>
                {application.email ? (
                  <span className="text-sm text-muted-foreground">{application.email}</span>
                ) : null}
                {peekName && !isAutoRevealed && anonymize ? (
                  <StatusBadge status="warning">Identity revealed</StatusBadge>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="dossier-candidate-heading"
                  className="text-lg font-bold text-foreground sm:text-xl"
                >
                  Applicant {application.candidate_code}
                </h3>
                <StatusBadge status="info" dot>
                  Blind screening
                </StatusBadge>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setPeekName(true)}
                  className="h-auto p-0"
                >
                  View identity
                </Button>
              </div>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
              {score}%
            </p>
            <p className="text-sm text-muted-foreground">Overall match</p>
          </div>
        </div>

        <p className="max-w-3xl text-sm leading-6 text-foreground">{whyThisScore}</p>

        {actionNeeded || (hasPenalty && penaltyNote) ? (
          <FormAlertNote
            variant="warning"
            title="Needs attention"
            description={actionNeeded || penaltyNote}
          />
        ) : null}
      </section>

      {/* 2. Required Qualifications */}
      <section aria-labelledby="dossier-evidence-heading" className="space-y-3 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="dossier-evidence-heading" className="text-base font-bold text-foreground">
            Required qualifications
          </h3>
          <Badge variant="outline" className="tabular-nums">
            {metCount} of {totalReqCount} met
          </Badge>
        </div>

        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {mustHaveBreakdown.map((item, idx) => {
            const badge = getEvidenceBadge(item.status);
            const isMet = item.status === "met";
            const detail = isMet
              ? item.evidence
              : item.note ||
                (item.status === "verify_in_screening"
                  ? "Confirm during the screening call."
                  : item.status === "unclear"
                  ? "Listed in resume without specific work examples."
                  : "No mention found in resume.");

            return (
              <div key={`${item.skill}-${idx}`} className="space-y-1.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={badge.tone}>{badge.label}</StatusBadge>
                  <span className="text-sm font-semibold text-foreground">{item.skill}</span>
                </div>
                {detail ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {isMet ? `“${detail}”` : detail}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Additional Strengths */}
      <section aria-labelledby="dossier-strengths-heading" className="space-y-3 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="dossier-strengths-heading" className="text-base font-bold text-foreground">
            Additional strengths
          </h3>
          {preferredBreakdown.length > 0 ? (
            <Badge variant="outline" className="tabular-nums">
              {preferredBreakdown.length} found
            </Badge>
          ) : null}
        </div>

        {preferredBreakdown.length > 0 ? (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {preferredBreakdown.map((item, idx) => (
              <div key={`${item.skill}-${idx}`} className="flex items-start gap-3 px-4 py-3">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-success"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">{item.skill}</p>
                  {item.evidence || item.note ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.evidence || item.note}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No additional strengths were identified beyond core qualifications.
          </p>
        )}
      </section>

      {/* 4. Questions to Ask */}
      <section aria-labelledby="dossier-questions-heading" className="space-y-3 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="dossier-questions-heading" className="text-base font-bold text-foreground">
            Questions to ask
          </h3>
          <Badge variant="outline" className="tabular-nums">
            {Math.min(screeningQuestions.length, 3)} suggested
          </Badge>
        </div>

        <ol className="space-y-2.5">
          {screeningQuestions.slice(0, 3).map((question, index) => (
            <li
              key={index}
              className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground"
            >
              <span className="shrink-0 font-bold tabular-nums text-primary">{index + 1}.</span>
              <span>{question}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
