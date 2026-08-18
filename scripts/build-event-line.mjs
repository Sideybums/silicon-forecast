#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Ajv from "ajv";

const ROOT = new URL("../", import.meta.url);
const POLICY_PATH = "config/event-line-publication-policy.v1.json";
const SCHEMA_PATH = "schemas/event-line.v1.schema.json";
const GENERATOR_PATH = "scripts/build-event-line.mjs";
const OUTPUT_PATH = "data/public-dashboard/event-line-ram.v1.json";
const MANIFEST_PATH = "data/public-dashboard/event-line-ram.manifest.v1.json";

const bytes = (path) => readFileSync(new URL(path, ROOT));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) => `${JSON.stringify(value, null, 2)}\n`;
function fail(message) { process.stderr.write(`event-line build refused: ${message}\n`); process.exit(1); }

const policy = JSON.parse(bytes(POLICY_PATH));
if (policy.schema_version !== 1 || policy.policy_id !== "sf-public-event-line-v1" || policy.status !== "implemented_structure_for_review") fail("policy identity or review status drifted");
if (policy.scope?.real_markers !== false || policy.authority?.publish_real_marker !== false) fail("real-marker lock is open without a reviewed revision");
for (const key of ["select_research", "approve_source", "approve_interpretation", "alter_prices_or_index", "production_deployment"]) {
  if (policy.authority?.[key] !== false) fail(`${key} must remain explicitly locked`);
}
const expectedReviewFields = ["event_id", "headline", "publisher", "author", "source_url", "publication_date", "event_date", "interpretation", "uncertainty", "counter_evidence", "revision", "review_id"];
const expectedPublicFields = expectedReviewFields.filter((field) => field !== "review_id");
if (JSON.stringify(policy.required_review_record_fields) !== JSON.stringify(expectedReviewFields)) fail("marker review contract drifted");
if (JSON.stringify(policy.public_marker_fields) !== JSON.stringify(expectedPublicFields)) fail("public marker contract drifted");

// Structure-only authority deliberately emits no marker. A future policy revision
// must bind each reviewed record before this generator may accept source inputs.
const dataset = {
  schema_version: 1,
  policy_id: policy.policy_id,
  dataset_id: "sf-public-event-line-ram-v1",
  category_slug: "ram",
  status: "empty_pending_review",
  markers: [],
};
const validate = new Ajv({ allErrors: true }).compile(JSON.parse(bytes(SCHEMA_PATH)));
if (!validate(dataset)) fail(`schema validation failed: ${JSON.stringify(validate.errors)}`);
const outputBytes = canonical(dataset);
const manifest = {
  schema_version: 1,
  manifest_id: "sf-public-event-line-ram-manifest-v1",
  generator: { path: GENERATOR_PATH, sha256: sha256(bytes(GENERATOR_PATH)) },
  policy: { path: POLICY_PATH, sha256: sha256(bytes(POLICY_PATH)) },
  schema: { path: SCHEMA_PATH, sha256: sha256(bytes(SCHEMA_PATH)) },
  output: { path: OUTPUT_PATH, sha256: sha256(outputBytes) },
  reviewed_inputs: [],
};
const manifestBytes = canonical(manifest);

if (process.argv.includes("--check")) {
  for (const [path, expected] of [[OUTPUT_PATH, outputBytes], [MANIFEST_PATH, manifestBytes]]) {
    const target = new URL(path, ROOT);
    if (!existsSync(target) || readFileSync(target, "utf8") !== expected) fail(`${path} is stale; run npm run build:data`);
  }
  process.stdout.write(`event-line replay matched ${manifest.output.sha256}; 0 reviewed markers\n`);
  process.exit(0);
}
mkdirSync(new URL("data/public-dashboard/", ROOT), { recursive: true });
writeFileSync(new URL(OUTPUT_PATH, ROOT), outputBytes);
writeFileSync(new URL(MANIFEST_PATH, ROOT), manifestBytes);
process.stdout.write(`wrote empty reviewed Event Line contract\n`);
