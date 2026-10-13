"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { ApplicantPortal } from "@/components/applicant/ApplicantPortal";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi } from "@/lib/api";
import { Loader2, LogOut, UserCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function CareersPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const cached = sessionStorage.getItem("tm_cached_jobs");
      if (cached) {
        const parsed = JSON.parse(cached);
        requestAnimationFrame(() => {
          setJobs(parsed);
          setLoading(false);
        });
      }
    } catch {}

    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const jobsData = await fetchApi<Job[]>("/jobs/");
      setJobs(jobsData);
      try { sessionStorage.setItem("tm_cached_jobs", JSON.stringify(jobsData)); } catch {}
      setBackendOnline(true);
      setLoading(false);

      if (user) {
        // Authenticated applicant: fetch ONLY their own applications
        const appsData = await fetchApi<Application[]>(`/applications/?user_id=${user.id}`);
        setApplications(appsData);
      } else {
        // Unauthenticated guest: empty applications list
        setApplications([]);
      }
    } catch (err) {
      console.error("Data load error:", err);
      setBackendOnline(false);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    const interval = setInterval(loadData, 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [loadData]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.removeItem("talentmatch_token");
      localStorage.removeItem("talentmatch_user");
      localStorage.removeItem("talentmatch_recruiter_user");
      localStorage.removeItem("talentmatch_recruiter_token");
      sessionStorage.removeItem("tm_cached_apps");
    } catch {}
    setCurrentUser(null);
    setApplications([]);
    router.push("/applicant/login");
    router.refresh();
  };

  const handleApplicationCreated = (newApp: Application) => {
    setApplications((prev) => [newApp, ...prev.filter((a) => a.id !== newApp.id)]);
    loadData();
  };

  const displayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split("@")[0] ||
    "Applicant";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navigation backendOnline={backendOnline} />

      {/* Applicant Session & Logout Bar */}
      <div className="border-b border-border bg-card/60 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {currentUser ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5 py-0.5 font-medium border-primary/40 text-primary bg-primary/5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <UserCheck className="h-3 w-3" />
                  Applicant Account
                </Badge>
                <span className="text-foreground font-semibold">{displayName}</span>
                <span className="text-muted-foreground font-mono text-[11px]">({currentUser.email})</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1.5 px-2.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Viewing as Guest. Sign in to your account to save resumes and track your applications.</span>
              </div>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1.5 px-3">
                <Link href="/applicant/login">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Applicant Sign In</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <main className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Loading open positions...</div>
          </div>
        ) : (
          <ApplicantPortal
            jobs={jobs}
            applications={applications}
            onApplicationCreated={handleApplicationCreated}
          />
        )}
      </main>

      <footer className="border-t border-border bg-background py-4 text-xs text-muted-foreground text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TalentMatch Careers · Verified Universal Job Matching Engine</span>
          <span>Philippine Multi-Industry Benchmark</span>
        </div>
      </footer>
    </div>
  );
}
