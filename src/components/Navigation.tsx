"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, UserCheck, Briefcase, Shield, Sun, Moon, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
  const router = useRouter();
  const isRecruiter = pathname.startsWith("/admin") || pathname.startsWith("/recruiter");
  const isCareers = pathname.startsWith("/careers");
  const [isDark, setIsDark] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("talentmatch_theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialDark = saved ? saved === "dark" : prefersDark;
      if (initialDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      requestAnimationFrame(() => setIsDark(initialDark));
    } catch {}
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setRole(currentUser?.user_metadata?.role || null);
    };

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setRole(session?.user?.user_metadata?.role || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("talentmatch_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("talentmatch_theme", "light");
      }
    } catch {}
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.removeItem("talentmatch_recruiter_user");
      localStorage.removeItem("talentmatch_recruiter_token");
      localStorage.removeItem("talentmatch_token");
      localStorage.removeItem("talentmatch_user");
      sessionStorage.removeItem("tm_cached_apps");
      sessionStorage.removeItem("tm_cached_jobs");
    } catch {}
    setUser(null);
    setRole(null);
    if (isRecruiter) {
      router.push("/recruiter/login");
    } else {
      router.push("/applicant/login");
    }
    router.refresh();
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-foreground">
              TalentMatch
            </span>
            <Badge variant="outline" className="hidden sm:inline-flex text-xs font-normal">
              AI Engine
            </Badge>
          </div>
        </Link>

        {/* Portal Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Anonymize Toggle for Recruiters */}
          {isRecruiter && onToggleAnonymize && (
            <Button
              variant={anonymize ? "secondary" : "outline"}
              size="sm"
              onClick={() => onToggleAnonymize(!anonymize)}
              className="text-xs sm:text-sm font-medium gap-1.5 h-9"
              title="Toggle Candidate Anonymization (Demographic Bias Reduction)"
            >
              <Shield className={`h-4 w-4 ${anonymize ? "text-primary" : "text-muted-foreground"}`} />
              <span className="hidden md:inline">Anonymized View:</span>
              <span className="font-bold">{anonymize ? "ON" : "OFF"}</span>
            </Button>
          )}

          {/* Role-Aware Navigation Links */}
          <nav className="flex items-center rounded-xl border border-border p-1 bg-muted/50">
            {/* If Recruiter logged in */}
            {role === "recruiter" || role === "superadmin" ? (
              <Link
                href="/admin"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isRecruiter
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="h-4 w-4 text-primary" />
                <span>Recruiter Portal</span>
              </Link>
            ) : role === "applicant" ? (
              /* If Applicant logged in */
              <Link
                href="/careers"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isCareers
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserCheck className="h-4 w-4 text-primary" />
                <span>Careers & My Applications</span>
              </Link>
            ) : (
              /* If Guest / Unauthenticated */
              <>
                <Link
                  href="/careers"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isCareers
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Careers</span>
                </Link>

                <Link
                  href="/applicant/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Applicant Login</span>
                </Link>

                <Link
                  href="/recruiter/login"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Recruiter Portal</span>
                </Link>
              </>
            )}
          </nav>

          {/* User Status / Logout when Authenticated */}
          {user && (
            <div className="flex items-center gap-2 pl-1 border-l border-border/80">
              <Badge
                variant={role === "recruiter" ? "default" : "secondary"}
                className="hidden md:inline-flex text-xs font-medium capitalize"
              >
                {role || "User"}
              </Badge>

              <span className="hidden lg:inline text-xs font-medium text-muted-foreground max-w-[120px] truncate" title={user.email}>
                {displayName}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                title="Sign Out"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}

          {/* Notifications Bell */}
          {user && (
            <NotificationBell role={role} userId={user?.id || null} />
          )}

          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
            className="text-muted-foreground hover:text-foreground h-9 w-9"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* API Health Status Indicator */}
          <div className="hidden xl:flex items-center gap-2 pl-1 text-xs text-muted-foreground">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                backendOnline ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span className="font-medium">{backendOnline ? "Live" : "Offline"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
