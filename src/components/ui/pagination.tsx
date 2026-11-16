import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => <nav role="navigation" aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />;
const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({ className, ...props }, ref) => <ul ref={ref} className={cn("flex items-center gap-1", className)} {...props} />);
PaginationContent.displayName = "PaginationContent";
const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>((props, ref) => <li ref={ref} {...props} />);
PaginationItem.displayName = "PaginationItem";
type PaginationLinkProps = { isActive?: boolean; size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg" } & React.ComponentProps<"a">;
function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) { return <a aria-current={isActive ? "page" : undefined} className={cn(buttonVariants({ variant: isActive ? "outline" : "ghost", size }), className)} {...props} />; }
const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => <PaginationLink aria-label="Go to previous page" size="default" className={cn("gap-1 pl-2.5", className)} {...props}><ChevronLeft className="size-4" /><span>Previous</span></PaginationLink>;
const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => <PaginationLink aria-label="Go to next page" size="default" className={cn("gap-1 pr-2.5", className)} {...props}><span>Next</span><ChevronRight className="size-4" /></PaginationLink>;
const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => <span aria-hidden="true" className={cn("flex size-10 items-center justify-center", className)} {...props}><MoreHorizontal className="size-4" /></span>;
export { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis };
