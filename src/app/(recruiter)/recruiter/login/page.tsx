"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Briefcase, Lock, Mail, User, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RecruiterLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/recruiter";
  const errorParam = searchParams.get("error");

  const [activeTab, setActiveTab] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    errorParam === "unauthorized" ? "Please sign in with authorized recruiter credentials." : ""
  );
  const [successMsg, setSuccessMsg] = useState("");

  // Sign In fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Create recruiter team account fields
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [organization, setOrganization] = useState("");

  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      const role = data.user?.user_metadata?.role;
      if (role === "applicant") {
        // Applicant attempted to log into recruiter portal
        await supabase.auth.signOut();
        setErrorMsg("Access Denied: This account is registered as an Applicant. Please use the Applicant Portal.");
        return;
      }

      router.push(nextUrl);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid recruiter credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterRecruiter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          data: {
            role: "recruiter",
            full_name: fullName.trim(),
            company: organization.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setSuccessMsg("Recruiter account authorized! Redirecting to dashboard...");
        setTimeout(() => {
          router.push(nextUrl);
          router.refresh();
        }, 800);
      } else {
        setSuccessMsg("Recruiter registered! Check your email to activate and verify access.");
        setActiveTab("signin");
        setEmail(regEmail);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create recruiter workspace account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Subtle tech background backdrop */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 mb-3 group">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-foreground">
              TalentMatch
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 px-3 py-1 font-medium border-primary/40 bg-primary/5 text-primary">
              <Briefcase className="h-3.5 w-3.5" />
              Recruiter & Talent Ops Portal
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to review candidate pipelines, examine AI match scores, and manage job requisitions.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-border shadow-lg bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Recruiter Sign In</TabsTrigger>
                <TabsTrigger value="register">Register Team</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="leading-snug">{successMsg}</span>
              </div>
            )}

            {activeTab === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="recruiter-email">Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recruiter-email"
                      type="email"
                      placeholder="recruiter@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recruiter-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recruiter-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-10 font-semibold gap-2">
                  {loading ? "Authenticating..." : "Sign In to Recruiter Portal"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegisterRecruiter} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="recruiter-fullname">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recruiter-fullname"
                      type="text"
                      placeholder="Sarah Jenkins"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recruiter-company">Company / Organization</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recruiter-company"
                      type="text"
                      placeholder="TechCorp Innovations"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recruiter-reg-email">Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recruiter-reg-email"
                      type="email"
                      placeholder="sarah@techcorp.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recruiter-reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recruiter-reg-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-10 font-semibold gap-2 mt-2">
                  {loading ? "Registering Workspace..." : "Register Recruiter Workspace"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="pt-2 border-t border-border flex flex-col gap-2 text-center text-xs text-muted-foreground">
            <div>
              Are you applying for a job?{" "}
              <Link href="/applicant/login" className="text-primary hover:underline font-semibold">
                Go to Candidate / Applicant Portal →
              </Link>
            </div>
            <div>
              <Link href="/careers" className="hover:underline">
                Public Careers Directory
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
