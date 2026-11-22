"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { Job } from "@/types/job";
import {
  Application,
  ApplicationStatus,
  RejectionReason,
  TeamMember,
} from "@/types/application";
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

export interface CompactApplicationPatch {
  id: number;
  status?: ApplicationStatus;
  rejection_reason?: RejectionReason | "";
  rejection_note?: string;
  tags?: string[];
  updated_at?: string;
  latest_activity_at?: string | null;
}

export interface StatusUpdateOptions {
  reason?: RejectionReason | "";
  note?: string;
}

export type JobLifecycleAction = "close" | "reopen" | "archive" | "delete-draft";

const POLL_INTERVAL_MS = 30_000;
const VISIBILITY_REFRESH_MIN_GAP_MS = 10_000;

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
  pendingApplicationIds: Set<number>;
  backendOnline: boolean;
  loading: boolean;
  loadData: () => Promise<void>;
  onJobCreated: (newJob: Job) => void;
  onJobUpdated: (updatedJob: Job) => void;
  onJobArchived: (jobId: number) => void;
  onApplicationUpdated: (updatedApp: Application) => void;
  mergeApplicationPatch: (appId: number, patch: Partial<Application>) => void;
  updateApplicationStatus: (
    app: Application,
    newStatus: ApplicationStatus,
    options?: StatusUpdateOptions
  ) => Promise<Application>;
  bulkUpdateApplicationStatus: (
    applicationIds: number[],
    newStatus: ApplicationStatus,
    options?: StatusUpdateOptions
  ) => Promise<number>;
  updateJobStatusOptimistic: (
    job: Job,
    action: JobLifecycleAction
  ) => Promise<Job | null>;
  adjustTaskCounts: (openDelta: number, overdueDelta?: number) => void;
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
  const [pendingApplicationIds, setPendingApplicationIds] = useState<Set<number>>(new Set());

  const applicationsRef = useRef<Application[]>([]);
  const jobsRef = useRef<Job[]>([]);
  const mutationEpochRef = useRef(0);
  const loadSeqRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);
  const lastLoadCompletedAtRef = useRef(0);
  const teamLoadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

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
  const currentUserId = currentUser?.id ?? null;

  const loadData = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    const startEpoch = mutationEpochRef.current;
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    try {
      if (isPlatformAdmin) {
        await fetchApi("/auth/me/", { signal: controller.signal });
        if (controller.signal.aborted || seq !== loadSeqRef.current) return;
        setBackendOnline(true);
        setLoading(false);
        lastLoadCompletedAtRef.current = Date.now();
        return;
      }

      const shouldFetchTeam = Boolean(currentUserId && teamLoadedForUserRef.current !== currentUserId);
      const [jobsData, appsData, teamData, tasksSummary] = await Promise.all([
        fetchApi<Job[]>("/jobs/", { signal: controller.signal }),
        fetchApi<Application[]>("/applications/", { signal: controller.signal }),
        shouldFetchTeam
          ? fetchApi<TeamMember[]>("/companies/team/", { signal: controller.signal }).catch(() => null)
          : Promise.resolve(null),
        fetchApi<{ summary: { open: number; overdue: number } }>(
          "/applications/tasks/?status=open",
          { signal: controller.signal }
        ).catch(() => null),
      ]);

      // Discard stale poll responses if a newer load started or a local optimistic mutation occurred mid-flight
      if (
        controller.signal.aborted ||
        seq !== loadSeqRef.current ||
        startEpoch !== mutationEpochRef.current
      ) {
        return;
      }

      setJobs(jobsData);
      setApplications(appsData);
      if (shouldFetchTeam && teamData !== null) {
        setTeamMembers(teamData);
        teamLoadedForUserRef.current = currentUserId;
      }
      if (tasksSummary?.summary) {
        setOpenTasksCount(tasksSummary.summary.open);
        setOverdueTasksCount(tasksSummary.summary.overdue);
      } else {
        setOpenTasksCount(appsData.reduce((sum, app) => sum + (app.open_task_count || 0), 0));
      }
      setBackendOnline(true);
      setLoading(false);
      lastLoadCompletedAtRef.current = Date.now();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (controller.signal.aborted || seq !== loadSeqRef.current) {
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        setJobs([]);
        setApplications([]);
        setCurrentUser(null);
        teamLoadedForUserRef.current = null;
        clearRecruiterStorage();
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/recruiter/login");
      }
      console.error("Data load error:", err);
      setBackendOnline(false);
      setLoading(false);
    }
  }, [clearRecruiterStorage, currentUserId, isPlatformAdmin, router, supabase]);

  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void loadData();
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastLoadCompletedAtRef.current;
        if (elapsed >= VISIBILITY_REFRESH_MIN_GAP_MS) {
          void loadData();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      loadAbortRef.current?.abort();
    };
  }, [currentUser, loadData]);

  const handleLogout = useCallback(async () => {
    loadAbortRef.current?.abort();
    teamLoadedForUserRef.current = null;
    clearRecruiterStorage();
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
  }, [clearRecruiterStorage, router, supabase]);

  const onJobCreated = useCallback((newJob: Job) => {
    mutationEpochRef.current += 1;
    setJobs((prev) => [newJob, ...prev]);
  }, []);

  const onJobUpdated = useCallback((updatedJob: Job) => {
    mutationEpochRef.current += 1;
    setJobs((prev) => {
      const exists = prev.some((j) => j.id === updatedJob.id);
      return exists ? prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)) : [updatedJob, ...prev];
    });
  }, []);

  const onJobArchived = useCallback((jobId: number) => {
    mutationEpochRef.current += 1;
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setApplications((prev) => prev.filter((a) => a.job !== jobId));
  }, []);

  const onApplicationUpdated = useCallback((updatedApp: Application) => {
    mutationEpochRef.current += 1;
    setApplications((prev) =>
      prev.map((app) =>
        app.id === updatedApp.id
          ? {
              ...app,
              ...updatedApp,
              resume: updatedApp.resume ?? app.resume,
              match_result: updatedApp.match_result ?? app.match_result,
            }
          : app
      )
    );
  }, []);

  const mergeApplicationPatch = useCallback((appId: number, patch: Partial<Application>) => {
    mutationEpochRef.current += 1;
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, ...patch } : app))
    );
  }, []);

  const adjustTaskCounts = useCallback((openDelta: number, overdueDelta = 0) => {
    mutationEpochRef.current += 1;
    if (openDelta !== 0) {
      setOpenTasksCount((prev) => Math.max(0, prev + openDelta));
    }
    if (overdueDelta !== 0) {
      setOverdueTasksCount((prev) => Math.max(0, prev + overdueDelta));
    }
  }, []);

  const updateApplicationStatus = useCallback(
    async (
      app: Application,
      newStatus: ApplicationStatus,
      options?: StatusUpdateOptions
    ): Promise<Application> => {
      const currentSnapshot =
        applicationsRef.current.find((item) => item.id === app.id) ?? app;
      const nowIso = new Date().toISOString();
      const optimisticPatch: Partial<Application> = {
        status: newStatus,
        rejection_reason:
          newStatus === "REJECTED"
            ? options?.reason ?? currentSnapshot.rejection_reason ?? ""
            : "",
        rejection_note:
          newStatus === "REJECTED"
            ? options?.note ?? currentSnapshot.rejection_note ?? ""
            : "",
        updated_at: nowIso,
        latest_activity_at: nowIso,
      };

      const optimisticApp: Application = { ...currentSnapshot, ...optimisticPatch };

      // 1. Apply optimistic update immediately & invalidate any in-flight poll
      mutationEpochRef.current += 1;
      loadAbortRef.current?.abort();
      setApplications((prev) =>
        prev.map((item) => (item.id === app.id ? { ...item, ...optimisticPatch } : item))
      );
      setPendingApplicationIds((prev) => {
        const next = new Set(prev);
        next.add(app.id);
        return next;
      });

      try {
        const serverPatch = await fetchApi<CompactApplicationPatch>(
          `/applications/${app.id}/status/?compact=1`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status: newStatus,
              ...(newStatus === "REJECTED" && options?.reason
                ? { rejection_reason: options.reason }
                : {}),
              ...(newStatus === "REJECTED" && options?.note
                ? { rejection_note: options.note }
                : {}),
            }),
          }
        );

        const reconciled: Partial<Application> = {
          status: serverPatch.status ?? newStatus,
          rejection_reason: serverPatch.rejection_reason ?? optimisticPatch.rejection_reason,
          rejection_note: serverPatch.rejection_note ?? optimisticPatch.rejection_note,
          ...(serverPatch.updated_at ? { updated_at: serverPatch.updated_at } : {}),
          ...(serverPatch.latest_activity_at !== undefined
            ? { latest_activity_at: serverPatch.latest_activity_at }
            : {}),
        };

        mutationEpochRef.current += 1;
        setApplications((prev) =>
          prev.map((item) => (item.id === app.id ? { ...item, ...reconciled } : item))
        );
        return { ...optimisticApp, ...reconciled };
      } catch (err) {
        // Roll back only if this application was not superseded by another optimistic change
        mutationEpochRef.current += 1;
        setApplications((prev) =>
          prev.map((item) => (item.id === app.id ? currentSnapshot : item))
        );
        throw err;
      } finally {
        setPendingApplicationIds((prev) => {
          const next = new Set(prev);
          next.delete(app.id);
          return next;
        });
      }
    },
    []
  );

  const bulkUpdateApplicationStatus = useCallback(
    async (
      applicationIds: number[],
      newStatus: ApplicationStatus,
      options?: StatusUpdateOptions
    ): Promise<number> => {
      const uniqueIds = Array.from(new Set(applicationIds));
      if (uniqueIds.length === 0) return 0;

      const idSet = new Set(uniqueIds);
      const previousById = new Map<number, Application>();
      for (const app of applicationsRef.current) {
        if (idSet.has(app.id)) previousById.set(app.id, app);
      }

      const nowIso = new Date().toISOString();
      mutationEpochRef.current += 1;
      loadAbortRef.current?.abort();

      setApplications((prev) =>
        prev.map((item) =>
          idSet.has(item.id)
            ? {
                ...item,
                status: newStatus,
                rejection_reason:
                  newStatus === "REJECTED"
                    ? options?.reason ?? item.rejection_reason ?? ""
                    : "",
                rejection_note:
                  newStatus === "REJECTED"
                    ? options?.note ?? item.rejection_note ?? ""
                    : "",
                updated_at: nowIso,
                latest_activity_at: nowIso,
              }
            : item
        )
      );
      setPendingApplicationIds((prev) => {
        const next = new Set(prev);
        uniqueIds.forEach((id) => next.add(id));
        return next;
      });

      try {
        const patches = await fetchApi<CompactApplicationPatch[]>(
          "/applications/bulk/?compact=1",
          {
            method: "POST",
            body: JSON.stringify({
              application_ids: uniqueIds,
              status: newStatus,
              ...(newStatus === "REJECTED" && options?.reason
                ? { rejection_reason: options.reason }
                : {}),
              ...(newStatus === "REJECTED" && options?.note
                ? { rejection_note: options.note }
                : {}),
            }),
          }
        );

        const patchMap = new Map(patches.map((p) => [p.id, p]));
        mutationEpochRef.current += 1;
        setApplications((prev) =>
          prev.map((item) => {
            const p = patchMap.get(item.id);
            if (!p) return item;
            return {
              ...item,
              status: p.status ?? item.status,
              rejection_reason: p.rejection_reason ?? item.rejection_reason,
              rejection_note: p.rejection_note ?? item.rejection_note,
              ...(p.updated_at ? { updated_at: p.updated_at } : {}),
              ...(p.latest_activity_at !== undefined
                ? { latest_activity_at: p.latest_activity_at }
                : {}),
            };
          })
        );
        return patches.length;
      } catch (err) {
        mutationEpochRef.current += 1;
        setApplications((prev) =>
          prev.map((item) => previousById.get(item.id) ?? item)
        );
        throw err;
      } finally {
        setPendingApplicationIds((prev) => {
          const next = new Set(prev);
          uniqueIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    },
    []
  );

  const updateJobStatusOptimistic = useCallback(
    async (job: Job, action: JobLifecycleAction): Promise<Job | null> => {
      const prevJobs = jobsRef.current;
      const prevApps = applicationsRef.current;

      mutationEpochRef.current += 1;
      loadAbortRef.current?.abort();

      if (action === "close") {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: "CLOSED", updated_at: new Date().toISOString() } : j
          )
        );
      } else if (action === "reopen") {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: "PUBLISHED", updated_at: new Date().toISOString() } : j
          )
        );
      } else {
        setJobs((prev) => prev.filter((j) => j.id !== job.id));
        setApplications((prev) => prev.filter((a) => a.job !== job.id));
      }

      try {
        if (action === "close") {
          const updated = await fetchApi<Job>(`/jobs/${job.id}/close/`, { method: "POST" });
          mutationEpochRef.current += 1;
          setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
          return updated;
        }
        if (action === "reopen") {
          const updated = await fetchApi<Job>(`/jobs/${job.id}/reopen/`, { method: "POST" });
          mutationEpochRef.current += 1;
          setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
          return updated;
        }
        if (action === "archive") {
          await fetchApi(`/jobs/${job.id}/archive/`, { method: "POST" });
          mutationEpochRef.current += 1;
          return null;
        }
        await fetchApi(`/jobs/${job.id}/`, { method: "DELETE" });
        mutationEpochRef.current += 1;
        return null;
      } catch (err) {
        mutationEpochRef.current += 1;
        setJobs(prevJobs);
        setApplications(prevApps);
        throw err;
      }
    },
    []
  );

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
      pendingApplicationIds,
      backendOnline,
      loading,
      loadData,
      onJobCreated,
      onJobUpdated,
      onJobArchived,
      onApplicationUpdated,
      mergeApplicationPatch,
      updateApplicationStatus,
      bulkUpdateApplicationStatus,
      updateJobStatusOptimistic,
      adjustTaskCounts,
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
      pendingApplicationIds,
      backendOnline,
      loading,
      loadData,
      onJobCreated,
      onJobUpdated,
      onJobArchived,
      onApplicationUpdated,
      mergeApplicationPatch,
      updateApplicationStatus,
      bulkUpdateApplicationStatus,
      updateJobStatusOptimistic,
      adjustTaskCounts,
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
