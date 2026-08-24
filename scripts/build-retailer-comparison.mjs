#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Ajv from "ajv";

const ROOT = new URL("../", import.meta.url);
const POLICY_PATH = "config/retailer-comparison-roster.v1.json";
const SCHEMA_PATH = "schemas/retailer-comparison.v1.schema.json";
const GENERATOR_PATH = "scripts/build-retailer-comparison.mjs";
const OUTPUT_PATH = "data/public-offers/retailer-comparison-ram.v1.json";
const MANIFEST_PATH = "data/public-offers/retailer-comparison-ram.manifest.v1.json";
const AUTHORITY_KEYS = ["public_retailer_axes", "visible_blank_cells", "factual_offer_spotlights", "source_collection_approval", "marketplace_stock", "recommendation_or_ranking", "production_deployment"];
const HARD_PROHIBITIONS = ["blank_cell_as_no_stock_claim", "current_price_or_current_stock_claim", "recommendation_best_deal_or_value_claim", "marketplace_or_second_hand_offer", "cross_mpn_substitution", "forward_fill_or_interpolation", "unreleased_observation", "automatic_prospective_fetch"];
const APPROVED_RETAILERS = [
  ["awd-it", "AWD-IT"],
  ["box-uk", "Box.co.uk"],
  ["ccl", "CCL"],
  ["currys", "Currys"],
  ["kingston-memory-shop", "KingstonMemoryShop"],
  ["novatech", "Novatech"],
  ["overclockers-uk", "Overclockers UK"],
  ["scan-computers", "Scan"],
];

const bytes = (path) => readFileSync(new URL(path, ROOT));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) => `${JSON.stringify(value, null, 2)}\n`;
function fail(message) { process.stderr.write(`retailer comparison build refused: ${message}\n`); process.exit(1); }

const policyBytes = bytes(POLICY_PATH);
const policy = JSON.parse(policyBytes);
if (policy.schema_version !== 1 || policy.policy_id !== "sf-retailer-comparison-roster-v1" || policy.status !== "approved") fail("policy identity or approval status drifted");
if (policy.decision !== "approve_public_exact_mpn_retailer_comparison_roster") fail("decision is outside the comparison scope");
if (policy.dataset_id !== "ram" || policy.market !== "GB" || policy.currency !== "GBP") fail("market identity drifted");
if (policy.approved_by?.name !== "David Sidebottom" || policy.approved_by?.role !== "project_owner") fail("project-owner approval is missing");
if (JSON.stringify(Object.keys(policy.authority ?? {})) !== JSON.stringify(AUTHORITY_KEYS)) fail("comparison authority keys drifted");
if (policy.authority.public_retailer_axes !== true || policy.authority.visible_blank_cells !== true || policy.authority.factual_offer_spotlights !== true) fail("public comparison authority is incomplete");
for (const key of ["source_collection_approval", "marketplace_stock", "recommendation_or_ranking", "production_deployment"]) {
  if (policy.authority[key] !== false) fail(`${key} must remain explicitly locked`);
}
if (JSON.stringify(policy.hard_prohibitions) !== JSON.stringify(HARD_PROHIBITIONS)) fail("comparison hard prohibitions drifted");
const retailers = policy.retailers.map(({ retailer_id, display_name }) => ({ retailer_id, display_name }));
const sorted = [...retailers].sort((a, b) => a.retailer_id === b.retailer_id ? 0 : a.retailer_id < b.retailer_id ? -1 : 1);
if (JSON.stringify(retailers) !== JSON.stringify(sorted)) fail("retailer roster must be sorted by retailer_id");
if (new Set(retailers.map((retailer) => retailer.retailer_id)).size !== retailers.length) fail("retailer IDs must be unique");
if (new Set(retailers.map((retailer) => retailer.display_name)).size !== retailers.length) fail("retailer display names must be unique");
if (JSON.stringify(retailers.map(({ retailer_id, display_name }) => [retailer_id, display_name])) !== JSON.stringify(APPROVED_RETAILERS)) fail("retailer roster drifted from the owner-approved eight");

const dataset = {
  schema_version: 1,
  dataset_id: "ram",
  market: "GB",
  currency: "GBP",
  policy_id: policy.policy_id,
  policy_sha256: sha256(policyBytes),
  absence_label: policy.public_absence_label,
  spotlight_labels: policy.spotlight_labels,
  retailers,
};
const validate = new Ajv({ allErrors: true }).compile(JSON.parse(bytes(SCHEMA_PATH)));
if (!validate(dataset)) fail(`schema validation failed: ${JSON.stringify(validate.errors)}`);
const outputBytes = canonical(dataset);
const manifest = {
  schema_version: 1,
  manifest_id: "sf-retailer-comparison-ram-manifest-v1",
  generator: { path: GENERATOR_PATH, sha256: sha256(bytes(GENERATOR_PATH)) },
  policy: { path: POLICY_PATH, sha256: sha256(policyBytes) },
  schema: { path: SCHEMA_PATH, sha256: sha256(bytes(SCHEMA_PATH)) },
  output: { path: OUTPUT_PATH, sha256: sha256(outputBytes) },
};
const manifestBytes = canonical(manifest);

if (process.argv.includes("--check")) {
  for (const [path, expected] of [[OUTPUT_PATH, outputBytes], [MANIFEST_PATH, manifestBytes]]) {
    const target = new URL(path, ROOT);
    if (!existsSync(target) || readFileSync(target, "utf8") !== expected) fail(`${path} is stale; run npm run build:data`);
  }
  process.stdout.write(`retailer comparison replay matched ${manifest.output.sha256}; ${retailers.length} approved axes\n`);
  process.exit(0);
}
mkdirSync(new URL("data/public-offers/", ROOT), { recursive: true });
writeFileSync(new URL(OUTPUT_PATH, ROOT), outputBytes);
writeFileSync(new URL(MANIFEST_PATH, ROOT), manifestBytes);
process.stdout.write(`wrote retailer comparison roster with ${retailers.length} axes\n`);
