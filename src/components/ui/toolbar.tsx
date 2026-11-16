"use client";

import * as React from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { cn } from "@/lib/utils";

type ViewMode = "cards" | "table";

function Toolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="toolbar"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    />
  );
}

function ToolbarGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

interface ViewModeToggleProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  label?: string;
  className?: string;
}

function ViewModeToggle({
  value,
  onValueChange,
  label = "Display mode",
  className,
}: ViewModeToggleProps) {
  return (
    <FilterTabs
      label={label}
      value={value}
      onValueChange={(next) => onValueChange(next as ViewMode)}
      className={className}
      tabs={[
        { id: "cards", label: "Cards", icon: <LayoutGrid /> },
        { id: "table", label: "Table", icon: <List /> },
      ]}
    />
  );
}

interface CollectionToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  tabs?: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  clearLabel?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  viewModeClassName?: string;
  actions?: React.ReactNode;
}

function CollectionToolbar({
  label,
  tabs,
  search,
  filters,
  hasActiveFilters = false,
  onClearFilters,
  clearLabel = "Clear filters",
  viewMode,
  onViewModeChange,
  viewModeClassName,
  actions,
  className,
  ...props
}: CollectionToolbarProps) {
  const clearButton =
    hasActiveFilters && onClearFilters ? (
      <Button type="button" variant="outline" onClick={onClearFilters}>
        {clearLabel}
      </Button>
    ) : null;

  const displayToggle =
    viewMode && onViewModeChange ? (
      <ViewModeToggle
        value={viewMode}
        onValueChange={onViewModeChange}
        className={cn("hidden shrink-0 md:flex", viewModeClassName)}
      />
    ) : null;

  if (tabs) {
    return (
      <Toolbar aria-label={label} className={cn("items-stretch", className)} {...props}>
        <ToolbarGroup className="min-w-0 flex-1">{tabs}</ToolbarGroup>
        <ToolbarGroup className="w-full sm:w-auto sm:justify-end">
          {search}
          {filters}
          {clearButton}
          {displayToggle}
          {actions}
        </ToolbarGroup>
      </Toolbar>
    );
  }

  return (
    <Toolbar aria-label={label} className={cn("items-stretch", className)} {...props}>
      <ToolbarGroup className="min-w-0 flex-1">
        {search}
        {filters}
        {clearButton}
      </ToolbarGroup>
      {displayToggle || actions ? (
        <ToolbarGroup className="shrink-0 sm:justify-end">
          {displayToggle}
          {actions}
        </ToolbarGroup>
      ) : null}
    </Toolbar>
  );
}

export { CollectionToolbar, Toolbar, ToolbarGroup, ViewModeToggle };
export type { CollectionToolbarProps, ViewMode, ViewModeToggleProps };
