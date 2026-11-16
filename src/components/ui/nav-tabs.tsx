import * as React from "react";
import { cn } from "@/lib/utils";

interface NavTab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface NavTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: NavTab[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  fullWidth?: boolean;
}

function NavTabs({
  tabs,
  value,
  onValueChange,
  label,
  fullWidth = false,
  className,
  ...props
}: NavTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex w-full items-center overflow-x-auto border-b border-border",
        fullWidth ? "gap-1" : "gap-5 sm:gap-6",
        className
      )}
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onValueChange(tab.id)}
            className={cn(
              "group relative inline-flex h-11 cursor-pointer select-none items-center gap-2 whitespace-nowrap text-sm transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 [&_svg]:size-4 [&_svg]:shrink-0",
              fullWidth ? "min-w-0 flex-1 justify-center px-3" : "shrink-0 px-0.5",
              isActive
                ? "font-semibold text-secondary-foreground"
                : "font-medium text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon ? (
              <span aria-hidden="true" className="inline-flex items-center">
                {tab.icon}
              </span>
            ) : null}
            <span>{tab.label}</span>
            {tab.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-full transition-colors",
                isActive ? "bg-primary" : "bg-transparent group-hover:bg-border"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export { NavTabs };
export type { NavTab, NavTabsProps };

