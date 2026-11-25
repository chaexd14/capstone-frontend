"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TermsAgreementModal } from "@/components/auth/TermsAgreementModal";

export function PublicFooter() {
  const [activeModal, setActiveModal] = useState<"terms" | "privacy" | null>(null);

  return (
    <>
      <footer className="bg-card border-t border-border py-8 px-4 sm:px-6 lg:px-8 text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Brand & Copyright */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <div className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-sm tracking-tight">
              TM
            </div>
            <span className="font-bold text-base text-foreground tracking-tight">
              TalentMatch
            </span>
            <Separator orientation="vertical" className="hidden sm:block h-4" />
            <span className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} TalentMatch. All rights reserved.
            </span>
          </div>

          {/* Navigation Links */}
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium"
          >
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <Link
              href="/careers"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Explore Jobs
            </Link>
            <Link
              href="/careers?tab=BOOKMARK"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Bookmarks
            </Link>
            <Link
              href="/applicant/login"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Applicant Portal
            </Link>
            <Link
              href="/recruiter/login"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Recruiter Portal
            </Link>
          </nav>

          {/* Legal Actions: Quiet Link Buttons opening canonical TermsAgreementModal */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setActiveModal("terms")}
              className="h-auto p-0 text-muted-foreground hover:text-primary font-medium"
            >
              Terms of Service
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setActiveModal("privacy")}
              className="h-auto p-0 text-muted-foreground hover:text-primary font-medium"
            >
              Privacy Policy
            </Button>
          </div>
        </div>
      </footer>

      <TermsAgreementModal
        open={activeModal !== null}
        onOpenChange={(open) => !open && setActiveModal(null)}
        mode="preview"
        defaultSection={activeModal ?? "terms"}
      />
    </>
  );
}
