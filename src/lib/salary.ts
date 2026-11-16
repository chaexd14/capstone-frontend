import type { Job } from "@/types/job";

export const SALARY_RANGES: string[] = [
  "All",
  "₱25,000 - ₱45,000",
  "₱45,000 - ₱70,000",
  "₱70,000 - ₱100,000",
  "₱100,000+",
];

const SALARY_BUCKETS: Record<string, { min: number; max: number }> = {
  "₱25,000 - ₱45,000": { min: 25_000, max: 45_000 },
  "₱45,000 - ₱70,000": { min: 45_000, max: 70_000 },
  "₱70,000 - ₱100,000": { min: 70_000, max: 100_000 },
  "₱100,000+": { min: 100_000, max: Number.POSITIVE_INFINITY },
};

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

export function formatSalary(job: Pick<Job, "salary_min" | "salary_max">): string {
  const { salary_min: min, salary_max: max } = job;
  if (min == null || max == null) return "Salary not disclosed";
  if (min === max) return `${peso.format(min)} / mo`;
  return `${peso.format(min)} – ${peso.format(max)} / mo`;
}

export function matchesSalaryRange(
  job: Pick<Job, "salary_min" | "salary_max">,
  selectedRange: string
): boolean {
  if (selectedRange === "All") return true;
  const bucket = SALARY_BUCKETS[selectedRange];
  if (!bucket || job.salary_min == null || job.salary_max == null) return false;
  return job.salary_max >= bucket.min && job.salary_min <= bucket.max;
}

export function salaryDigits(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

export function formatSalaryInput(value: string): string {
  const digits = salaryDigits(value);
  return digits ? Number(digits).toLocaleString("en-PH") : "";
}

export function parseSalaryInput(value: string): number | null {
  const digits = salaryDigits(value);
  return digits ? Number(digits) : null;
}
