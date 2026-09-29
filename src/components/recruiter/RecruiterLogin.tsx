"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Lock,
  Mail,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Building2,
  UserCheck,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

export interface RecruiterUser {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  is_staff?: boolean;
}

interface RecruiterLoginProps {
  onLoginSuccess: (user: RecruiterUser) => void;
}

export function RecruiterLogin({ onLoginSuccess }: RecruiterLoginProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Please provide both email/username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchApi<{ message: string; user: RecruiterUser; token: string }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify({
          email: identifier.trim(),
          password: password,
        }),
      });

      if (response && response.user) {
        localStorage.setItem("talentmatch_recruiter_user", JSON.stringify(response.user));
        localStorage.setItem("talentmatch_recruiter_token", response.token || "demo-token");
        onLoginSuccess(response.user);
      }
    } catch (err: any) {
      setError(err?.message || "Invalid recruiter credentials. Please verify and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIdentifier("recruiter@talentmatch.ai");
    setPassword("password123");
    setLoading(true);
    setError(null);

    try {
      const response = await fetchApi<{ message: string; user: RecruiterUser; token: string }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify({
          email: "recruiter@talentmatch.ai",
          password: "password123",
        }),
      });

      if (response && response.user) {
        localStorage.setItem("talentmatch_recruiter_user", JSON.stringify(response.user));
        localStorage.setItem("talentmatch_recruiter_token", response.token || "demo-token");
        onLoginSuccess(response.user);
      }
    } catch (err: any) {
      setError("Could not complete automatic demo login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header Badge & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 shadow-xl shadow-indigo-500/25">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Recruiter & Admin Login
          </h1>

          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Secure access to the TalentMatch Company Studio, AI Applicant Rankings, and Demographic Bias Reduction controls.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username / Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Recruiter Work Email / Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. recruiter@talentmatch.ai"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <span className="text-[10px] text-slate-500">Default: password123</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Sign In to Admin Workspace</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="text-center text-[11px] text-slate-500 font-medium">
              Demo Access for Capstone Evaluation
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span>⚡ 1-Click Demo Login as Lead Recruiter</span>
            </button>
          </div>
        </div>

        {/* Back to Applicant / Careers Portal */}
        <div className="text-center">
          <Link
            href="/careers"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Are you an applicant? Go to Careers Portal →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
