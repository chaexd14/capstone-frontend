"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Archive,
  LoaderCircle,
  Lock,
  RotateCcw,
  Trash2,
} from "lucide-react";

export type JobActionType = "close" | "reopen" | "archive" | "delete-draft";

interface ConfirmJobActionModalProps {
  isOpen: boolean;
  actionType: JobActionType | null;
  jobTitle: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmJobActionModal({
  isOpen,
  actionType,
  jobTitle,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmJobActionModalProps) {
  if (!actionType) return null;

  const getConfig = () => {
    switch (actionType) {
      case "close":
        return {
          title: "Close job position",
          icon: <Lock className="size-5 text-warning" aria-hidden="true" />,
          variant: "default" as const,
          confirmLabel: "Close position",
          description: (
            <div className="space-y-3 pt-1 text-sm text-muted-foreground">
              <p>
                Are you sure you want to close{" "}
                <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong>?
              </p>
              <div className="space-y-1.5 rounded-xl border border-warning/25 bg-warning/10 p-3.5 text-sm leading-relaxed text-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-warning">
                  <Lock className="size-4" aria-hidden="true" />
                  <span>Applications will be paused</span>
                </div>
                <p className="text-muted-foreground">
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
          title: "Reopen job",
          icon: <RotateCcw className="size-5 text-success" aria-hidden="true" />,
          variant: "default" as const,
          confirmLabel: "Reopen job",
          description: (
            <div className="space-y-3 pt-1 text-sm text-muted-foreground">
              <p>
                Reopen <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong>?
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Candidates will immediately be able to find this job and submit new applications.
              </p>
            </div>
          ),
        };

      case "archive":
        return {
          title: "Archive job",
          icon: <Archive className="size-5 text-destructive" aria-hidden="true" />,
          variant: "destructive" as const,
          confirmLabel: "Archive job",
          description: (
            <p className="text-sm text-muted-foreground">
              Move <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong> to Archived Jobs?
              Applications and resumes will be available when the position is restored.
            </p>
          ),
        };

      case "delete-draft":
        return {
          title: "Delete draft permanently",
          icon: <Trash2 className="size-5 text-destructive" aria-hidden="true" />,
          variant: "destructive" as const,
          confirmLabel: "Delete draft",
          description: (
            <div className="space-y-3 pt-1 text-sm text-muted-foreground">
              <p>
                Permanently delete <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong>?
              </p>
              <p className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm leading-5 text-destructive">
                This draft has never been published. Deletion cannot be undone and it will not appear in Archived Jobs.
              </p>
            </div>
          ),
        };

    }
  };

  const config = getConfig();

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-secondary">{config.icon}</div>
            <AlertDialogTitle>{config.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="sr-only">{config.title} for {jobTitle}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">{config.description}</div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant={config.variant}
            onClick={onConfirm}
            disabled={isLoading}
            className="gap-1.5"
          >
            {isLoading ? (
              <>
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span>Processing…</span>
              </>
            ) : (
              <span>{config.confirmLabel}</span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
