import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { LoginPageComponent } from "@/components/auth/LoginPageComponent";

export default function GeneralLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-slate-500 font-medium">Loading TalentMatch Portal...</span>
        </div>
      }
    >
      <LoginPageComponent initialRole="applicant" />
    </Suspense>
  );
}
