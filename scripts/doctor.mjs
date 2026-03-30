#!/usr/bin/env node
// scripts/doctor.mjs
// ---------------------------------------------------------------------------
// Diagnostic check for Barn Time local dev environment.
// Runs all preflight checks without changing anything.
//
// Usage:  node scripts/doctor.mjs   (or: npm run doctor)
// ---------------------------------------------------------------------------
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { printPreflight, SUPABASE_BIN, ROOT } from "./preflight.mjs";

console.log("\n=== Barn Time — Doctor ===");

const ok = printPreflight();

// Extra diagnostics (non-fatal)
console.log("Environment:");

// .env.local
const envPath = resolve(ROOT, ".env.local");
if (existsSync(envPath)) {
  console.log("  .env.local      exists");
} else {
  console.log("  .env.local      MISSING — run `npm run setup` to generate it");
}

// node_modules
if (existsSync(resolve(ROOT, "node_modules"))) {
  console.log("  node_modules    installed");
} else {
  console.log("  node_modules    MISSING — run `npm ci`");
}

// Supabase running?
try {
  const status = execSync(`"${SUPABASE_BIN}" status -o env`, {
    stdio: "pipe",
    encoding: "utf-8",
    cwd: ROOT,
    timeout: 10_000,
  });
  if (status.includes("API_URL")) {
    console.log("  Supabase local  running");
  } else {
    console.log("  Supabase local  not running");
  }
} catch {
  console.log("  Supabase local  not running");
}

console.log("");
if (ok) {
  console.log("All checks passed. Ready for `npm run setup` or `npm run dev`.");
} else {
  console.log("Some checks failed. Fix the issues above and run `npm run doctor` again.");
}
console.log("");

process.exit(ok ? 0 : 1);
