"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Lock,
  Mail,
  Sparkles,
  ShieldCheck,
  Loader2,
  AlertCircle,
  KeyRound,
  UserCheck,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid recruiter credentials. Please verify and try again.");
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
    } catch {
      setError("Could not complete automatic demo login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header Icon & Title */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-primary-foreground mx-auto shadow-xs">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Recruiter & Admin Login
          </h1>

          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Access candidate rankings, job calibration, and demographic bias reduction controls.
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {error && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recruiter-email" className="text-sm font-semibold">Work Email / Username</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="recruiter-email"
                    type="text"
                    required
                    placeholder="recruiter@talentmatch.ai"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-10 h-11 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recruiter-password" className="text-sm font-semibold">Password</Label>
                  <span className="text-xs text-muted-foreground font-mono">default: password123</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="recruiter-password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 text-sm"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} size="lg" className="w-full gap-2 mt-2 font-semibold">
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
              </Button>
            </form>

            <div className="pt-2">
              <div className="relative flex items-center justify-center my-4">
                <Separator />
                <span className="absolute bg-card px-2.5 text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                  Quick Demo Access
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full gap-2 text-sm font-medium h-11"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span>1-Click Demo Login as Lead Recruiter</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to Careers */}
        <div className="text-center">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <UserCheck className="h-4 w-4" />
            <span>Looking for open jobs? Go to Careers Portal →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
