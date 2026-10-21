"use client";

import React from "react";
import { Menu } from "lucide-react";

interface RecruiterTopBarProps {
  onOpenMobileMenu: () => void;
  jobTitle?: string;
}

export function RecruiterTopBar({ onOpenMobileMenu }: RecruiterTopBarProps) {
  return (
    <header className="md:hidden flex h-12 items-center justify-between border-b border-slate-100 px-4 bg-white shrink-0">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-[#2196F3] text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
          TM
        </div>
        <span className="font-bold text-xs tracking-tight text-slate-900">
          TalentMatch
        </span>
      </div>

      <div className="w-6" role="presentation" />
    </header>
  );
}
