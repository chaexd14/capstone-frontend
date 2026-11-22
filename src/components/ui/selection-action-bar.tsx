"use client";

import * as React from "react";
import { CheckSquare2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export interface SelectionActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  count: number;
  label?: string;
  description?: string;
  secondaryActions?: React.ReactNode;
  actions?: React.ReactNode;
  onClear: () => void;
  clearLabel?: string;
  disabled?: boolean;
}

export function SelectionActionBar({
  count,
  label = "Bulk selection actions",
  description,
  secondaryActions,
  actions,
  onClear,
  clearLabel = "Clear",
  disabled = false,
  className,
  ...props
}: SelectionActionBarProps) {
  if (count <= 0) return null;

  return (
    <Card
      role="region"
      aria-label={label}
      className={cn(
        "border border-primary/25 bg-secondary/40 shadow-xs",
        className
      )}
      {...props}
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status="info" dot aria-live="polite">
            <CheckSquare2 className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">{count} selected</span>
          </StatusBadge>
          {secondaryActions}
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={disabled}
          >
            {clearLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
