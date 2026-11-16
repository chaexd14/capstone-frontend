import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  label: string;
  size?: "icon-sm" | "icon" | "icon-lg";
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, children, size = "icon", ...props }, ref) => (
    <Button ref={ref} size={size} aria-label={label} title={label} {...props}>
      {children}
    </Button>
  )
);
IconButton.displayName = "IconButton";

export { IconButton };
