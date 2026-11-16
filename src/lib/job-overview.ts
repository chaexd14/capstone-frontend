import type { Job } from "@/types/job";

export function getLegacyJobOverview(job: Pick<Job, "description" | "department">): string {
  if (job.description) {
    const summary = job.description
      .split(/\r?\n|•|\* |(?<=[.!?])\s+/)
      .map((line) => line.trim().replace(/^[-*•\s]+/, ""))
      .find((line) => line.length > 25 && !/^(qualifications?|requirements?|how to apply)/i.test(line));
    if (summary) return summary.endsWith(".") ? summary : `${summary}.`;
  }
  return `Learn more about this opportunity with the ${job.department || "hiring"} team.`;
}

export function getJobOverview(job: Pick<Job, "job_overview" | "description" | "department">): string {
  return job.job_overview?.trim() || getLegacyJobOverview(job);
}

export function truncateJobOverview(overview: string, maxLength = 170): string {
  if (overview.length <= maxLength) return overview;
  const clipped = overview.slice(0, maxLength + 1);
  const breakAt = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, breakAt > maxLength * 0.65 ? breakAt : maxLength).trimEnd()}…`;
}
