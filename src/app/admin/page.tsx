"use client";

import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useRecruiter } from "@/context/RecruiterContext";
import { Application } from "@/types/application";
import { ContextualLoading } from "@/components/ui/contextual-loading";

const DashboardOverview = dynamic(() => import("@/components/recruiter/DashboardOverview").then((module) => module.DashboardOverview));
const JobsView = dynamic(() => import("@/components/recruiter/JobsView").then((module) => module.JobsView));
const AllApplicantsView = dynamic(() => import("@/components/recruiter/AllApplicantsView").then((module) => module.AllApplicantsView));
const RecruitmentPipelineView = dynamic(() => import("@/components/recruiter/RecruitmentPipelineView").then((module) => module.RecruitmentPipelineView));
const TasksHubView = dynamic(() => import("@/components/recruiter/TasksHubView").then((module) => module.TasksHubView));
const TalentPoolView = dynamic(() => import("@/components/recruiter/TalentPoolView").then((module) => module.TalentPoolView));
const MessageTemplatesView = dynamic(() => import("@/components/recruiter/MessageTemplatesView").then((module) => module.MessageTemplatesView));
const CreateJobModal = dynamic(() => import("@/components/recruiter/CreateJobModal").then((module) => module.CreateJobModal));
const CandidateAnalysisModal = dynamic(() => import("@/components/recruiter/CandidateAnalysisModal").then((module) => module.CandidateAnalysisModal));
const PlatformManagement = dynamic(() => import("@/components/recruiter/PlatformManagement").then((module) => module.PlatformManagement));
const SystemMonitoring = dynamic(() => import("@/components/recruiter/SystemMonitoring").then((module) => module.SystemMonitoring));
const AdminAccountSettings = dynamic(() => import("@/components/account/AdminAccountSettings").then((module) => module.AdminAccountSettings));

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
  const [selectedQueue, setSelectedQueue] = useState<Application[] | undefined>(undefined);

  const handleSelectApplication = (app: Application, queue?: Application[]) => {
    setSelectedApplication(app);
    setSelectedQueue(queue);
  };

  // Check for legacy deep link: ?jobId=... and forward to dedicated dynamic route /admin/jobs/[id]
  useEffect(() => {
    const jobIdParam = searchParams.get("jobId");
    if (jobIdParam) {
      router.replace(`/admin/jobs/${jobIdParam}`);
    }
  }, [searchParams, router]);

  const activeView = searchParams.get("view") || "dashboard";
  const isSuperAdmin = currentUser?.role === "superadmin";

  if (activeView === "account") {
    return <AdminAccountSettings />;
  }

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
        <AllApplicantsView onSelectApplication={handleSelectApplication} />
      ) : activeView === "pipeline" ? (
        <RecruitmentPipelineView />
      ) : activeView === "tasks" ? (
        <TasksHubView onSelectApplication={handleSelectApplication} />
      ) : activeView === "talent-pool" ? (
        <TalentPoolView onSelectApplication={handleSelectApplication} />
      ) : activeView === "templates" ? (
        <MessageTemplatesView />
      ) : (
        <DashboardOverview
          jobs={jobs}
          applications={applications}
          anonymize={anonymize}
          onSelectApplication={handleSelectApplication}
        />
      )}

      {/* Global Modals for Admin Workspace */}
      {isCreateJobOpen && <CreateJobModal
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        onJobCreated={onJobCreated}
      />}

      {selectedApplication && <CandidateAnalysisModal
        isOpen={selectedApplication !== null}
        application={
          selectedApplication
            ? applications.find((a) => a.id === selectedApplication.id) || selectedApplication
            : null
        }
        applicationsQueue={selectedQueue}
        onSelectApplication={setSelectedApplication}
        job={jobs.find((j) => j.id === selectedApplication?.job) || null}
        onClose={() => {
          setSelectedApplication(null);
          setSelectedQueue(undefined);
        }}
        anonymize={anonymize}
        onStatusUpdated={onApplicationUpdated}
      />}
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
