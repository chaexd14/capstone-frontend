"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Job } from "@/types/job";
import { Application, TeamMember } from "@/types/application";
import { ApiError, clearResumeBlobCache, fetchApi } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export interface RecruiterUserInfo {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name: string;
  role: string;
  company?: string;
}

const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanNameValue(value: unknown, opaqueIds: Array<string | undefined>): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || UUID_LIKE_PATTERN.test(trimmed)) return "";
  if (opaqueIds.some((id) => id && id.trim().toLowerCase() === trimmed.toLowerCase())) {
    return "";
  }
  return trimmed;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function nameFromEmail(email?: string): { firstName: string; lastName: string } {
  if (!email) return { firstName: "", lastName: "" };
  const local = email.split("@")[0]?.trim() || "";
  if (!local || UUID_LIKE_PATTERN.test(local)) return { firstName: "", lastName: "" };
  const tokens = local
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^\d+$/.test(part));
  if (tokens.length === 0) return { firstName: "", lastName: "" };
  const formatted = tokens.map(
    (part) => part.charAt(0).toUpperCase() + part.slice(1)
  );
  if (formatted.length === 1) return { firstName: formatted[0], lastName: "" };
  return { firstName: formatted[0], lastName: formatted.slice(1).join(" ") };
}

interface RecruiterContextValue {
  currentUser: RecruiterUserInfo | null;
  authChecked: boolean;
  anonymize: boolean;
  setAnonymize: (val: boolean) => void;
  jobs: Job[];
  applications: Application[];
  teamMembers: TeamMember[];
  openTasksCount: number;
  overdueTasksCount: number;
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [openTasksCount, setOpenTasksCount] = useState(0);
  const [overdueTasksCount, setOverdueTasksCount] = useState(0);
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
          user: {
            role: string;
            email?: string;
            first_name?: string;
            last_name?: string;
            name?: string;
            username?: string;
            supabase_id?: string;
            company_id?: number | null;
            company_name?: string | null;
          };
        }>("/auth/me/");

        const verifiedRole = meData?.user?.role?.toLowerCase();

        // Fail-closed authorization boundary: only authorized recruiters or superadmins allowed
        if (verifiedRole !== "recruiter" && verifiedRole !== "superadmin") {
          clearRecruiterStorage();
          router.replace("/careers?error=recruiter_only");
          return;
        }

        const resolvedEmail = meData?.user?.email || user.email;
        const opaqueIds = [user.id, meData?.user?.username, meData?.user?.supabase_id];
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

        const backendFirst = cleanNameValue(meData?.user?.first_name, opaqueIds);
        const backendLast = cleanNameValue(meData?.user?.last_name, opaqueIds);
        const metaFirst = cleanNameValue(meta.first_name, opaqueIds);
        const metaLast = cleanNameValue(meta.last_name, opaqueIds);
        const rawFullName =
          cleanNameValue(meData?.user?.name, opaqueIds) ||
          cleanNameValue(meta.full_name, opaqueIds) ||
          cleanNameValue(meta.name, opaqueIds);

        let firstName = backendFirst;
        let lastName = backendLast;

        if (!firstName && !lastName) {
          firstName = metaFirst;
          lastName = metaLast;
        }
        if (!firstName && !lastName && rawFullName) {
          ({ firstName, lastName } = splitFullName(rawFullName));
        }
        if (!firstName && !lastName) {
          ({ firstName, lastName } = nameFromEmail(resolvedEmail));
        }
        if (!firstName && !lastName) {
          if (verifiedRole === "superadmin") {
            firstName = "Platform";
            lastName = "Admin";
          } else {
            firstName = "Recruiter";
            lastName = "";
          }
        }

        const resolvedFullName = [firstName, lastName].filter(Boolean).join(" ");

        clearRecruiterStorage();
        setCurrentUser({
          id: user.id,
          email: resolvedEmail,
          firstName,
          lastName,
          name: resolvedFullName,
          role: verifiedRole,
          company:
            cleanNameValue(meData?.user?.company_name, opaqueIds) ||
            cleanNameValue(meta.company, opaqueIds) ||
            "TalentMatch Recruiting",
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
      const [jobsData, appsData, teamData, tasksSummary] = await Promise.all([
        fetchApi<Job[]>("/jobs/"),
        fetchApi<Application[]>("/applications/"),
        fetchApi<TeamMember[]>("/companies/team/").catch(() => []),
        fetchApi<{ summary: { open: number; overdue: number } }>("/applications/tasks/?status=open").catch(() => null),
      ]);

      setJobs(jobsData);
      setApplications(appsData);
      setTeamMembers(teamData);
      if (tasksSummary?.summary) {
        setOpenTasksCount(tasksSummary.summary.open);
        setOverdueTasksCount(tasksSummary.summary.overdue);
      } else {
        setOpenTasksCount(appsData.reduce((sum, app) => sum + (app.open_task_count || 0), 0));
      }
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
    setJobs((prev) => {
      const exists = prev.some((j) => j.id === updatedJob.id);
      return exists ? prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)) : [updatedJob, ...prev];
    });
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
      teamMembers,
      openTasksCount,
      overdueTasksCount,
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
      teamMembers,
      openTasksCount,
      overdueTasksCount,
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
