import { gzipSync } from "node:zlib";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const distDir = process.env.NEXT_DIST_DIR || ".next";
const budgets = [
  { route: "app/page", manifest: ["app", "page_client-reference-manifest.js"], limitKb: 200 },
  { route: "app/(applicant)/careers/page", manifest: ["app", "(applicant)", "careers", "page_client-reference-manifest.js"], limitKb: 200 },
];

let failed = false;
for (const budget of budgets) {
  const manifestPath = path.join(distDir, "server", ...budget.manifest);
  const manifestSource = await readFile(manifestPath, "utf8");
  const files = [...new Set(
    [...manifestSource.matchAll(/static\\?\/chunks\\?\/[^"']+?\.js/g)]
      .map((match) => match[0].replaceAll("\\\\/", "/")),
  )];
  if (!files.length) throw new Error(`No client chunks found for ${budget.route}`);
  let compressedBytes = 0;
  for (const file of files) {
    const filePath = path.join(distDir, file);
    await stat(filePath);
    compressedBytes += gzipSync(await readFile(filePath)).byteLength;
  }
  const compressedKb = compressedBytes / 1024;
  console.log(`${budget.route}: ${compressedKb.toFixed(1)} KB gzip (${files.length} chunks)`);
  if (compressedKb > budget.limitKb) {
    failed = true;
    console.error(`Budget exceeded: ${compressedKb.toFixed(1)} KB > ${budget.limitKb} KB`);
  }
}

if (failed) process.exitCode = 1;
