import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> { label: React.ReactNode; htmlFor: string; description?: React.ReactNode; error?: React.ReactNode; required?: boolean; action?: React.ReactNode; }
function FormField({ label, htmlFor, description, error, required, action, className, children, ...props }: FormFieldProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return <div className={cn("space-y-2", className)} {...props}>{action ? <div className="flex items-center justify-between gap-3"><Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">{label}{required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}</Label>{action}</div> : <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">{label}{required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}</Label>}{children}{description ? <p id={descriptionId} className="text-sm leading-5 text-muted-foreground">{description}</p> : null}{error ? <p id={errorId} role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}</div>;
}
export { FormField };
export type { FormFieldProps };
