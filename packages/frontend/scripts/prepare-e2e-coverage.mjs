import fs from "node:fs";
import path from "node:path";

for (const relativePath of [".nyc_output/e2e", "coverage/e2e", ".next/dev"]) {
  fs.rmSync(path.join(process.cwd(), relativePath), { recursive: true, force: true });
}
