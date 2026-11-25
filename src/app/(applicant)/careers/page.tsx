"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
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

      const jobsData = await fetchApi<PaginatedResponse<Job>>("/jobs/?page=1&page_size=20");
      setJobs(jobsData.results);
      setJobPage(1);
      setHasMoreJobs(Boolean(jobsData.next));
      try {
        sessionStorage.setItem("tm_cached_jobs", JSON.stringify(jobsData.results));
      } catch {}
      setBackendOnline(true);
      setLoading(false);

      if (user) {
        // Authenticated applicant: fetch ONLY their own applications
        const appsData = await fetchApi<PaginatedResponse<Application>>(`/applications/?user_id=${user.id}&page=1&page_size=20`);
        setApplications(appsData.results);
        setApplicationPage(1);
        setHasMoreApplications(Boolean(appsData.next));
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
    loadData();
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
