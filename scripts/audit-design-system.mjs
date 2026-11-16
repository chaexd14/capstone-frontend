import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const excluded = [path.join("components", "ui"), path.join("app", "ui-lab")];
const limits = { button: 0, input: 0, select: 0, textarea: 0, table: 0, brandColor: 0 };
const extensions = new Set([".tsx", ".ts", ".css"]);

function allSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return allSourceFiles(full);
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    const relative = path.relative(root, full);
    if (!entry.isDirectory() && relative === path.join("app", "globals.css")) return [];
    if (entry.isDirectory() && excluded.some((prefix) => relative === prefix || relative.startsWith(`${prefix}${path.sep}`))) return [];
    if (entry.isDirectory()) return filesIn(full);
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

const source = filesIn(root).map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typographyViolations = [];
const tableLayoutViolations = [];
for (const file of allSourceFiles(root)) {
  const relative = path.relative(process.cwd(), file);
  const featureFile = !excluded.some((prefix) => {
    const fromRoot = path.relative(root, file);
    return fromRoot === prefix || fromRoot.startsWith(`${prefix}${path.sep}`);
  });
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/\btext-xs\b/.test(line)) {
      typographyViolations.push(`${relative}:${index + 1}: text-xs is below the 14px readability floor`);
    }
    for (const match of line.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
      if (Number(match[1]) < 14) {
        typographyViolations.push(`${relative}:${index + 1}: ${match[0]} is below the 14px readability floor`);
      }
    }
    for (const match of line.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) {
      if (Number(match[1]) < 14) {
        typographyViolations.push(`${relative}:${index + 1}: ${match[0]} is below the 14px readability floor`);
      }
    }
    if (/\bfont-mono\b/.test(line)) {
      typographyViolations.push(`${relative}:${index + 1}: font-mono requires a documented technical-ID or code exception`);
    }
    if (featureFile && /<colgroup\b/.test(line)) {
      tableLayoutViolations.push(`${relative}:${index + 1}: feature tables must use semantic column sizes instead of colgroup width maps`);
    }
    if (featureFile && /<Table\b[^>]*\bfixed\b/.test(line)) {
      tableLayoutViolations.push(`${relative}:${index + 1}: fixed table layout requires a documented design-system exception`);
    }
    if (featureFile && /<TableHead\b[^>]*\bw-\[\d+(?:\.\d+)?%\]/.test(line)) {
      tableLayoutViolations.push(`${relative}:${index + 1}: percentage table widths must use the semantic size prop`);
    }
  });
}
const counts = {
  button: (source.match(/<button\b/g) ?? []).length,
  input: (source.match(/<input\b/g) ?? []).length,
  select: (source.match(/<select\b/g) ?? []).length,
  textarea: (source.match(/<textarea\b/g) ?? []).length,
  table: (source.match(/<table\b/g) ?? []).length,
  brandColor: (source.match(/#(?:2196f3|1988f5|1976d2|2563eb|3b82f6)\b/gi) ?? []).length,
};

const regressions = Object.entries(counts).filter(([key, value]) => value > limits[key]);
console.log("Design-system legacy baseline:", counts);
if (regressions.length) {
  console.error("New design-system debt detected:");
  for (const [key, value] of regressions) console.error(`- ${key}: ${value} (maximum ${limits[key]})`);
  process.exit(1);
}
if (typographyViolations.length) {
  console.error("Typography policy violations detected:");
  for (const violation of typographyViolations) console.error(`- ${violation}`);
  process.exit(1);
}
if (tableLayoutViolations.length) {
  console.error("Responsive table policy violations detected:");
  for (const violation of tableLayoutViolations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log("Design-system audit passed. Counts may decrease, but may not increase.");
