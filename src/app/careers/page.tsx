"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { ApplicantPortal } from "@/components/applicant/ApplicantPortal";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { fetchApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // 1. Fetch jobs immediately to render positions without delay
      const jobsData = await fetchApi<Job[]>("/jobs/");
      setJobs(jobsData);
      try { sessionStorage.setItem("tm_cached_jobs", JSON.stringify(jobsData)); } catch {}
      setBackendOnline(true);
      setLoading(false);

      // 2. Fetch applicant submissions in the background
      const appsData = await fetchApi<Application[]>("/applications/");
      setApplications(appsData);
    } catch (err) {
      console.error("Data load error:", err);
      setBackendOnline(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("tm_cached_jobs");
      if (cached) {
        setJobs(JSON.parse(cached));
        setLoading(false);
      }
    } catch {}
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleApplicationCreated = (newApp: Application) => {
    setApplications((prev) => [newApp, ...prev.filter((a) => a.id !== newApp.id)]);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px]" />
      </div>

      <Navigation backendOnline={backendOnline} />

      <main className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <div className="text-xs text-slate-400">Loading open job opportunities...</div>
          </div>
        ) : (
          <ApplicantPortal
            jobs={jobs}
            applications={applications}
            onApplicationCreated={handleApplicationCreated}
          />
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TalentMatch Careers · Verified Universal Job Matching Engine</span>
          <span>Philippine Multi-Industry Benchmark</span>
        </div>
      </footer>
    </div>
  );
}
