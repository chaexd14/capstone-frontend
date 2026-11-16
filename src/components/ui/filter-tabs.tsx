import * as React from "react";
import { cn } from "@/lib/utils";

interface FilterTab { id: string; label: string; count?: number; icon?: React.ReactNode; }
interface FilterTabsProps extends React.HTMLAttributes<HTMLDivElement> { tabs: FilterTab[]; value: string; onValueChange: (value: string) => void; label: string; fullWidth?: boolean; }
function FilterTabs({ tabs, value, onValueChange, label, fullWidth = false, className, ...props }: FilterTabsProps) {
  return <div role="tablist" aria-label={label} className={cn("max-w-full shrink-0 gap-1 overflow-x-auto rounded-xl bg-muted p-1", fullWidth ? "flex w-full" : "inline-flex w-fit", className)} {...props}>
    {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={value === tab.id} onClick={() => onValueChange(tab.id)} className={cn("inline-flex h-9 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 [&_svg]:size-4 [&_svg]:shrink-0", fullWidth ? "min-w-0 flex-1 justify-center" : "shrink-0", value === tab.id && "bg-card text-foreground shadow-xs")}>{tab.icon ? <span aria-hidden="true" className="inline-flex items-center">{tab.icon}</span> : null}<span>{tab.label}</span>{tab.count !== undefined ? <span className="text-sm tabular-nums text-muted-foreground">{tab.count}</span> : null}</button>)}
  </div>;
}
export { FilterTabs };
export type { FilterTab, FilterTabsProps };
