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
          "flex min-h-[90px] w-full rounded-lg border bg-card px-3.5 py-2.5 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 leading-relaxed transition-[border-color,box-shadow,background-color]",
          isInvalid
            ? "border-rose-400 hover:border-rose-500 focus-visible:border-rose-500 focus-visible:ring-4 focus-visible:ring-rose-500/15"
            : "border-input hover:border-slate-300 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
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
