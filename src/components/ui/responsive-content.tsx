import * as React from "react";
import { cn } from "@/lib/utils";
function ResponsiveContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[1920px]", className)} {...props} />;
}
export { ResponsiveContent };
