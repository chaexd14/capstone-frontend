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

test("public routes tolerate stale auth cookies and expose session recovery", async ({
  request,
}) => {
  const staleCookie = "sb-127-auth-token.0=base64-stale-session";
  const careers = await request.get("/careers", {
    headers: { cookie: staleCookie },
  });
  expect(careers.ok()).toBeTruthy();

  const reset = await request.get("/auth/reset-session", {
    headers: { cookie: staleCookie },
    maxRedirects: 0,
  });
  expect([307, 308]).toContain(reset.status());
  expect(reset.headers()["location"]).toMatch(/\/careers$/);
  expect(reset.headers()["set-cookie"]).toContain("sb-127-auth-token.0=");
  expect(reset.headers()["set-cookie"]).toContain("Max-Age=0");
});

test("redirected users receive an actionable authentication message", async ({ page }) => {
  await page.goto("/login?error=unauthorized");
  const notice = page.getByRole("alert").filter({ hasText: "Authentication Required" });
  await expect(notice.getByText("Authentication Required", { exact: true })).toBeVisible();
  await expect(notice.getByText(/authorized recruiter credentials/i)).toBeVisible();
});
