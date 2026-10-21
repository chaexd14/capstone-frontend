import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    const isInvalid = error || props["aria-invalid"] === true || props["aria-invalid"] === "true";

    return (
      <input
        type={type}
        aria-invalid={isInvalid ? true : undefined}
        className={cn(
          "flex h-10 w-full rounded-lg border bg-background px-3.5 py-2 text-sm shadow-xs transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
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
Input.displayName = "Input";

export { Input };
