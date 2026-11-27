"use client";

import * as React from "react";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ViewMode = "cards" | "table";
type CollectionFilterValues = Record<string, string>;

interface CollectionFilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CollectionFilterField {
  id: string;
  label: string;
  value: string;
  defaultValue: string;
  options: CollectionFilterOption[];
  placeholder?: string;
  triggerClassName?: string;
}

function Toolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="toolbar"
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
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

interface ResponsiveFilterSheetProps {
  label: string;
  fields: CollectionFilterField[];
  onApply: (values: CollectionFilterValues) => void;
  responsiveClassName?: string;
}

interface ResponsiveCustomFilterSheetProps {
  label: string;
  active: boolean;
  onClear?: () => void;
  children: React.ReactNode;
  responsiveClassName?: string;
}

function valuesFromFields(fields: CollectionFilterField[]): CollectionFilterValues {
  return Object.fromEntries(fields.map((field) => [field.id, field.value]));
}

function defaultValuesFromFields(fields: CollectionFilterField[]): CollectionFilterValues {
  return Object.fromEntries(fields.map((field) => [field.id, field.defaultValue]));
}

function ResponsiveFilterSheet({
  label,
  fields,
  onApply,
  responsiveClassName = "md:hidden",
}: ResponsiveFilterSheetProps) {
  const [open, setOpen] = React.useState(false);
  const [draftValues, setDraftValues] = React.useState<CollectionFilterValues>(() => valuesFromFields(fields));
  const activeCount = fields.filter((field) => field.value !== field.defaultValue).length;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setDraftValues(valuesFromFields(fields));
    setOpen(nextOpen);
  };

  const handleApply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply(draftValues);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-11 shrink-0", responsiveClassName)}
          aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filters
          {activeCount > 0 ? (
            <Badge variant="secondary" className="min-w-5 justify-center px-1.5 tabular-nums">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className={cn("max-h-[85dvh] overflow-hidden rounded-t-2xl p-0", responsiveClassName)}
      >
        <form className="flex max-h-[85dvh] flex-col" onSubmit={handleApply}>
          <SheetHeader className="shrink-0 border-b border-border px-5 pb-4 pt-5 text-left">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Refine {label.toLowerCase()} without losing your place.</SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={`mobile-filter-${field.id}`}>{field.label}</Label>
                <Select
                  value={draftValues[field.id] ?? field.defaultValue}
                  onValueChange={(value) =>
                    setDraftValues((current) => ({ ...current, [field.id]: value }))
                  }
                >
                  <SelectTrigger id={`mobile-filter-${field.id}`} className="h-11 w-full">
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <SheetFooter className="shrink-0 flex-col gap-2 border-t border-border bg-background px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:mr-auto"
              onClick={() => setDraftValues(defaultValuesFromFields(fields))}
            >
              Reset
            </Button>
            <Button type="submit" className="h-11">
              Apply filters
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ResponsiveCustomFilterSheet({
  label,
  active,
  onClear,
  children,
  responsiveClassName = "md:hidden",
}: ResponsiveCustomFilterSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-11 shrink-0", responsiveClassName)}
          aria-label={active ? "Filters, active" : "Filters"}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filters
          {active ? (
            <Badge variant="secondary" className="min-w-5 justify-center px-1.5 tabular-nums">
              1
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className={cn("max-h-[85dvh] overflow-hidden rounded-t-2xl p-0", responsiveClassName)}
      >
        <div className="flex max-h-[85dvh] flex-col">
          <SheetHeader className="shrink-0 border-b border-border px-5 pb-4 pt-5 text-left">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Refine {label.toLowerCase()} without losing your place.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 [&>button]:h-11 [&>button]:w-full">
            {children}
          </div>
          <SheetFooter className="shrink-0 flex-col gap-2 border-t border-border bg-background px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row">
            {active && onClear ? (
              <Button type="button" variant="outline" className="h-11 sm:mr-auto" onClick={onClear}>
                Reset
              </Button>
            ) : null}
            <SheetClose asChild>
              <Button type="button" className="h-11">Done</Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface CollectionToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  tabs?: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  filterFields?: CollectionFilterField[];
  onFilterValuesChange?: (values: CollectionFilterValues) => void;
  filterBreakpoint?: "md" | "wide";
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
  filterFields = [],
  onFilterValuesChange,
  filterBreakpoint = "md",
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
  const committedValues = valuesFromFields(filterFields);
  const hasStructuredFilters = filterFields.length > 0 && Boolean(onFilterValuesChange);
  const filterResponsiveClasses = filterBreakpoint === "wide"
    ? {
        compact: "min-[1800px]:hidden",
        desktop: "hidden min-[1800px]:flex",
        desktopContents: "hidden min-[1800px]:contents",
      }
    : {
        compact: "md:hidden",
        desktop: "hidden md:flex",
        desktopContents: "hidden md:contents",
      };

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

  const desktopFilters = hasStructuredFilters ? (
    <div className={cn("flex-wrap items-center gap-2", filterResponsiveClasses.desktop)}>
      {filterFields.map((field) => (
        <Select
          key={field.id}
          value={field.value}
          onValueChange={(value) => onFilterValuesChange?.({ ...committedValues, [field.id]: value })}
        >
          <SelectTrigger aria-label={field.label} className={cn("w-40", field.triggerClassName)}>
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  ) : (
    filters
  );

  const compactFilterSheet = hasStructuredFilters ? (
    <ResponsiveFilterSheet
      label={label}
      fields={filterFields}
      onApply={(values) => onFilterValuesChange?.(values)}
      responsiveClassName={filterResponsiveClasses.compact}
    />
  ) : filters ? (
    <ResponsiveCustomFilterSheet
      label={label}
      active={hasActiveFilters}
      onClear={onClearFilters}
      responsiveClassName={filterResponsiveClasses.compact}
    >
      {filters}
    </ResponsiveCustomFilterSheet>
  ) : null;

  const primaryControls = (
    <ToolbarGroup
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:flex",
        tabs ? "md:w-auto md:justify-end" : "md:w-full",
        !tabs && (displayToggle || actions) ? "md:justify-start" : "md:justify-end"
      )}
    >
      {search}
      {compactFilterSheet}
      <div className={filterResponsiveClasses.desktopContents}>
        {desktopFilters}
        {clearButton}
      </div>
    </ToolbarGroup>
  );

  if (tabs) {
    return (
      <Toolbar aria-label={label} className={cn("items-stretch", className)} {...props}>
        <ToolbarGroup className="min-w-0 flex-1">{tabs}</ToolbarGroup>
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-end">
          {primaryControls}
          {displayToggle}
          {actions ? <ToolbarGroup className="shrink-0 md:justify-end">{actions}</ToolbarGroup> : null}
        </div>
      </Toolbar>
    );
  }

  return (
    <Toolbar aria-label={label} className={cn("items-stretch", className)} {...props}>
      <ToolbarGroup className="min-w-0 flex-1">{primaryControls}</ToolbarGroup>
      {displayToggle || actions ? (
        <ToolbarGroup className="shrink-0 md:justify-end">
          {displayToggle}
          {actions}
        </ToolbarGroup>
      ) : null}
    </Toolbar>
  );
}

export { CollectionToolbar, ResponsiveFilterSheet, Toolbar, ToolbarGroup, ViewModeToggle };
export type {
  CollectionFilterField,
  CollectionFilterOption,
  CollectionFilterValues,
  CollectionToolbarProps,
  ViewMode,
  ViewModeToggleProps,
};
