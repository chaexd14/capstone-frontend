import { CareersClient } from "@/components/applicant/CareersClient";
import type { Job } from "@/types/job";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

interface PublicJobsResponse {
  next: string | null;
  results: Job[];
}

async function getInitialJobs(): Promise<{
  jobs: Job[];
  hasMore: boolean;
  backendOnline: boolean;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs/?page=1&page_size=20`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
    });
    if (!response.ok) throw new Error(`Jobs API returned ${response.status}`);
    const data = (await response.json()) as PublicJobsResponse;
    return { jobs: data.results, hasMore: Boolean(data.next), backendOnline: true };
  } catch (error) {
    console.error("Unable to pre-render public jobs:", error);
    return { jobs: [], hasMore: false, backendOnline: false };
  }
}

export default async function CareersPage() {
  const initial = await getInitialJobs();
  return (
    <CareersClient
      initialJobs={initial.jobs}
      initialHasMoreJobs={initial.hasMore}
      initialBackendOnline={initial.backendOnline}
    />
  );
}
