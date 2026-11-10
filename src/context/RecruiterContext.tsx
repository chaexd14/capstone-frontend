"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { ApiError, clearResumeBlobCache, fetchApi } from "@/lib/api";
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

  const clearRecruiterStorage = useCallback(() => {
    try {
      clearResumeBlobCache();
      sessionStorage.removeItem("tm_cached_apps");
      sessionStorage.removeItem("tm_cached_jobs");
      localStorage.removeItem("talentmatch_recruiter_user");
      localStorage.removeItem("talentmatch_recruiter_token");
    } catch {}
  }, []);

  // Check Supabase session on mount and verify authoritative role with backend
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          clearRecruiterStorage();
          router.replace("/recruiter/login?next=/admin");
          return;
        }

        // Authoritatively verify role with Django backend
        const meData = await fetchApi<{
          user: { role: string; email?: string; name?: string };
        }>("/auth/me/");

        const verifiedRole = meData?.user?.role?.toLowerCase();

        // Fail-closed authorization boundary: only authorized recruiters or superadmins allowed
        if (verifiedRole !== "recruiter" && verifiedRole !== "superadmin") {
          clearRecruiterStorage();
          router.replace("/careers?error=recruiter_only");
          return;
        }

        clearRecruiterStorage();
        setCurrentUser({
          id: user.id,
          email: meData?.user?.email || user.email,
          name: meData?.user?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Recruiter",
          role: verifiedRole,
          company: user.user_metadata?.company || "Talent Operations",
        });
      } catch (err) {
        console.error("Auth check failed:", err);
        clearRecruiterStorage();
        if (err instanceof ApiError && err.status === 401) {
          await supabase.auth.signOut({ scope: "local" });
        }
        router.replace("/recruiter/login");
      } finally {
        setAuthChecked(true);
      }
    };
    void checkAuth();
  }, [router, supabase, clearRecruiterStorage]);

  const isPlatformAdmin = currentUser?.role === "superadmin";
  const loadData = useCallback(async () => {
    try {
      if (isPlatformAdmin) {
        await fetchApi("/auth/me/");
        setBackendOnline(true);
        setLoading(false);
        return;
      }
      const [jobsData, appsData] = await Promise.all([
        fetchApi<Job[]>("/jobs/"),
        fetchApi<Application[]>("/applications/"),
      ]);

      setJobs(jobsData);
      setApplications(appsData);
      setBackendOnline(true);
      setLoading(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setJobs([]);
        setApplications([]);
        setCurrentUser(null);
        clearRecruiterStorage();
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/recruiter/login");
      }
      console.error("Data load error:", err);
      setBackendOnline(false);
      setLoading(false);
    }
  }, [clearRecruiterStorage, isPlatformAdmin, router, supabase]);

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
