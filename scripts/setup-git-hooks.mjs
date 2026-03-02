import { chmodSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = process.cwd();
const hookPath = join(repoRoot, ".githooks", "pre-commit");

if (!existsSync(hookPath)) {
  console.error("Missing .githooks/pre-commit");
  process.exit(1);
}

chmodSync(hookPath, 0o755);
execSync("git config core.hooksPath .githooks", { stdio: "inherit" });
console.log("Git hooks configured to use .githooks");
