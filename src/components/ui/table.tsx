import * as React from "react";
import { cn } from "@/lib/utils";

export type TableDensity = "default" | "compact" | "relaxed";
export type TableColumnSize = "auto" | "fit" | "compact" | "standard" | "wide" | "fill";
export type TableCellOverflow = "wrap" | "nowrap" | "truncate";

const TableDensityContext = React.createContext<TableDensity>("default");

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  fixed?: boolean;
  density?: TableDensity;
  containerClassName?: string;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, fixed = false, density = "default", ...props }, ref) => (
    <TableDensityContext.Provider value={density}>
      <div className={cn("relative w-full overflow-x-auto", containerClassName)}>
        <table
          ref={ref}
          className={cn(
            "w-full caption-bottom text-sm border-collapse border-spacing-0",
            fixed ? "table-fixed" : "table-auto",
            className
          )}
          {...props}
        />
      </div>
    </TableDensityContext.Provider>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  density?: TableDensity;
  size?: TableColumnSize;
}

const columnSizeClasses: Record<TableColumnSize, string> = {
  auto: "",
  fit: "w-px min-w-max whitespace-nowrap",
  compact: "w-28 min-w-28",
  standard: "w-40 min-w-40",
  wide: "w-56 min-w-56",
  fill: "w-full min-w-48",
};

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, scope = "col", density: explicitDensity, size = "auto", ...props }, ref) => {
    const contextDensity = React.useContext(TableDensityContext);
    const density = explicitDensity || contextDensity;

    return (
      <th
        ref={ref}
        scope={scope}
        className={cn(
          "text-left align-middle font-semibold text-muted-foreground uppercase tracking-wider overflow-hidden [&:has([role=checkbox])]:pr-0",
          density === "compact"
            ? "h-9 px-3 text-sm"
            : density === "relaxed"
              ? "h-12 px-5 text-sm"
              : "h-11 px-4 text-sm",
          columnSizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
TableHead.displayName = "TableHead";

type TableCellBaseProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  density?: TableDensity;
};

export type TableCellProps = TableCellBaseProps & (
  | { overflow: "truncate"; title: string }
  | { overflow?: Exclude<TableCellOverflow, "truncate">; title?: string }
);

const cellOverflowClasses: Record<TableCellOverflow, string> = {
  wrap: "whitespace-normal break-words",
  nowrap: "whitespace-nowrap",
  truncate: "max-w-0 truncate whitespace-nowrap",
};

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, density: explicitDensity, overflow = "wrap", ...props }, ref) => {
    const contextDensity = React.useContext(TableDensityContext);
    const density = explicitDensity || contextDensity;

    return (
      <td
        ref={ref}
        className={cn(
          "align-middle overflow-hidden [&:has([role=checkbox])]:pr-0",
          density === "compact"
            ? "py-2.5 px-3 text-sm"
            : density === "relaxed"
              ? "p-5 text-base"
              : "p-4 text-sm",
          cellOverflowClasses[overflow],
          className
        )}
        {...props}
      />
    );
  }
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
