#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const APPROVAL_PATH = "config/factual-offer-deployment-approval.v1.json";
const SURFACE_ROOTS = ["app", "components", "lib", "public", "data/public-offers", "data/public-projection", "data/public-dashboard"];
const SURFACE_FILES = [
  ".github/workflows/deploy-pages.yml",
  "config/factual-offer-publication-policy.v1.json",
  "config/public-release.v1.json",
  "config/daily-market-dashboard-policy.v1.json",
  "config/event-line-publication-policy.v1.json",
  "config/retailer-comparison-roster.v1.json",
  "eslint.config.mjs",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "scripts/build-public-offers.mjs",
  "scripts/build-public-site-data.mjs",
  "scripts/build-daily-market.mjs",
  "scripts/build-event-line.mjs",
  "scripts/build-retailer-comparison.mjs",
  "scripts/deploy-approved-public-preview.mjs",
  "schemas/daily-market-dashboard.v1.schema.json",
  "schemas/event-line.v1.schema.json",
  "schemas/retailer-comparison.v1.schema.json",
  "tsconfig.json",
  "worker.mjs",
  "wrangler.jsonc",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function walk(relativePath) {
  if (!existsSync(relativePath)) return [];
  if (!statSync(relativePath).isDirectory()) return [relativePath];
  return readdirSync(relativePath)
    .sort()
    .flatMap((entry) => walk(path.posix.join(relativePath, entry)));
}

export function deploymentSurface() {
  const files = [...new Set([...SURFACE_FILES, ...SURFACE_ROOTS.flatMap(walk)])]
    .filter((file) => existsSync(file) && statSync(file).isFile())
    .sort();
  const records = files.map((file) => ({ path: file, sha256: sha256(readFileSync(file)) }));
  const digest = sha256(records.map((record) => `${record.path}\0${record.sha256}\n`).join(""));
  return { digest, records };
}

function fail(message) {
  process.stderr.write(`Deployment refused: ${message}\n`);
  process.exit(1);
}

function validateApproval() {
  if (!existsSync(APPROVAL_PATH)) fail("deployment approval record is missing");
  const approval = JSON.parse(readFileSync(APPROVAL_PATH, "utf8"));
  if (approval.schema_version !== 1 || approval.status !== "approved" || approval.decision !== "deploy_daily_market_dashboard_public_preview") fail("approval identity is invalid");
  if (approval.approved_by?.name !== "David Sidebottom" || approval.approved_by?.role !== "project_owner") fail("project-owner approval is absent");
  for (const approved of ["factual_offers", "retailer_links", "raw_exact_mpn_history", "daily_market_dashboard", "empty_event_line"]) {
    if (approval.scope?.[approved] !== true) fail(`${approved} is not explicitly approved`);
  }
  for (const locked of ["aggregate_index", "methodology", "basket", "baseline", "historical_reference", "deflator", "research_publication", "recommendations", "paid_affiliate_tracking"]) {
    if (approval.scope?.[locked] !== false) fail(`${locked} is not explicitly locked`);
  }
  if (JSON.stringify(approval.targets) !== JSON.stringify(["siliconforecast.com", "www.siliconforecast.com"])) fail("deployment target drift");
  for (const binding of [
    approval.bindings?.policy,
    approval.bindings?.manifest,
    approval.bindings?.payload,
    approval.bindings?.dashboard_policy,
    approval.bindings?.dashboard_manifest,
    approval.bindings?.dashboard_payload,
    approval.bindings?.event_policy,
    approval.bindings?.event_manifest,
    approval.bindings?.event_payload,
    approval.bindings?.retailer_comparison_policy,
    approval.bindings?.retailer_comparison_manifest,
    approval.bindings?.retailer_comparison_payload,
    approval.bindings?.retailer_comparison_schema,
    approval.bindings?.retailer_comparison_generator,
  ]) {
    if (!binding?.path || !/^[0-9a-f]{64}$/.test(binding.sha256) || sha256(readFileSync(binding.path)) !== binding.sha256) fail(`bound artefact changed: ${binding?.path ?? "unknown"}`);
  }
  const surface = deploymentSurface();
  if (surface.digest !== approval.bindings?.deployment_surface_sha256) fail("reviewed deployment surface changed after approval");
  return approval;
}

const printOnly = process.argv.includes("--print-digest");
const checkOnly = process.argv.includes("--check");
if (printOnly) {
  process.stdout.write(`${deploymentSurface().digest}\n`);
  process.exit(0);
}

const approval = validateApproval();
if (checkOnly) {
  process.stdout.write(`deployment approval ${approval.approval_id} matches the reviewed surface\n`);
  process.exit(0);
}

const status = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" });
if (status.status !== 0 || status.stdout.trim()) fail("Git worktree is not clean");
const result = spawnSync("npx", ["wrangler", "deploy"], { stdio: "inherit" });
process.exit(result.status ?? 1);
