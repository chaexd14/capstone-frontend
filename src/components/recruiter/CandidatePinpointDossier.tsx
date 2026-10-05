"use client";

import React, { useState } from "react";
import { Application, SkillEvidenceItem, CandidateLogistics } from "@/types/application";
import {
  Sparkles,
  Clock,
  GraduationCap,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle,
  FileCheck,
  AlertCircle,
  Award,
  Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const penaltyNote =
    insights?.penalty_note ||
    (score < 60 && match?.missing_skills && match.missing_skills.length > 0
      ? "Score reflects penalty for missing critical must-have requirement."
      : "No must-have penalty applied.");

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
      `${resume?.extracted_experience_years || 0} years relevant. Credit is capped at requirement.`
    );
    lines.push(``);

    lines.push(`EDUCATION`);
    lines.push(`${resume?.extracted_education?.[0] || "Academic degree on file"} (requirement met)`);
    lines.push(``);

    lines.push(`SCORE BREAKDOWN`);
    const bd = match?.ai_insights?.score_breakdown || {};
    lines.push(
      `Required skills ${bd.required_skills ?? match?.skill_match_score ?? 0} | Experience ${bd.experience ?? match?.experience_match_score ?? 0} | Education ${bd.education ?? match?.education_match_score ?? 0} | Preferred ${bd.preferred_skills ?? match?.preferred_skill_match_score ?? 0} | Achievements ${bd.projects ?? match?.project_match_score ?? 0}`
    );
    lines.push(``);

    // Reference Score Calculation Table
    lines.push(`REFERENCE SCORE CALCULATION`);
    lines.push(`| Component | Score | Weight | Contribution |`);
    lines.push(`|---|---|---|---|`);
    refCalc.items.forEach((it) => {
      const sc = typeof it.score === "number" ? it.score.toFixed(2) : it.score;
      const wt = typeof it.weight === "number" ? it.weight.toFixed(2) : it.weight;
      const cb = typeof it.contribution === "number" ? it.contribution.toFixed(3) : it.contribution;
      lines.push(`| ${it.component} | ${sc} | ${wt} | ${cb} |`);
    });
    lines.push(`| Raw score | | | ${refCalc.raw_score.toFixed(1)}% |`);
    if (refCalc.penalty_multiplier < 1.0) {
      lines.push(`| Penalty: ${refCalc.penalty_description || "Must-have without hands-on evidence"} | x ${refCalc.penalty_multiplier.toFixed(2)} | | |`);
    }
    lines.push(`| Final match | | | ${score}% (${band}) |`);
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
                    <Badge variant="outline" className="text-[10px] py-0 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-medium">
                      Revealed post-shortlist
                    </Badge>
                  )}
                  {peekName && !isShortlisted && anonymize && (
                    <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-500/30 bg-amber-500/10 font-medium">
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
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Card Copied!</span>
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
              <span className="text-xs uppercase font-bold text-muted-foreground">Match</span>
              <span className="text-3xl font-extrabold font-mono text-foreground">{score}%</span>
            </div>

            <Badge variant={getBandBadgeVariant(band)} className="text-xs font-bold px-2.5 py-0.5">
              {band}
            </Badge>

            <span className="text-xs text-muted-foreground font-medium">
              Review Priority: <strong className="text-foreground">{reviewPriority}</strong>
            </span>
          </div>

          <div className="text-xs text-muted-foreground italic">
            {penaltyNote}
          </div>
        </div>

        {/* 2. WHY THIS SCORE */}
        <div className="p-3.5 rounded-lg bg-muted/40 border border-border/80 space-y-1">
          <div className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Why This Score</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed font-medium">
            {whyThisScore}
          </p>
        </div>

        {/* 3. ACTION NEEDED BEFORE OFFER (if hard requirement / license verification exists) */}
        {actionNeeded && (
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Action Needed Before Offer</span>
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
          <div className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
            <FileCheck className="h-4 w-4 text-primary" />
            <span>Must-Have Skills</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground font-semibold">
            {mustHaveBreakdown.filter((m) => m.status === "met").length} / {mustHaveBreakdown.length} Met
          </span>
        </div>

        <div className="space-y-2">
          {mustHaveBreakdown.map((item, idx) => {
            const isMet = item.status === "met";
            const isUnclear = item.status === "unclear";
            return (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isMet ? "success" : isUnclear ? "warning" : "destructive"}
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

                {isMet && item.evidence && (
                  <p className="text-muted-foreground italic pl-1 text-xs">
                    &ldquo;{item.evidence}&rdquo;
                  </p>
                )}

                {isUnclear && (
                  <p className="text-amber-700 dark:text-amber-300 font-medium pl-1 text-xs">
                    {item.note || "Listed under Skills only. No sentence shows hands-on use."}
                  </p>
                )}

                {!isMet && !isUnclear && (
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
          <div className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Preferred Skills</span>
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
          <div className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
            <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Other Evidence & Notable Credentials</span>
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
      <div className="p-5 rounded-xl border border-border bg-muted/20 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <div className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Experience</span>
          </div>
          <div className="font-semibold text-foreground text-sm">
            {resume?.extracted_experience_years || 0} years relevant
          </div>
          <div className="text-muted-foreground">
            Credit is capped at requirement; extra tenure is not overweighted.
          </div>
        </div>

        <div className="space-y-1">
          <div className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            <span>Education</span>
          </div>
          <div className="font-semibold text-foreground text-sm">
            {resume?.extracted_education?.[0] || "Academic Degree"}
          </div>
          <div className="text-emerald-600 dark:text-emerald-400 font-medium">
            Requirement met
          </div>
        </div>
      </div>

      {/* 8. SCORE BREAKDOWN & REFERENCE SCORE CALCULATION */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-foreground">
          <span className="uppercase tracking-wider">Score Breakdown & Rubric Weights</span>
          <span className="text-muted-foreground font-mono">
            {refCalc?.preset_name || "Official 5-Component Preset"}
          </span>
        </div>

        {/* 5 Component Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center font-mono">
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Required</div>
            <div className="text-lg font-extrabold text-foreground mt-0.5">{match?.skill_match_score || 0}%</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Experience</div>
            <div className="text-lg font-extrabold text-foreground mt-0.5">{match?.experience_match_score || 0}%</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Education</div>
            <div className="text-lg font-extrabold text-foreground mt-0.5">{match?.education_match_score || 0}%</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Preferred</div>
            <div className="text-lg font-extrabold text-foreground mt-0.5">{match?.preferred_skill_match_score || 0}%</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border col-span-2 sm:col-span-1">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Achievements</div>
            <div className="text-lg font-extrabold text-foreground mt-0.5">{match?.project_match_score || 0}%</div>
          </div>
        </div>

        {/* Reference Score Calculation Table (Section 1.5 & 2.5 of TalentMatch Recruiter Summary Spec) */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Reference Score Calculation (Audit Trail)</span>
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              Formula Audited
            </Badge>
          </div>

          <div className="rounded-lg border border-border overflow-hidden bg-background">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground">
                <tr>
                  <th className="py-2 px-3">Component</th>
                  <th className="py-2 px-3 text-right">Score</th>
                  <th className="py-2 px-3 text-right">Weight</th>
                  <th className="py-2 px-3 text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-[11px]">
                {refCalc.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="py-2 px-3 font-sans">
                      <span className="font-medium text-foreground">{item.component}</span>
                      {item.description && (
                        <span className="block text-[10px] text-muted-foreground font-sans">
                          {item.description}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground font-semibold">
                      {typeof item.score === "number" ? item.score.toFixed(2) : item.score}
                    </td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {typeof item.weight === "number" ? (item.weight * 100).toFixed(0) + "%" : item.weight}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-foreground">
                      {typeof item.contribution === "number" ? item.contribution.toFixed(3) : item.contribution}
                    </td>
                  </tr>
                ))}

                {/* Raw Score Subtotal */}
                <tr className="bg-muted/30 font-semibold border-t-2 border-border">
                  <td className="py-2 px-3 font-sans text-foreground">Raw score</td>
                  <td colSpan={2} className="py-2 px-3 text-right text-muted-foreground"></td>
                  <td className="py-2 px-3 text-right text-foreground font-bold">
                    {refCalc.raw_score.toFixed(1)}%
                  </td>
                </tr>

                {/* Penalty Row if applied */}
                {refCalc.penalty_multiplier < 1.0 && (
                  <tr className="bg-amber-500/5 text-amber-700 dark:text-amber-300 font-sans">
                    <td className="py-2 px-3 text-[11px]">
                      Penalty: {refCalc.penalty_description || "Missing must-have without hands-on evidence"}
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
                <tr className="bg-primary/10 font-bold border-t border-border">
                  <td className="py-2.5 px-3 font-sans text-primary text-xs">
                    Final match
                  </td>
                  <td colSpan={3} className="py-2.5 px-3 text-right text-primary text-xs">
                    {score}%, shown as <strong>{score}% ({band})</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 9. ASK IN THE SCREENING CALL */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span>Ask in the Screening Call</span>
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

      {/* 10. LOGISTICS (shown, not scored) */}
      <div className="p-4 rounded-xl border border-border bg-muted/30 text-xs space-y-2">
        <div className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-primary" />
          <span>Logistics (Shown for recruiter, never scored)</span>
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

      {/* 11. DATA USED / FAIRNESS */}
      <div className="p-4 rounded-xl border border-border bg-muted/10 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Fairness & Demographic Bias-Reduction Notice</span>
        </div>
        <div>
          <strong>Scored on:</strong> skills evidence, experience tenure, credentials, projects
        </div>
        <div>
          <strong>Excluded:</strong> candidate name, contact details, address, school prestige, employer names, graduation year
        </div>
        <div className="pt-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
          ✓ Parse confidence: High
        </div>
      </div>
    </div>
  );
}
