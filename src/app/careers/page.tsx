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
      const jobsData = await fetchApi<Job[]>("/jobs/");
      setJobs(jobsData);
      try { sessionStorage.setItem("tm_cached_jobs", JSON.stringify(jobsData)); } catch {}
      setBackendOnline(true);
      setLoading(false);

      const appsData = await fetchApi<Application[]>("/applications/");
      setApplications(appsData);
    } catch (err) {
      console.error("Data load error:", err);
      setBackendOnline(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    const interval = setInterval(loadData, 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleApplicationCreated = (newApp: Application) => {
    setApplications((prev) => [newApp, ...prev.filter((a) => a.id !== newApp.id)]);
    loadData();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navigation backendOnline={backendOnline} />

      <main className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Loading open positions...</div>
          </div>
        ) : (
          <ApplicantPortal
            jobs={jobs}
            applications={applications}
            onApplicationCreated={handleApplicationCreated}
          />
        )}
      </main>

      <footer className="border-t border-border bg-background py-4 text-xs text-muted-foreground text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TalentMatch Careers · Verified Universal Job Matching Engine</span>
          <span>Philippine Multi-Industry Benchmark</span>
        </div>
      </footer>
    </div>
  );
}
