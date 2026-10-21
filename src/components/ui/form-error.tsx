"use client";

import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PasswordRequirementItem } from "@/lib/validation";

export interface FieldErrorProps {
  message?: string | null;
  id?: string;
  className?: string;
}

/**
 * TalentMatch Inline Field Error Note
 * Crisp rose-slate inline validation feedback aligned with DESIGN.md and sonner.tsx.
 */
export function FieldError({ message, id, className }: FieldErrorProps) {
  if (!message) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        "mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-700",
        className
      )}
    >
      <AlertCircle
        className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 stroke-[2.2]"
        aria-hidden="true"
      />
      <span className="leading-snug">{message}</span>
    </div>
  );
}

export interface FormAlertNoteProps {
  variant?: "error" | "warning" | "info" | "success";
  title?: string;
  description: string;
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
}

/**
 * TalentMatch Architectural Form Alert Card
 * Matches the 1px bordered card & icon-badge system from DESIGN.md and sonner.tsx.
 */
export function FormAlertNote({
  variant = "error",
  title,
  description,
  onDismiss,
  action,
  className,
}: FormAlertNoteProps) {
  const styles = {
    error: {
      container: "bg-rose-50/80 border-rose-200/90 text-rose-950",
      badge: "bg-white border-rose-200/90 text-rose-600",
      title: "text-rose-900",
      desc: "text-rose-800",
      Icon: AlertCircle,
    },
    warning: {
      container: "bg-amber-50/80 border-amber-200/90 text-amber-950",
      badge: "bg-white border-amber-200/90 text-amber-600",
      title: "text-amber-900",
      desc: "text-amber-800",
      Icon: AlertTriangle,
    },
    info: {
      container: "bg-blue-50/80 border-blue-200/90 text-slate-900",
      badge: "bg-white border-blue-200/90 text-[#1976D2]",
      title: "text-slate-900",
      desc: "text-slate-700",
      Icon: Sparkles,
    },
    success: {
      container: "bg-emerald-50/80 border-emerald-200/90 text-emerald-950",
      badge: "bg-white border-emerald-200/90 text-emerald-600",
      title: "text-emerald-900",
      desc: "text-emerald-800",
      Icon: CheckCircle2,
    },
  }[variant];

  const IconComponent = styles.Icon;

  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "p-3.5 rounded-xl border shadow-2xs flex items-start justify-between gap-3 transition-colors",
        styles.container,
        className
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div
          className={cn(
            "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs mt-0.5",
            styles.badge
          )}
        >
          <IconComponent className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          {title && (
            <p className={cn("text-xs font-bold leading-snug", styles.title)}>
              {title}
            </p>
          )}
          <p
            className={cn(
              "text-xs leading-relaxed",
              title ? "mt-0.5" : "mt-1",
              styles.desc
            )}
          >
            {description}
          </p>
        </div>
      </div>

      {(action || onDismiss) && (
        <div className="flex items-center gap-1.5 shrink-0">
          {action}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notice"
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Interactive Password Requirement Checklist Chips
 */
export function PasswordStrengthChecklist({
  requirements,
  visible = true,
}: {
  requirements: PasswordRequirementItem[];
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      className="mt-2 flex flex-wrap gap-1.5"
      aria-label="Password strength requirements"
    >
      {requirements.map((req) => (
        <span
          key={req.id}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors",
            req.met
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-slate-50 border-slate-200 text-slate-600"
          )}
        >
          <CheckCircle2
            className={cn(
              "w-3 h-3 shrink-0",
              req.met ? "text-emerald-600" : "text-slate-400"
            )}
            aria-hidden="true"
          />
          <span>{req.label}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * Standard TalentMatch raw <input> classes with error state support (matching DESIGN.md Section 4.2)
 */
export function getAuthInputClasses(hasError?: boolean, extraClasses?: string) {
  return cn(
    "w-full h-11 px-3.5 rounded-xl border text-slate-900 placeholder:text-slate-400 text-sm transition-all outline-none bg-white shadow-2xs",
    hasError
      ? "border-rose-400 hover:border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15"
      : "border-slate-200 hover:border-slate-300 focus:border-[#2196F3] focus:ring-4 focus:ring-[#2196F3]/15",
    extraClasses
  );
}
