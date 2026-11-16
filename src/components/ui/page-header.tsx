import * as React from "react";
import { cn } from "@/lib/utils";

function PageHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)} {...props} />;
}
function PageHeaderTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("text-2xl font-extrabold tracking-[-0.025em] text-foreground sm:text-3xl", className)} {...props} />;
}
function PageHeaderDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 max-w-[70ch] text-sm leading-6 text-muted-foreground", className)} {...props} />;
}
function PageHeaderActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}
export { PageHeader, PageHeaderTitle, PageHeaderDescription, PageHeaderActions };
