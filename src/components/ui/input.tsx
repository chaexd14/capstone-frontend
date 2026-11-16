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
          "flex h-10 w-full rounded-lg border bg-card px-3.5 py-2 text-sm text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
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
Input.displayName = "Input";

export { Input };
