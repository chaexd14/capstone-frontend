import { expect, test } from "@playwright/test";

import {
  getJobOverview,
  getLegacyJobOverview,
  truncateJobOverview,
} from "../../src/lib/job-overview";

test("stored overview is preferred over responsibility text", () => {
  const job = {
    job_overview: "Join a collaborative team improving the hiring experience for applicants.",
    description: "Build APIs.\nReview code.",
    department: "Engineering",
  };
  expect(getJobOverview(job)).toBe(job.job_overview);
});

test("legacy jobs derive a readable overview from existing responsibilities", () => {
  const job = {
    job_overview: null,
    description: "• Maintain dependable platform services for recruiters and applicants\n• Review production health",
    department: "Engineering",
  };
  expect(getJobOverview(job)).toBe(
    "Maintain dependable platform services for recruiters and applicants."
  );
  expect(getLegacyJobOverview(job)).toBe(getJobOverview(job));
});

test("card overview truncation preserves a word boundary", () => {
  const summary = truncateJobOverview(
    "Join a collaborative engineering team building thoughtful tools for recruiters and applicants across the hiring journey.",
    70
  );
  expect(summary).toBe("Join a collaborative engineering team building thoughtful tools for…");
  expect(summary.length).toBeLessThanOrEqual(71);
});

test("public job cards render the recruiter-authored overview without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText(/Join a product engineering team building dependable tools/).first()
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  ).toBe(false);
});
