"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DetailSectionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}

function DetailSection({
  title,
  description,
  children,
  className,
  ...props
}: DetailSectionProps) {
  const titleId = React.useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn("border-t border-border pt-7 sm:pt-8", className)}
      {...props}
    >
      <div className="mb-4 space-y-1.5">
        <h2
          id={titleId}
          className="text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl"
        >
          {title}
        </h2>
        {description ? (
          <p className="max-w-[70ch] text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DetailFacts({
  className,
  ...props
}: React.HTMLAttributes<HTMLDListElement>) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-5 gap-y-5 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
      {...props}
    />
  );
}

interface DetailFactProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
}

function DetailFact({
  label,
  value,
  className,
  ...props
}: DetailFactProps) {
  return (
    <div className={cn("min-w-0 space-y-1", className)} {...props}>
      <dt className="text-sm font-semibold text-muted-foreground">
        {label}
      </dt>
      <dd
        className="break-words text-sm font-semibold leading-5 text-foreground"
      >
        {value}
      </dd>
    </div>
  );
}

interface DetailLeadFactProps extends React.HTMLAttributes<HTMLDListElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  hideLabel?: boolean;
}

function DetailLeadFact({
  label,
  value,
  hideLabel = false,
  className,
  ...props
}: DetailLeadFactProps) {
  return (
    <dl className={cn("max-w-full", className)} {...props}>
      <div className="space-y-1.5">
        <dt
          className={cn(
            "text-sm font-semibold text-muted-foreground",
            hideLabel && "sr-only"
          )}
        >
          {label}
        </dt>
        <dd className="max-w-full break-words text-2xl font-extrabold leading-tight tracking-[-0.02em] text-primary tabular-nums sm:text-3xl">
          {value}
        </dd>
      </div>
    </dl>
  );
}

interface ReadableListProps
  extends Omit<React.HTMLAttributes<HTMLUListElement>, "children"> {
  items: string[];
  initialVisibleCount?: number;
  moreLabel?: (hiddenCount: number) => string;
  lessLabel?: string;
}

function ReadableList({
  items,
  initialVisibleCount,
  moreLabel = (hiddenCount) => `Show ${hiddenCount} more`,
  lessLabel = "Show less",
  className,
  ...props
}: ReadableListProps) {
  const [expanded, setExpanded] = React.useState(false);
  const hasDisclosure =
    typeof initialVisibleCount === "number" && items.length > initialVisibleCount;
  const visibleItems =
    hasDisclosure && !expanded ? items.slice(0, initialVisibleCount) : items;
  const hiddenCount = items.length - visibleItems.length;

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <ul
        className={cn(
          "max-w-[70ch] space-y-2.5 text-sm leading-6 text-foreground/85 sm:text-base sm:leading-7",
          className
        )}
        {...props}
      >
        {visibleItems.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-3">
            <span
              className="mt-[0.65rem] size-1.5 shrink-0 rounded-full bg-muted-foreground/55"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {hasDisclosure ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-3 text-primary"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? lessLabel : moreLabel(hiddenCount)}
        </Button>
      ) : null}
    </div>
  );
}

export { DetailFact, DetailFacts, DetailLeadFact, DetailSection, ReadableList };
export type {
  DetailFactProps,
  DetailLeadFactProps,
  DetailSectionProps,
  ReadableListProps,
};
