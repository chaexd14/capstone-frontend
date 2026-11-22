"use client";

import React from "react";
import { Menu } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRecruiter } from "@/context/RecruiterContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { IconButton } from "@/components/ui/icon-button";

interface RecruiterTopBarProps {
  onOpenMobileMenu: () => void;
  jobTitle?: string;
}

export function RecruiterTopBar({ onOpenMobileMenu }: RecruiterTopBarProps) {
  const searchParams = useSearchParams();
  const { currentUser } = useRecruiter();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    jobs: "Jobs",
    applicants: "Applicants",
    pipeline: "Hiring Pipeline",
    tasks: "Follow-up Tasks",
    "talent-pool": "Talent Pool",
    templates: "Message Templates",
    platform: "Companies & Team",
    system: "System Health",
  };

  const title = labels[searchParams.get("view") || "dashboard"] || "Recruiter Workspace";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-card px-3 md:hidden">
      <IconButton
        variant="ghost"
        size="icon"
        type="button"
        onClick={onOpenMobileMenu}
        label="Open navigation menu"
        className="-ml-1 text-muted-foreground hover:text-foreground"
      >
        <Menu className="size-5" aria-hidden="true" />
      </IconButton>

      <div className="min-w-0 flex-1 px-2">
        <p className="truncate text-sm font-bold tracking-tight text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin ? "TalentMatch Admin" : "TalentMatch Recruiter"}
        </p>
      </div>

      <NotificationBell
        role={currentUser?.role || "recruiter"}
        userId={currentUser?.id || null}
      />
    </header>
  );
}
