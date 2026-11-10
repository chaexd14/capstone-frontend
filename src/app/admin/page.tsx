"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { DashboardOverview } from "@/components/recruiter/DashboardOverview";
import { JobsView } from "@/components/recruiter/JobsView";
import { AllApplicantsView } from "@/components/recruiter/AllApplicantsView";
import { CreateJobModal } from "@/components/recruiter/CreateJobModal";
import { CandidateAnalysisModal } from "@/components/recruiter/CandidateAnalysisModal";
import { Application } from "@/types/application";

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    jobs,
    applications,
    anonymize,
    loading,
    isCreateJobOpen,
    setIsCreateJobOpen,
    onJobCreated,
    onApplicationUpdated,
  } = useRecruiter();

  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Check for legacy deep link: ?jobId=... and forward to dedicated dynamic route /admin/jobs/[id]
  useEffect(() => {
    const jobIdParam = searchParams.get("jobId");
    if (jobIdParam) {
      router.replace(`/admin/jobs/${jobIdParam}`);
    }
  }, [searchParams, router]);

  const activeView = searchParams.get("view") || "dashboard";

  if (activeView !== "platform" && loading && jobs.length === 0 && applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#2196F3]" />
        <span className="text-xs text-slate-500 font-mono">
          Loading Recruiter Management Studio...
        </span>
      </div>
    );
  }

  return (
    <>
      {activeView === "platform" ? (
        <p role="alert" className="py-6 text-sm text-muted-foreground">
          Companies and staff management requires a Super Admin account.
        </p>
      ) : activeView === "jobs" ? (
        <JobsView />
      ) : activeView === "applicants" ? (
        <AllApplicantsView onSelectApplication={setSelectedApplication} />
      ) : (
        <DashboardOverview
          jobs={jobs}
          applications={applications}
          anonymize={anonymize}
          onSelectApplication={setSelectedApplication}
        />
      )}

      {/* Global Modals for Admin Workspace */}
      <CreateJobModal
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        onJobCreated={onJobCreated}
      />

      <CandidateAnalysisModal
        isOpen={selectedApplication !== null}
        application={selectedApplication}
        job={jobs.find((j) => j.id === selectedApplication?.job) || null}
        onClose={() => setSelectedApplication(null)}
        anonymize={anonymize}
        onStatusUpdated={onApplicationUpdated}
      />
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#2196F3]" />
          <span className="text-xs text-slate-500 font-mono">Loading workspace...</span>
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
