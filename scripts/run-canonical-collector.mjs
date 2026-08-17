#!/usr/bin/env node
// Executes one canonical collection pass and records it.
//
// Every pass writes three things: an immutable observation tranche, an evidence
// ledger binding each reading to the exact bytes it came from, and an entry in
// the run ledger. The run ledger also records scheduled slots that passed
// without any run at all, so a laptop that was closed for two days leaves a
// visible, reviewable gap rather than a silent one.
//
// Usage:
//   node scripts/run-canonical-collector.mjs [--max N] [--priority P] [--dry-run]
//
// Nothing here approves a source, a methodology or a publication.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTOR_VERSION, SCHEDULE, buildEstablishedKitShapes, buildProspectiveObservation, detectMissedSlots, runCollection } from "../lib/canonical-collector.mjs";
import { acquireCollectorLock, gitCommand, pushCollectorCommit, synchroniseCollectorCheckout } from "../lib/collector-runtime.mjs";
import { buildGlobalIntegrationAudit, discoverProspectiveTranches, writeGlobalIntegrationAudit } from "../lib/global-integration-audit.mjs";
import { appendExcludedProspectiveCandidate, CANDIDATE_INPUT_MANIFEST } from "../lib/candidate-input-manifest.mjs";
import { readdirSync } from "node:fs";

const repo = new URL("../", import.meta.url);
const repoPath = fileURLToPath(repo);
const LEDGER = new URL("data/collection-runs/ledger.v1.json", repo);

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const a = process.argv[i];
  if (a === "--dry-run") { args.set("dry-run", true); continue; }
  if (!a.startsWith("--")) throw new Error(`unexpected argument: ${a}`);
  args.set(a.slice(2), process.argv[++i]);
}
const maxTargets = args.has("max") ? Number(args.get("max")) : 45;
const maxPriority = args.has("priority") ? Number(args.get("priority")) : 4;
const dryRun = args.get("dry-run") === true;

// Repository safety is resolved before reading targets, robots.txt or retailer
// pages. A dirty, divergent, locally-ahead or non-main checkout therefore makes
// zero retailer requests.
const expectedCheckout = process.env.SF_COLLECTOR_CHECKOUT ?? repoPath;
const lockPath = process.env.SF_COLLECTOR_LOCK ?? path.join(process.env.HOME ?? repoPath, "Library/Application Support/Silicon Forecast Collector/collector.lock");
const releaseLock = acquireCollectorLock(lockPath, { checkout: repoPath });
process.once("exit", releaseLock);
process.once("SIGINT", () => process.exit(130));
process.once("SIGTERM", () => process.exit(143));
try {
  const aligned = synchroniseCollectorCheckout(repoPath, { expectedCheckout, branch: process.env.SF_COLLECTOR_BRANCH ?? "main" });
  process.stdout.write(`collector preflight: main aligned at ${aligned.slice(0, 12)}\n`);
} catch (error) {
  releaseLock();
  throw error;
}

const now = new Date();
const stamp = `${now.toISOString().slice(0, 19).replace(/[-:]/gu, "")}Z`;
const iso = `${now.toISOString().slice(0, 19)}Z`;

const registry = JSON.parse(readFileSync(new URL("data/catalogue/collection-targets.v1.json", repo), "utf8"));
const targets = registry.targets.filter((t) => t.collection_priority <= maxPriority).slice(0, maxTargets);

const ledger = existsSync(LEDGER)
  ? JSON.parse(readFileSync(LEDGER, "utf8"))
  : {
      schema_version: 1,
      ledger_id: "sf-canonical-collector-run-ledger-v1",
      status: "candidate_private_immutable",
      policy:
        "Append-only. Every attempted run is recorded whether it succeeded or not, and every scheduled slot that passed without a run is recorded as an unobserved gap for the operator to review after the fact. Entries are never edited or removed; corrections are additive.",
      schedule: SCHEDULE,
      runs: [],
      missed_slots: [],
    };

// Record any scheduled slots that passed with no run at all. This is the whole
// point of the ledger: launchd catches up at most once after a sleep, so
// without this a closed laptop would leave days that are simply absent and
// indistinguishable from days nothing was scheduled.
const lastRun = ledger.runs.length ? ledger.runs.at(-1).started_at : null;
const alreadyRecorded = new Set(ledger.missed_slots.map((m) => m.scheduled_for));
const missed = detectMissedSlots(lastRun, now, SCHEDULE).filter((s) => !alreadyRecorded.has(s));
for (const slot of missed) {
  ledger.missed_slots.push({
    scheduled_for: slot,
    state: "unobserved_no_run",
    detected_at: iso,
    detected_by_run: `sf-collection-run-${stamp}`,
    operator_acknowledged: false,
    note: "No collection run occurred at this scheduled slot. No observation exists for it and none may be inferred; the gap is recorded so it can be reviewed rather than passing unnoticed.",
  });
}

process.stdout.write(`canonical collector v${COLLECTOR_VERSION}\n`);
process.stdout.write(`  targets:      ${targets.length} (priority <= ${maxPriority}, max ${maxTargets})\n`);
process.stdout.write(`  last run:     ${lastRun ?? "none recorded"}\n`);
process.stdout.write(`  missed slots: ${missed.length}${missed.length ? ` -> ${missed.join(", ")}` : ""}\n`);

if (dryRun) {
  process.stdout.write("dry run: repository preflight completed; no retailer fetch performed and nothing written\n");
  process.exit(0);
}

// Kit shapes established by evidence that saw them on the page, so retailers
// whose templates no longer state the module count can still be collected.
const candidateDir = new URL("data/observations/candidate/", repo);
const establishedShapes = buildEstablishedKitShapes(
  readdirSync(candidateDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(new URL(f, candidateDir), "utf8"))),
);
process.stdout.write(`  kit shapes:   ${establishedShapes.size} MPNs established from prior evidence\n`);

const results = await runCollection(targets, {
  delayMs: 2500,
  establishedShapes,
  onProgress: (i, total, r) => {
    const state = r.usable ? "ok" : (r.reasons[0] ?? "unusable");
    process.stdout.write(`  [${String(i).padStart(3)}/${total}] ${r.seller_display_name} ${r.mpn_expected} — ${state}\n`);
  },
});

const usable = results.filter((r) => r.usable);
const observations = usable.map((r) =>
  buildProspectiveObservation(r, {
    observedAt: iso,
    evidencePath: `research/evidence/primary-retail-${stamp}/ledger.v1.json`,
  }),
);

const evidence = usable.map((r) => ({
  evidence_id: `sf-collect-evidence-${r.mpn.toLowerCase()}-${r.seller_display_name.toLowerCase().replace(/[^a-z0-9]/gu, "")}-${stamp}`,
  seller_display_name: r.seller_display_name,
  source_url: r.url,
  final_url: r.final_url ?? r.url,
  retrieved_at: iso,
  http_status: r.http_status,
  response_bytes: r.response_bytes,
  response_sha256: r.response_sha256,
  response_bytes_retained: false,
  retention_note:
    "Fetched response bytes are not retained; only this minimal factual extract, the response byte count and the response SHA-256 are kept.",
  vat_determination: r.vat_basis ?? null,
  facts: { mpn: r.mpn, capacity_gb: 32, module_count: 2, item_price_minor: r.amount_minor, currency: "GBP", vat_included: true },
  minimal_quote: `${(r.title ?? "").slice(0, 200)} — GBP ${(r.amount_minor / 100).toFixed(2)}`,
}));

const runRecord = {
  run_id: `sf-collection-run-${stamp}`,
  collector_version: COLLECTOR_VERSION,
  started_at: iso,
  completed_at: `${new Date().toISOString().slice(0, 19)}Z`,
  outcome: usable.length ? "completed" : "completed_with_no_usable_readings",
  targets_attempted: targets.length,
  observations_retained: observations.length,
  abstentions: results.length - usable.length,
  abstention_reasons: results
    .filter((r) => !r.usable)
    .reduce((acc, r) => ({ ...acc, [r.reasons[0] ?? "UNKNOWN"]: (acc[r.reasons[0] ?? "UNKNOWN"] ?? 0) + 1 }), {}),
  tranche_file: observations.length ? `data/observations/candidate/uk-primary-retail-${stamp}.v1.json` : null,
  evidence_ledger: observations.length ? `research/evidence/primary-retail-${stamp}/ledger.v1.json` : null,
};
ledger.runs.push(runRecord);

if (observations.length) {
  const tranche = {
    schema_version: 1,
    tranche_id: `sf-gb-primary-retail-${stamp}-v1`,
    status: "candidate_private_immutable",
    scope: "candidate_only",
    region: "GB",
    channel: "PRIMARY_RETAIL",
    created_at: iso,
    observation_count: observations.length,
    collector_version: COLLECTOR_VERSION,
    evidence_ledger: runRecord.evidence_ledger,
    immutability_policy: "Append-only candidate observation tranche; do not edit in place. Corrections require a new additive artifact.",
    capture_basis: {
      observed_at_semantics: "Time of retrieval by the canonical collector; the retailer's own price-change time is not observed.",
      acquisition_method:
        "Scheduled unattended retrieval of exact-MPN product pages listed in data/catalogue/collection-targets.v1.json. One request at a time with a delay between requests, an identifying user-agent, and robots.txt honoured per host.",
      run_id: runRecord.run_id,
    },
    observations,
    governance: {
      source_approved: false,
      methodology_approved: false,
      index_eligible: false,
      production_eligible: false,
      publication_eligible: false,
      public_claim_approved: false,
    },
  };
  writeFileSync(new URL(runRecord.tranche_file, repo), `${JSON.stringify(tranche, null, 2)}\n`);
  appendExcludedProspectiveCandidate(repo, runRecord.tranche_file);
  mkdirSync(new URL(`research/evidence/primary-retail-${stamp}/`, repo), { recursive: true });
  writeFileSync(
    new URL(runRecord.evidence_ledger, repo),
    `${JSON.stringify(
      {
        schema_version: 1,
        ledger_id: `sf-primary-retail-${stamp}-v1`,
        status: "candidate_private_immutable",
        created_at: iso,
        run_id: runRecord.run_id,
        entry_count: evidence.length,
        entries: evidence,
        authority: { source_approved: false, methodology_approved: false, index_eligible: false, publication_eligible: false },
      },
      null,
      2,
    )}\n`,
  );
}

const globalAudit = buildGlobalIntegrationAudit(discoverProspectiveTranches(repo), iso);
const globalAuditPath = writeGlobalIntegrationAudit(repo, globalAudit);
runRecord.global_integration_audit = globalAuditPath;

mkdirSync(new URL("data/collection-runs/", repo), { recursive: true });
writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);

process.stdout.write(`\nretained ${observations.length} observations, ${runRecord.abstentions} abstentions\n`);
process.stdout.write(`reasons: ${JSON.stringify(runRecord.abstention_reasons)}\n`);
if (observations.length) process.stdout.write(`tranche: ${runRecord.tranche_file}\n`);
process.stdout.write(`run ledger: data/collection-runs/ledger.v1.json (${ledger.runs.length} runs, ${ledger.missed_slots.length} recorded gaps)\n`);

// Commit and push what this run produced.
//
// Only the collector's own output paths are staged. A scheduled unattended job
// must never sweep up whatever else happens to be in the working tree, and a
// failure to commit must not discard a successful collection — the data is
// already on disk, so any git problem is reported and the run still counts.
const paths = [
  "data/collection-runs/ledger.v1.json",
  observations.length ? CANDIDATE_INPUT_MANIFEST : null,
  runRecord.tranche_file,
  runRecord.evidence_ledger ? `research/evidence/primary-retail-${stamp}/` : null,
  globalAuditPath,
].filter(Boolean);

const git = (args) => gitCommand(repoPath, args);
git(["add", "--", ...paths]);
const staged = git(["diff", "--cached", "--name-only"]);
if (!staged) {
  throw new Error("collector wrote no staged output; refusing to report success");
}
const summary = observations.length
  ? `${observations.length} observations from ${new Set(observations.map((o) => o.seller.display_name)).size} retailers`
  : "no usable readings";
const gaps = missed.length ? `\n\nRecorded ${missed.length} scheduled slot(s) with no run: ${missed.join(", ")}.` : "";
git([
  "commit",
  "-q",
  "-m",
  `data: collection run ${stamp}`,
  "-m",
  `Automated canonical collector run. ${summary}; ${runRecord.abstentions} abstentions.${gaps}\n\nNo source, methodology or publication is approved.`,
]);
const commit = git(["rev-parse", "--short", "HEAD"]);
process.stdout.write(`git: committed ${commit} on main\n`);
try {
  pushCollectorCommit(repoPath);
  process.stdout.write("git: pushed HEAD to origin/main\n");
} catch (error) {
  process.stderr.write(`collector: PUSH FAILED; evidence retained in local commit ${commit}; origin/main was not updated\n`);
  throw error;
}
