"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SELECT_CONTENT_MAX_HEIGHTS = {
  compact: "15rem",
  default: "18rem",
  tall: "20rem",
} as const

type SelectContentSize = keyof typeof SELECT_CONTENT_MAX_HEIGHTS

export interface SelectContentProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  /** Preset maximum height for the scrollable viewport ("compact" = 240px, "default" = 288px, "tall" = 320px). */
  size?: SelectContentSize
  /** Custom CSS max-height override (e.g. "22rem" or "360px"), clamped to available viewport height. */
  maxHeight?: string
  /** Optional client-side batch size to progressively render long option lists on scroll. */
  batchSize?: number
  /** Async pagination callback invoked when the user scrolls near the bottom of the list. */
  onLoadMore?: () => void
  /** Indicates whether additional options are available to load asynchronously. */
  hasMore?: boolean
  /** Displays a loading indicator at the bottom of the dropdown while fetching more options. */
  isLoadingMore?: boolean
  /** Label shown alongside the spinner while loading more options. */
  loadingMoreLabel?: string
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-card px-3.5 py-2 text-sm shadow-xs transition-[border-color,box-shadow] data-[placeholder]:text-muted-foreground hover:border-slate-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center border-b border-border/60 bg-popover/95 py-1 text-muted-foreground",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" aria-hidden="true" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center border-t border-border/60 bg-popover/95 py-1 text-muted-foreground",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" aria-hidden="true" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(
  (
    {
      className,
      children,
      position = "popper",
      collisionPadding = 8,
      size = "default",
      maxHeight,
      batchSize,
      onLoadMore,
      hasMore = false,
      isLoadingMore = false,
      loadingMoreLabel = "Loading more…",
      onScroll,
      ...props
    },
    ref
  ) => {
    const viewportRef = React.useRef<HTMLDivElement | null>(null)
    const sentinelRef = React.useRef<HTMLDivElement | null>(null)
    const loadTriggeredRef = React.useRef(false)

    const childArray = React.useMemo(
      () => React.Children.toArray(children),
      [children]
    )
    const normalizedBatchSize =
      typeof batchSize === "number" && batchSize > 0 ? Math.floor(batchSize) : undefined

    const [visibleCount, setVisibleCount] = React.useState<number>(
      () => normalizedBatchSize ?? childArray.length
    )

    React.useEffect(() => {
      if (normalizedBatchSize) {
        setVisibleCount((prev) =>
          Math.min(Math.max(prev, normalizedBatchSize), childArray.length)
        )
      } else {
        setVisibleCount(childArray.length)
      }
    }, [childArray.length, normalizedBatchSize])

    React.useEffect(() => {
      if (!isLoadingMore) {
        loadTriggeredRef.current = false
      }
    }, [isLoadingMore, childArray.length])

    const hasRemainingBatch =
      normalizedBatchSize !== undefined && visibleCount < childArray.length
    const showMoreAvailable = hasRemainingBatch || hasMore

    const triggerLoadMore = React.useCallback(() => {
      if (hasRemainingBatch && normalizedBatchSize) {
        setVisibleCount((prev) =>
          Math.min(prev + normalizedBatchSize, childArray.length)
        )
        return
      }
      if (hasMore && !isLoadingMore && onLoadMore && !loadTriggeredRef.current) {
        loadTriggeredRef.current = true
        onLoadMore()
      }
    }, [
      childArray.length,
      hasMore,
      hasRemainingBatch,
      isLoadingMore,
      normalizedBatchSize,
      onLoadMore,
    ])

    React.useEffect(() => {
      if (!showMoreAvailable || isLoadingMore) return
      const viewport = viewportRef.current
      const sentinel = sentinelRef.current
      if (!viewport || !sentinel || typeof IntersectionObserver === "undefined") {
        return
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            triggerLoadMore()
          }
        },
        {
          root: viewport,
          rootMargin: "32px",
          threshold: 0,
        }
      )

      observer.observe(sentinel)
      return () => observer.disconnect()
    }, [isLoadingMore, showMoreAvailable, triggerLoadMore])

    const handleViewportScroll = React.useCallback(
      (event: React.UIEvent<HTMLDivElement>) => {
        onScroll?.(event)
        if (!showMoreAvailable || isLoadingMore) return
        const target = event.currentTarget
        if (target.scrollTop + target.clientHeight >= target.scrollHeight - 32) {
          triggerLoadMore()
        }
      },
      [isLoadingMore, onScroll, showMoreAvailable, triggerLoadMore]
    )

    const resolvedMaxHeight = maxHeight ?? SELECT_CONTENT_MAX_HEIGHTS[size]
    const renderedChildren = normalizedBatchSize
      ? childArray.slice(0, visibleCount)
      : children

    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          collisionPadding={collisionPadding}
          className={cn(
            "relative z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-fade-in origin-[var(--radix-select-content-transform-origin)]",
            position === "popper" &&
              "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className
          )}
          position={position}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            ref={viewportRef}
            onScroll={handleViewportScroll}
            style={{
              maxHeight: `min(${resolvedMaxHeight}, var(--radix-select-content-available-height, ${resolvedMaxHeight}))`,
            }}
            className={cn(
              "overflow-y-auto overflow-x-hidden p-1 scroll-py-1",
              position === "popper" &&
                "w-full min-w-[var(--radix-select-trigger-width)]"
            )}
          >
            {renderedChildren}
            {(showMoreAvailable || isLoadingMore) && (
              <div ref={sentinelRef} aria-hidden="true" className="h-px w-full shrink-0" />
            )}
            {isLoadingMore ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center justify-center gap-2 px-2 py-2 text-sm text-muted-foreground"
              >
                <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
                <span>{loadingMoreLabel}</span>
              </div>
            ) : showMoreAvailable ? (
              <div className="px-2 py-1.5 text-center text-sm font-medium text-muted-foreground/80">
                Scroll for more
              </div>
            ) : null}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    )
  }
)
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
