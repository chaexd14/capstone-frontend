"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  Sparkles,
  UserPlus,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { IconButton } from "@/components/ui/icon-button";
import { NavTabs } from "@/components/ui/nav-tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchApi } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { NotificationItem, NotificationsResponse } from "@/types/notification";

interface NotificationBellProps {
  role: string | null;
  userId: string | null;
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return past.toLocaleDateString();
  } catch {
    return "Recently";
  }
}

const NOTIFICATION_POLL_MS = 30_000;
const NOTIFICATION_VISIBILITY_GAP_MS = 10_000;

interface SharedNotificationBucket {
  notifications: NotificationItem[];
  unreadCount: number;
  knownIds: Set<number>;
  initialLoaded: boolean;
  lastFetchedAt: number;
  inFlight: Promise<void> | null;
  intervalId: ReturnType<typeof setInterval> | null;
  visibilityHandler: (() => void) | null;
  listeners: Set<() => void>;
  onNewNotification: ((item: NotificationItem) => void) | null;
  realtimeConnected: boolean;
  realtimeClient: SupabaseClient | null;
  realtimeChannel: RealtimeChannel | null;
  realtimeRefCount: number;
}

const sharedNotificationStores = new Map<string, SharedNotificationBucket>();

function getOrCreateNotificationBucket(key: string): SharedNotificationBucket {
  let bucket = sharedNotificationStores.get(key);
  if (!bucket) {
    bucket = {
      notifications: [],
      unreadCount: 0,
      knownIds: new Set<number>(),
      initialLoaded: false,
      lastFetchedAt: 0,
      inFlight: null,
      intervalId: null,
      visibilityHandler: null,
      listeners: new Set(),
      onNewNotification: null,
      realtimeConnected: false,
      realtimeClient: null,
      realtimeChannel: null,
      realtimeRefCount: 0,
    };
    sharedNotificationStores.set(key, bucket);
  }
  return bucket;
}

function notifyBucketListeners(bucket: SharedNotificationBucket) {
  bucket.listeners.forEach((listener) => listener());
}

function publishApplicationPatch(item: NotificationItem) {
  if (
    typeof window === "undefined" ||
    !item.application ||
    !item.application_status
  ) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("talentmatch:application-patch", {
      detail: {
        id: item.application,
        status: item.application_status,
        updated_at: item.application_updated_at,
      },
    })
  );
}

async function fetchNotificationBucket(
  key: string,
  isRecruiter: boolean,
  isApplicant: boolean,
  userId: string | null
) {
  const bucket = getOrCreateNotificationBucket(key);
  if (bucket.inFlight) return bucket.inFlight;

  const task = (async () => {
    try {
      const recipientType = isRecruiter ? "RECRUITER" : "APPLICANT";
      let url = `/notifications/?recipient_type=${recipientType}`;
      if (isApplicant && userId) {
        url += `&user_id=${userId}`;
      }
      const res = await fetchApi<NotificationsResponse>(url);
      const list = res.notifications || [];

      if (bucket.initialLoaded) {
        const newUnread = list.find((n) => !n.is_read && !bucket.knownIds.has(n.id));
        if (newUnread && bucket.onNewNotification) {
          bucket.onNewNotification(newUnread);
        }
      }

      bucket.notifications = list;
      bucket.unreadCount = res.unread_count || 0;
      bucket.knownIds = new Set(list.map((n) => n.id));
      bucket.initialLoaded = true;
      bucket.lastFetchedAt = Date.now();
      notifyBucketListeners(bucket);
    } catch {
      // Quiet fail on transient network error
    } finally {
      bucket.inFlight = null;
    }
  })();

  bucket.inFlight = task;
  return task;
}

export function NotificationBell({ role, userId }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const isRecruiter = role === "recruiter" || role === "superadmin";
  const isApplicant = role === "applicant";
  const storeKey = role ? `${isRecruiter ? "RECRUITER" : "APPLICANT"}:${userId ?? "anon"}` : "";

  const navigateToNotification = useCallback(
    (item: NotificationItem) => {
      if (isRecruiter) {
        if (item.job) {
          router.push(`/admin/jobs/${item.job}`);
        } else {
          router.push("/admin");
        }
      } else {
        router.push("/careers?tab=MY_APPLICATIONS");
      }
    },
    [isRecruiter, router]
  );

  const navigateRef = useRef(navigateToNotification);
  useEffect(() => {
    navigateRef.current = navigateToNotification;
  }, [navigateToNotification]);

  useEffect(() => {
    if (!role || !storeKey) return;
    const bucket = getOrCreateNotificationBucket(storeKey);

    const syncFromBucket = () => {
      setNotifications(bucket.notifications);
      setUnreadCount(bucket.unreadCount);
    };

    bucket.listeners.add(syncFromBucket);
    syncFromBucket();

    if (!bucket.onNewNotification) {
      bucket.onNewNotification = (newUnread: NotificationItem) => {
        toast.info(newUnread.title, {
          description: newUnread.message,
          action: {
            label: "View",
            onClick: () => {
              bucket.notifications = bucket.notifications.map((n) =>
                n.id === newUnread.id ? { ...n, is_read: true } : n
              );
              bucket.unreadCount = Math.max(0, bucket.unreadCount - 1);
              notifyBucketListeners(bucket);
              void fetchApi(`/notifications/${newUnread.id}/read/`, {
                method: "PATCH",
              }).catch(() => {});
              navigateRef.current(newUnread);
            },
          },
        });
      };
    }

    // Start a single shared visibility-aware poller across all mounted NotificationBell instances
    if (bucket.intervalId === null) {
      if (!bucket.initialLoaded || Date.now() - bucket.lastFetchedAt >= NOTIFICATION_VISIBILITY_GAP_MS) {
        void fetchNotificationBucket(storeKey, isRecruiter, isApplicant, userId);
      }
      bucket.intervalId = setInterval(() => {
        if (bucket.realtimeConnected) return;
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          return;
        }
        void fetchNotificationBucket(storeKey, isRecruiter, isApplicant, userId);
      }, NOTIFICATION_POLL_MS);

      const handleVisibility = () => {
        if (
          document.visibilityState === "visible" &&
          Date.now() - bucket.lastFetchedAt >= NOTIFICATION_VISIBILITY_GAP_MS
        ) {
          void fetchNotificationBucket(storeKey, isRecruiter, isApplicant, userId);
        }
      };
      bucket.visibilityHandler = handleVisibility;
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      bucket.listeners.delete(syncFromBucket);
      if (bucket.listeners.size === 0) {
        if (bucket.intervalId !== null) {
          clearInterval(bucket.intervalId);
          bucket.intervalId = null;
        }
        if (bucket.visibilityHandler) {
          document.removeEventListener("visibilitychange", bucket.visibilityHandler);
          bucket.visibilityHandler = null;
        }
        bucket.onNewNotification = null;
      }
    };
  }, [role, storeKey, isRecruiter, isApplicant, userId]);

  useEffect(() => {
    if (!role || !storeKey) return;
    if (isApplicant && !userId) return;
    const bucket = getOrCreateNotificationBucket(storeKey);
    bucket.realtimeRefCount += 1;
    if (!bucket.realtimeChannel) {
      const realtime = createClient();
      const filter = isApplicant
        ? `user_id=eq.${userId}`
        : `recipient_type=eq.RECRUITER`;
      bucket.realtimeClient = realtime;
      bucket.realtimeChannel = realtime
        .channel(`notifications:${storeKey}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications_notification",
            filter,
          },
          (payload) => {
            const item = payload.new as NotificationItem;
            if (!item?.id || bucket.knownIds.has(item.id)) return;
            bucket.notifications = [item, ...bucket.notifications].slice(0, 50);
            bucket.knownIds.add(item.id);
            if (!item.is_read) bucket.unreadCount += 1;
            bucket.lastFetchedAt = Date.now();
            notifyBucketListeners(bucket);
            bucket.onNewNotification?.(item);
          }
        )
        .subscribe((status) => {
          bucket.realtimeConnected = status === "SUBSCRIBED";
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            void fetchNotificationBucket(storeKey, isRecruiter, isApplicant, userId);
          }
        });
    }

    return () => {
      bucket.realtimeRefCount = Math.max(0, bucket.realtimeRefCount - 1);
      if (bucket.realtimeRefCount === 0 && bucket.realtimeClient && bucket.realtimeChannel) {
        bucket.realtimeConnected = false;
        void bucket.realtimeClient.removeChannel(bucket.realtimeChannel);
        bucket.realtimeClient = null;
        bucket.realtimeChannel = null;
      }
    };
  }, [isApplicant, isRecruiter, role, storeKey, userId]);

  const markAsRead = async (item: NotificationItem) => {
    if (item.is_read || !storeKey) return;
    const bucket = getOrCreateNotificationBucket(storeKey);

    bucket.notifications = bucket.notifications.map((n) =>
      n.id === item.id ? { ...n, is_read: true } : n
    );
    bucket.unreadCount = Math.max(0, bucket.unreadCount - 1);
    notifyBucketListeners(bucket);

    try {
      const updated = await fetchApi<NotificationItem>(`/notifications/${item.id}/read/`, {
        method: "PATCH",
      });
      publishApplicationPatch(updated);
    } catch {
      void fetchNotificationBucket(storeKey, isRecruiter, isApplicant, userId);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || !storeKey) return;
    const bucket = getOrCreateNotificationBucket(storeKey);

    bucket.notifications = bucket.notifications.map((n) => ({ ...n, is_read: true }));
    bucket.unreadCount = 0;
    notifyBucketListeners(bucket);

    try {
      const recipientType = isRecruiter ? "RECRUITER" : "APPLICANT";
      await fetchApi("/notifications/mark-all-read/", {
        method: "POST",
        body: JSON.stringify({
          recipient_type: recipientType,
          user_id: isApplicant ? userId : undefined,
        }),
      });
    } catch {
      void fetchNotificationBucket(storeKey, isRecruiter, isApplicant, userId);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    publishApplicationPatch(item);
    void markAsRead(item);
    setIsOpen(false);
    navigateToNotification(item);
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === "UNREAD") return !item.is_read;
    return true;
  });

  if (!role) return null;

  return (
    <>
      <IconButton
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        label={
          unreadCount > 0
            ? `View notifications (${unreadCount} unread)`
            : "View notifications"
        }
        className="relative text-muted-foreground hover:text-foreground"
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-sm font-bold leading-none tabular-nums text-primary-foreground shadow-2xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </IconButton>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-lg"
        >
          <TooltipProvider delayDuration={250}>
            {/* Sheet Header matching CandidateWorkflowPanel */}
          <div className="shrink-0 bg-card">
            <SheetHeader className="px-5 pb-3 pt-5 text-left sm:px-6 sm:pt-6">
              <div className="flex min-w-0 items-start gap-3.5 pr-12">
                <div
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-secondary text-secondary-foreground"
                >
                  <Bell className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <SheetTitle className="text-xl font-bold text-foreground">
                      Notifications
                    </SheetTitle>
                    {unreadCount > 0 ? (
                      <StatusBadge status="info" dot className="shrink-0 tabular-nums">
                        {unreadCount} new
                      </StatusBadge>
                    ) : null}
                  </div>
                  <SheetDescription className="mt-1 truncate">
                    {isRecruiter
                      ? "Application alerts and requisition activity"
                      : "Application updates and hiring alerts"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* Canonical Underline NavTabs + Mark All Read */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 sm:px-6">
              <NavTabs
                label="Filter notifications"
                value={activeFilter}
                onValueChange={(value) => setActiveFilter(value as "ALL" | "UNREAD")}
                className="w-auto flex-1 border-b-0"
                tabs={[
                  { id: "ALL", label: "All", count: notifications.length },
                  { id: "UNREAD", label: "Unread", count: unreadCount },
                ]}
              />

              {unreadCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void markAllAsRead()}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck aria-hidden="true" />
                  <span>Mark all read</span>
                </Button>
              ) : null}
            </div>
          </div>

          {/* Scrollable Notification Feed */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/40 px-5 py-5 sm:px-6">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <EmptyState
                    title={
                      activeFilter === "UNREAD"
                        ? "You're all caught up"
                        : "No notifications yet"
                    }
                    description={
                      activeFilter === "UNREAD"
                        ? "There are no unread alerts right now. Switch to All to review earlier activity."
                        : isRecruiter
                        ? "You will be notified here when candidates apply or application statuses change."
                        : "Updates on your submitted applications will appear here."
                    }
                    className="min-h-48 py-8"
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="divide-y divide-border overflow-hidden">
                {filteredNotifications.map((item) => {
                  const isNewApp = item.notification_type === "NEW_APPLICATION";
                  const isStatus = item.notification_type === "STATUS_UPDATE";

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3.5 transition-colors sm:px-5",
                        item.is_read
                          ? "bg-card hover:bg-muted/40"
                          : "bg-secondary/35 hover:bg-secondary/55"
                      )}
                    >
                      <div
                        aria-hidden="true"
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border",
                          isNewApp
                            ? "border-success/20 bg-success/10 text-success"
                            : isStatus
                            ? "border-primary/15 bg-secondary text-secondary-foreground"
                            : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {isNewApp ? (
                          <UserPlus className="size-4" />
                        ) : isStatus ? (
                          <Sparkles className="size-4" />
                        ) : (
                          <FileCheck className="size-4" />
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void handleNotificationClick(item)}
                        className="h-auto min-w-0 flex-1 flex-col items-start justify-start gap-1 whitespace-normal rounded-lg px-1 py-0.5 text-left font-normal hover:bg-transparent"
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              item.is_read
                                ? "font-medium text-foreground"
                                : "font-semibold text-foreground"
                            )}
                          >
                            {item.title}
                          </span>
                          {!item.is_read ? (
                            <span
                              className="size-2 shrink-0 rounded-full bg-primary"
                              aria-label="Unread notification"
                            />
                          ) : null}
                        </span>

                        <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {item.message}
                        </span>

                        <span className="inline-flex items-center gap-1.5 pt-0.5 text-sm tabular-nums text-muted-foreground">
                          <Clock className="size-3.5" aria-hidden="true" />
                          <span>{formatRelativeTime(item.created_at)}</span>
                        </span>
                      </Button>

                      {!item.is_read ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <IconButton
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              label="Mark notification as read"
                              onClick={() => void markAsRead(item)}
                              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              <Check className="size-4" aria-hidden="true" />
                            </IconButton>
                          </TooltipTrigger>
                          <TooltipContent>Mark as read</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  );
                })}
              </Card>
            )}
          </div>
          </TooltipProvider>
        </SheetContent>
      </Sheet>
    </>
  );
}
