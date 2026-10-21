"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export interface RecruiterHeaderUserInfo {
  id: string;
  email?: string;
  name: string;
  role: string;
  company?: string;
}

interface NavigationProps {
  anonymize?: boolean;
  onToggleAnonymize?: (val: boolean) => void;
  backendOnline: boolean;
  currentUser?: RecruiterHeaderUserInfo | null;
  onLogout?: () => void;
}

export function Navigation({
  anonymize = false,
  onToggleAnonymize,
  backendOnline,
  currentUser,
  onLogout,
}: NavigationProps) {
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setOpenUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ensure application remains consistently in light mode and remove any legacy theme selection
  useEffect(() => {
    try {
      document.documentElement.classList.remove("dark");
      localStorage.removeItem("talentmatch_theme");
    } catch { }
  }, []);

  const displayName = currentUser?.name || currentUser?.email?.split("@")[0] || "Recruiter";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Canonical TM Brand Badge & Recruiter Identity */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#2196F3] text-white font-bold text-sm flex items-center justify-center tracking-tight shadow-2xs transition-transform group-hover:scale-105">
              TM
            </div>
            <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-[#2196F3] transition-colors leading-none">
              TalentMatch
            </span>
          </Link>

          <div className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#1976D2] border border-blue-100">
            Recruiter Studio
          </div>
        </div>

        {/* Right: Anonymize Toggle + Switch Portal + NotificationBell + User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Anonymize Toggle for Recruiters */}
          {onToggleAnonymize && (
            <button
              type="button"
              onClick={() => onToggleAnonymize(!anonymize)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${anonymize
                ? "bg-blue-50 border-blue-200 text-[#1976D2] hover:bg-blue-100/70"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              title="Toggle Candidate Demographic Anonymization"
              aria-label="Toggle Demographic Blind Screening"
            >
              <Shield className={`w-3.5 h-3.5 ${anonymize ? "text-[#2196F3]" : "text-slate-400"}`} />
              <span className="hidden md:inline">Demographics Masked:</span>
              <span className={`font-mono font-bold ${anonymize ? "text-[#1976D2]" : "text-slate-500"}`}>
                {anonymize ? "ON" : "OFF"}
              </span>
            </button>
          )}

          {/* Switch to Applicant Portal Link */}
          <Link
            href="/careers"
            className="hidden lg:inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Applicant Portal
          </Link>

          {/* Reusable Notification Bell */}
          {currentUser && (
            <NotificationBell role="recruiter" userId={currentUser.id} />
          )}

          {/* Recruiter Avatar Dropdown Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setOpenUserMenu(!openUserMenu)}
              aria-expanded={openUserMenu}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer select-none min-h-[40px] min-w-[40px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3]"
              aria-label="Recruiter account menu"
            >
              <Avatar className="w-8 h-8 border border-slate-200 shadow-2xs">
                <AvatarFallback className="bg-[#2196F3] text-white font-bold text-xs">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openUserMenu ? "rotate-180" : ""
                  }`}
              />
            </button>

            {openUserMenu && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-2"
              >
                <div className="p-3 bg-slate-50/80 rounded-xl space-y-1 border border-slate-100">
                  <div className="font-bold text-sm text-slate-900 truncate">{displayName}</div>
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {currentUser?.email || "Recruiter Account"}
                  </div>
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center text-[11px] font-semibold text-[#1976D2] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {currentUser?.role === "superadmin" ? "Superadmin" : "Recruiter"}
                    </span>
                    {currentUser?.company && (
                      <span className="text-[11px] font-medium text-slate-500 truncate" title={currentUser.company}>
                        {currentUser.company}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-1 space-y-0.5 text-xs">
                  <Link
                    role="menuitem"
                    href="/careers"
                    className="w-full text-left px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 block"
                  >
                    Switch to Applicant Portal
                  </Link>
                  <Link
                    role="menuitem"
                    href="/"
                    className="w-full text-left px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 block"
                  >
                    TalentMatch Home
                  </Link>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setOpenUserMenu(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full px-3 py-2 rounded-lg font-semibold text-xs text-rose-600 hover:bg-rose-50 text-left transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
