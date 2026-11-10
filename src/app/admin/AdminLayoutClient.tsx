"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { RecruiterSidebar } from "@/components/recruiter/RecruiterSidebar";
import { RecruiterTopBar } from "@/components/recruiter/RecruiterTopBar";
import { PlatformManagement } from "@/components/recruiter/PlatformManagement";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const { authChecked, currentUser } = useRecruiter();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!authChecked || !currentUser) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#2196F3]" />
        <span className="text-xs text-slate-500 font-mono">Verifying recruiter authorization...</span>
      </div>
    );
  }

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#edf4fc] text-slate-900 flex p-0 md:p-2 md:gap-2 font-sans selection:bg-[#2196F3] selection:text-white">
      {/* Desktop Persistent Sidebar (Pinned Left, 256px, Canvas-Level) */}
      <div className="hidden md:block shrink-0 h-full">
        <RecruiterSidebar />
      </div>

      {/* Mobile Drawer (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-2 w-68 bg-[#edf4fc] border-r border-slate-200/90">
          <RecruiterSidebar onCloseMobile={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Workspace: shadcn sidebar-08 Inset Island Frame */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white md:rounded-2xl md:border md:border-slate-200/90 md:shadow-2xs overflow-hidden">
        <RecruiterTopBar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="max-w-[1600px] w-full mx-auto">
            {currentUser.role === "superadmin" ? <PlatformManagement /> : children}
          </div>
        </main>
      </div>
    </div>
  );
}
