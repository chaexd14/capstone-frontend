"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import {
  Sparkles,
  UserCheck,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Activity,
  Award,
  Layers,
  Zap,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { Job } from "@/types/job";
import { Application } from "@/types/application";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    try {
      const cachedJobs = sessionStorage.getItem("tm_cached_jobs");
      const cachedApps = sessionStorage.getItem("tm_cached_apps");
      if (cachedJobs) setJobs(JSON.parse(cachedJobs));
      if (cachedApps) setApplications(JSON.parse(cachedApps));
    } catch {}

    const loadStats = async () => {
      try {
        const [jobsData, appsData] = await Promise.all([
          fetchApi<Job[]>("/jobs/"),
          fetchApi<Application[]>("/applications/"),
        ]);
        setBackendOnline(true);
        setJobs(jobsData);
        setApplications(appsData);
        try {
          sessionStorage.setItem("tm_cached_jobs", JSON.stringify(jobsData));
          sessionStorage.setItem("tm_cached_apps", JSON.stringify(appsData));
        } catch {}
      } catch {
        setBackendOnline(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[160px]" />
      </div>

      <Navigation backendOnline={backendOnline} />

      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold mb-6 shadow-inner animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Universal AI Candidate Screening & Matching Engine</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl animate-in fade-in slide-in-from-bottom-3 duration-500">
          Explainable, Merit-Based Recruitment for{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
            Every Industry
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700">
          Empowering applicants with instant matching feedback and equipping recruiters with automated candidate screening, verifiable evidence, and demographic bias reduction.
        </p>

        {/* Dual Portal Gateways */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl text-left animate-in fade-in slide-in-from-bottom-5 duration-700">
          {/* Careers / Applicant Card */}
          <Link
            href="/careers"
            className="group relative p-7 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <UserCheck className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-indigo-300 transition">
                  Careers & Job Portal
                </h2>
                <span className="text-xs text-indigo-400 font-mono">/careers</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Explore open multi-industry positions (Healthcare, CPA/Finance, Engineering, BPO, Sales, IT), apply with instant resume upload, and monitor screening progress.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
              <span>Enter Applicant Portal</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Recruiter Admin Card */}
          <Link
            href="/admin"
            className="group relative p-7 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-violet-500/50 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1"
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all">
                <Briefcase className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-violet-300 transition">
                  Recruiter Studio & Admin
                </h2>
                <span className="text-xs text-violet-400 font-mono">/admin</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Manage job profiles, inspect AI rankings leaderboards, review full applicant rosters with contact details, and evaluate explainable AI score breakdowns.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-violet-400 group-hover:text-violet-300">
              <span>Enter Recruiter Admin</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Live System Stats */}
        <div className="mt-14 w-full max-w-3xl p-5 rounded-2xl bg-slate-950/60 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-[11px] text-slate-400">Open Job Benchmarks</div>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">{jobs.length}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Screened Candidates</div>
            <div className="text-2xl font-extrabold text-indigo-400 font-mono mt-1">{applications.length}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">AI Scoring Formula</div>
            <div className="text-xs font-bold text-emerald-400 font-mono mt-2">40% Exp · 35% Skills</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">System Pipeline</div>
            <div className="text-xs font-bold text-sky-400 font-mono mt-2">Zero-Shot + Gated</div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TalentMatch Platform · Automated AI Screening & Explainable Matching</span>
          <span>Dual Portal Architecture: /careers & /admin</span>
        </div>
      </footer>
    </div>
  );
}
