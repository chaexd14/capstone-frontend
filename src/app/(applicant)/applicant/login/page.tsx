"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, UserCheck, Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function ApplicantLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/careers";
  const errorParam = searchParams.get("error");

  const [activeTab, setActiveTab] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    errorParam === "recruiter_only" ? "Access denied: That area is restricted to recruiters." : ""
  );
  const [successMsg, setSuccessMsg] = useState("");

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up fields
  const [fullName, setFullName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      if (error) {
        throw error;
      }

      const role = data.user?.user_metadata?.role;
      if (role === "recruiter") {
        // Warn if this account is actually a recruiter
        router.push("/recruiter");
        return;
      }

      router.push(nextUrl);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (signUpPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (signUpPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail.trim(),
        password: signUpPassword,
        options: {
          data: {
            role: "applicant",
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        // Direct auto-confirm configured
        setSuccessMsg("Account created successfully! Redirecting...");
        setTimeout(() => {
          router.push(nextUrl);
          router.refresh();
        }, 800);
      } else {
        setSuccessMsg(
          "Account created! Please check your email to confirm your account before logging in."
        );
        setActiveTab("signin");
        setSignInEmail(signUpEmail);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

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
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 font-medium">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              Applicant Portal
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to submit job applications, track match feedback, and manage your profile.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-border shadow-md bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
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
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="leading-snug">{successMsg}</span>
              </div>
            )}

            {activeTab === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="applicant@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-10 font-semibold gap-2">
                  {loading ? "Signing in..." : "Sign In to Applicant Portal"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Alex Taylor"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="alex.taylor@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-10 font-semibold gap-2 mt-2">
                  {loading ? "Creating Account..." : "Create Applicant Account"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="pt-2 border-t border-border flex flex-col gap-2 text-center text-xs text-muted-foreground">
            <div>
              Are you a hiring manager or recruiter?{" "}
              <Link href="/recruiter/login" className="text-primary hover:underline font-semibold">
                Go to Recruiter Login →
              </Link>
            </div>
            <div>
              <Link href="/careers" className="hover:underline">
                Browse open career opportunities without signing in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
