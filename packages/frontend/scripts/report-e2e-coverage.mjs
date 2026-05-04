import fs from "node:fs";
import path from "node:path";
import libCoverage from "istanbul-lib-coverage";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";

const coverageDir = path.join(process.cwd(), ".nyc_output", "e2e");
const reportDir = path.join(process.cwd(), "coverage", "e2e");
const threshold = Number(process.env.E2E_BRANCH_COVERAGE_THRESHOLD || 80);

if (!fs.existsSync(coverageDir)) {
  console.error("No E2E Istanbul coverage files found in .nyc_output/e2e.");
  process.exit(1);
}

const coverageMap = libCoverage.createCoverageMap({});
const files = fs
  .readdirSync(coverageDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

for (const file of files) {
  const coverage = JSON.parse(fs.readFileSync(path.join(coverageDir, file), "utf8"));
  coverageMap.merge(coverage);
}

if (coverageMap.files().length === 0) {
  console.error("E2E coverage was collected, but no instrumented source files were present.");
  process.exit(1);
}

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "coverage-final.json"),
  JSON.stringify(coverageMap.toJSON(), null, 2),
);

const context = libReport.createContext({
  dir: reportDir,
  coverageMap,
});

reports.create("text-summary").execute(context);
reports.create("json-summary").execute(context);
reports.create("lcovonly").execute(context);

const summary = coverageMap.getCoverageSummary().toJSON();
const branchPct = summary.branches.pct;

if (branchPct < threshold) {
  console.error(`E2E branch coverage ${branchPct}% is below the required ${threshold}%.`);
  process.exit(1);
}

console.log(`E2E branch coverage ${branchPct}% meets the required ${threshold}%.`);
