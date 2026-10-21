"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export interface RecruiterUserInfo {
  id: string;
  email?: string;
  name: string;
  role: string;
  company?: string;
}

interface RecruiterContextValue {
  currentUser: RecruiterUserInfo | null;
  authChecked: boolean;
  anonymize: boolean;
  setAnonymize: (val: boolean) => void;
  jobs: Job[];
  applications: Application[];
  backendOnline: boolean;
  loading: boolean;
  loadData: () => Promise<void>;
  onJobCreated: (newJob: Job) => void;
  onJobUpdated: (updatedJob: Job) => void;
  onJobDeleted: (jobId: number) => void;
  onJobArchived: (jobId: number) => void;
  onApplicationUpdated: (updatedApp: Application) => void;
  handleLogout: () => Promise<void>;
  isCreateJobOpen: boolean;
  setIsCreateJobOpen: (open: boolean) => void;
}

const RecruiterContext = createContext<RecruiterContextValue | undefined>(undefined);

export function RecruiterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [currentUser, setCurrentUser] = useState<RecruiterUserInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [anonymize, setAnonymize] = useState<boolean>(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);

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
    void checkAuth();
  }, [router, supabase]);

  const loadData = useCallback(async () => {
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
  }, []);

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
  }, [currentUser, loadData]);

  const handleLogout = useCallback(async () => {
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
  }, [router, supabase]);

  const onJobCreated = useCallback((newJob: Job) => {
    setJobs((prev) => [newJob, ...prev]);
  }, []);

  const onJobUpdated = useCallback((updatedJob: Job) => {
    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
  }, []);

  const onJobDeleted = useCallback((jobId: number) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setApplications((prev) => prev.filter((a) => a.job !== jobId));
  }, []);

  const onJobArchived = useCallback((jobId: number) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setApplications((prev) => prev.filter((a) => a.job !== jobId));
  }, []);

  const onApplicationUpdated = useCallback((updatedApp: Application) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updatedApp.id ? updatedApp : app))
    );
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      authChecked,
      anonymize,
      setAnonymize,
      jobs,
      applications,
      backendOnline,
      loading,
      loadData,
      onJobCreated,
      onJobUpdated,
      onJobDeleted,
      onJobArchived,
      onApplicationUpdated,
      handleLogout,
      isCreateJobOpen,
      setIsCreateJobOpen,
    }),
    [
      currentUser,
      authChecked,
      anonymize,
      jobs,
      applications,
      backendOnline,
      loading,
      loadData,
      onJobCreated,
      onJobUpdated,
      onJobDeleted,
      onJobArchived,
      onApplicationUpdated,
      handleLogout,
      isCreateJobOpen,
    ]
  );

  return <RecruiterContext.Provider value={value}>{children}</RecruiterContext.Provider>;
}

export function useRecruiter(): RecruiterContextValue {
  const ctx = useContext(RecruiterContext);
  if (!ctx) {
    throw new Error("useRecruiter must be used within a RecruiterProvider");
  }
  return ctx;
}
