"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRecruiter } from "@/context/RecruiterContext";
import { DashboardOverview } from "@/components/recruiter/DashboardOverview";
import { JobsView } from "@/components/recruiter/JobsView";
import { AllApplicantsView } from "@/components/recruiter/AllApplicantsView";
import { RecruitmentPipelineView } from "@/components/recruiter/RecruitmentPipelineView";
import { MessageTemplatesView } from "@/components/recruiter/MessageTemplatesView";
import { CreateJobModal } from "@/components/recruiter/CreateJobModal";
import { CandidateAnalysisModal } from "@/components/recruiter/CandidateAnalysisModal";
import { Application } from "@/types/application";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { PlatformManagement } from "@/components/recruiter/PlatformManagement";
import { SystemMonitoring } from "@/components/recruiter/SystemMonitoring";

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
    currentUser,
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
  const isSuperAdmin = currentUser?.role === "superadmin";

  if (isSuperAdmin) {
    return activeView === "platform" ? <PlatformManagement /> : <SystemMonitoring />;
  }

  if (activeView !== "platform" && loading && jobs.length === 0 && applications.length === 0) {
    return (
      <ContextualLoading label="Loading recruiter workspace" />
    );
  }

  return (
    <>
      {activeView === "platform" || activeView === "system" ? (
        <p role="alert" className="py-6 text-sm text-muted-foreground">
          System administration requires a Super Admin account.
        </p>
      ) : activeView === "jobs" ? (
        <JobsView />
      ) : activeView === "applicants" ? (
        <AllApplicantsView onSelectApplication={setSelectedApplication} />
      ) : activeView === "pipeline" ? (
        <RecruitmentPipelineView />
      ) : activeView === "templates" ? (
        <MessageTemplatesView />
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
        <ContextualLoading label="Loading recruiter workspace" />
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
