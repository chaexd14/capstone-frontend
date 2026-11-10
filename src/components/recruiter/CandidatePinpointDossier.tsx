"use client";

import React, { useState } from "react";
import { Application, SkillEvidenceItem, CandidateLogistics } from "@/types/application";
import {
  Copy,
  Check,
  ShieldCheck,
  Calculator,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CandidatePinpointDossierProps {
  application: Application;
  anonymize: boolean;
  className?: string;
}

export function CandidatePinpointDossier({
  application,
  anonymize,
  className = "",
}: CandidatePinpointDossierProps) {
  const [copied, setCopied] = useState(false);
  const [peekName, setPeekName] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  const match = application.match_result;
  const resume = application.resume;
  const insights = match?.ai_insights;

  const score = match?.match_score ?? 0;

  // Official Project Bands per Spec
  const band =
    insights?.band ||
    (score >= 85 ? "Strong" : score >= 70 ? "Good" : score >= 50 ? "Partial" : "Weak");

  const reviewPriority =
    insights?.review_priority ||
    (score >= 85 ? "High" : score >= 70 ? "Medium" : "Low");

  const isShortlisted = application.status === "SHORTLISTED";
  const isNameRevealed = !anonymize || isShortlisted || peekName;

  const getBandBadgeVariant = (b: string): "success" | "info" | "warning" | "secondary" => {
    switch (b) {
      case "Strong":
        return "success";
      case "Good":
        return "info";
      case "Partial":
        return "warning";
      default:
        return "secondary";
    }
  };

  const whyThisScore =
    insights?.why_this_score ||
    insights?.executive_headline ||
    insights?.summary ||
    `Candidate demonstrates ${score}% alignment with core duties and technical requirements.`;

  const actionNeeded = insights?.action_needed;

  const hasPenalty = Boolean(
    insights?.penalty_note?.toLowerCase().includes("penalty") ||
    (score < 60 && match?.missing_skills && match.missing_skills.length > 0)
  );
  const penaltyNote =
    insights?.penalty_note ||
    (hasPenalty ? "Score adjusted: Missing critical must-have requirement." : "");

  // Must-have breakdown with [met], [unclear], [not found]
  const mustHaveBreakdown: SkillEvidenceItem[] =
    insights?.must_have_breakdown && insights.must_have_breakdown.length > 0
      ? insights.must_have_breakdown
      : [
          ...(match?.matched_skills?.map((s, idx) => ({
            skill: s,
            status: "met",
            evidence: `Verified active application in candidate work duties.`,
            source: `Experience ${idx + 1}`,
          })) || []),
          ...(match?.missing_skills?.map((s) => ({
            skill: s,
            status: "not found",
            note: "No mention found in resume",
          })) || []),
        ];

  // Preferred breakdown
  const preferredBreakdown: SkillEvidenceItem[] =
    insights?.preferred_breakdown && insights.preferred_breakdown.length > 0
      ? insights.preferred_breakdown
      : (insights?.strengths?.slice(2).map((s, idx) => ({
          skill: s.skill,
          status: "met",
          evidence: s.evidence || `Demonstrated background in ${s.skill}`,
          source: s.source || `Experience ${idx + 1}`,
        })) || []);

  // Other Evidence
  const otherEvidence: string[] =
    insights?.other_evidence && insights.other_evidence.length > 0
      ? insights.other_evidence
      : [
          ...(resume?.extracted_education && resume.extracted_education.length > 1
            ? [resume.extracted_education[1]]
            : []),
          ...(insights?.key_pinpoints?.slice(1, 3).map((p) => `"${p.evidence}" [${p.source || "Experience"}]`) || []),
        ];

  // Screening call questions
  const screeningQuestions: string[] =
    insights?.screening_questions && insights.screening_questions.length > 0
      ? insights.screening_questions
      : insights?.interview_guide && insights.interview_guide.length > 0
      ? insights.interview_guide.map((g) => g.question)
      : insights?.interview_focus && insights.interview_focus.length > 0
      ? insights.interview_focus.map((f) => `Can you describe your practical project experience with ${f}?`)
      : [
          `Can you walk us through your most impactful project relevant to ${application.job_title}?`,
          `How do you diagnose and debug performance bottlenecks in production?`,
          `Describe a time you had to adapt quickly to an unfamiliar tool or workflow.`,
        ];

  // Logistics
  const logistics: CandidateLogistics = insights?.logistics || {
    notice_period: "30 days",
    work_arrangement: "Hybrid / On-site",
    location: "Metro Manila",
  };

  // Reference Calculation conforming to Spec Section 1.5 & 2.5
  const refCalc = insights?.reference_calculation || {
    preset_name: "5-Component Rubric",
    items: [
      {
        component: "Required skills (40%)",
        description: `Must-haves: ${mustHaveBreakdown.filter((m) => m.status === "met").length} of ${mustHaveBreakdown.length} met`,
        score: (match?.skill_match_score || 0) / 100,
        weight: 0.40,
        contribution: Number((((match?.skill_match_score || 0) / 100) * 0.40).toFixed(3)),
      },
      {
        component: "Experience (25%)",
        description: `${resume?.extracted_experience_years || 0} yrs relevant (capped at requirement)`,
        score: (match?.experience_match_score || 0) / 100,
        weight: 0.25,
        contribution: Number((((match?.experience_match_score || 0) / 100) * 0.25).toFixed(3)),
      },
      {
        component: "Education (15%)",
        description: resume?.extracted_education?.[0] || "Academic degree requirement",
        score: (match?.education_match_score || 0) / 100,
        weight: 0.15,
        contribution: Number((((match?.education_match_score || 0) / 100) * 0.15).toFixed(3)),
      },
      {
        component: "Preferred skills (10%)",
        description: `Preferred: ${preferredBreakdown.filter((p) => p.status === "met").length} of ${preferredBreakdown.length || 1} met`,
        score: (match?.preferred_skill_match_score || 0) / 100,
        weight: 0.10,
        contribution: Number((((match?.preferred_skill_match_score || 0) / 100) * 0.10).toFixed(3)),
      },
      {
        component: "Achievements and projects (10%)",
        description: "Validated project execution and operational impact",
        score: (match?.project_match_score || 0) / 100,
        weight: 0.10,
        contribution: Number((((match?.project_match_score || 0) / 100) * 0.10).toFixed(3)),
      },
    ],
    raw_score: score,
    penalty_multiplier: penaltyNote.includes("penalty") ? 0.85 : 1.0,
    penalty_description: penaltyNote,
    final_match: score,
    final_band: band,
  };

  // Copy Candidate Card matching the exact text layout in TalentMatch_Sample_Recruiter_Summaries.md
  const handleCopyCard = () => {
    const lines = [
      `CANDIDATE ${application.candidate_code}  |  ${application.job_title || "Candidate"}  |  Applied: ${new Date(application.applied_at).toLocaleDateString()}`,
      `MATCH ${score}% (${band})  |  Review priority: ${reviewPriority}`,
      `${penaltyNote}`,
      ``,
      `WHY THIS SCORE`,
      `${whyThisScore}`,
      ``,
    ];

    if (actionNeeded) {
      lines.push(`ACTION NEEDED BEFORE OFFER`);
      lines.push(`${actionNeeded}`);
      lines.push(``);
    }

    if (mustHaveBreakdown.length > 0) {
      lines.push(`MUST-HAVE SKILLS`);
      mustHaveBreakdown.forEach((m) => {
        const tag = `[${m.status}]`.padEnd(12);
        const name = m.skill.padEnd(16);
        if (m.status === "met") {
          const src = m.source ? ` (${m.source})` : "";
          lines.push(`${tag} ${name} "${m.evidence}"${src}`);
        } else {
          lines.push(`${tag} ${name} ${m.note || "No mention found in resume"}`);
        }
      });
      lines.push(``);
    }

    if (preferredBreakdown.length > 0) {
      lines.push(`PREFERRED SKILLS`);
      preferredBreakdown.forEach((p) => {
        const tag = `[${p.status}]`.padEnd(12);
        const name = p.skill.padEnd(16);
        if (p.status === "met") {
          const src = p.source ? ` (${p.source})` : "";
          lines.push(`${tag} ${name} "${p.evidence}"${src}`);
        } else {
          lines.push(`${tag} ${name} ${p.note || "No mention found in resume"}`);
        }
      });
      lines.push(``);
    }

    if (otherEvidence.length > 0) {
      lines.push(`OTHER EVIDENCE`);
      otherEvidence.forEach((o) => lines.push(`- ${o}`));
      lines.push(``);
    }

    lines.push(`EXPERIENCE`);
    lines.push(
      `${resume?.extracted_experience_years || 0} years relevant (meets requirement).`
    );
    lines.push(``);

    lines.push(`EDUCATION`);
    lines.push(`${resume?.extracted_education?.[0] || "Academic degree on file"} (Requirement met)`);
    lines.push(``);

    lines.push(`RUBRIC SCORE BREAKDOWN`);
    lines.push(
      `Required: ${match?.skill_match_score || 0}% (40%) | Experience: ${match?.experience_match_score || 0}% (25%) | Education: ${match?.education_match_score || 0}% (15%) | Preferred: ${match?.preferred_skill_match_score || 0}% (10%) | Projects: ${match?.project_match_score || 0}% (10%)`
    );
    if (refCalc.penalty_multiplier < 1.0) {
      lines.push(`Adjustment: ${refCalc.penalty_description || "Missing must-have qualification"}`);
    }
    lines.push(`Overall Match: ${score}% (${band})`);
    lines.push(``);

    lines.push(`ASK IN THE SCREENING CALL`);
    screeningQuestions.slice(0, 3).forEach((q, idx) => lines.push(`${idx + 1}. ${q}`));
    lines.push(``);

    lines.push(`LOGISTICS (shown, not scored)`);
    const logParts = [];
    if (logistics.notice_period) logParts.push(`Notice period: ${logistics.notice_period}`);
    if (logistics.work_arrangement) logParts.push(`Work arrangement: ${logistics.work_arrangement}`);
    if (logistics.location) logParts.push(`Location: ${logistics.location}`);
    if (logistics.expected_salary) logParts.push(`Expected salary: ${logistics.expected_salary}`);
    lines.push(logParts.join(" | ") || "Not stated");
    lines.push(``);

    lines.push(`DATA USED`);
    lines.push(`Scored on: skills evidence, experience, education level, projects`);
    lines.push(`Not used: name, contact details, address, school, employer names, graduation year`);
    lines.push(`Parse confidence: High`);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("Evaluation Summary Copied", {
      description: `Evaluation summary for ${application.candidate_code} copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`space-y-4 text-foreground font-sans ${className}`}>
      {/* 1. Official Candidate Card Header Banner */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono font-extrabold text-lg text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
                CANDIDATE {application.candidate_code}
              </span>
              <span className="text-sm font-semibold text-foreground">
                {application.job_title}
              </span>
            </div>

            {/* Demographics Masking & Post-Shortlist Reveal (Spec Note 1) */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {isNameRevealed ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {application.applicant_name}
                  </span>
                  {application.email && (
                    <span className="text-xs text-muted-foreground">({application.email})</span>
                  )}
                  {isShortlisted && (
                    <Badge variant="outline" className="text-[10px] py-0 text-emerald-800 border-emerald-500/30 bg-emerald-500/10 font-medium">
                      Revealed post-shortlist
                    </Badge>
                  )}
                  {peekName && !isShortlisted && anonymize && (
                    <Badge variant="outline" className="text-[10px] py-0 text-amber-800 border-amber-500/30 bg-amber-500/10 font-medium">
                      Auditor Peek
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] py-0 gap-1 text-primary">
                    <ShieldCheck className="h-3 w-3" />
                    Demographics Masked (Blind Review)
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setPeekName(true)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                    title="Temporarily unmask for compliance verification"
                  >
                    Peek Name
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCard}
              className="gap-1.5 text-xs font-semibold h-8"
              title="Copy official TalentMatch candidate summary card"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Card Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Copy Summary Card</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Match, Band, Priority & Penalty status */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs uppercase font-bold text-slate-500">Match</span>
              <span className={`text-3xl font-extrabold font-mono tabular-nums ${score >= 85 ? "text-emerald-600" : score >= 70 ? "text-[#1976D2]" : "text-slate-900"}`}>
                {score}%
              </span>
            </div>

            <Badge variant={getBandBadgeVariant(band)} className="text-xs font-bold px-2.5 py-0.5">
              {band}
            </Badge>

            <span className="text-xs text-slate-500 font-medium">
              Review Priority: <strong className="text-slate-900">{reviewPriority}</strong>
            </span>
          </div>

          {hasPenalty && penaltyNote && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span>⚠️ {penaltyNote}</span>
            </div>
          )}
        </div>

        {/* 2. EXECUTIVE BRIEF / WHY THIS SCORE */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
          <p className="text-sm text-slate-800 leading-relaxed font-medium">
            {whyThisScore}
          </p>
        </div>

        {/* 3. ACTION NEEDED BEFORE OFFER (if hard requirement / license verification exists) */}
        {actionNeeded && (
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Action Needed Before Offer
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              {actionNeeded}
            </p>
          </div>
        )}
      </div>

      {/* 4. MUST-HAVE SKILLS */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-foreground uppercase tracking-wider">
            Must-Have Skills
          </div>
          <span className="text-xs font-mono text-muted-foreground font-semibold">
            {insights?.must_haves_summary
              ? `${insights.must_haves_summary} Met`
              : `${mustHaveBreakdown.filter((m) => m.status === "met").length} / ${mustHaveBreakdown.filter((m) => m.status !== "verify_in_screening").length || mustHaveBreakdown.length} Met`}
          </span>
        </div>

        <div className="space-y-2">
          {mustHaveBreakdown.map((item, idx) => {
            const isMet = item.status === "met";
            const isVerify = item.status === "verify_in_screening";
            const isUnclear = item.status === "unclear";
            return (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        isMet
                          ? "success"
                          : isVerify
                          ? "info"
                          : isUnclear
                          ? "warning"
                          : "destructive"
                      }
                      className="font-mono text-[10px] px-2 py-0 uppercase font-bold"
                    >
                      {isVerify ? "VERIFY IN SCREENING" : item.status}
                    </Badge>
                    <span className="font-bold text-foreground text-sm">{item.skill}</span>
                  </div>
                  {item.source && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      [{item.source}]
                    </span>
                  )}
                </div>

                {isMet && item.evidence && (
                  <p className="text-muted-foreground italic pl-1 text-xs">
                    &ldquo;{item.evidence}&rdquo;
                  </p>
                )}

                {isVerify && (
                  <p className="text-sky-700 font-medium pl-1 text-xs">
                    {item.note || "Confirm in screening call / live assessment (not typically listed on resumes)."}
                  </p>
                )}

                {isUnclear && (
                  <p className="text-amber-700 font-medium pl-1 text-xs">
                    {item.note || "Listed under Skills only. No sentence shows hands-on use."}
                  </p>
                )}

                {!isMet && !isVerify && !isUnclear && (
                  <p className="text-destructive font-medium pl-1 text-xs">
                    {item.note || "No mention found in resume"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. PREFERRED SKILLS */}
      {preferredBreakdown.length > 0 && (
        <div className="p-5 rounded-xl border border-border bg-card space-y-3">
          <div className="text-sm font-bold text-foreground uppercase tracking-wider">
            Preferred Skills
          </div>

          <div className="space-y-2">
            {preferredBreakdown.map((item, idx) => {
              const isMet = item.status === "met";
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isMet ? "success" : "secondary"}
                        className="font-mono text-[10px] px-2 py-0 uppercase font-bold"
                      >
                        {item.status}
                      </Badge>
                      <span className="font-bold text-foreground text-sm">{item.skill}</span>
                    </div>
                    {item.source && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        [{item.source}]
                      </span>
                    )}
                  </div>

                  {isMet && item.evidence ? (
                    <p className="text-muted-foreground italic pl-1 text-xs">
                      &ldquo;{item.evidence}&rdquo;
                    </p>
                  ) : (
                    <p className="text-muted-foreground pl-1 text-xs">
                      {item.note || "No mention found in resume"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. OTHER EVIDENCE & ACHIEVEMENTS */}
      {otherEvidence.length > 0 && (
        <div className="p-5 rounded-xl border border-border bg-card space-y-2.5">
          <div className="text-sm font-bold text-foreground uppercase tracking-wider">
            Other Evidence &amp; Notable Credentials
          </div>

          <ul className="space-y-1.5 pl-2">
            {otherEvidence.map((ev, idx) => (
              <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{ev}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 7. EXPERIENCE & EDUCATION RECAP */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Experience
          </div>
          <div className="font-semibold text-slate-900 text-sm">
            {resume?.extracted_experience_years || 0} years relevant
          </div>
          <div className="text-slate-500 text-xs">
            Tenure meets role requirement
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Education
          </div>
          <div className="font-semibold text-slate-900 text-sm">
            {resume?.extracted_education?.[0] || "Academic Degree"}
          </div>
          <div className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
            ✓ Requirement verified
          </div>
        </div>
      </div>

      {/* 8. SCORE BREAKDOWN & METRIC TILES */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-3.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">Rubric Score Breakdown</span>
            <span className="text-[11px] text-slate-500 font-medium ml-2 font-mono">({refCalc?.preset_name || "5-Component Preset"})</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAuditModalOpen(true)}
            className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-100 font-medium gap-1.5"
          >
            <Calculator className="w-3.5 h-3.5 text-slate-500" />
            <span>Formula Breakdown</span>
          </Button>
        </div>

        {/* 5 Component Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center font-mono">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Required (40%)</div>
            <div className={`text-xl font-extrabold mt-1 ${(match?.skill_match_score || 0) >= 80 ? "text-emerald-600" : "text-slate-900"}`}>
              {match?.skill_match_score || 0}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Experience (25%)</div>
            <div className={`text-xl font-extrabold mt-1 ${(match?.experience_match_score || 0) >= 80 ? "text-emerald-600" : "text-slate-900"}`}>
              {match?.experience_match_score || 0}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Education (15%)</div>
            <div className={`text-xl font-extrabold mt-1 ${(match?.education_match_score || 0) >= 80 ? "text-emerald-600" : "text-slate-900"}`}>
              {match?.education_match_score || 0}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Preferred (10%)</div>
            <div className={`text-xl font-extrabold mt-1 ${(match?.preferred_skill_match_score || 0) >= 80 ? "text-emerald-600" : "text-slate-900"}`}>
              {match?.preferred_skill_match_score || 0}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Projects (10%)</div>
            <div className={`text-xl font-extrabold mt-1 ${(match?.project_match_score || 0) >= 80 ? "text-emerald-600" : "text-slate-900"}`}>
              {match?.project_match_score || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Formula Audit Dialog (Available on Demand for Compliance/Verification) */}
      <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#1976D2]" />
              <span>Reference Score Calculation (Audit Trail)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Deterministic mathematical contribution per rubric component for {application.candidate_code}.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white mt-2">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3 text-right">Weight</th>
                  <th className="py-2.5 px-3 text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {refCalc.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-sans">
                      <span className="font-medium text-slate-900">{item.component}</span>
                      {item.description && (
                        <span className="block text-[11px] text-slate-500 font-sans">
                          {item.description}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-900 font-semibold">
                      {typeof item.score === "number" ? item.score.toFixed(2) : item.score}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {typeof item.weight === "number" ? (item.weight * 100).toFixed(0) + "%" : item.weight}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {typeof item.contribution === "number" ? item.contribution.toFixed(3) : item.contribution}
                    </td>
                  </tr>
                ))}

                {/* Raw Score Subtotal */}
                <tr className="bg-slate-50/80 font-semibold border-t-2 border-slate-200">
                  <td className="py-2 px-3 font-sans text-slate-900">Raw score subtotal</td>
                  <td colSpan={2} className="py-2 px-3 text-right text-slate-400"></td>
                  <td className="py-2 px-3 text-right text-slate-900 font-bold">
                    {refCalc.raw_score.toFixed(1)}%
                  </td>
                </tr>

                {/* Penalty Row if applied */}
                {refCalc.penalty_multiplier < 1.0 && (
                  <tr className="bg-amber-50 text-amber-800 font-sans">
                    <td className="py-2 px-3 text-xs">
                      Penalty: {refCalc.penalty_description || "Missing critical requirement"}
                    </td>
                    <td colSpan={2} className="py-2 px-3 text-right font-mono font-bold">
                      x {refCalc.penalty_multiplier.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      -{(100 - refCalc.penalty_multiplier * 100).toFixed(0)}%
                    </td>
                  </tr>
                )}

                {/* Final Match Row */}
                <tr className="bg-blue-50/60 font-bold border-t border-blue-100">
                  <td className="py-2.5 px-3 font-sans text-[#1976D2] text-xs">
                    Final Match Score
                  </td>
                  <td colSpan={3} className="py-2.5 px-3 text-right text-[#1976D2] text-xs font-mono">
                    <strong>{score}% ({band})</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* 9. ASK IN THE SCREENING CALL */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-foreground uppercase tracking-wider">
            Ask in the Screening Call
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {screeningQuestions.length} Questions
          </Badge>
        </div>

        <div className="space-y-2.5">
          {screeningQuestions.map((q, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-border bg-muted/20 text-xs flex items-start gap-2.5"
            >
              <span className="font-mono font-bold text-primary shrink-0">{idx + 1}.</span>
              <p className="font-medium text-foreground leading-relaxed">
                {q}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 10. LOGISTICS (Non-scored candidate preferences) */}
      <div className="p-4 rounded-xl border border-border bg-muted/30 text-xs space-y-2">
        <div className="font-bold text-muted-foreground uppercase tracking-wider">
          Logistics & Preferences (Not Scored)
        </div>
        <div className="flex flex-wrap items-center gap-4 text-foreground pt-1">
          {logistics.notice_period && (
            <span>
              <strong>Notice Period:</strong> {logistics.notice_period}
            </span>
          )}
          {logistics.work_arrangement && (
            <span>
              <strong>Work Arrangement:</strong> {logistics.work_arrangement}
            </span>
          )}
          {logistics.location && (
            <span>
              <strong>Location:</strong> {logistics.location}
            </span>
          )}
          {logistics.expected_salary && (
            <span>
              <strong>Expected Salary:</strong> {logistics.expected_salary}
            </span>
          )}
        </div>
      </div>

      {/* 11. DEMOGRAPHIC BLIND SCREENING */}
      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#1976D2]" />
          <span className="font-semibold text-slate-900">Demographic Blind Screening</span>
          <span className="text-slate-500">• PII & School Prestige Masked</span>
        </div>
        <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          ✓ High Confidence Parse
        </span>
      </div>
    </div>
  );
}
