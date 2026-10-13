"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { RecruiterPortal } from "@/components/recruiter/RecruiterPortal";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi } from "@/lib/api";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface RecruiterUserInfo {
  id: string;
  email?: string;
  name: string;
  role: string;
  company?: string;
}

export default function AdminRecruiterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [currentUser, setCurrentUser] = useState<RecruiterUserInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [anonymize, setAnonymize] = useState<boolean>(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check Supabase session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/recruiter/login?next=/admin");
          return;
        }

        const role = user.user_metadata?.role;
        if (role === "applicant") {
          router.replace("/careers?error=recruiter_only");
          return;
        }

        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Recruiter",
          role: role || "recruiter",
          company: user.user_metadata?.company || "Talent Operations",
        });
      } catch (err) {
        console.error("Auth check failed:", err);
        router.replace("/recruiter/login");
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [router, supabase]);

  const loadData = async () => {
    try {
      const cachedJobs = sessionStorage.getItem("tm_cached_jobs");
      const cachedApps = sessionStorage.getItem("tm_cached_apps");
      if (cachedJobs) setJobs(JSON.parse(cachedJobs));
      if (cachedApps) setApplications(JSON.parse(cachedApps));
      if (cachedJobs || cachedApps) setLoading(false);
    } catch {}

    try {
      const [jobsData, appsData] = await Promise.all([
        fetchApi<Job[]>("/jobs/"),
        fetchApi<Application[]>("/applications/"),
      ]);

      setJobs(jobsData);
      setApplications(appsData);
      try {
        sessionStorage.setItem("tm_cached_jobs", JSON.stringify(jobsData));
        sessionStorage.setItem("tm_cached_apps", JSON.stringify(appsData));
      } catch {}
      setBackendOnline(true);
      setLoading(false);
    } catch (err) {
      console.error("Data load error:", err);
      setBackendOnline(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        void loadData();
      }, 0);
      const interval = setInterval(loadData, 15000);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      await fetchApi("/auth/logout/", { method: "POST" });
    } catch {}
    try {
      localStorage.removeItem("talentmatch_recruiter_user");
      localStorage.removeItem("talentmatch_recruiter_token");
      localStorage.removeItem("talentmatch_token");
      localStorage.removeItem("talentmatch_user");
      sessionStorage.removeItem("tm_cached_apps");
      sessionStorage.removeItem("tm_cached_jobs");
    } catch {}
    setCurrentUser(null);
    router.replace("/recruiter/login");
    router.refresh();
  };

  const handleApplicationUpdated = (updatedApp: Application) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updatedApp.id ? updatedApp : app))
    );
  };

  const handleJobCreated = (newJob: Job) => {
    setJobs((prev) => [newJob, ...prev]);
  };

  const handleJobUpdated = (updatedJob: Job) => {
    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
  };

  const handleJobDeleted = (jobId: number) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setApplications((prev) => prev.filter((a) => a.job !== jobId));
  };

  const handleJobArchived = (jobId: number) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setApplications((prev) => prev.filter((a) => a.job !== jobId));
  };

  if (!authChecked || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Verifying recruiter authorization...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navigation
        anonymize={anonymize}
        onToggleAnonymize={setAnonymize}
        backendOnline={backendOnline}
      />

      <main className="flex-1">
        {/* Authenticated Recruiter Header Bar */}
        <div className="border-b border-border bg-card/60 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 py-0.5 font-medium border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Recruiter Workspace
              </Badge>
              <span className="text-foreground font-semibold">{currentUser.name}</span>
              <span className="text-muted-foreground font-mono text-[11px]">({currentUser.email})</span>
              {currentUser.company && (
                <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                  {currentUser.company}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
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
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Loading Recruiter Management Studio...</div>
          </div>
        ) : (
          <RecruiterPortal
            jobs={jobs}
            applications={applications}
            anonymize={anonymize}
            onJobCreated={handleJobCreated}
            onJobUpdated={handleJobUpdated}
            onJobDeleted={handleJobDeleted}
            onJobArchived={handleJobArchived}
            onRefreshData={loadData}
            onApplicationUpdated={handleApplicationUpdated}
          />
        )}
      </main>

      <footer className="border-t border-border bg-background py-4 text-xs text-muted-foreground text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TalentMatch Recruiter Admin · Job Profiles & AI Candidate Ranking</span>
          <span>Demographic Bias Reduction & Explainable AI Verification</span>
        </div>
      </footer>
    </div>
  );
}
