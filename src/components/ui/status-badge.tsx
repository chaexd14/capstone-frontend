import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const statusBadgeVariants = cva("inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold", { variants: { status: { neutral: "bg-muted text-muted-foreground", info: "bg-blue-50 text-blue-700", success: "bg-emerald-50 text-emerald-700", warning: "bg-amber-50 text-amber-800", danger: "bg-rose-50 text-rose-700", processing: "bg-sky-50 text-sky-700" } }, defaultVariants: { status: "neutral" } });
interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> { dot?: boolean; }
function StatusBadge({ className, status, dot = false, children, ...props }: StatusBadgeProps) { return <span className={cn(statusBadgeVariants({ status }), className)} {...props}>{dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}{children}</span>; }
export { StatusBadge, statusBadgeVariants };
export type { StatusBadgeProps };
