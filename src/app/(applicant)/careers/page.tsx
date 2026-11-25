"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ApplicantPortal } from "@/components/applicant/ApplicantPortal";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi, type PaginatedResponse } from "@/lib/api";
import { ContextualLoading } from "@/components/ui/contextual-loading";
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
  const [jobPage, setJobPage] = useState(1);
  const [applicationPage, setApplicationPage] = useState(1);
  const [hasMoreJobs, setHasMoreJobs] = useState(false);
  const [hasMoreApplications, setHasMoreApplications] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastApplicationSyncRef = useRef(0);
  const applicationRealtimeConnectedRef = useRef(false);

  const applyApplicationPatch = useCallback((patch: Partial<Application> & { id: number }) => {
    setApplications((current) =>
      current.map((application) => {
        if (application.id !== patch.id) return application;
        if (
          application.updated_at &&
          patch.updated_at &&
          new Date(application.updated_at).getTime() > new Date(patch.updated_at).getTime()
        ) {
          return application;
        }
        return { ...application, ...patch };
      })
    );
    lastApplicationSyncRef.current = Date.now();
  }, []);

  const refreshApplications = useCallback(async (userId: string) => {
    const appsData = await fetchApi<PaginatedResponse<Application>>(
      `/applications/?user_id=${userId}&page=1&page_size=20`
    );
    setApplications(appsData.results);
    setApplicationPage(1);
    setHasMoreApplications(Boolean(appsData.next));
    lastApplicationSyncRef.current = Date.now();
  }, []);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      const jobsRequest = fetchApi<PaginatedResponse<Job>>("/jobs/?page=1&page_size=20");
      const applicationsRequest = user
        ? fetchApi<PaginatedResponse<Application>>(
            `/applications/?user_id=${user.id}&page=1&page_size=20`
          )
        : Promise.resolve(null);
      const [jobsData, appsData] = await Promise.all([jobsRequest, applicationsRequest]);
      setJobs(jobsData.results);
      setJobPage(1);
      setHasMoreJobs(Boolean(jobsData.next));
      try {
        sessionStorage.setItem("tm_cached_jobs", JSON.stringify(jobsData.results));
      } catch {}
      setBackendOnline(true);
      setLoading(false);

      if (appsData) {
        setApplications(appsData.results);
        setApplicationPage(1);
        setHasMoreApplications(Boolean(appsData.next));
        lastApplicationSyncRef.current = Date.now();
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
    if (!currentUser) return;
    const channel = supabase
      .channel(`applicant-applications:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "applications_application",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const patch = payload.new as Partial<Application> & { id?: number };
          if (typeof patch.id === "number") {
            applyApplicationPatch(patch as Partial<Application> & { id: number });
          }
        }
      )
      .subscribe((status) => {
        applicationRealtimeConnectedRef.current = status === "SUBSCRIBED";
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void refreshApplications(currentUser.id);
        }
      });

    const reconcileOnFocus = () => {
      if (
        document.visibilityState === "visible" &&
        !applicationRealtimeConnectedRef.current &&
        Date.now() - lastApplicationSyncRef.current > 30_000
      ) {
        void refreshApplications(currentUser.id);
      }
    };
    document.addEventListener("visibilitychange", reconcileOnFocus);

    return () => {
      applicationRealtimeConnectedRef.current = false;
      document.removeEventListener("visibilitychange", reconcileOnFocus);
      void supabase.removeChannel(channel);
    };
  }, [applyApplicationPatch, currentUser, refreshApplications, supabase]);

  useEffect(() => {
    const handleApplicationPatch = (event: Event) => {
      const patch = (event as CustomEvent<Partial<Application> & { id?: number }>).detail;
      if (typeof patch?.id === "number") {
        applyApplicationPatch(patch as Partial<Application> & { id: number });
      }
    };
    window.addEventListener("talentmatch:application-patch", handleApplicationPatch);
    return () => {
      window.removeEventListener("talentmatch:application-patch", handleApplicationPatch);
    };
  }, [applyApplicationPatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [loadData]);

  const loadMoreJobs = async () => {
    if (loadingMore || !hasMoreJobs) return;
    setLoadingMore(true);
    try {
      const nextPage = jobPage + 1;
      const data = await fetchApi<PaginatedResponse<Job>>(`/jobs/?page=${nextPage}&page_size=20`);
      setJobs((prev) => [...prev, ...data.results.filter((item) => !prev.some((job) => job.id === item.id))]);
      setJobPage(nextPage);
      setHasMoreJobs(Boolean(data.next));
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreApplications = async () => {
    if (loadingMore || !hasMoreApplications || !currentUser) return;
    setLoadingMore(true);
    try {
      const nextPage = applicationPage + 1;
      const data = await fetchApi<PaginatedResponse<Application>>(
        `/applications/?user_id=${currentUser.id}&page=${nextPage}&page_size=20`
      );
      setApplications((prev) => [...prev, ...data.results.filter((item) => !prev.some((app) => app.id === item.id))]);
      setApplicationPage(nextPage);
      setHasMoreApplications(Boolean(data.next));
    } finally {
      setLoadingMore(false);
    }
  };

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
    lastApplicationSyncRef.current = Date.now();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {loading ? (
        <ContextualLoading
          label="Loading open positions..."
          className="min-h-screen"
        />
      ) : (
        <div className="flex-1 flex flex-col">
          <Suspense fallback={null}>
            <ApplicantPortal
              jobs={jobs}
              applications={applications}
              onApplicationCreated={handleApplicationCreated}
              currentUser={currentUser}
              onLogout={handleLogout}
              backendOnline={backendOnline}
              hasMoreJobs={hasMoreJobs}
              hasMoreApplications={hasMoreApplications}
              loadingMore={loadingMore}
              onLoadMoreJobs={loadMoreJobs}
              onLoadMoreApplications={loadMoreApplications}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
