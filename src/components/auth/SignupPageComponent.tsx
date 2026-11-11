"use client";

import { getSafeRedirectUrl } from "@/lib/auth-redirect";
import React, { useState, useId, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShowcasePanel } from "@/components/auth/ShowcasePanel";
import { toast } from "@/components/ui/sonner";
import {
  FieldError,
  FormAlertNote,
  PasswordStrengthChecklist,
  getAuthInputClasses,
} from "@/components/ui/form-error";
import {
  validateName,
  validateEmail,
  validatePasswordStrength,
  validatePasswordMatch,
} from "@/lib/validation";
import {
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { TermsAgreementModal } from "@/components/auth/TermsAgreementModal";

interface SignupPageComponentProps {
  initialRole?: "applicant";
}

type SignupField = "firstName" | "lastName" | "email" | "password" | "repeatPassword";

export function SignupPageComponent({}: SignupPageComponentProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [loading, setLoading] = useState(false);

  // Form Fields matching Sign up.png
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  // Validation states ("Reward Early, Punish Late")
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SignupField, string | null>>>({});
  const [touched, setTouched] = useState<Partial<Record<SignupField, boolean>>>({});
  const [formNotice, setFormNotice] = useState<{
    variant: "error" | "warning" | "info";
    title: string;
    description: string;
  } | null>(null);

  // Legal Agreement Modal
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalMode, setLegalModalMode] = useState<"gate" | "preview">("gate");
  const [legalModalSection, setLegalModalSection] = useState<"terms" | "privacy">("terms");

  const supabase = createClient();
  const firstNameInputId = useId();
  const lastNameInputId = useId();
  const emailInputId = useId();
  const passwordInputId = useId();
  const repeatPasswordInputId = useId();

  const resolvedNextUrl = getSafeRedirectUrl(nextParam, "/careers");
  const loginUrl = "/login";

  const passwordValidation = useMemo(() => validatePasswordStrength(password), [password]);
  const passwordsMatch =
    repeatPassword.length > 0 && password.length > 0 && password === repeatPassword;

  const updateFieldError = (field: SignupField, errorMsg: string | null) => {
    setFieldErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (formNotice) setFormNotice(null);
    if (touched.firstName || fieldErrors.firstName) {
      const err = validateName(val, "First name");
      if (!err) updateFieldError("firstName", null);
      else if (touched.firstName) updateFieldError("firstName", err);
    }
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    if (formNotice) setFormNotice(null);
    if (touched.lastName || fieldErrors.lastName) {
      const err = validateName(val, "Last name");
      if (!err) updateFieldError("lastName", null);
      else if (touched.lastName) updateFieldError("lastName", err);
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (formNotice) setFormNotice(null);
    if (touched.email || fieldErrors.email) {
      const err = validateEmail(val);
      if (!err) updateFieldError("email", null);
      else if (touched.email) updateFieldError("email", err);
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (formNotice) setFormNotice(null);
    const pwCheck = validatePasswordStrength(val);
    if (touched.password || fieldErrors.password) {
      if (pwCheck.isValid) updateFieldError("password", null);
      else if (touched.password) updateFieldError("password", pwCheck.error);
    }
    if (touched.repeatPassword || fieldErrors.repeatPassword) {
      const matchErr = validatePasswordMatch(val, repeatPassword);
      updateFieldError("repeatPassword", matchErr);
    }
  };

  const handleRepeatPasswordChange = (val: string) => {
    setRepeatPassword(val);
    if (formNotice) setFormNotice(null);
    if (touched.repeatPassword || fieldErrors.repeatPassword) {
      const err = validatePasswordMatch(password, val);
      if (!err) updateFieldError("repeatPassword", null);
      else if (touched.repeatPassword) updateFieldError("repeatPassword", err);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormNotice(null);

    const firstErr = validateName(firstName, "First name");
    const lastErr = validateName(lastName, "Last name");
    const emailErr = validateEmail(email);
    const pwErr = passwordValidation.error;
    const repeatErr = validatePasswordMatch(password, repeatPassword);

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      repeatPassword: true,
    });

    const nextErrors: Partial<Record<SignupField, string | null>> = {
      firstName: firstErr,
      lastName: lastErr,
      email: emailErr,
      password: pwErr,
      repeatPassword: repeatErr,
    };
    setFieldErrors(nextErrors);

    const firstFailure = firstErr || lastErr || emailErr || pwErr || repeatErr;
    if (firstFailure) {
      toast.warning("Check Highlighted Fields", {
        description: firstFailure,
      });
      return;
    }

    // Open mandatory terms and privacy agreement gate modal
    setLegalModalMode("gate");
    setLegalModalSection("terms");
    setShowLegalModal(true);
  };

  const handleConfirmSignUp = async () => {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const fullName = `${cleanFirst} ${cleanLast}`.trim();
    const cleanEmail = email.trim();

    setLoading(true);
    setFormNotice(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(resolvedNextUrl)}`,
          data: {
            role: "applicant",
            full_name: fullName,
            first_name: cleanFirst,
            last_name: cleanLast,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: "2026.1",
          },
        },
      });

      if (error?.status === 429) {
        throw new Error("Signup is temporarily limited. Please wait before trying again.");
      }
      if (error) {
        throw error;
      }

      setShowLegalModal(false);

      if (data.session) {
        toast.success("Account Created Successfully!", {
          description: "Welcome to TalentMatch! Redirecting to your dashboard...",
        });
        setTimeout(() => {
          router.push(resolvedNextUrl);
          router.refresh();
        }, 800);
      } else {
        toast.info("Account Created!", {
          description: "Please check your email to confirm your account before logging in.",
        });
        setTimeout(() => {
          router.push(loginUrl);
        }, 1800);
      }
    } catch (err: unknown) {
      setShowLegalModal(false);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create account. Please verify your details and try again.";
      if (/already registered|already exists/i.test(message)) {
        updateFieldError("email", "An account with this email already exists. Try signing in instead.");
      }
      setFormNotice({
        variant: "error",
        title: "Account Creation Failed",
        description: message,
      });
      toast.error("Account Creation Failed", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-white text-slate-900 font-sans selection:bg-[#2196F3] selection:text-white antialiased">
      {/* ============================================================== */}
      {/* LEFT COLUMN: Crisp White Signup Form (Exact Match to Sign up.png) */}
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

        {/* Center Signup Form Container */}
        <div className="w-full max-w-[440px] mx-auto my-auto py-8">
          {/* Create your account today Header (matching Sign up.png) */}
          <div className="text-center mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Create your account today
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
              Create your applicant account to unlock instant AI resume matching and feedback.
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

          {/* Form matching Sign up.png layout */}
          <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
            {/* Row with First name and Last name side by side (matches Sign up.png) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor={firstNameInputId}
                  className="block text-sm font-semibold text-slate-900 mb-1.5"
                >
                  First name <span className="text-rose-500">*</span>
                </label>
                <input
                  id={firstNameInputId}
                  type="text"
                  value={firstName}
                  onChange={(e) => handleFirstNameChange(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, firstName: true }));
                    updateFieldError("firstName", validateName(firstName, "First name"));
                  }}
                  placeholder="e.g. Alex"
                  autoComplete="given-name"
                  aria-invalid={!!fieldErrors.firstName}
                  aria-describedby={fieldErrors.firstName ? `${firstNameInputId}-error` : undefined}
                  className={getAuthInputClasses(!!fieldErrors.firstName)}
                />
                <FieldError id={`${firstNameInputId}-error`} message={fieldErrors.firstName} />
              </div>

              <div>
                <label
                  htmlFor={lastNameInputId}
                  className="block text-sm font-semibold text-slate-900 mb-1.5"
                >
                  Last name <span className="text-rose-500">*</span>
                </label>
                <input
                  id={lastNameInputId}
                  type="text"
                  value={lastName}
                  onChange={(e) => handleLastNameChange(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, lastName: true }));
                    updateFieldError("lastName", validateName(lastName, "Last name"));
                  }}
                  placeholder="e.g. Santos"
                  autoComplete="family-name"
                  aria-invalid={!!fieldErrors.lastName}
                  aria-describedby={fieldErrors.lastName ? `${lastNameInputId}-error` : undefined}
                  className={getAuthInputClasses(!!fieldErrors.lastName)}
                />
                <FieldError id={`${lastNameInputId}-error`} message={fieldErrors.lastName} />
              </div>
            </div>

            {/* Field: Email Address (matches Sign up.png) */}
            <div>
              <label
                htmlFor={emailInputId}
                className="block text-sm font-semibold text-slate-900 mb-1.5"
              >
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                id={emailInputId}
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, email: true }));
                  updateFieldError("email", validateEmail(email));
                }}
                placeholder="alex.santos@company.com"
                autoComplete="email"
                spellCheck={false}
                autoCapitalize="none"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? `${emailInputId}-error` : undefined}
                className={getAuthInputClasses(!!fieldErrors.email)}
              />
              <FieldError id={`${emailInputId}-error`} message={fieldErrors.email} />
            </div>

            {/* Field: Password (matches Sign up.png) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor={passwordInputId}
                  className="block text-sm font-semibold text-slate-900"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">8+ chars, upper, lower &amp; number</span>
              </div>
              <div className="relative">
                <input
                  id={passwordInputId}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, password: true }));
                    updateFieldError("password", passwordValidation.error);
                  }}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? `${passwordInputId}-error` : undefined}
                  className={getAuthInputClasses(!!fieldErrors.password, "pr-11")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  aria-controls={passwordInputId}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
              <PasswordStrengthChecklist
                requirements={passwordValidation.requirements}
                visible={password.length > 0 || !!touched.password}
              />
              <FieldError id={`${passwordInputId}-error`} message={fieldErrors.password} />
            </div>

            {/* Field: Repeat Password (matches Sign up.png) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor={repeatPasswordInputId}
                  className="block text-sm font-semibold text-slate-900"
                >
                  Repeat Password <span className="text-rose-500">*</span>
                </label>
                {passwordsMatch && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    <span>Passwords match</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id={repeatPasswordInputId}
                  type={showRepeatPassword ? "text" : "password"}
                  value={repeatPassword}
                  onChange={(e) => handleRepeatPasswordChange(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, repeatPassword: true }));
                    updateFieldError("repeatPassword", validatePasswordMatch(password, repeatPassword));
                  }}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.repeatPassword}
                  aria-describedby={fieldErrors.repeatPassword ? `${repeatPasswordInputId}-error` : undefined}
                  className={getAuthInputClasses(!!fieldErrors.repeatPassword, "pr-11")}
                />
                <button
                  type="button"
                  onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2196F3]"
                  aria-label={showRepeatPassword ? "Hide password" : "Show password"}
                  aria-pressed={showRepeatPassword}
                  aria-controls={repeatPasswordInputId}
                >
                  {showRepeatPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
              <FieldError id={`${repeatPasswordInputId}-error`} message={fieldErrors.repeatPassword} />
            </div>

            {/* Primary CTA: "Create Account" (Solid Blue Button, matching Sign up.png) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 sm:h-12 mt-2 bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold rounded-xl shadow-xs hover:shadow transition-all text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>

            {/* Disclaimer: Terms of Service & Privacy Policy (matching Sign up.png) */}
            <p className="text-xs text-slate-500 text-center pt-2 leading-relaxed">
              By creating an account, you agree to our{" "}
              <button
                type="button"
                onClick={() => {
                  setLegalModalMode("preview");
                  setLegalModalSection("terms");
                  setShowLegalModal(true);
                }}
                className="font-bold text-slate-800 hover:underline inline cursor-pointer"
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => {
                  setLegalModalMode("preview");
                  setLegalModalSection("privacy");
                  setShowLegalModal(true);
                }}
                className="font-bold text-slate-800 hover:underline inline cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </p>
          </form>

          {/* Bottom Switch Link: Navigates directly to /login (matches Sign up.png bottom) */}
          <div className="text-center text-sm text-slate-600 mt-10">
            <span>
              Already have an Account?{" "}
              <Link
                href={loginUrl}
                className="font-semibold text-[#2196F3] hover:underline ml-1 cursor-pointer"
              >
                Login instead
              </Link>
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: Solid Blue Showcase (Exact Match to Sign up.png) */}
      {/* ============================================================== */}
      <ShowcasePanel />

      {/* Terms of Service & Privacy Policy Modal */}
      {showLegalModal && (
        <TermsAgreementModal
          open={showLegalModal}
          onOpenChange={setShowLegalModal}
          mode={legalModalMode}
          defaultSection={legalModalSection}
          onConfirmAgreement={handleConfirmSignUp}
          submitting={loading}
        />
      )}
    </div>
  );
}
