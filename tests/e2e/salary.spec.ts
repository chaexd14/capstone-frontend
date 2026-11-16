import { expect, test } from "@playwright/test";

import {
  formatSalary,
  formatSalaryInput,
  matchesSalaryRange,
  parseSalaryInput,
} from "../../src/lib/salary";

test("salary helpers format fixed, ranged, and undisclosed compensation", () => {
  expect(formatSalary({ salary_min: 50_000, salary_max: 50_000 })).toBe("₱50,000 / mo");
  expect(formatSalary({ salary_min: 50_000, salary_max: 75_000 })).toBe(
    "₱50,000 – ₱75,000 / mo"
  );
  expect(formatSalary({ salary_min: null, salary_max: null })).toBe("Salary not disclosed");
  expect(formatSalaryInput("PHP 050000")).toBe("50,000");
  expect(parseSalaryInput("₱75,000")).toBe(75_000);
});

test("salary filters match any overlapping part of a disclosed range", () => {
  const job = { salary_min: 60_000, salary_max: 80_000 };
  expect(matchesSalaryRange(job, "₱45,000 - ₱70,000")).toBe(true);
  expect(matchesSalaryRange(job, "₱70,000 - ₱100,000")).toBe(true);
  expect(matchesSalaryRange(job, "₱100,000+")).toBe(false);
  expect(matchesSalaryRange({ salary_min: null, salary_max: null }, "₱25,000 - ₱45,000")).toBe(false);
  expect(matchesSalaryRange({ salary_min: null, salary_max: null }, "All")).toBe(true);
});

test("public fallback listings show stored compensation without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("₱75,000 – ₱110,000 / mo").first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});
