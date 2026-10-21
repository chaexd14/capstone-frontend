"use client";

import React from "react";
import { Toaster as Sonner, toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Loader2,
} from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      closeButton
      richColors={false}
      expand={false}
      gap={10}
      duration={4800}
      icons={{
        success: (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-300/90 flex items-center justify-center shrink-0 text-emerald-600 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 stroke-[2.25]" aria-hidden="true" />
          </div>
        ),
        error: (
          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-300/90 flex items-center justify-center shrink-0 text-rose-600 shadow-2xs">
            <AlertCircle className="w-4 h-4 stroke-[2.25]" aria-hidden="true" />
          </div>
        ),
        warning: (
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-300/90 flex items-center justify-center shrink-0 text-amber-600 shadow-2xs">
            <AlertTriangle className="w-4 h-4 stroke-[2.25]" aria-hidden="true" />
          </div>
        ),
        info: (
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-300/90 flex items-center justify-center shrink-0 text-[#2196F3] shadow-2xs">
            <Sparkles className="w-4 h-4 stroke-[2.25]" aria-hidden="true" />
          </div>
        ),
        loading: (
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-300/90 flex items-center justify-center shrink-0 text-[#2196F3] shadow-2xs">
            <Loader2 className="w-4 h-4 animate-spin stroke-[2.25]" aria-hidden="true" />
          </div>
        ),
      }}
      toastOptions={{
        className: "talentmatch-toast",
        classNames: {
          toast: "talentmatch-toast-card",
          title: "talentmatch-toast-title",
          description: "talentmatch-toast-description",
          icon: "talentmatch-toast-icon",
          content: "talentmatch-toast-content",
          closeButton: "talentmatch-toast-close",
          actionButton: "talentmatch-toast-action",
          cancelButton: "talentmatch-toast-cancel",
          success: "talentmatch-toast-success",
          warning: "talentmatch-toast-warning",
          error: "talentmatch-toast-error",
          info: "talentmatch-toast-info",
          loading: "talentmatch-toast-loading",
        },
      }}
      {...props}
    />
  );
}

export { toast };

