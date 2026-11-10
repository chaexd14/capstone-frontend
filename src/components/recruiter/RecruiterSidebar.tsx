"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen]);

  const activeView = searchParams.get("view") || "dashboard";
  const isSuperAdmin = currentUser?.role === "superadmin";
  const isJobDetail = pathname.startsWith("/admin/jobs/");

  const activeJobsCount = jobs.filter(
    (j) => j.status === "PUBLISHED" || (!j.status && j.status !== "CLOSED")
  ).length;

  const navItems = isSuperAdmin ? [{
    id: "platform",
    label: "Companies & staff",
    icon: Building2,
    href: "/admin?view=platform",
    isActive: true,
    badge: null,
  }] : [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/admin?view=dashboard",
      isActive: !isJobDetail && activeView === "dashboard",
      badge: null,
    },
    {
      id: "jobs",
      label: "Job Requisitions",
      icon: Briefcase,
      href: "/admin?view=jobs",
      isActive: isJobDetail || activeView === "jobs",
      badge: activeJobsCount,
    },
    {
      id: "applicants",
      label: "Candidate Applications",
      icon: Users,
      href: "/admin?view=applicants",
      isActive: !isJobDetail && activeView === "applicants",
      badge: applications.length,
    },
  ];

  const handleNavClick = (href: string) => {
    router.push(href);
    if (onCloseMobile) onCloseMobile();
  };

  const displayName = currentUser?.name || currentUser?.email?.split("@")[0] || "Recruiter";
  const userInitial = displayName.charAt(0).toUpperCase();
  const userEmail = currentUser?.email || "recruiter@talentmatch.internal";

  return (
    <aside className="w-64 h-full flex flex-col justify-between py-3.5 px-2 select-none overflow-hidden text-slate-800">
      {/* Top Section: Brand Logo, Quick Create CTA & Nav */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        {/* Brand Header */}
        <div className="h-10 flex items-center px-2 mb-3">
          <Link
            href={isSuperAdmin ? "/admin?view=platform" : "/admin?view=dashboard"}
            onClick={() => onCloseMobile && onCloseMobile()}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#2196F3] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-[#1976D2] transition-colors">
              TM
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-slate-900 group-hover:text-[#2196F3] transition-colors leading-none">
                TalentMatch
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                {isSuperAdmin ? "Super Admin" : "Recruiter Studio"}
              </span>
            </div>
          </Link>
        </div>

        {!isSuperAdmin && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <button
              type="button"
              onClick={() => setIsCreateJobOpen(true)}
              className="flex-1 h-9.5 bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold text-xs rounded-xl shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Job</span>
            </button>

            <div className="h-9.5 w-9.5 rounded-xl border border-slate-200/90 bg-white hover:bg-blue-50/50 hover:border-blue-200 flex items-center justify-center shrink-0 shadow-2xs transition-colors">
              <NotificationBell
                role={currentUser?.role || "recruiter"}
                userId={currentUser?.id || null}
              />
            </div>
          </div>
        )}

        {/* Primary Workspace Navigation */}
        <nav className="space-y-1 px-1" aria-label="Recruiter Studio Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.href)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  item.isActive
                    ? "bg-white text-slate-900 shadow-2xs border-slate-200/90"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70 hover:border-slate-200/60 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      item.isActive ? "text-[#2196F3]" : "text-slate-500"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded-full font-bold tabular-nums shrink-0 ${
                      item.isActive
                        ? "bg-blue-50 text-[#1976D2] border border-blue-200/70"
                        : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {!isSuperAdmin && (
          <div className="mt-6 px-1 space-y-1.5">
            <div className="px-3 pb-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Workspace Settings
              </span>
            </div>

            {/* Demographic Masking Toggle */}
            <button
              type="button"
              onClick={() => setAnonymize(!anonymize)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                anonymize
                  ? "bg-white text-[#1976D2] font-semibold border-blue-200/80 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/70 border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className={`w-4 h-4 ${anonymize ? "text-[#2196F3]" : "text-slate-500"}`} />
                <div className="text-left">
                  <span className="block leading-none">Blind Screening</span>
                  <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                    {anonymize ? "PII masked for fair review" : "Candidate names visible"}
                  </span>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                  anonymize ? "bg-[#2196F3]" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform transform ${
                    anonymize ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Section: User Profile Pill */}
      <div className="px-1 pt-2 relative" ref={userMenuRef}>
        {/* User Popover Menu */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-1 right-1 mb-2 p-1.5 bg-white rounded-2xl border border-slate-200/90 shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-100 text-xs">
            <div className="px-3 py-2.5 border-b border-slate-100">
              <div className="font-bold text-slate-900 truncate">{displayName}</div>
              <div className="text-[11px] text-slate-400 font-mono truncate">{userEmail}</div>
              <div className="mt-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#1976D2] border border-blue-100">
                  {isSuperAdmin ? "Platform Administrator" : "Hiring Team Recruiter"}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  void handleLogout();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}

        {/* User Pill Button */}
        <button
          type="button"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer text-left border ${
            userMenuOpen
              ? "bg-white border-slate-200/90 shadow-2xs"
              : "bg-white/70 hover:bg-white border-slate-200/70 shadow-2xs"
          }`}
          aria-label="User profile and session options"
          aria-expanded={userMenuOpen}
        >
          <Avatar className="h-8 w-8 rounded-full border border-blue-100 bg-blue-50 text-[#1976D2] shrink-0">
            <AvatarFallback className="rounded-full font-bold text-xs bg-blue-50 text-[#1976D2]">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1 leading-tight">
            <span className="text-xs font-bold text-slate-900 truncate">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-400 truncate mt-0.5">
              {userEmail}
            </span>
          </div>
          <MoreVertical className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </div>
    </aside>
  );
}
