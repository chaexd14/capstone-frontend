"use client";

import React, { useState } from "react";
import { useRecruiter } from "@/context/RecruiterContext";
import { RecruiterSidebar } from "@/components/recruiter/RecruiterSidebar";
import { RecruiterTopBar } from "@/components/recruiter/RecruiterTopBar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { ResponsiveContent } from "@/components/ui/responsive-content";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const { authChecked, currentUser } = useRecruiter();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!authChecked || !currentUser) {
    return (
      <div className="min-h-screen bg-background text-foreground"><ContextualLoading label="Verifying recruiter access" className="min-h-screen" /></div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Desktop Persistent Sidebar (Pinned Left, 256px, Canvas-Level) */}
      <div className="hidden h-full w-64 shrink-0 md:block">
        <RecruiterSidebar />
      </div>

      {/* Mobile Drawer (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-background p-2">
          <RecruiterSidebar onCloseMobile={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Workspace: shadcn sidebar-08 Inset Island Frame */}
      <div className="m-0 flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-card md:my-2 md:mr-2 md:rounded-2xl md:shadow-sm">
        <RecruiterTopBar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto bg-card px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
          <ResponsiveContent>
            {children}
          </ResponsiveContent>
        </main>
      </div>
    </div>
  );
}
