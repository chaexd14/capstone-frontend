"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<number>>(new Set());
  const initialLoadRef = useRef(true);

  const isRecruiter = role === "recruiter" || role === "superadmin";
  const isApplicant = role === "applicant";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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
    loadNotifications();
    const interval = setInterval(loadNotifications, 12000);
    return () => clearInterval(interval);
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
    } catch {
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
    } catch {
      loadNotifications();
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    await markAsRead(item);
    setIsOpen(false);

    if (isRecruiter) {
      if (item.job) {
        router.push(`/admin?jobId=${item.job}`);
      } else {
        router.push("/admin");
      }
    } else {
      // Applicant navigation
      router.push("/careers?tab=MY_APPLICATIONS");
    }
  };

  if (!role) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className="relative text-muted-foreground hover:text-foreground h-9 w-9"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card/98 backdrop-blur-md shadow-2xl z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-muted/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5 text-primary" />
                <span>Mark all read</span>
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border/40 overscroll-contain">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <BellOff className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {isRecruiter
                    ? "You'll be alerted here whenever new candidates apply for published positions."
                    : "You'll see real-time updates here whenever your application status advances."}
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isNewApp = item.notification_type === "NEW_APPLICATION";
                const isStatus = item.notification_type === "STATUS_UPDATE";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer group ${
                      item.is_read
                        ? "bg-card hover:bg-muted/30"
                        : "bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isNewApp
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : isStatus
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "bg-primary/10 text-primary"
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
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs truncate ${
                            item.is_read ? "font-medium text-foreground" : "font-bold text-foreground"
                          }`}
                        >
                          {item.title}
                        </p>
                        {!item.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between pt-0.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(item.created_at)}
                        </span>

                        <span className="text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium inline-flex items-center gap-0.5">
                          View details
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification Alert for incoming events */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-primary/20 bg-card/95 backdrop-blur-md shadow-2xl p-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="h-4 w-4 animate-bounce" />
            </div>
            <div
              className="flex-1 cursor-pointer"
              onClick={() => {
                handleNotificationClick(toastNotification);
                setToastNotification(null);
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">
                  {toastNotification.title}
                </span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  New
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {toastNotification.message}
              </p>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              aria-label="Dismiss toast"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
