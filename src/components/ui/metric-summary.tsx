import * as React from "react";
import { cn } from "@/lib/utils";

interface MetricSummaryProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  description: string;
  tone?: "neutral" | "brand" | "success";
}
function MetricSummary({ label, value, description, tone = "neutral", className, ...props }: MetricSummaryProps) {
  return <div className={cn("min-w-0 py-1", className)} {...props}>
    <p className={cn("text-sm font-semibold text-muted-foreground", tone === "brand" && "text-primary", tone === "success" && "text-emerald-700")}>{label}</p>
    <p className={cn("mt-2 text-3xl font-extrabold tracking-tight text-foreground tabular-nums", tone === "brand" && "text-primary", tone === "success" && "text-emerald-600")}>{value}</p>
    <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
  </div>;
}
export { MetricSummary };
export type { MetricSummaryProps };
