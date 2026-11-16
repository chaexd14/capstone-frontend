import { expect, test } from "@playwright/test";

test("UI lab exposes canonical controls and interaction states", async ({ page }) => {
  await page.goto("/ui-lab");
  await expect(page.getByRole("heading", { name: "TalentMatch UI Lab" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create job" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Candidate search" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();

  await page.getByRole("button", { name: "Reject candidate" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "Reject this candidate?" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("UI lab remains within narrow viewport", async ({ page }) => {
  await page.goto("/ui-lab");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});

test("status badges preserve readable single-line labels", async ({ page }) => {
  await page.goto("/ui-lab");
  const status = page.getByText("Needs review", { exact: true });

  await expect(status).toHaveCSS("font-size", "14px");
  await expect(status).toHaveCSS("white-space", "nowrap");
});

test("semantic table columns contain long content without page overflow", async ({ page }) => {
  await page.goto("/ui-lab");
  const table = page.getByTestId("semantic-table");
  const email = table.locator('[title="avery.long.candidate.email.address@example-enterprise.com"]');
  const status = table.getByText("Under review", { exact: true });

  await expect(table.getByRole("columnheader", { name: "Fit" })).toHaveCSS("white-space", "nowrap");
  await expect(email).toHaveCSS("text-overflow", "ellipsis");
  await expect(status).toHaveCSS("font-size", "14px");
  await expect(status).toHaveCSS("white-space", "nowrap");

  const geometry = await table.evaluate((element) => {
    const container = element.parentElement;
    const emailCell = element.querySelector('[title="avery.long.candidate.email.address@example-enterprise.com"]');
    return {
      documentOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      tableScrollIsContained: Boolean(container && container.scrollWidth >= container.clientWidth),
      longEmailIsConstrained: Boolean(emailCell && emailCell.scrollWidth > emailCell.clientWidth),
    };
  });

  expect(geometry.documentOverflows).toBe(false);
  expect(geometry.tableScrollIsContained).toBe(true);
  expect(geometry.longEmailIsConstrained).toBe(true);
});

test("recruiter authentication uses canonical action hierarchy", async ({ page }) => {
  await page.goto("/recruiter/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Forgot your password?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Terms of Service" })).toBeVisible();
});

test("UI lab documents recruiter shell composition patterns", async ({ page }) => {
  await page.goto("/ui-lab");
  await expect(page.getByRole("heading", { name: "Recruiter dashboard" })).toBeVisible();
  await expect(page.getByText("Active requisitions", { exact: true })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Candidate status" })).toBeVisible();
  await expect(page.getByRole("status").getByText("Loading recruiter workspace")).toBeVisible();
});
