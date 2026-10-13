"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Archive,
  Trash2,
  Lock,
  RotateCcw,
  Users,
  FileText,
  Loader2,
} from "lucide-react";

export type JobActionType = "close" | "reopen" | "archive" | "delete" | "delete_archived";

interface ConfirmJobActionModalProps {
  isOpen: boolean;
  actionType: JobActionType | null;
  jobTitle: string;
  applicantCount?: number;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmJobActionModal({
  isOpen,
  actionType,
  jobTitle,
  applicantCount = 0,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmJobActionModalProps) {
  if (!actionType) return null;

  const getConfig = () => {
    switch (actionType) {
      case "close":
        return {
          title: "Close Job Position",
          icon: <Lock className="h-5 w-5 text-amber-500" />,
          variant: "default" as const,
          confirmLabel: "Close Position",
          confirmClass: "bg-amber-600 hover:bg-amber-700 text-white",
          description: (
            <div className="space-y-3 text-sm text-muted-foreground pt-1">
              <p>
                Are you sure you want to close{" "}
                <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong>?
              </p>
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 leading-relaxed">
                <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <Lock className="h-4 w-4" />
                  <span>Applications will be paused</span>
                </div>
                <p>
                  Candidates can still see the job posting in the career portal for transparency,
                  but the <strong>Apply</strong> action will be locked. You can still view, review,
                  and filter all existing applicants.
                </p>
              </div>
            </div>
          ),
        };

      case "reopen":
        return {
          title: "Reopen Job Position",
          icon: <RotateCcw className="h-5 w-5 text-emerald-500" />,
          variant: "default" as const,
          confirmLabel: "Reopen & Publish Role",
          confirmClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
          description: (
            <div className="space-y-3 text-sm text-muted-foreground pt-1">
              <p>
                Reopen <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong>?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will transition the role status back to <strong>PUBLISHED</strong>. Candidates will
                immediately be able to submit new applications through the career portal.
              </p>
            </div>
          ),
        };

      case "archive":
        return {
          title: "Archive Job Requisition",
          icon: <Archive className="h-5 w-5 text-rose-500" />,
          variant: "destructive" as const,
          confirmLabel: "Archive & Purge Applicants",
          confirmClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
          description: (
            <div className="space-y-3 text-sm text-muted-foreground pt-1">
              <p>
                Move <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong> to the Archived Jobs repository?
              </p>
              <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-2 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <span>Permanent Applicant Deletion Warning</span>
                </div>
                <p className="text-foreground/90">
                  Archiving this job will <strong>permanently and irreversibly delete</strong>:
                </p>
                <div className="flex flex-col gap-1.5 pt-1 text-foreground/80 font-medium">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-destructive" />
                    <span>
                      {applicantCount} applicant candidate record{applicantCount === 1 ? "" : "s"} &amp; AI rankings
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-destructive" />
                    <span>All uploaded resume files quarantined in cloud storage</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The role requirements will be safely stored in the <strong>Archived Jobs</strong> repository,
                from where you can reopen it anytime with 0 applicants.
              </p>
            </div>
          ),
        };

      case "delete":
        return {
          title: "Permanently Delete Job",
          icon: <Trash2 className="h-5 w-5 text-destructive" />,
          variant: "destructive" as const,
          confirmLabel: "Delete Job Permanently",
          confirmClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
          description: (
            <div className="space-y-3 text-sm text-muted-foreground pt-1">
              <p>
                Permanently delete <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong>?
              </p>
              <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-2 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <span>Irreversible Action</span>
                </div>
                <p className="text-foreground/90">
                  This active job requisition along with all{" "}
                  <strong>{applicantCount} applicant record{applicantCount === 1 ? "" : "s"}</strong> and
                  their uploaded resume files will be permanently erased. This cannot be undone.
                </p>
              </div>
            </div>
          ),
        };

      case "delete_archived":
        return {
          title: "Delete Archived Job Requisition",
          icon: <Trash2 className="h-5 w-5 text-destructive" />,
          variant: "destructive" as const,
          confirmLabel: "Delete Permanently",
          confirmClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
          description: (
            <div className="space-y-3 text-sm text-muted-foreground pt-1">
              <p>
                Permanently delete archived job <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong>?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will remove the archived specification completely from the database. This action
                cannot be undone.
              </p>
            </div>
          ),
        };
    }
  };

  const config = getConfig();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="max-w-md">
        <DialogHeader className="pb-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-secondary">{config.icon}</div>
            <DialogTitle className="text-lg font-bold">{config.title}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">{config.title} for {jobTitle}</DialogDescription>
        </DialogHeader>

        <div className="py-2">{config.description}</div>

        <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={`gap-1.5 font-semibold ${config.confirmClass}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{config.confirmLabel}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
