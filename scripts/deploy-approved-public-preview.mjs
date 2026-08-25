#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const APPROVAL_PATH = "config/factual-offer-deployment-approval.v1.json";
const ARTIFACT_ROOT = "out";
const SURFACE_ROOTS = ["app", "components", "lib", "public", "data/public-offers", "data/public-projection", "data/public-dashboard"];
const SURFACE_FILES = [
  ".github/workflows/deploy-pages.yml",
  "config/factual-offer-publication-policy.v1.json",
  "config/factual-offer-active-release.v1.json",
  "config/factual-offer-promotion-approval-2026-08-25.v1.json",
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
const BINDING_PATHS = {
  policy: "config/factual-offer-publication-policy.v1.json",
  active_release: "config/factual-offer-active-release.v1.json",
  promotion_approval: "config/factual-offer-promotion-approval-2026-08-25.v1.json",
  manifest: "data/derived/private-candidate/public-offers-manifest.v1.json",
  payload: "data/public-offers/offers-ram.v1.json",
  dashboard_policy: "config/daily-market-dashboard-policy.v1.json",
  dashboard_manifest: "data/public-dashboard/daily-market-ram.manifest.v1.json",
  dashboard_payload: "data/public-dashboard/daily-market-ram.v1.json",
  event_policy: "config/event-line-publication-policy.v1.json",
  event_manifest: "data/public-dashboard/event-line-ram.manifest.v1.json",
  event_payload: "data/public-dashboard/event-line-ram.v1.json",
  retailer_comparison_policy: "config/retailer-comparison-roster.v1.json",
  retailer_comparison_manifest: "data/public-offers/retailer-comparison-ram.manifest.v1.json",
  retailer_comparison_payload: "data/public-offers/retailer-comparison-ram.v1.json",
  retailer_comparison_schema: "schemas/retailer-comparison.v1.schema.json",
  retailer_comparison_generator: "scripts/build-retailer-comparison.mjs",
};
const APPROVED_SCOPE = {
  factual_offers: true,
  retailer_links: true,
  raw_exact_mpn_history: true,
  daily_market_dashboard: true,
  empty_event_line: true,
  retailer_comparison: true,
  aggregate_index: false,
  methodology: false,
  basket: false,
  baseline: false,
  historical_reference: false,
  deflator: false,
  research_publication: false,
  recommendations: false,
  paid_affiliate_tracking: false,
  new_product_approval: false,
  source_family_approval: false,
  threshold_selection: false,
  current_price_or_stock_claims: false,
  causal_claims: false,
  production_database_mutation: false,
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value) && same(Object.keys(value), keys);

function fail(message) {
  process.stderr.write(`Deployment refused: ${message}\n`);
  process.exit(1);
}

function walk(relativePath) {
  if (!existsSync(relativePath)) return [];
  const stat = lstatSync(relativePath);
  if (stat.isSymbolicLink()) throw new Error(`symbolic link is forbidden in deployment material: ${relativePath}`);
  if (stat.isFile()) return [relativePath];
  if (!stat.isDirectory()) throw new Error(`unsupported deployment material type: ${relativePath}`);
  return readdirSync(relativePath).sort().flatMap((entry) => walk(path.posix.join(relativePath, entry)));
}

function trackedMode(file) {
  const result = spawnSync("git", ["ls-files", "--stage", "--", file], { encoding: "utf8" });
  const match = result.status === 0 ? /^(100644|100755) [0-9a-f]+ \d+\t/u.exec(result.stdout) : null;
  if (!match) throw new Error(`deployment source is not a tracked regular file: ${file}`);
  return match[1].slice(-3);
}

function recordsFor(files, modeFor = (file) => (lstatSync(file).mode & 0o777).toString(8).padStart(3, "0")) {
  return files.map((file) => {
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`deployment material is not a regular file: ${file}`);
    const bytes = readFileSync(file);
    return { path: file, type: "file", mode: modeFor(file), byte_length: bytes.length, sha256: sha256(bytes) };
  });
}

function digestRecords(records) {
  return sha256(records.map((record) => `${record.path}\0${record.type}\0${record.mode}\0${record.byte_length}\0${record.sha256}\n`).join(""));
}

export function deploymentSurface() {
  const files = [...new Set([...SURFACE_FILES, ...SURFACE_ROOTS.flatMap(walk)])]
    .filter((file) => existsSync(file))
    .sort();
  const records = recordsFor(files, trackedMode);
  return { digest: digestRecords(records), records };
}

export function deploymentArtifact() {
  if (!existsSync(ARTIFACT_ROOT)) throw new Error("deployment artifact directory is missing");
  const files = walk(ARTIFACT_ROOT).sort();
  if (!files.length) throw new Error("deployment artifact directory is empty");
  const records = recordsFor(files);
  return { digest: digestRecords(records), file_count: records.length, records };
}

function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) fail(`Git check failed: git ${args.join(" ")}`);
  return result.stdout.trim();
}

function validateGitRelease(approval) {
  if (git("symbolic-ref", "--short", "HEAD") !== "main") fail("deployment is permitted only from the canonical main branch");
  const head = git("rev-parse", "HEAD");
  if (head !== git("rev-parse", "origin/main")) fail("local main is not identical to origin/main");
  const remoteMainResult = spawnSync("git", ["ls-remote", "--exit-code", "origin", "refs/heads/main"], { encoding: "utf8" });
  if (remoteMainResult.status !== 0) fail("could not verify canonical remote main");
  const remoteMainFields = remoteMainResult.stdout.trim().split(/\s+/u);
  if (remoteMainFields.length !== 2 || remoteMainFields[1] !== "refs/heads/main" || remoteMainFields[0] !== head) fail("local main is not identical to canonical remote main");
  const releaseCommit = approval.bindings.release_commit;
  if (!/^[0-9a-f]{40}$/u.test(releaseCommit ?? "") || git("rev-parse", `${releaseCommit}^{commit}`) !== releaseCommit) fail("approved release commit is invalid");
  const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", releaseCommit, head]);
  if (ancestor.status !== 0) fail("approved release commit is not an ancestor of deployed HEAD");
  const drift = spawnSync("git", ["diff", "--quiet", releaseCommit, head, "--", ...SURFACE_ROOTS, ...SURFACE_FILES]);
  if (drift.status !== 0) fail("deployment surface changed after the approved release commit");
}

function validateApproval({ enforceGit = true } = {}) {
  if (!existsSync(APPROVAL_PATH)) fail("deployment approval record is missing");
  const approval = JSON.parse(readFileSync(APPROVAL_PATH, "utf8"));
  const expectedTopKeys = ["schema_version", "approval_id", "status", "decision", "approved_by", "approved_at", "approval_record", "targets", "scope", "bindings", "notes"];
  if (!exactKeys(approval, expectedTopKeys) || approval.schema_version !== 1 || approval.status !== "approved" || approval.decision !== "deploy_factual_offers_and_retailer_comparison_public_preview") fail("approval identity or schema is invalid");
  if (approval.approved_by?.name !== "David Sidebottom" || approval.approved_by?.role !== "project_owner" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(approval.approved_at ?? "")) fail("project-owner approval is absent or malformed");
  if (!same(approval.scope, APPROVED_SCOPE)) fail("deployment scope is not the exact closed approved scope");
  if (!same(approval.targets, ["siliconforecast.com", "www.siliconforecast.com"])) fail("deployment target drift");
  const expectedBindingKeys = [...Object.keys(BINDING_PATHS), "release_commit", "deployment_source_sha256", "deployment_artifact_sha256", "deployment_artifact_file_count"];
  if (!exactKeys(approval.bindings, expectedBindingKeys)) fail("deployment binding schema drift");
  const boundPaths = [];
  for (const [key, expectedPath] of Object.entries(BINDING_PATHS)) {
    const binding = approval.bindings[key];
    if (!exactKeys(binding ?? {}, ["path", "sha256"]) || binding.path !== expectedPath || !/^[0-9a-f]{64}$/u.test(binding.sha256) || !existsSync(binding.path) || lstatSync(binding.path).isSymbolicLink() || sha256(readFileSync(binding.path)) !== binding.sha256) fail(`bound artefact changed or redirected: ${key}`);
    boundPaths.push(binding.path);
  }
  if (new Set(boundPaths).size !== boundPaths.length) fail("deployment bindings contain duplicate paths");
  let surface;
  let artifact;
  try {
    surface = deploymentSurface();
    artifact = deploymentArtifact();
  } catch (error) {
    fail(error.message);
  }
  if (surface.digest !== approval.bindings.deployment_source_sha256) fail("reviewed deployment source surface changed after approval");
  if (artifact.digest !== approval.bindings.deployment_artifact_sha256 || artifact.file_count !== approval.bindings.deployment_artifact_file_count) fail("reviewed deployment artifact changed after approval");
  if (enforceGit) validateGitRelease(approval);
  return { approval, surface, artifact };
}

function main() {
  const printSource = process.argv.includes("--print-digest");
  const printArtifact = process.argv.includes("--print-artifact-digest");
  const printReview = process.argv.includes("--print-review");
  const checkMaterial = process.argv.includes("--check-material");
  const checkOnly = process.argv.includes("--check");
  const dryRun = process.argv.includes("--dry-run");
  if (printSource) {
    process.stdout.write(`${deploymentSurface().digest}\n`);
    return;
  }
  if (printArtifact) {
    const artifact = deploymentArtifact();
    process.stdout.write(`${artifact.digest} ${artifact.file_count}\n`);
    return;
  }
  if (printReview) {
    const surface = deploymentSurface();
    const artifact = deploymentArtifact();
    process.stdout.write(`${JSON.stringify({ source: { sha256: surface.digest, file_count: surface.records.length }, artifact: { sha256: artifact.digest, file_count: artifact.file_count } }, null, 2)}\n`);
    return;
  }
  if (checkMaterial) {
    const { approval } = validateApproval({ enforceGit: false });
    process.stdout.write(`deployment approval ${approval.approval_id} matches the reviewed source and artifact bytes\n`);
    return;
  }
  const status = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" });
  if (status.status !== 0 || status.stdout.trim()) fail("Git worktree is not clean");
  const { approval } = validateApproval();
  if (checkOnly) {
    process.stdout.write(`deployment approval ${approval.approval_id} matches canonical main and the reviewed source and artifact bytes\n`);
    return;
  }
  const args = ["wrangler", "deploy"];
  if (dryRun) args.push("--dry-run");
  const result = spawnSync("npx", args, { stdio: "inherit" });
  process.exit(result.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
