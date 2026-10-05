"use client";

import React from "react";
import { Job } from "@/types/job";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, GraduationCap, CheckCircle2, Sparkles, Briefcase, ArrowRight } from "lucide-react";

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (job: Job) => void;
}

export function JobDetailModal({ job, isOpen, onClose, onApply }: JobDetailModalProps) {
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
          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Role Scope & Responsibilities
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
                Required Qualifications & Licensure
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
              Resumes uploaded for this position are evaluated dynamically against required skills (40%), experience relevance (25%), education credentials (15%), and project contributions (20%). Personal demographics are masked to eliminate bias.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="default" onClick={onClose}>
            Back to Openings
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
