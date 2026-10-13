"use client";

import React from "react";
import { Job } from "@/types/job";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, GraduationCap, CheckCircle2, Sparkles, Briefcase, ArrowRight, Lock } from "lucide-react";

interface JobDetailModalProps {
  job: Job | null;
  hasApplied?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onApply: (job: Job) => void;
  onViewApplication?: () => void;
}

export function JobDetailModal({ job, hasApplied, isOpen, onClose, onApply, onViewApplication }: JobDetailModalProps) {
  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="outline" className="text-xs font-semibold">
              {job.department}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {job.employment_type}
            </Badge>
            {job.status === "CLOSED" && (
              <Badge variant="outline" className="text-xs font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1">
                <Lock className="h-3 w-3" />
                Applications Closed
              </Badge>
            )}
            {hasApplied && (
              <Badge variant="secondary" className="text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Already Applied
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto font-mono">
              {job.applicant_count || 0} applicants
            </span>
          </div>

          <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight">{job.title}</DialogTitle>
          <DialogDescription className="sr-only">Position overview and requirements for {job.title}</DialogDescription>

          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-foreground font-medium">{job.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span>Experience: <strong className="text-foreground">{job.minimum_experience}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>Education: <strong className="text-foreground">{job.education_requirement}</strong></span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-3 text-sm">
          {job.status === "CLOSED" && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>This position is currently closed and no longer accepting new submissions. Existing applicants can still view and track their application progress.</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Role Scope &amp; Responsibilities
            </h4>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
              {job.description}
            </p>
          </div>

          {/* Required Skills */}
          {job.required_skills && job.required_skills.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Required Qualifications &amp; Licensure
              </h4>
              <div className="flex flex-wrap gap-2">
                {job.required_skills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs px-3 py-1 font-medium">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Skills */}
          {job.preferred_skills && job.preferred_skills.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Preferred / Bonus Assets
              </h4>
              <div className="flex flex-wrap gap-2">
                {job.preferred_skills.map((skill, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs px-3 py-1 font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Scoring Notice */}
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1.5 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-primary" />
              <span>Automated Merit-Based Screening</span>
            </div>
            <p className="leading-relaxed">
              Resumes uploaded for this position are evaluated dynamically against required skills, experience relevance, education credentials, and project contributions using automated merit-based screening. Personal demographics are masked to eliminate bias.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="default" onClick={onClose}>
            Back to Openings
          </Button>
          {hasApplied ? (
            <Button
              size="default"
              variant="secondary"
              onClick={() => {
                onClose();
                if (onViewApplication) onViewApplication();
              }}
              className="gap-2 font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Already Applied · View Status</span>
            </Button>
          ) : job.status === "CLOSED" ? (
            <Button
              size="default"
              variant="secondary"
              disabled
              className="gap-2 font-medium cursor-not-allowed opacity-75"
            >
              <Lock className="h-4 w-4 text-amber-500" />
              <span>Applications Closed</span>
            </Button>
          ) : (
            <Button
              size="default"
              onClick={() => {
                onClose();
                onApply(job);
              }}
              className="gap-2 font-semibold"
            >
              <span>Apply for this Role</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
