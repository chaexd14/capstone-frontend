"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { JobProfileView } from "@/components/recruiter/JobProfileView";
import { Button } from "@/components/ui/button";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const {
    jobs,
    applications,
    anonymize,
    loading,
    onJobUpdated,
    onJobArchived,
    onApplicationUpdated,
  } = useRecruiter();

  const currentJob = useMemo(() => {
    return jobs.find((j) => String(j.id) === String(jobId));
  }, [jobs, jobId]);

  if (loading && !currentJob) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#2196F3]" />
        <span className="text-xs text-slate-500 font-mono">
          Loading job requisition #{jobId}...
        </span>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white space-y-3 my-8">
        <h2 className="text-base font-bold text-slate-900">Job Requisition Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requisition #{jobId} does not exist, may have been deleted, or is not yet loaded.
        </p>
        <Button
          onClick={() => router.push("/admin?view=jobs")}
          variant="outline"
          size="sm"
          className="text-xs font-semibold"
        >
          &larr; Back to Job Requisitions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <JobProfileView
        job={currentJob}
        applications={applications}
        anonymize={anonymize}
        onBack={() => router.push("/admin?view=jobs")}
        onApplicationUpdated={onApplicationUpdated}
        onJobUpdated={onJobUpdated}
        onJobArchived={(id) => {
          onJobArchived(id);
          router.push("/admin?view=jobs");
        }}
      />
    </div>
  );
}
