import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";

export interface SearchInputProps extends Omit<InputProps, "type"> {
  onClear?: () => void;
  containerClassName?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, onClear, value, defaultValue, ...props }, ref) => {
    const hasValue = String(value ?? defaultValue ?? "").length > 0;
    return (
      <div className={cn("relative", containerClassName)}>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          type="search"
          value={value}
          defaultValue={defaultValue}
          className={cn(
            "pl-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            onClear && "pr-10",
            className
          )}
          {...props}
        />
        {onClear && hasValue ? (
          <IconButton type="button" label="Clear search" variant="ghost" size="icon-sm" onClick={onClear} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground">
            <X aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";

export { SearchInput };
