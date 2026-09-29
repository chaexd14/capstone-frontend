"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { RecruiterPortal } from "@/components/recruiter/RecruiterPortal";
import { RecruiterLogin, RecruiterUser } from "@/components/recruiter/RecruiterLogin";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi } from "@/lib/api";
import { Loader2, LogOut, ShieldCheck, UserCheck } from "lucide-react";

export default function AdminRecruiterPage() {
  const [currentUser, setCurrentUser] = useState<RecruiterUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [anonymize, setAnonymize] = useState<boolean>(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
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
  }, []);

  const loadData = async () => {
    try {
      await fetchApi("/health/");
      setBackendOnline(true);

      const jobsData = await fetchApi<Job[]>("/jobs/");
      setJobs(jobsData);

      const appsData = await fetchApi<Application[]>("/applications/");
      setApplications(appsData);
    } catch (err) {
      console.error("Data load error:", err);
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px]" />
      </div>

      <Navigation
        anonymize={anonymize}
        onToggleAnonymize={setAnonymize}
        backendOnline={backendOnline}
      />

      {/* Recruiter Auth Guard */}
      {!currentUser ? (
        <main className="flex-1">
          <RecruiterLogin onLoginSuccess={handleLoginSuccess} />
        </main>
      ) : (
        <main className="flex-1">
          {/* Authenticated Recruiter Header Bar */}
          <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Authenticated Recruiter
                </span>
                <span className="text-slate-300 font-semibold">{currentUser.name}</span>
                <span className="text-slate-500 font-mono">({currentUser.email})</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <div className="text-xs text-slate-400">Loading Recruiter Management Studio...</div>
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

      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TalentMatch Recruiter Admin · Job Profiles & AI Candidate Ranking</span>
          <span>Demographic Bias Reduction & Explainable AI Verification</span>
        </div>
      </footer>
    </div>
  );
}
