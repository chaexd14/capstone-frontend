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
  Archive,
  Lock,
  RotateCcw,
  Loader2,
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
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-900 text-xs space-y-1.5 leading-relaxed">
                <div className="font-semibold flex items-center gap-1.5 text-amber-800">
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
          variant: "default" as const,
          confirmLabel: "Archive Position",
          description: (
            <p className="text-sm text-muted-foreground">
              Move <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong> to Archived Jobs?
              Applications and resumes will be available when the position is restored.
            </p>
          ),
        };

      case "delete-draft":
        return {
          title: "Delete Draft Permanently",
          icon: <Trash2 className="h-5 w-5 text-red-600" />,
          variant: "default" as const,
          confirmLabel: "Delete Draft Permanently",
          confirmClass: "bg-red-600 hover:bg-red-700 text-white",
          description: (
            <div className="space-y-3 text-sm text-muted-foreground pt-1">
              <p>
                Permanently delete <strong className="text-foreground">&ldquo;{jobTitle}&rdquo;</strong>?
              </p>
              <p className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-800">
                This draft has never been published. Deletion cannot be undone and it will not appear in Archived Jobs.
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

        <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading} className="h-9 px-4 text-xs font-semibold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={`h-9 px-4 text-xs gap-1.5 font-semibold ${config.confirmClass}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
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
