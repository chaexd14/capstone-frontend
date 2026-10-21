"use client";

import React, { useState, useEffect, useId } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShowcasePanel } from "@/components/auth/ShowcasePanel";
import { toast } from "@/components/ui/sonner";
import {
  FieldError,
  FormAlertNote,
  getAuthInputClasses,
} from "@/components/ui/form-error";
import {
  validateEmail,
  validatePasswordLogin,
} from "@/lib/validation";
import {
  Loader2,
  Eye,
  EyeOff,
  Mail,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LoginPageComponentProps {
  initialRole?: "recruiter" | "applicant";
}

export function LoginPageComponent({ initialRole = "applicant" }: LoginPageComponentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const errorParam = searchParams.get("error");
  const roleParam = searchParams.get("role") as "recruiter" | "applicant" | null;

  const [portalRole] = useState<"recruiter" | "applicant">(roleParam || initialRole);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Field-level & Form-level validation states ("Reward Early, Punish Late")
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string | null;
    password?: string | null;
  }>({});
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
  }>({});
  const [formNotice, setFormNotice] = useState<{
    variant: "error" | "warning" | "info";
    title: string;
    description: string;
  } | null>(null);

  // Forgot Password Modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState<string | null>(null);
  const [forgotEmailTouched, setForgotEmailTouched] = useState(false);
  const [forgotNotice, setForgotNotice] = useState<{
    variant: "error" | "success";
    title: string;
    description: string;
  } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState<"terms" | "privacy" | null>(null);

  const supabase = createClient();
  const emailInputId = useId();
  const passwordInputId = useId();
  const rememberCheckboxId = useId();
  const forgotEmailInputId = useId();

  // Load remembered email
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("talentmatch_saved_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch { }
  }, []);

  // Show error from query parameters if user was redirected
  useEffect(() => {
    if (errorParam === "unauthorized") {
      const msg = "Please sign in with authorized recruiter credentials to access that workspace.";
      setFormNotice({
        variant: "error",
        title: "Authentication Required",
        description: msg,
      });
      toast.error("Authentication Required", { description: msg });
    } else if (errorParam === "recruiter_only") {
      const msg = "That section requires a verified recruiter account.";
      setFormNotice({
        variant: "error",
        title: "Access Restricted",
        description: msg,
      });
      toast.error("Access Restricted", { description: msg });
    } else if (errorParam === "account_conflict") {
      const msg = "Your previous session was signed out so you can switch portals cleanly.";
      setFormNotice({
        variant: "warning",
        title: "Session Switched",
        description: msg,
      });
      toast.warning("Session Switched", { description: msg });
    }
  }, [errorParam]);

  // Signup URL depends on current role
  const signupUrl = portalRole === "recruiter" ? "/recruiter/signup" : "/signup";

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (formNotice) setFormNotice(null);
    if (touched.email || fieldErrors.email) {
      const err = validateEmail(value);
      if (!err) {
        setFieldErrors((prev) => ({ ...prev, email: null }));
      } else if (touched.email) {
        setFieldErrors((prev) => ({ ...prev, email: err }));
      }
    }
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (formNotice) setFormNotice(null);
    if (touched.password || fieldErrors.password) {
      const err = validatePasswordLogin(value);
      if (!err) {
        setFieldErrors((prev) => ({ ...prev, password: null }));
      } else if (touched.password) {
        setFieldErrors((prev) => ({ ...prev, password: err }));
      }
    }
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    setFieldErrors((prev) => ({ ...prev, password: validatePasswordLogin(password) }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormNotice(null);

    const emailErr = validateEmail(email);
    const passwordErr = validatePasswordLogin(password);

    setTouched({ email: true, password: true });
    setFieldErrors({ email: emailErr, password: passwordErr });

    if (emailErr || passwordErr) {
      toast.warning("Check Highlighted Fields", {
        description: emailErr || passwordErr || "Please enter a valid email address and password.",
      });
      return;
    }

    const cleanEmail = email.trim();
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem("talentmatch_saved_email", cleanEmail);
      } else {
        localStorage.removeItem("talentmatch_saved_email");
      }
    } catch { }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        throw error;
      }

      const userRole = data.user?.user_metadata?.role;

      if (portalRole === "recruiter" && userRole === "applicant") {
        await supabase.auth.signOut();
        const roleMsg = "This account is registered as a Candidate. Please sign in through the Candidate portal.";
        setFormNotice({
          variant: "error",
          title: "Recruiter Access Denied",
          description: roleMsg,
        });
        toast.error("Access Denied", {
          description: roleMsg,
        });
        setLoading(false);
        return;
      }

      try {
        const token = data.session?.access_token || "";
        const userInfo = {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.user_metadata?.full_name || cleanEmail.split("@")[0],
          role: userRole || portalRole,
        };
        if (userRole === "recruiter" || portalRole === "recruiter") {
          localStorage.setItem("talentmatch_recruiter_user", JSON.stringify(userInfo));
          localStorage.setItem("talentmatch_recruiter_token", token);
        } else {
          localStorage.setItem("talentmatch_user", JSON.stringify(userInfo));
          localStorage.setItem("talentmatch_token", token);
        }
      } catch { }

      toast.success("Welcome back!", {
        description: "Signing you in to your workspace...",
      });

      setTimeout(() => {
        if (userRole === "recruiter") {
          router.push(nextParam || "/recruiter");
        } else {
          router.push(nextParam || "/careers");
        }
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : "";
      const friendlyMessage =
        /invalid login credentials/i.test(rawMessage)
          ? "Incorrect email or password. Double-check your credentials or reset your password below."
          : rawMessage || "Invalid login credentials. Please check your email and password and try again.";

      setFormNotice({
        variant: "error",
        title: "Sign In Failed",
        description: friendlyMessage,
      });
      toast.error("Sign In Failed", {
        description: friendlyMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmailChange = (value: string) => {
    setForgotEmail(value);
    if (forgotNotice) setForgotNotice(null);
    if (forgotEmailTouched || forgotEmailError) {
      const err = validateEmail(value);
      setForgotEmailError(err);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotNotice(null);
    setForgotEmailTouched(true);

    const emailErr = validateEmail(forgotEmail);
    setForgotEmailError(emailErr);

    if (emailErr) {
      toast.warning("Valid Email Required", {
        description: emailErr,
      });
      return;
    }

    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) throw error;

      toast.success("Password Reset Link Sent", {
        description: "Please check your inbox for instructions to reset your password.",
      });
      setShowForgotModal(false);
      setForgotEmail("");
      setForgotEmailError(null);
      setForgotEmailTouched(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to send reset link. Please verify your email address and try again.";
      setForgotNotice({
        variant: "error",
        title: "Reset Request Failed",
        description: message,
      });
      toast.error("Reset Failed", {
        description: message,
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-white text-slate-900 font-sans selection:bg-[#2196F3] selection:text-white antialiased">
      {/* ============================================================== */}
      {/* LEFT COLUMN: Solid Blue Showcase (Exact Match to Login.png)     */}
      {/* ============================================================== */}
      <ShowcasePanel />

      {/* ============================================================== */}
      {/* RIGHT COLUMN: Crisp White Login Form (Exact Match to Login.png) */}
      {/* ============================================================== */}
      <div className="min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-white relative">
        {/* Top Header: Canonical TM Logo + Brand Name + Back to Home */}
        <div className="w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#2196F3] text-white font-bold text-sm flex items-center justify-center tracking-tight shadow-2xs transition-transform group-hover:scale-105">
              TM
            </div>
            <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-[#2196F3] transition-colors">
              Talent Match
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#2196F3] flex items-center gap-1.5 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-50"
          >
            <span>&larr; Back to Home</span>
          </Link>
        </div>

        {/* Center Auth Form Container */}
        <div className="w-full max-w-[430px] mx-auto my-auto py-8">
          {/* Welcome Back Header (matching Login.png) */}
          <div className="text-center mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
              {portalRole === "recruiter"
                ? "Sign in to evaluate candidates, manage requisitions, and review qualification scores."
                : "Sign in to submit job applications, track match scores, and manage your career profile."}
            </p>
          </div>

          {formNotice && (
            <div className="mb-4">
              <FormAlertNote
                variant={formNotice.variant}
                title={formNotice.title}
                description={formNotice.description}
                onDismiss={() => setFormNotice(null)}
              />
            </div>
          )}

          {/* Form Fields matching Login.png */}
          <form onSubmit={handleSignIn} noValidate className="space-y-4">
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
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="name@company.com"
                autoComplete="email"
                spellCheck={false}
                autoCapitalize="none"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? `${emailInputId}-error` : undefined}
                className={getAuthInputClasses(!!fieldErrors.email)}
              />
              <FieldError id={`${emailInputId}-error`} message={fieldErrors.email} />
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
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={handlePasswordBlur}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? `${passwordInputId}-error` : undefined}
                  className={getAuthInputClasses(!!fieldErrors.password, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <FieldError id={`${passwordInputId}-error`} message={fieldErrors.password} />
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
                onClick={() => {
                  setForgotEmail(email.trim());
                  setForgotEmailError(null);
                  setForgotEmailTouched(false);
                  setForgotNotice(null);
                  setShowForgotModal(true);
                }}
                className="text-sm font-medium text-[#2196F3] hover:text-[#1976D2] hover:underline transition-colors cursor-pointer"
              >
                Forgot your password?
              </button>
            </div>

            {/* Primary CTA: "Log in" (Solid Blue Button, matching Login.png) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 sm:h-12 mt-2 bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold rounded-xl shadow-xs hover:shadow transition-all text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
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

          {/* Bottom Switch Link: Navigates directly to /signup (matches Login.png bottom) */}
          <div className="text-center text-sm text-slate-600 mt-10">
            <span>
              Don&apos;t have an Account?{" "}
              <Link
                href={signupUrl}
                className="font-semibold text-[#2196F3] hover:underline ml-1 cursor-pointer"
              >
                Signup instead
              </Link>
            </span>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2196F3] flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">Reset Your Password</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">We will email you a secure link to reset it.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {forgotNotice && (
            <div className="mt-2">
              <FormAlertNote
                variant={forgotNotice.variant}
                title={forgotNotice.title}
                description={forgotNotice.description}
                onDismiss={() => setForgotNotice(null)}
              />
            </div>
          )}

          <form onSubmit={handlePasswordReset} noValidate className="space-y-4 mt-2">
            <div>
              <label
                htmlFor={forgotEmailInputId}
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Your Registered Email
              </label>
              <input
                id={forgotEmailInputId}
                type="email"
                value={forgotEmail}
                onChange={(e) => handleForgotEmailChange(e.target.value)}
                onBlur={() => {
                  setForgotEmailTouched(true);
                  setForgotEmailError(validateEmail(forgotEmail));
                }}
                placeholder="name@example.com"
                aria-invalid={!!forgotEmailError}
                aria-describedby={forgotEmailError ? `${forgotEmailInputId}-error` : undefined}
                className={getAuthInputClasses(!!forgotEmailError, "h-10")}
              />
              <FieldError id={`${forgotEmailInputId}-error`} message={forgotEmailError} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="px-4 py-2 bg-[#2196F3] text-white text-sm font-semibold rounded-xl hover:bg-[#1976D2] disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {forgotLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog
        open={showTermsModal === "terms"}
        onOpenChange={(open) => !open && setShowTermsModal(null)}
      >
        <DialogContent className="max-w-lg bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2196F3] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Terms of Service
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  TalentMatch AI Recruitment Standards
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto space-y-3.5 text-xs text-slate-600 leading-relaxed max-h-[60vh] pr-2 mt-2">
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">1. Explainable AI Decision Support</p>
              <p>
                TalentMatch operates strictly as an assistive decision-support platform. Match scores, rubric weights, and bluff analysis serve to guide human recruiters, who maintain absolute hiring authority.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">2. Sentence-Grounded Proof</p>
              <p>
                All qualification evaluation is anchored in sentence-level evidence extracted from verifiable candidate resumes, preventing automated hallucinations.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">3. Human-in-the-Loop Safeguards</p>
              <p>
                No applicant will be unilaterally hired or rejected by automated algorithmic processes without human review.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setShowTermsModal(null)}
              className="px-5 py-2 bg-[#2196F3] text-white text-xs font-semibold rounded-xl hover:bg-[#1976D2] cursor-pointer shadow-xs"
            >
              I Understand
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog
        open={showTermsModal === "privacy"}
        onOpenChange={(open) => !open && setShowTermsModal(null)}
      >
        <DialogContent className="max-w-lg bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2196F3] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Privacy &amp; Data Policy
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  TalentMatch AI Recruitment Standards
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto space-y-3.5 text-xs text-slate-600 leading-relaxed max-h-[60vh] pr-2 mt-2">
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">1. Demographic Blind Screening</p>
              <p>
                TalentMatch automatically masks non-merit demographic identifiers (candidate name, gender, contact details, graduation years, and institutional prestige) to ensure fair, unbiased evaluation.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">2. Data Confidentiality</p>
              <p>
                Uploaded resumes are processed securely and never sold, shared with third-party advertisers, or used to train external public models.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">3. Applicant Rights</p>
              <p>
                Applicants retain full rights to inspect their merit evaluation rubric breakdown and request data deletion at any time.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setShowTermsModal(null)}
              className="px-5 py-2 bg-[#2196F3] text-white text-xs font-semibold rounded-xl hover:bg-[#1976D2] cursor-pointer shadow-xs"
            >
              I Understand
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
