"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  Sparkles,
  UserPlus,
  FileCheck,
  X,
  ExternalLink,
  BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { fetchApi } from "@/lib/api";
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

export function NotificationBell({ role, userId }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const knownIdsRef = useRef<Set<number>>(new Set());
  const initialLoadRef = useRef(true);

  const isRecruiter = role === "recruiter" || role === "superadmin";
  const isApplicant = role === "applicant";

  const loadNotifications = useCallback(async () => {
    if (!role) return;

    try {
      const recipientType = isRecruiter ? "RECRUITER" : "APPLICANT";
      let url = `/notifications/?recipient_type=${recipientType}`;
      if (isApplicant && userId) {
        url += `&user_id=${userId}`;
      }

      const res = await fetchApi<NotificationsResponse>(url);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);

      // Check for incoming notifications to display toast alert
      if (!initialLoadRef.current) {
        const newUnread = (res.notifications || []).find(
          (n) => !n.is_read && !knownIdsRef.current.has(n.id)
        );
        if (newUnread) {
          setToastNotification(newUnread);
        }
      }

      // Record known IDs
      const currentIds = new Set<number>();
      (res.notifications || []).forEach((n) => currentIds.add(n.id));
      knownIdsRef.current = currentIds;
      initialLoadRef.current = false;
    } catch {
      // Quiet fail on network flutter
    }
  }, [role, userId, isRecruiter, isApplicant]);

  // Initial fetch and 12-second polling
  useEffect(() => {
    if (!role) return;
    const timer = setTimeout(() => {
      void loadNotifications();
    }, 0);
    const interval = setInterval(() => {
      void loadNotifications();
    }, 12000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [role, loadNotifications]);

  // Dismiss toast after 5 seconds
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  const markAsRead = async (item: NotificationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.is_read) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetchApi(`/notifications/${item.id}/read/`, { method: "PATCH" });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      // Revert if error
      loadNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      const recipientType = isRecruiter ? "RECRUITER" : "APPLICANT";
      await fetchApi("/notifications/mark-all-read/", {
        method: "POST",
        body: JSON.stringify({
          recipient_type: recipientType,
          user_id: isApplicant ? userId : undefined,
        }),
      });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      loadNotifications();
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    await markAsRead(item);
    setIsOpen(false);

    if (isRecruiter) {
      if (item.job) {
        router.push(`/admin/jobs/${item.job}`);
      } else {
        router.push("/admin");
      }
    } else {
      // Applicant navigation
      router.push("/careers?tab=MY_APPLICATIONS");
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === "UNREAD") return !item.is_read;
    return true;
  });

  if (!role) return null;

  return (
    <>
      {/* Bell Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label="View notifications"
        className="relative text-slate-600 hover:text-slate-900 h-9 w-9 rounded-xl cursor-pointer transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#2196F3] text-[10px] font-bold text-white shadow-2xs animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Slide-Out Notification Sheet Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-white text-slate-900 border-l border-slate-200/90 shadow-2xl focus:outline-none z-50 overflow-hidden [&>button:last-child]:hidden"
        >
          {/* 1. Header Toolbar */}
          <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#1976D2] border border-blue-200/60 flex items-center justify-center shrink-0">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <SheetHeader className="space-y-0.5 text-left">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-base font-bold text-slate-900 tracking-tight">
                    Notifications
                  </SheetTitle>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold bg-blue-50 text-[#1976D2] border border-blue-200/60">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                <SheetDescription className="text-xs text-slate-500 truncate">
                  {isRecruiter ? "Application alerts & requisition activity" : "Application updates & hiring alerts"}
                </SheetDescription>
              </SheetHeader>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1.5 rounded-lg cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-[#2196F3]" />
                  <span className="hidden sm:inline">Mark all read</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8.5 w-8.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                title="Close drawer (Esc)"
                aria-label="Close notifications drawer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 2. Filter Tabs Toolbar */}
          <div className="shrink-0 px-5 sm:px-6 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveFilter("ALL")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === "ALL"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("UNREAD")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === "UNREAD"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-[#2196F3] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Showing {filteredNotifications.length}
            </span>
          </div>

          {/* 3. Scrollable Notification Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 overscroll-contain focus:outline-none">
            {filteredNotifications.length === 0 ? (
              <div className="py-20 px-6 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <BellOff className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {activeFilter === "UNREAD" ? "You're all caught up!" : "No notifications yet"}
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {activeFilter === "UNREAD"
                    ? "There are no unread notifications right now. Check the 'All' tab to view past activity."
                    : isRecruiter
                    ? "You'll be alerted here whenever candidates apply for positions or application statuses update."
                    : "You'll see real-time updates here whenever your application status advances."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isNewApp = item.notification_type === "NEW_APPLICATION";
                const isStatus = item.notification_type === "STATUS_UPDATE";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`flex items-start gap-3.5 p-4 sm:px-6 transition-colors cursor-pointer group relative ${
                      item.is_read
                        ? "bg-white hover:bg-slate-50/80"
                        : "bg-blue-50/35 hover:bg-blue-50/70 border-l-3 border-l-[#2196F3]"
                    }`}
                  >
                    {/* Category Icon */}
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        isNewApp
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : isStatus
                          ? "bg-blue-50 text-[#1976D2] border-blue-200/60"
                          : "bg-slate-100 text-slate-700 border-slate-200/60"
                      }`}
                    >
                      {isNewApp ? (
                        <UserPlus className="h-4 w-4" />
                      ) : isStatus ? (
                        <Sparkles className="h-4 w-4" />
                      ) : (
                        <FileCheck className="h-4 w-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs ${
                            item.is_read ? "font-semibold text-slate-700" : "font-bold text-slate-900"
                          } truncate`}
                        >
                          {item.title}
                        </p>
                        {!item.is_read && (
                          <span className="h-2 w-2 rounded-full bg-[#2196F3] shrink-0" title="Unread" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {formatRelativeTime(item.created_at)}
                        </span>

                        <div className="flex items-center gap-2">
                          {!item.is_read && (
                            <button
                              type="button"
                              onClick={(e) => markAsRead(item, e)}
                              className="opacity-90 sm:opacity-0 sm:group-hover:opacity-100 text-[11px] text-slate-500 hover:text-[#2196F3] hover:underline transition-opacity flex items-center gap-1 cursor-pointer focus:opacity-100"
                              title="Mark as read without opening"
                              aria-label="Mark notification as read"
                            >
                              <Check className="h-3 w-3" />
                              <span>Mark read</span>
                            </button>
                          )}

                          <span className="text-[11px] text-[#2196F3] opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity font-semibold inline-flex items-center gap-0.5 focus:opacity-100">
                            <span>View</span>
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating Toast Notification Alert for incoming events */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-blue-200 bg-white/95 backdrop-blur-md shadow-2xl p-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#1976D2] border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="h-4 w-4 animate-pulse" />
            </div>
            <div
              className="flex-1 cursor-pointer"
              onClick={() => {
                handleNotificationClick(toastNotification);
                setToastNotification(null);
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">
                  {toastNotification.title}
                </span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-blue-200 text-[#1976D2] bg-blue-50 font-bold">
                  New
                </Badge>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                {toastNotification.message}
              </p>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
