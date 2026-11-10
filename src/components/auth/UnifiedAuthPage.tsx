"use client";

import { getSafeRedirectUrl } from "@/lib/auth-redirect";
import React, { useState, useEffect, useId } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Briefcase,
  UserCheck,
  X,
  FileText,
  Shield,
  Award,
  Search,
  Check,
} from "lucide-react";

interface UnifiedAuthPageProps {
  initialRole?: "recruiter" | "applicant";
}

interface SlideItem {
  headline: string;
  subtitle: string;
  renderVisual: () => React.ReactNode;
}

function getRememberedEmail() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("talentmatch_saved_email") ?? "";
  } catch {
    return "";
  }
}

export function UnifiedAuthPage({ initialRole = "applicant" }: UnifiedAuthPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const errorParam = searchParams.get("error");

  const [portalRole, setPortalRole] = useState<"recruiter" | "applicant">(initialRole);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    errorParam === "unauthorized"
      ? "Please sign in with authorized recruiter credentials."
      : errorParam === "recruiter_only"
      ? "Access restricted: That area requires a recruiter account."
      : ""
  );
  const [successMsg, setSuccessMsg] = useState("");

  // Sign In inputs
  const [rememberedEmail] = useState(getRememberedEmail);
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up inputs
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [forgotMessage, setForgotMessage] = useState("");

  const [showTermsModal, setShowTermsModal] = useState<"terms" | "privacy" | null>(null);

  // Left Showcase Carousel Slide
  const [activeSlide, setActiveSlide] = useState(0);

  const supabase = createClient();
  const emailInputId = useId();
  const passwordInputId = useId();
  const rememberCheckboxId = useId();

  // Auto-cycle carousel slides every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Update next URL depending on role
  const resolvedNextUrl =
    getSafeRedirectUrl(nextParam, portalRole === "recruiter" ? "/recruiter" : "/careers");

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg("Please provide both email address and password.");
      return;
    }

    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem("talentmatch_saved_email", cleanEmail);
      } else {
        localStorage.removeItem("talentmatch_saved_email");
      }
    } catch {}

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        throw error;
      }

      const token = data.session?.access_token || "";
      let serverRole = "applicant";

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/auth/me/`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const body = await res.json();
          serverRole = body?.user?.role || "applicant";
        }
      } catch {
        serverRole = "applicant";
      }

      if (portalRole === "recruiter" && serverRole !== "recruiter" && serverRole !== "superadmin") {
        await supabase.auth.signOut();
        try {
          localStorage.removeItem("talentmatch_recruiter_token");
          localStorage.removeItem("talentmatch_recruiter_user");
        } catch {}
        setErrorMsg("Access Denied: This account is not provisioned with Recruiter or Admin privileges. Please sign in as an Applicant or contact support.");
        setLoading(false);
        return;
      }

      // Also persist session keys for legacy backend integration
      try {
        const userInfo = {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.user_metadata?.full_name || cleanEmail.split("@")[0],
          role: serverRole,
        };
        if (serverRole === "recruiter" || serverRole === "superadmin") {
          localStorage.setItem("talentmatch_recruiter_user", JSON.stringify(userInfo));
          localStorage.removeItem("talentmatch_recruiter_token");
        } else {
          localStorage.setItem("talentmatch_user", JSON.stringify(userInfo));
          localStorage.removeItem("talentmatch_token");
        }
      } catch {}

      setSuccessMsg("Signed in successfully! Redirecting...");
      setTimeout(() => {
        if (serverRole === "recruiter" || serverRole === "superadmin") {
          router.push(getSafeRedirectUrl(nextParam, "/recruiter"));
        } else {
          router.push(getSafeRedirectUrl(nextParam, "/careers"));
        }
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid login credentials. Please check and try again.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = signUpEmail.trim();
    const cleanName = fullName.trim();

    if (!cleanName) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!cleanEmail) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (signUpPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (signUpPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: signUpPassword,
        options: {
          data: {
            role: "applicant",
            full_name: cleanName,
          },
        },
      });

      if (error?.status === 429) {
        throw new Error("Signup is temporarily limited. Please wait before trying again.");
      }
      if (error) {
        throw error;
      }

      if (data.session) {
        setSuccessMsg("Account created successfully! Redirecting...");
        setTimeout(() => {
          router.push(resolvedNextUrl);
          router.refresh();
        }, 800);
      } else {
        setSuccessMsg("Account created! Check your email to confirm and then sign in.");
        setMode("signin");
        setEmail(cleanEmail);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };


  // Send Password Reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotMessage("Please enter your email address.");
      setForgotStatus("error");
      return;
    }

    setForgotStatus("loading");
    setForgotMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setForgotStatus("success");
      setForgotMessage("Password reset email sent! Please check your inbox for instructions.");
    } catch (err: unknown) {
      setForgotStatus("error");
      setForgotMessage(err instanceof Error ? err.message : "Failed to send reset link. Please verify your email.");
    }
  };

  // Carousel slide definitions
  const slides: SlideItem[] = [
    {
      headline: "AI-Powered Talent Matching",
      subtitle:
        "Streamline resume screening with explainable 5-component rubric scoring, demographic blind screening, and sentence-grounded evidence verification.",
      renderVisual: () => (
        <div className="w-full h-full flex flex-col justify-between p-5 select-none">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#2196F3]/10 text-[#2196F3] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#2196F3]" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Candidate Evaluation</p>
                <p className="text-[11px] text-slate-400">Explainable 5-Rubric Analysis</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              Rank #1 Shortlist
            </span>
          </div>

          {/* Match Score Display */}
          <div className="my-2 py-3 px-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overall Match Score</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-3xl font-extrabold text-[#2196F3] tracking-tight">94.8%</span>
                <span className="text-xs font-semibold text-emerald-600">Strong Fit</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-full border-4 border-[#2196F3] border-t-emerald-400 flex items-center justify-center font-bold text-xs text-slate-700 bg-white shadow-xs">
              AI
            </div>
          </div>

          {/* Rubric Breakdown Progress Bars */}
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Required Skills (Python, FastAPI, Postgres)</span>
                <span className="text-[#2196F3] font-bold">96%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#2196F3] rounded-full transition-all duration-500" style={{ width: "96%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Sentence-Grounded Experience Tenure</span>
                <span className="text-[#2196F3] font-bold">92%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#2196F3] rounded-full transition-all duration-500" style={{ width: "92%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Anti-Bluff Narrative Evidence Proof</span>
                <span className="text-emerald-600 font-bold">98% (Verified)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: "98%" }} />
              </div>
            </div>
          </div>

          {/* Footer Badge */}
          <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
              Zero Demographics Considered
            </span>
            <span className="font-mono text-[10px] text-slate-400">ID: TM-9821</span>
          </div>
        </div>
      ),
    },
    {
      headline: "Sentence-Grounded Verification",
      subtitle:
        "Differentiate genuine hands-on technical competence from keyword-stuffed resume claims with sentence citations.",
      renderVisual: () => (
        <div className="w-full h-full flex flex-col justify-between p-5 select-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Sentence Evidence Extraction</p>
                <p className="text-[11px] text-slate-400">Evidence vs Bullet-List Claim</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#2196F3] border border-blue-200">
              100% Grounded
            </span>
          </div>

          <div className="my-2 p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-left">
            <p className="text-[10px] font-bold text-[#2196F3] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Search className="w-3 h-3" /> Grounded Resume Citation
            </p>
            <p className="text-xs text-slate-700 italic leading-relaxed">
              &quot;Architected distributed ETL streaming pipeline processing <span className="font-semibold text-slate-900 bg-yellow-100 px-1 rounded">5M+ daily records</span> using <span className="font-semibold text-slate-900 bg-yellow-100 px-1 rounded">Apache Kafka</span>, Docker, and PostgreSQL.&quot;
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-[10px] text-emerald-700 font-bold uppercase">Narrative Proof</p>
              <p className="font-extrabold text-emerald-800 text-sm mt-0.5">High Confidence</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Bluff Risk</p>
              <p className="font-extrabold text-slate-700 text-sm mt-0.5">0.0% (Verified)</p>
            </div>
          </div>

          <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-slate-600 font-medium">Verifiable Employment History</span>
            <span className="font-mono text-[10px] text-[#2196F3] font-semibold">Citation Confirmed</span>
          </div>
        </div>
      ),
    },
    {
      headline: "Demographic Bias Reduction",
      subtitle:
        "Mask candidate PII, prestige markers, and non-merit demographics so every hire is judged purely on proven qualification.",
      renderVisual: () => (
        <div className="w-full h-full flex flex-col justify-between p-5 select-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Demographic Anonymization</p>
                <p className="text-[11px] text-slate-400">EEOC 4/5ths Rule Invariant</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
              Blind Review Active
            </span>
          </div>

          <div className="space-y-2 my-2">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Candidate Identity</span>
              <span className="font-mono text-slate-800 font-bold bg-slate-200/70 px-2 py-0.5 rounded">#C-8492 [REDACTED]</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Educational Institution</span>
              <span className="text-slate-600 font-mono text-[11px] bg-slate-200/70 px-2 py-0.5 rounded">[Prestige Masked]</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Demographic Markers</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" /> Anonymized
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-purple-900">Merit-First Index</span>
            </div>
            <span className="text-sm font-extrabold text-purple-700">96 / 100</span>
          </div>

          <div className="mt-2 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Counterfactual Audited</span>
            <span className="text-emerald-600 font-semibold">100% Invariant</span>
          </div>
        </div>
      ),
    },
  ];

  const currentSlide = slides[activeSlide];

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-white text-slate-900 font-sans selection:bg-[#2196F3] selection:text-white antialiased">
      {/* ============================================================== */}
      {/* LEFT COLUMN: Solid Vibrant Blue Showcase (Matches Login.png)   */}
      {/* ============================================================== */}
      <div className="hidden lg:flex flex-col justify-between items-center bg-[#2196F3] p-10 xl:p-14 text-white relative overflow-hidden">
        {/* Subtle atmospheric ambient glow */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        {/* Top spacer to balance vertical layout */}
        <div className="w-full flex justify-between items-center z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white text-xs font-semibold tracking-wide transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Return to Home</span>
          </Link>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/15 text-white backdrop-blur-xs border border-white/20">
            TalentMatch AI Platform
          </span>
        </div>

        {/* Center Container: Large White Card + Indicators + Text */}
        <div className="w-full max-w-[430px] flex flex-col items-center my-auto z-10">
          {/* Large White Rounded Card */}
          <div className="w-full aspect-square bg-white text-slate-900 rounded-[28px] shadow-2xl p-2 relative flex flex-col items-center justify-center transition-all duration-300">
            {currentSlide.renderVisual()}
          </div>

          {/* Carousel Pagination (3 Horizontal Pill Bars, matching Login.png) */}
          <div className="flex items-center justify-center gap-2 mt-8 mb-6">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeSlide === idx
                    ? "w-12 bg-white shadow-xs"
                    : "w-6 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>

          {/* Marketing / Feature Headline */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight leading-tight">
            {currentSlide.headline}
          </h2>

          {/* Subtitle / Description */}
          <p className="text-blue-50 text-sm sm:text-base text-center mt-2.5 max-w-sm mx-auto leading-relaxed">
            {currentSlide.subtitle}
          </p>
        </div>

        {/* Bottom info */}
        <div className="w-full flex items-center justify-between text-xs text-white/80 z-10 pt-4 border-t border-white/15">
          <span>Explainable Candidate Screening</span>
          <span>© 2026 TalentMatch AI</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: Crisp White Login Form (Matches Login.png)       */}
      {/* ============================================================== */}
      <div className="min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-white relative">
        {/* Top Header: Logo + Brand Name (matches Login.png top-left) */}
        <div className="w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-[#2196F3] text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-[#2196F3] transition-colors">
              Talent Match
            </span>
          </Link>

          {/* Role Switcher Pill */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPortalRole("applicant")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                portalRole === "applicant"
                  ? "bg-white text-[#2196F3] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Candidate</span>
            </button>
            <button
              type="button"
              onClick={() => setPortalRole("recruiter")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                portalRole === "recruiter"
                  ? "bg-white text-[#2196F3] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Recruiter</span>
            </button>
          </div>
        </div>

        {/* Center Auth Form Container */}
        <div className="w-full max-w-[430px] mx-auto my-auto py-8">
          {/* Welcome Back Header (matching Login.png) */}
          <div className="text-center mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {mode === "signin" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
              {mode === "signin"
                ? portalRole === "recruiter"
                  ? "Sign in to evaluate candidates, manage requisitions, and review qualification scores."
                  : "Sign in to submit job applications, track match scores, and manage your career profile."
                : portalRole === "recruiter"
                ? "Register your talent acquisition team to start screening candidates with explainable AI."
                : "Create your applicant account to unlock instant AI resume matching and feedback."}
            </p>
          </div>

          {/* Error & Success Feedback Alerts */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* SIGN IN FORM (Matches Login.png)                              */}
          {/* ============================================================== */}
          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Field: Email Address */}
              <div>
                <label
                  htmlFor={emailInputId}
                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id={emailInputId}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Input Field"
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20 text-slate-900 placeholder:text-slate-400 text-sm transition-all outline-none"
                />
              </div>

              {/* Field: Password */}
              <div>
                <label
                  htmlFor={passwordInputId}
                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id={passwordInputId}
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Input Field"
                    className="w-full h-11 px-3.5 pr-10 rounded-lg border border-slate-300 focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20 text-slate-900 placeholder:text-slate-400 text-sm transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row (matching Login.png) */}
              <div className="flex items-center justify-between pt-1">
                <label htmlFor={rememberCheckboxId} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id={rememberCheckboxId}
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2196F3] focus:ring-[#2196F3] cursor-pointer"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm font-medium text-[#2196F3] hover:text-[#1e88e5] hover:underline transition-colors cursor-pointer"
                >
                  Forgot your password?
                </button>
              </div>

              {/* Primary CTA: "Log in" (Solid Blue Button, matching Login.png) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-2 bg-[#2196F3] hover:bg-[#1e88e5] text-white font-bold rounded-lg shadow-sm hover:shadow transition-all text-base flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Log in</span>
                )}
              </button>

              {/* Disclaimer: Terms of Service & Privacy Policy (matching Login.png) */}
              <p className="text-xs text-slate-500 text-center pt-2 leading-relaxed">
                By logging in, you agree to our{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal("terms")}
                  className="font-bold text-slate-800 hover:underline inline cursor-pointer"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal("privacy")}
                  className="font-bold text-slate-800 hover:underline inline cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </form>
          ) : (
            /* ============================================================== */
            /* SIGN UP FORM (Clean transition when clicking Signup instead)   */
            /* ============================================================== */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Input Field"
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20 text-slate-900 placeholder:text-slate-400 text-sm transition-all outline-none"
                />
              </div>

              {portalRole === "recruiter" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Input Field"
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20 text-slate-900 placeholder:text-slate-400 text-sm transition-all outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="Input Field"
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20 text-slate-900 placeholder:text-slate-400 text-sm transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showSignUpPassword ? "text" : "password"}
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Input Field"
                    className="w-full h-11 px-3.5 pr-10 rounded-lg border border-slate-300 focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20 text-slate-900 placeholder:text-slate-400 text-sm transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Input Field"
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20 text-slate-900 placeholder:text-slate-400 text-sm transition-all outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-3 bg-[#2196F3] hover:bg-[#1e88e5] text-white font-bold rounded-lg shadow-sm hover:shadow transition-all text-base flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>

              <p className="text-xs text-slate-500 text-center pt-2 leading-relaxed">
                By creating an account, you agree to our{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal("terms")}
                  className="font-bold text-slate-800 hover:underline inline cursor-pointer"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal("privacy")}
                  className="font-bold text-slate-800 hover:underline inline cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </form>
          )}

          {/* Bottom Switch Link (matches Login.png bottom) */}
          <div className="text-center text-sm text-slate-600 mt-10">
            {mode === "signin" ? (
              <span>
                Don&apos;t have an Account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg("");
                    setSuccessMsg("");
                    setMode("signup");
                  }}
                  className="font-semibold text-[#2196F3] hover:underline ml-1 cursor-pointer"
                >
                  Signup instead
                </button>
              </span>
            ) : (
              <span>
                Already have an Account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg("");
                    setSuccessMsg("");
                    setMode("signin");
                  }}
                  className="font-semibold text-[#2196F3] hover:underline ml-1 cursor-pointer"
                >
                  Log in instead
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Bar: Careers Link */}
        <div className="w-full flex items-center justify-end text-xs text-slate-400 pt-6 border-t border-slate-100">
          <Link href="/careers" className="hover:text-slate-600 hover:underline transition-colors">
            Browse Careers Directory →
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FORGOT PASSWORD MODAL                                          */}
      {/* ============================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(false);
                setForgotStatus("idle");
                setForgotMessage("");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2196F3] flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reset Your Password</h3>
                <p className="text-xs text-slate-500">We will email you a secure link to reset it.</p>
              </div>
            </div>

            {forgotStatus === "success" ? (
              <div className="py-4 space-y-4">
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                  <span>{forgotMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 bg-[#2196F3] text-white font-semibold rounded-lg hover:bg-[#1e88e5] transition-colors text-sm cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
                {forgotStatus === "error" && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    {forgotMessage}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-300 focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20 text-slate-900 text-sm outline-none"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotStatus === "loading"}
                    className="px-4 py-2 bg-[#2196F3] text-white text-sm font-semibold rounded-lg hover:bg-[#1e88e5] disabled:opacity-50 cursor-pointer"
                  >
                    {forgotStatus === "loading" ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TERMS / PRIVACY MODAL                                          */}
      {/* ============================================================== */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowTermsModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2196F3] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {showTermsModal === "terms" ? "Terms of Service" : "Privacy & Data Policy"}
                </h3>
                <p className="text-xs text-slate-500">TalentMatch AI Recruitment Standards</p>
              </div>
            </div>

            <div className="overflow-y-auto space-y-3.5 text-xs text-slate-600 leading-relaxed pr-2">
              {showTermsModal === "terms" ? (
                <>
                  <p className="font-semibold text-slate-800">1. Explainable AI Decision Support</p>
                  <p>
                    TalentMatch operates strictly as an assistive decision-support platform. Match scores, rubric weights, and bluff analysis serve to guide human recruiters, who maintain absolute hiring authority.
                  </p>
                  <p className="font-semibold text-slate-800">2. Sentence-Grounded Proof</p>
                  <p>
                    All qualification evaluation is anchored in sentence-level evidence extracted from verifiable candidate resumes, preventing automated hallucinations.
                  </p>
                  <p className="font-semibold text-slate-800">3. Human-in-the-Loop Safeguards</p>
                  <p>
                    No applicant will be unilaterally hired or rejected by automated algorithmic processes without human review.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-800">1. Demographic Blind Screening</p>
                  <p>
                    TalentMatch automatically masks non-merit demographic identifiers (candidate name, gender, contact details, graduation years, and institutional prestige) to ensure fair, unbiased evaluation.
                  </p>
                  <p className="font-semibold text-slate-800">2. Data Confidentiality</p>
                  <p>
                    When a deployment enables AI-assisted screening, TalentMatch removes common identifiers before sending resume text to its AI provider. The deployment privacy notice describes the provider and its data handling.
                  </p>
                  <p className="font-semibold text-slate-800">3. Applicant Rights</p>
                  <p>
                    Applicants retain full rights to inspect their merit evaluation rubric breakdown and request data deletion at any time.
                  </p>
                </>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTermsModal(null)}
                className="px-5 py-2 bg-[#2196F3] text-white text-xs font-semibold rounded-lg hover:bg-[#1e88e5] cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
