// scripts/preflight.mjs
// ---------------------------------------------------------------------------
// Preflight checks for Barn Time local development.
// Verifies that all prerequisites are met before setup can proceed.
// ---------------------------------------------------------------------------
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SUPABASE_BIN = resolve(ROOT, "node_modules", ".bin", "supabase");

const checks = [
  {
    name: "Node.js >= 20",
    run() {
      const major = parseInt(process.versions.node.split(".")[0], 10);
      if (major < 20) {
        return `Node.js 20+ is required. You are running ${process.version}.\nInstall a newer version from https://nodejs.org`;
      }
      return null;
    },
  },
  {
    name: "Docker installed",
    run() {
      try {
        execSync("docker --version", { stdio: "pipe" });
        return null;
      } catch {
        return "Docker is not installed or not in PATH.\nInstall Docker Desktop from https://www.docker.com/products/docker-desktop";
      }
    },
  },
  {
    name: "Docker daemon running",
    run() {
      try {
        execSync("docker info", { stdio: "pipe", timeout: 10_000 });
        return null;
      } catch {
        return "Docker is installed but the daemon is not running.\nOpen Docker Desktop and wait until it says \"Docker is running\", then try again.";
      }
    },
  },
  {
    name: "Supabase CLI available (repo-local)",
    run() {
      try {
        const version = execSync(`"${SUPABASE_BIN}" --version`, {
          stdio: "pipe",
          encoding: "utf-8",
        }).trim();
        return null;
      } catch {
        return "The Supabase CLI is not available. Run `npm ci` first to install project dependencies.";
      }
    },
  },
  {
    name: "supabase/config.toml exists",
    run() {
      if (!existsSync(resolve(ROOT, "supabase", "config.toml"))) {
        return "supabase/config.toml is missing. Are you in the correct project directory?";
      }
      return null;
    },
  },
  {
    name: "supabase/seed.sql exists",
    run() {
      if (!existsSync(resolve(ROOT, "supabase", "seed.sql"))) {
        return "supabase/seed.sql is missing.";
      }
      return null;
    },
  },
];

/**
 * Run all preflight checks.
 * @returns {{ ok: boolean, results: Array<{name: string, passed: boolean, error?: string}> }}
 */
export function runPreflight() {
  const results = [];
  let ok = true;
  for (const check of checks) {
    const error = check.run();
    if (error) {
      results.push({ name: check.name, passed: false, error });
      ok = false;
    } else {
      results.push({ name: check.name, passed: true });
    }
  }
  return { ok, results };
}

/**
 * Print preflight results and optionally exit on failure.
 */
export function printPreflight({ exitOnFail = false } = {}) {
  const { ok, results } = runPreflight();
  console.log("");
  console.log("Preflight checks:");
  for (const r of results) {
    const icon = r.passed ? "  pass" : "  FAIL";
    console.log(`${icon}  ${r.name}`);
    if (r.error) {
      for (const line of r.error.split("\n")) {
        console.log(`        ${line}`);
      }
    }
  }
  console.log("");
  if (!ok && exitOnFail) {
    console.log("Fix the issues above and try again.");
    process.exit(1);
  }
  return ok;
}

export { SUPABASE_BIN, ROOT };
