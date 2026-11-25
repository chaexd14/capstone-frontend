"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ServerPaginationProps {
  page: number;
  pageSize: number;
  count: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

export function ServerPagination({
  page,
  pageSize,
  count,
  totalPages,
  loading = false,
  onPageChange,
}: ServerPaginationProps) {
  if (count === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, count);

  return (
    <nav aria-label="Results pages" className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing <span className="font-semibold text-foreground tabular-nums">{first}–{last}</span> of{" "}
        <span className="font-semibold text-foreground tabular-nums">{count}</span>
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" /> Previous
        </Button>
        <span className="min-w-24 text-center text-sm font-medium tabular-nums">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
