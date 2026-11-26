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

  const safeReturn = await request.get(
    "/auth/reset-session?next=%2Fcareers%3Ftab%3DBOOKMARK",
    {
      headers: { cookie: staleCookie },
      maxRedirects: 0,
    }
  );
  expect(safeReturn.headers()["location"]).toMatch(
    /\/careers\?tab=BOOKMARK$/
  );

  const externalReturn = await request.get(
    "/auth/reset-session?next=https%3A%2F%2Fevil.example",
    { maxRedirects: 0 }
  );
  expect(externalReturn.headers()["location"]).toMatch(/\/careers$/);
});

test("an invalid stored session recovers once and returns to the requested page", async ({
  context,
  page,
}) => {
  const fakeSession = {
    access_token: "invalid.access.token",
    refresh_token: "stale-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "00000000-0000-4000-8000-000000000000",
      aud: "authenticated",
      role: "authenticated",
      email: "safari-recovery@example.test",
    },
  };
  const encodedSession = Buffer.from(JSON.stringify(fakeSession)).toString(
    "base64url"
  );

  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value: `base64-${encodedSession}`,
      url: "http://localhost:3100",
    },
  ]);
  await page.route("http://127.0.0.1:54321/auth/v1/user", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: "bad_jwt", message: "Invalid JWT" }),
    });
  });

  let recoveryRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/auth/reset-session")) recoveryRequests += 1;
  });

  await page.goto("/careers");
  await expect.poll(() => recoveryRequests).toBe(1);
  await expect(page).toHaveURL(/\/careers$/);
  await expect
    .poll(async () =>
      (await context.cookies()).some((cookie) =>
        cookie.name.startsWith("sb-127-auth-token")
      )
    )
    .toBe(false);
});

test("redirected users receive an actionable authentication message", async ({ page }) => {
  await page.goto("/login?error=unauthorized");
  const notice = page.getByRole("alert").filter({ hasText: "Authentication Required" });
  await expect(notice.getByText("Authentication Required", { exact: true })).toBeVisible();
  await expect(notice.getByText(/authorized recruiter credentials/i)).toBeVisible();
});
