"use client";

import { Button } from "@/components/ui/button";
import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { JobProfileView } from "@/components/recruiter/JobProfileView";

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
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <span className="text-sm text-slate-500 ">
          Loading job #{jobId}...
        </span>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white space-y-3 my-8">
        <h2 className="text-base font-bold text-slate-900">Job not found</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Job #{jobId} may have been removed or could not be loaded. Return to the job list and try again.
        </p>
        <Button
          onClick={() => router.push("/admin?view=jobs")}
          variant="outline"
          size="sm"
          className="text-sm font-semibold"
        >
          &larr; Back to jobs
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
