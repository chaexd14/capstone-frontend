"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ApplicantPortal } from "@/components/applicant/ApplicantPortal";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi, type PaginatedResponse } from "@/lib/api";
import { Loader2 } from "lucide-react";
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
    <div className="min-h-screen bg-[#e3f1fe] text-slate-900 flex flex-col font-sans selection:bg-primary selection:text-white relative">
      {/* Blueprint Background Texture: Fine Dot Mesh + Architectural 48px Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(rgba(33,150,243,0.15)_1px,transparent_1px)] [background-size:24px_24px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,rgba(33,150,243,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(33,150,243,0.035)_1px,transparent_1px)] [background-size:48px_48px]"
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white text-primary shadow-md flex items-center justify-center border border-blue-200/80">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <div className="text-sm font-semibold text-slate-600">Loading open positions...</div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col">
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
