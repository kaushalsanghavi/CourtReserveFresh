import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = [
  path.join(ROOT, "api"),
  path.join(ROOT, "server", "ai"),
  path.join(ROOT, "server", "db.ts"),
  path.join(ROOT, "server", "routes.ts"),
];

const ALIAS_PREFIXES = ["@shared/", "@/"];
const ALLOWED_RELATIVE_SUFFIXES = [".js", ".json", ".mjs"];

function isTsSource(filePath) {
  return filePath.endsWith(".ts") && !filePath.endsWith(".d.ts");
}

function collectFiles(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return isTsSource(targetPath) ? [targetPath] : [];
  }

  const entries = fs.readdirSync(targetPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const nextPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(nextPath));
      continue;
    }
    if (entry.isFile() && isTsSource(nextPath)) {
      files.push(nextPath);
    }
  }
  return files;
}

function getImportSpecifiers(line) {
  const specs = [];

  const fromMatch = line.match(/\bfrom\s+["']([^"']+)["']/g);
  if (fromMatch) {
    for (const item of fromMatch) {
      const match = item.match(/\bfrom\s+["']([^"']+)["']/);
      if (match?.[1]) {
        specs.push(match[1]);
      }
    }
  }

  const dynamicMatch = line.match(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g);
  if (dynamicMatch) {
    for (const item of dynamicMatch) {
      const match = item.match(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/);
      if (match?.[1]) {
        specs.push(match[1]);
      }
    }
  }

  return specs;
}

function validateSpecifier(filePath, lineNumber, specifier) {
  const violations = [];

  if (ALIAS_PREFIXES.some((prefix) => specifier.startsWith(prefix))) {
    violations.push({
      file: filePath,
      line: lineNumber,
      specifier,
      reason:
        "Path alias import is not allowed in runtime-critical files. Use a relative .js import.",
    });
    return violations;
  }

  if (specifier.startsWith(".")) {
    const hasAllowedSuffix = ALLOWED_RELATIVE_SUFFIXES.some((suffix) =>
      specifier.endsWith(suffix),
    );
    if (!hasAllowedSuffix) {
      violations.push({
        file: filePath,
        line: lineNumber,
        specifier,
        reason:
          "Relative import must include explicit runtime extension (.js/.mjs/.json) for Node ESM.",
      });
    }
  }

  return violations;
}

function run() {
  const files = TARGETS.flatMap((target) => collectFiles(target));
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const specs = getImportSpecifiers(line);
      for (const specifier of specs) {
        violations.push(...validateSpecifier(file, index + 1, specifier));
      }
    });
  }

  if (violations.length === 0) {
    console.log("Runtime import check passed.");
    return;
  }

  console.error("Runtime import check failed:");
  for (const violation of violations) {
    const rel = path.relative(ROOT, violation.file);
    console.error(
      `- ${rel}:${violation.line} -> "${violation.specifier}" (${violation.reason})`,
    );
  }
  process.exit(1);
}

run();
