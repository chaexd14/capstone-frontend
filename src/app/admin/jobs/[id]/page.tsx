"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { JobProfileView } from "@/components/recruiter/JobProfileView";
import { fetchApi } from "@/lib/api";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { usePaginatedApi } from "@/hooks/use-paginated-api";
import { ServerPagination } from "@/components/ui/server-pagination";
import { ErrorState } from "@/components/ui/feedback";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const {
    jobs,
    anonymize,
    loading,
    onJobUpdated,
    onJobArchived,
    onApplicationUpdated,
  } = useRecruiter();
  const [fetchedJob, setFetchedJob] = useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [page, setPage] = useState(1);
  const {
    data: applicationsPage,
    loading: applicationsLoading,
    error: applicationsError,
    refresh: refreshApplications,
  } = usePaginatedApi<Application>(
    jobId ? `/jobs/${jobId}/applicants/?page=${page}&page_size=20` : null
  );

  const currentJob = useMemo(() => {
    return fetchedJob || jobs.find((j) => String(j.id) === String(jobId));
  }, [fetchedJob, jobs, jobId]);

  useEffect(() => {
    if (!jobId || fetchedJob) return;
    void fetchApi<Job>(`/jobs/${jobId}/`).then(setFetchedJob).catch(() => null).finally(() => setDetailLoading(false));
  }, [fetchedJob, jobId]);

  if ((loading || detailLoading) && !currentJob) {
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
        applications={applicationsPage?.results ?? []}
        anonymize={anonymize}
        onBack={() => router.push("/admin?view=jobs")}
        onApplicationUpdated={onApplicationUpdated}
        onJobUpdated={onJobUpdated}
        onJobArchived={(id) => {
          onJobArchived(id);
          router.push("/admin?view=jobs");
        }}
      />
      {applicationsError ? (
        <ErrorState
          title="Could not load applicants"
          description={applicationsError}
          onAction={() => void refreshApplications()}
          className="rounded-2xl border border-border bg-card"
        />
      ) : null}
      {applicationsPage ? (
        <ServerPagination
          page={applicationsPage.page}
          pageSize={applicationsPage.page_size}
          count={applicationsPage.count}
          totalPages={applicationsPage.total_pages}
          loading={applicationsLoading}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
