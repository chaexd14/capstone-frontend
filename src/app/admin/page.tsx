"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { RecruiterPortal } from "@/components/recruiter/RecruiterPortal";
import { RecruiterLogin, RecruiterUser } from "@/components/recruiter/RecruiterLogin";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi } from "@/lib/api";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminRecruiterPage() {
  const [currentUser, setCurrentUser] = useState<RecruiterUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [anonymize, setAnonymize] = useState<boolean>(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem("talentmatch_recruiter_user");
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        }
      } catch {
        // ignore
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  const loadData = async () => {
    try {
      const cachedJobs = sessionStorage.getItem("tm_cached_jobs");
      const cachedApps = sessionStorage.getItem("tm_cached_apps");
      if (cachedJobs) setJobs(JSON.parse(cachedJobs));
      if (cachedApps) setApplications(JSON.parse(cachedApps));
      if (cachedJobs || cachedApps) setLoading(false);
    } catch {}

    try {
      const jobsData = await fetchApi<Job[]>("/jobs/");
      setJobs(jobsData);
      try { sessionStorage.setItem("tm_cached_jobs", JSON.stringify(jobsData)); } catch {}
      setBackendOnline(true);
      setLoading(false);

      const appsData = await fetchApi<Application[]>("/applications/");
      setApplications(appsData);
      try { sessionStorage.setItem("tm_cached_apps", JSON.stringify(appsData)); } catch {}
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

  const handleLoginSuccess = (user: RecruiterUser) => {
    setCurrentUser(user);
    loadData();
  };

  const handleLogout = async () => {
    try {
      await fetchApi("/auth/logout/", { method: "POST" });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("talentmatch_recruiter_user");
      localStorage.removeItem("talentmatch_recruiter_token");
      setCurrentUser(null);
    }
  };

  const handleApplicationUpdated = (updatedApp: Application) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updatedApp.id ? updatedApp : app))
    );
  };

  const handleJobCreated = (newJob: Job) => {
    setJobs((prev) => [newJob, ...prev]);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

      {/* Recruiter Auth Guard */}
      {!currentUser ? (
        <main className="flex-1 flex flex-col justify-center">
          <RecruiterLogin onLoginSuccess={handleLoginSuccess} />
        </main>
      ) : (
        <main className="flex-1">
          {/* Authenticated Recruiter Header Bar */}
          <div className="border-b border-border bg-card/50 px-4 sm:px-6 lg:px-8 py-2">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="gap-1.5 py-0.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Recruiter Workspace
                </Badge>
                <span className="text-foreground font-semibold">{currentUser.name}</span>
                <span className="text-muted-foreground font-mono text-[11px]">({currentUser.email})</span>
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
              onApplicationUpdated={handleApplicationUpdated}
            />
          )}
        </main>
      )}

      <footer className="border-t border-border bg-background py-4 text-xs text-muted-foreground text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TalentMatch Recruiter Admin · Job Profiles & AI Candidate Ranking</span>
          <span>Demographic Bias Reduction & Explainable AI Verification</span>
        </div>
      </footer>
    </div>
  );
}
