"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TermsAgreementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "gate" | "preview";
  defaultSection?: "terms" | "privacy";
  onConfirmAgreement?: () => Promise<void> | void;
  submitting?: boolean;
}

export function TermsAgreementModal({
  open,
  onOpenChange,
  mode = "gate",
  defaultSection = "terms",
  onConfirmAgreement,
  submitting = false,
}: TermsAgreementModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const termsSectionRef = useRef<HTMLDivElement>(null);
  const privacySectionRef = useRef<HTMLDivElement>(null);

  const [agreed, setAgreed] = useState(false);

  // Handle section scrolling when modal opens or defaultSection changes
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (defaultSection === "privacy" && privacySectionRef.current) {
          privacySectionRef.current.scrollIntoView({ behavior: "smooth" });
        } else if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [open, defaultSection]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setAgreed(false);
    }
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!agreed || submitting) return;
    if (onConfirmAgreement) {
      await onConfirmAgreement();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onClose={() => handleOpenChange(false)}
        className="max-w-2xl max-h-[88dvh] flex flex-col p-6 sm:p-8 bg-card border-border shadow-2xl"
      >
        {/* Canonical Header */}
        <DialogHeader className="pb-4 border-b border-border space-y-1 text-left shrink-0">
          <DialogTitle
            id="terms-dialog-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
          >
            {mode === "gate"
              ? "Terms of Service & Privacy Policy"
              : defaultSection === "privacy"
              ? "Privacy & Data Governance Policy"
              : "Terms of Service"}
          </DialogTitle>
          <DialogDescription
            id="terms-dialog-desc"
            className="text-sm text-muted-foreground"
          >
            TalentMatch Explainable AI Recruitment Standards
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Document Body */}
        <div
          ref={scrollContainerRef}
          tabIndex={0}
          role="region"
          aria-label="Terms of Service and Privacy Policy Document"
          className="flex-1 overflow-y-auto py-4 space-y-6 text-sm text-muted-foreground leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset pr-2"
        >
          {/* Section 1: Terms of Service */}
          <section ref={termsSectionRef} className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              1. TalentMatch Terms of Service
            </h3>

            <div className="space-y-3.5 text-sm leading-relaxed">
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  1.1 Acceptance of Terms &amp; Eligibility
                </h4>
                <p>
                  By registering for an account, accessing, or utilizing TalentMatch
                  (&quot;Platform&quot;), you acknowledge that you have read, understood, and
                  agree to be legally bound by these Terms of Service. If you represent
                  an organization or recruitment agency, you warrant that you possess
                  legal authority to bind such entity to these provisions.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  1.2 Explainable AI Decision Support &amp; Human Agency
                </h4>
                <p>
                  TalentMatch functions exclusively as an assistive decision-support
                  engine. All candidate qualification scores, rubric weightings, and
                  evidence extractions are generated to augment human judgment.
                  Recruiters and hiring managers maintain sole and non-delegable
                  decision-making authority over interview selection, shortlisting,
                  and hiring decisions. No applicant will be automatically hired or
                  rejected without human review.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  1.3 Sentence-Grounded Resume Verification &amp; Bluff Detection
                </h4>
                <p>
                  The Platform evaluates candidate qualifications by anchoring
                  scores in verifiable sentence-level evidence extracted from
                  submitted resumes. Our bluff-detection heuristics distinguish
                  between claims merely listed in bullet points and verifiable
                  hands-on workplace experience. Users agree to submit truthful,
                  verifiable career histories.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  1.4 Prohibited Conduct &amp; Credential Integrity
                </h4>
                <p>
                  Users may not upload falsified resumes, fraudulent academic
                  credentials, or fabricated work histories. Any attempt to exploit,
                  adversarially probe, inject prompt-injection attacks into the
                  document parsing pipeline, or reverse-engineer the scoring rubrics
                  will result in immediate account termination.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  1.5 Account Security &amp; Confidentiality
                </h4>
                <p>
                  You are responsible for safeguarding your login credentials. You
                  must notify TalentMatch immediately upon discovering any
                  unauthorized use or security breach associated with your account.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  1.6 Platform Availability &amp; Modifications
                </h4>
                <p>
                  TalentMatch strives for continuous availability but does not
                  guarantee uninterrupted access. We reserve the right to modify,
                  update, or temporarily suspend features for maintenance or compliance
                  enhancements with reasonable advance notice.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  1.7 Limitation of Liability
                </h4>
                <p>
                  To the maximum extent permitted by applicable law, TalentMatch and its
                  developers shall not be liable for indirect, incidental, or
                  consequential damages resulting from employment outcomes, hiring
                  delays, or candidate screening decisions.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Privacy Policy */}
          <section ref={privacySectionRef} className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              2. Privacy &amp; Data Governance Policy
            </h3>

            <div className="space-y-3.5 text-sm leading-relaxed">
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  2.1 Demographic Blind Screening &amp; Non-Merit Masking
                </h4>
                <p>
                  To foster unbiased hiring, TalentMatch implements automated blind
                  screening. Non-merit demographic markers—including candidate full
                  names, gender, contact numbers, email addresses, graduation dates,
                  and institutional prestige—are redacted or masked during initial
                  recruiter fast-screening until candidates advance to subsequent stages.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  2.2 Resume Data Ingestion &amp; Purpose Limitation
                </h4>
                <p>
                  Uploaded resumes in PDF and DOCX formats are ingested solely for
                  the purpose of skill extraction, rubric evaluation, and candidate
                  matching against active job requisitions. We do not use your personal
                  data for commercial profiling or targeted advertising.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  2.3 AI-assisted resume screening
                </h4>
                <p>
                  If AI-assisted screening is enabled, TalentMatch removes common personal
                  identifiers before sending resume text to its AI provider. Resume text can
                  still contain identifying details. The deployment privacy notice explains
                  which provider processes the data and how long it can retain it.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  2.4 Candidate Rights &amp; Rubric Transparency
                </h4>
                <p>
                  In accordance with the Data Privacy Act of 2012 and international
                  data protection standards, applicants retain the right to:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 mt-1">
                  <li>Inspect their explainable qualification rubric breakdown.</li>
                  <li>Request correction of inaccurate parsing results.</li>
                  <li>Request permanent deletion of their uploaded resume documents and profile data.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  2.5 Data Retention &amp; Security Controls
                </h4>
                <p>
                  Your data is stored in encrypted databases using industry-standard
                  AES-256 encryption at rest and TLS 1.3 in transit. Inactive accounts
                  and unattached resumes are archived or purged in accordance with our
                  statutory retention guidelines.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  2.6 Contact for Data Protection Inquiries
                </h4>
                <p>
                  For data subject requests, inquiries regarding algorithmic fairness,
                  or privacy compliance questions, contact the TalentMatch compliance
                  team at{" "}
                  <a
                    href="mailto:privacy@talentmatch.ph"
                    className="font-semibold text-primary hover:underline"
                  >
                    privacy@talentmatch.ph
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* End of Document Subtitle */}
          <div className="pt-2 text-center text-xs text-muted-foreground font-mono">
            &bull; &bull; &bull;
          </div>
        </div>

        {/* Canonical Footer */}
        <DialogFooter className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          {mode === "gate" ? (
            <>
              <label
                htmlFor="terms-agreement-checkbox"
                className="flex items-center gap-2.5 cursor-pointer select-none min-h-[44px] py-2"
              >
                <input
                  id="terms-agreement-checkbox"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-sm font-medium text-foreground">
                  I agree to the Terms of Service and Privacy Policy
                </span>
              </label>

              <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!agreed || submitting}
                  className="min-w-[170px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    "Agree & Create Account"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <Button
                type="button"
                variant="default"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
