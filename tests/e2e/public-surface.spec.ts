import { expect, test } from "@playwright/test";

test("landing page renders and remains within the viewport", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Find the job that fits your skills, not just your keywords.",
    })
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});
test("responses enforce a nonce-based content security policy", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  const policy = response.headers()["content-security-policy"];
  expect(policy).toContain("script-src 'self' 'nonce-");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
});

test("redirected users receive an actionable authentication message", async ({ page }) => {
  await page.goto("/login?error=unauthorized");
  const notice = page.getByRole("alert").filter({ hasText: "Authentication Required" });
  await expect(notice.getByText("Authentication Required", { exact: true })).toBeVisible();
  await expect(notice.getByText(/authorized recruiter credentials/i)).toBeVisible();
});
