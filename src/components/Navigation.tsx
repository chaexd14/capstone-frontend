"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, UserCheck, Briefcase, Shield, Home } from "lucide-react";

interface NavigationProps {
  anonymize?: boolean;
  onToggleAnonymize?: (val: boolean) => void;
  backendOnline: boolean;
}

export function Navigation({
  anonymize = false,
  onToggleAnonymize,
  backendOnline,
}: NavigationProps) {
  const pathname = usePathname();
  const isRecruiter = pathname.startsWith("/admin") || pathname.startsWith("/recruiter");
  const isCareers = pathname.startsWith("/careers");
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                TalentMatch
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AI Platform
              </span>
            </div>
          </div>
        </Link>

        {/* Portal Route Navigation */}
        <div className="flex items-center gap-3">
          {/* Anonymize Toggle for Recruiters */}
          {isRecruiter && onToggleAnonymize && (
            <button
              onClick={() => onToggleAnonymize(!anonymize)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                anonymize
                  ? "bg-violet-950/60 border-violet-700/80 text-violet-300 shadow-sm shadow-violet-900/30"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Candidate Anonymization (Bias Reduction)"
            >
              <Shield className="h-3.5 w-3.5 text-violet-400" />
              <span>Anonymized View: {anonymize ? "ON" : "OFF"}</span>
            </button>
          )}

          {/* Route Switcher Links */}
          <nav className="bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <Link
              href="/careers"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isCareers
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Careers / Applicant</span>
            </Link>

            <Link
              href="/admin"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isRecruiter
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Recruiter Admin</span>
            </Link>
          </nav>

          {/* API Health Status Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 pl-2">
            <div
              className={`h-2 w-2 rounded-full ${
                backendOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`}
            />
            <span>{backendOnline ? "API Online" : "API Offline"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
