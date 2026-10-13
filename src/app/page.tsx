"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import {
  Sparkles,
  UserCheck,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [screenedCount, setScreenedCount] = useState<number>(0);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const cachedJobs = sessionStorage.getItem("tm_cached_jobs");
        const cachedCount = sessionStorage.getItem("tm_cached_screened_count");
        if (cachedJobs) setJobs(JSON.parse(cachedJobs));
        if (cachedCount) setScreenedCount(Number(cachedCount));
      } catch {}
      try {
        const [jobsData, statsData] = await Promise.all([
          fetchApi<Job[]>("/jobs/"),
          fetchApi<{ open_benchmarks: number; screened_candidates: number }>("/jobs/public-stats/"),
        ]);
        setBackendOnline(true);
        setJobs(jobsData);
        setScreenedCount(statsData.screened_candidates);
        try {
          sessionStorage.setItem("tm_cached_jobs", JSON.stringify(jobsData));
          sessionStorage.setItem("tm_cached_screened_count", String(statsData.screened_candidates));
        } catch {}
      } catch {
        setBackendOnline(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navigation backendOnline={backendOnline} />

      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        {/* Subtle Pill Badge */}
        <div className="mb-6">
          <Badge variant="outline" className="gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-secondary/60 text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Universal AI Screening & Match Engine</span>
          </Badge>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl leading-[1.15]">
          Explainable, Merit-Based Recruitment for Every Industry
        </h1>

        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Empowering applicants with transparent match feedback and equipping hiring teams with automated candidate screening, verifiable qualification proof, and demographic bias reduction.
        </p>

        {/* Dual Portal Gateways */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl text-left">
          {/* Careers / Applicant Card */}
          <Card className="hover:border-foreground/30 transition-all hover:shadow-sm flex flex-col justify-between group bg-card">
            <CardHeader className="space-y-3.5 p-6 pb-4">
              <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl font-bold">Careers & Job Portal</CardTitle>
                  <span className="text-xs font-mono text-muted-foreground">/careers</span>
                </div>
                <CardDescription className="mt-2 text-sm leading-relaxed">
                  Browse open multi-industry benchmarks (Healthcare, CPA, Engineering, BPO, Sales, IT), upload your resume, and get instant score evaluations.
                </CardDescription>
              </div>
            </CardHeader>
            <CardFooter className="p-6 pt-2 flex gap-2">
              <Button asChild variant="outline" size="default" className="flex-1 justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-colors font-semibold text-sm">
                <Link href="/careers">
                  <span>Browse Jobs</span>
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="default" className="text-sm font-semibold">
                <Link href="/applicant/login">
                  <span>Sign In</span>
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Recruiter Admin Card */}
          <Card className="hover:border-foreground/30 transition-all hover:shadow-sm flex flex-col justify-between group bg-card">
            <CardHeader className="space-y-3.5 p-6 pb-4">
              <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl font-bold">Recruiter Studio & Admin</CardTitle>
                  <span className="text-xs font-mono text-muted-foreground">/recruiter</span>
                </div>
                <CardDescription className="mt-2 text-sm leading-relaxed">
                  Post and calibrate job specs, inspect AI candidate ranking leaderboards, view contact profiles, and analyze explainable scoring rubrics.
                </CardDescription>
              </div>
            </CardHeader>
            <CardFooter className="p-6 pt-2">
              <Button asChild variant="outline" size="default" className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-colors font-semibold text-sm">
                <Link href="/recruiter/login">
                  <span>Recruiter Enterprise Sign In</span>
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Live System Stats Bar */}
        <div className="mt-12 w-full max-w-3xl rounded-xl border border-border bg-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">Open Benchmarks</div>
            <div className="text-2xl font-bold font-mono text-foreground">{jobs.length}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">Screened Candidates</div>
            <div className="text-2xl font-bold font-mono text-foreground">{screenedCount}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">Scoring Weights</div>
            <div className="text-xs sm:text-sm font-bold text-foreground pt-1">40% Exp · 35% Skills</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">Pipeline Standard</div>
            <div className="text-xs sm:text-sm font-bold text-foreground pt-1">Zero-Shot + Gated</div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-background py-5 text-xs sm:text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TalentMatch Platform · Automated AI Screening & Explainable Matching</span>
          <span className="font-mono text-xs">Clean Minimalist Architecture</span>
        </div>
      </footer>
    </div>
  );
}
