"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Users,
  Shield,
  LogOut,
  MoreVertical,
  Plus,
  Columns3,
  Mail,
  HeartPulse,
} from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface RecruiterSidebarProps {
  onCloseMobile?: () => void;
}

export function RecruiterSidebar({ onCloseMobile }: RecruiterSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    currentUser,
    anonymize,
    setAnonymize,
    jobs,
    applications,
    handleLogout,
    setIsCreateJobOpen,
  } = useRecruiter();

  const activeView = searchParams.get("view") || "dashboard";
  const isSuperAdmin = currentUser?.role === "superadmin";
  const isJobDetail = pathname.startsWith("/admin/jobs/");

  const activeJobsCount = jobs.filter(
    (j) => j.status === "PUBLISHED" || (!j.status && j.status !== "CLOSED")
  ).length;

  const navItems = isSuperAdmin
    ? [
        {
          id: "system",
          label: "System Health",
          icon: HeartPulse,
          href: "/admin?view=system",
          isActive: activeView !== "platform",
          badge: null as number | null,
        },
        {
          id: "platform",
          label: "Companies & Team",
          icon: Building2,
          href: "/admin?view=platform",
          isActive: activeView === "platform",
          badge: null as number | null,
        },
      ]
    : [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "/admin?view=dashboard",
          isActive: !isJobDetail && activeView === "dashboard",
          badge: null as number | null,
        },
        {
          id: "jobs",
          label: "Jobs",
          icon: Briefcase,
          href: "/admin?view=jobs",
          isActive: isJobDetail || activeView === "jobs",
          badge: activeJobsCount,
        },
        {
          id: "pipeline",
          label: "Hiring Pipeline",
          icon: Columns3,
          href: "/admin?view=pipeline",
          isActive: !isJobDetail && activeView === "pipeline",
          badge: applications.filter(
            (application) => !["HIRED", "REJECTED"].includes(application.status)
          ).length,
        },
        {
          id: "applicants",
          label: "Applicants",
          icon: Users,
          href: "/admin?view=applicants",
          isActive: !isJobDetail && activeView === "applicants",
          badge: applications.length,
        },
        {
          id: "templates",
          label: "Message Templates",
          icon: Mail,
          href: "/admin?view=templates",
          isActive: !isJobDetail && activeView === "templates",
          badge: null as number | null,
        },
      ];

  const handleNavClick = (href: string) => {
    router.push(href);
    if (onCloseMobile) onCloseMobile();
  };

  const firstName = (currentUser?.firstName || "").trim();
  const lastName = (currentUser?.lastName || "").trim();
  const fullNameFromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
  const fallbackName = (currentUser?.name || "").trim();
  const displayName =
    fullNameFromParts ||
    (fallbackName && fallbackName !== currentUser?.id ? fallbackName : "") ||
    (isSuperAdmin ? "Platform Admin" : "Recruiter");

  const userInitials = (() => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return "R";
  })();

  const userEmail = currentUser?.email || "recruiter@talentmatch.internal";

  return (
    <aside className="flex h-full w-64 select-none flex-col justify-between overflow-hidden px-3 py-4 text-foreground">
      {/* Top Section: Brand Header, Quick Action & Navigation */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-5 flex h-10 items-center px-2">
          <Link
            href={isSuperAdmin ? "/admin?view=system" : "/admin?view=dashboard"}
            onClick={() => onCloseMobile && onCloseMobile()}
            className="group flex items-center gap-2.5"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-2xs transition-colors group-hover:bg-primary/90">
              TM
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none tracking-tight text-foreground transition-colors group-hover:text-primary">
                TalentMatch
              </span>
              <span className="mt-1 text-sm font-medium leading-none text-muted-foreground">
                {isSuperAdmin ? "Admin Console" : "Recruiter Workspace"}
              </span>
            </div>
          </Link>
        </div>

        {!isSuperAdmin ? (
          <div className="mb-5 flex items-center gap-2 px-1">
            <Button
              type="button"
              onClick={() => setIsCreateJobOpen(true)}
              className="h-10 flex-1"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Post New Job</span>
            </Button>

            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-card shadow-xs">
              <NotificationBell
                role={currentUser?.role || "recruiter"}
                userId={currentUser?.id || null}
              />
            </div>
          </div>
        ) : null}

        <nav className="space-y-1 px-1" aria-label="Recruiter workspace navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                variant="ghost"
                key={item.id}
                type="button"
                aria-current={item.isActive ? "page" : undefined}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full justify-between px-3 text-sm font-semibold",
                  item.isActive
                    ? "bg-card text-foreground shadow-xs hover:bg-card hover:text-foreground"
                    : "text-muted-foreground hover:bg-card/80 hover:text-foreground"
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      item.isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </span>

                {item.badge !== null ? (
                  <Badge
                    variant={item.isActive ? "secondary" : "outline"}
                    className={cn(
                      "shrink-0 px-2 py-0.5 tabular-nums",
                      !item.isActive && "border-border/80 bg-card/70 text-muted-foreground"
                    )}
                  >
                    {item.badge}
                  </Badge>
                ) : null}
              </Button>
            );
          })}
        </nav>

        {!isSuperAdmin ? (
          <div className="mt-5 px-1">
            <div
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors",
                anonymize
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
              )}
            >
              <label
                htmlFor="sidebar-anonymous-review"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
              >
                <Shield
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0",
                    anonymize ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold leading-tight text-foreground">
                    Anonymous Review
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-normal text-muted-foreground">
                    {anonymize ? "Names hidden" : "Names visible"}
                  </span>
                </span>
              </label>

              <Switch
                id="sidebar-anonymous-review"
                checked={anonymize}
                onCheckedChange={setAnonymize}
                aria-label="Anonymous review"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Section: Canonical DropdownMenu User Profile */}
      <div className="px-1 pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              type="button"
              className="h-auto w-full justify-start gap-2.5 bg-card/80 p-2 text-left shadow-xs hover:bg-card data-[state=open]:bg-card"
              aria-label="User profile and session options"
            >
              <Avatar className="size-8 shrink-0 border border-primary/15 bg-secondary text-secondary-foreground">
                <AvatarFallback className="bg-secondary text-sm font-bold text-secondary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </span>
                <span className="mt-0.5 truncate text-sm text-muted-foreground">
                  {userEmail}
                </span>
              </span>
              <MoreVertical
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="start"
            className="w-60 rounded-2xl p-1.5 shadow-lg"
          >
            <DropdownMenuLabel className="space-y-1 px-2.5 py-2 font-normal">
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>
              <p className="truncate text-sm text-muted-foreground">{userEmail}</p>
              <div className="pt-1">
                <Badge variant="secondary">
                  {isSuperAdmin ? "Platform Admin" : "Hiring Team"}
                </Badge>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => void handleLogout()}
              className="cursor-pointer rounded-xl font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
