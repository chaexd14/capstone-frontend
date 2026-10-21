import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const isInvalid = error || props["aria-invalid"] === true || props["aria-invalid"] === "true";

    return (
      <textarea
        aria-invalid={isInvalid ? true : undefined}
        className={cn(
          "flex min-h-[90px] w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed transition-all",
          isInvalid
            ? "border-rose-400 hover:border-rose-500 focus-visible:border-rose-500 focus-visible:ring-4 focus-visible:ring-rose-500/15"
            : "border-input hover:border-slate-300 focus-visible:border-[#2196F3] focus-visible:ring-4 focus-visible:ring-[#2196F3]/15",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
