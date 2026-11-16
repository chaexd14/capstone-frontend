import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function ContextualLoading({ label = "Loading workspace", className }: { label?: string; className?: string }) {
  return <div role="status" className={cn("flex min-h-64 flex-col items-center justify-center gap-3 text-center", className)}>
    <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /></span>
    <div><p className="text-sm font-semibold text-foreground">{label}</p><p className="mt-1 text-sm text-muted-foreground">This usually takes only a moment.</p></div>
  </div>;
}
export { ContextualLoading };
