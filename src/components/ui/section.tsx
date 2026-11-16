import * as React from "react";
import { cn } from "@/lib/utils";
function Section({ className, ...props }: React.HTMLAttributes<HTMLElement>) { return <section className={cn("rounded-2xl bg-card p-5 shadow-xs sm:p-6", className)} {...props} />; }
function SectionHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)} {...props} />; }
function SectionTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h2 className={cn("text-lg font-bold tracking-tight text-foreground", className)} {...props} />; }
function SectionDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn("mt-1 max-w-[70ch] text-sm leading-6 text-muted-foreground", className)} {...props} />; }
export { Section, SectionHeader, SectionTitle, SectionDescription };
