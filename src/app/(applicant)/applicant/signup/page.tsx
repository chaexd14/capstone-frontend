import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SignupPageComponent } from "@/components/auth/SignupPageComponent";

export default function ApplicantSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#2196F3]" />
          <span className="text-xs text-slate-500 font-medium">Loading Candidate Registration...</span>
        </div>
      }
    >
      <SignupPageComponent initialRole="applicant" />
    </Suspense>
  );
}
