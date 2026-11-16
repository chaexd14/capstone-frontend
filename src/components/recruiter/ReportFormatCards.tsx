"use client";

import React from "react";
import { Check, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ReportFileType = "pdf" | "xlsx";

const FORMAT_OPTIONS: Array<{
  id: ReportFileType;
  label: string;
  detail: string;
  icon: typeof FileText;
}> = [
  {
    id: "pdf",
    label: "PDF",
    detail: "Formatted report (.pdf)",
    icon: FileText,
  },
  {
    id: "xlsx",
    label: "Excel",
    detail: "Spreadsheet workbook (.xlsx)",
    icon: FileSpreadsheet,
  },
];

interface ReportFormatCardsProps {
  value: ReportFileType;
  onValueChange: (value: ReportFileType) => void;
  disabled?: boolean;
  label?: string;
}

export function ReportFormatCards({
  value,
  onValueChange,
  disabled = false,
  label = "File format",
}: ReportFormatCardsProps) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {FORMAT_OPTIONS.map(({ id, label: optionLabel, detail, icon: Icon }) => {
          const selected = value === id;
          return (
            <Button
              key={id}
              type="button"
              variant="outline"
              role="radio"
              aria-checked={selected}
              onClick={() => onValueChange(id)}
              className={cn(
                "h-auto w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 text-foreground shadow-xs hover:bg-primary/10 hover:text-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
                    selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {optionLabel}
                  </span>
                  <span className="block truncate text-sm font-normal text-muted-foreground">
                    {detail}
                  </span>
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border transition-colors [&>svg]:size-3",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                )}
              >
                {selected ? <Check /> : null}
              </span>
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}
