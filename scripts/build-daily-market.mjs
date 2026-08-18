#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Ajv from "ajv";
import { buildDailyMarketDataset } from "../lib/daily-market.ts";

const ROOT = new URL("../", import.meta.url);
const PAYLOAD_PATH = "data/public-offers/offers-ram.v1.json";
const POLICY_PATH = "config/daily-market-dashboard-policy.v1.json";
const SCHEMA_PATH = "schemas/daily-market-dashboard.v1.schema.json";
const OUTPUT_PATH = "data/public-dashboard/daily-market-ram.v1.json";
const MANIFEST_PATH = "data/public-dashboard/daily-market-ram.manifest.v1.json";
const GENERATOR_PATH = "scripts/build-daily-market.mjs";
const ENGINE_PATH = "lib/daily-market.ts";

function bytes(path) {
  return readFileSync(new URL(path, ROOT));
}

function json(path) {
  return JSON.parse(bytes(path));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function fail(message) {
  process.stderr.write(`daily dashboard build refused: ${message}\n`);
  process.exit(1);
}

function validatePolicy(policy) {
  if (policy.schema_version !== 1 || policy.policy_id !== "sf-daily-market-dashboard-v1" || policy.status !== "approved_for_repository_publication") fail("policy identity or review status drifted");
  const locked = policy.unrelated_authorities ?? {};
  for (const key of ["formal_matched_model_index", "basket_or_reference_selection", "deflator", "new_source_approval", "collector_fetch", "production_deployment", "recommendations", "paid_affiliate_tracking"]) {
    if (locked[key] !== false) fail(`${key} must remain explicitly locked`);
  }
  if (policy.scope?.source_payload !== PAYLOAD_PATH) fail("sole price payload drifted");
  if (JSON.stringify(policy.quality?.excluded_exact_item_price_minor) !== JSON.stringify([9999999])) fail("sentinel quarantine drifted");
  if (policy.quality?.temporal_outlier_suppression !== false) fail("temporal price suppression must remain disabled");
}

function validateDataset(dataset, source) {
  const validate = new Ajv({ allErrors: true }).compile(json(SCHEMA_PATH));
  if (!validate(dataset)) fail(`schema validation failed: ${JSON.stringify(validate.errors)}`);
  if (dataset.policy_id !== "sf-daily-market-dashboard-v1") fail("dataset policy identity drifted");
  if (dataset.dataset_id !== source.dataset_id || dataset.market !== source.market || dataset.currency !== source.currency || dataset.time_zone !== "Europe/London") fail("dataset source binding drifted");
  if (!dataset.points.length || dataset.first_date !== dataset.points[0].date || dataset.latest_date !== dataset.points.at(-1).date) fail("dataset date bounds are invalid");
  const sourceById = new Map(source.observations.map((item) => [item.public_observation_id, item]));
  let previous = "";
  for (const point of dataset.points) {
    if (point.date <= previous) fail(`points are not strictly ordered at ${point.date}`);
    previous = point.date;
    if (!(point.low_minor <= point.typical_minor && point.typical_minor <= point.high_minor)) fail(`price bounds are invalid on ${point.date}`);
    if (point.product_count !== point.products.length || point.product_count > point.declared_product_count) fail(`coverage is invalid on ${point.date}`);
    for (const evidence of [...point.low_evidence, ...point.high_evidence]) {
      const input = sourceById.get(evidence.public_observation_id);
      if (!input) fail(`evidence ${evidence.public_observation_id} is not in the approved payload`);
      for (const key of ["observed_at", "observation_kind", "mpn", "retailer_id", "retailer_name", "item_price_minor", "source_url"]) {
        if (evidence[key] !== input[key]) fail(`evidence ${evidence.public_observation_id} drifted at ${key}`);
      }
      if (evidence.item_price_minor === 9999999) fail(`sentinel evidence reached ${point.date}`);
    }
  }
}

const source = json(PAYLOAD_PATH);
const policy = json(POLICY_PATH);
validatePolicy(policy);
const dataset = buildDailyMarketDataset(source);
validateDataset(dataset, source);
const datasetBytes = canonical(dataset);
const manifest = {
  schema_version: 1,
  manifest_id: "sf-daily-market-ram-manifest-v1",
  source_latest_observed_at: source.latest_observed_at,
  generator: { path: GENERATOR_PATH, sha256: sha256(bytes(GENERATOR_PATH)) },
  calculation_engine: { path: ENGINE_PATH, sha256: sha256(bytes(ENGINE_PATH)) },
  policy: { path: POLICY_PATH, sha256: sha256(bytes(POLICY_PATH)) },
  schema: { path: SCHEMA_PATH, sha256: sha256(bytes(SCHEMA_PATH)) },
  input: { path: PAYLOAD_PATH, dataset_id: source.dataset_id, sha256: sha256(bytes(PAYLOAD_PATH)) },
  output: { path: OUTPUT_PATH, sha256: sha256(datasetBytes) },
};
const manifestBytes = canonical(manifest);

if (process.argv.includes("--check")) {
  for (const [path, expected] of [[OUTPUT_PATH, datasetBytes], [MANIFEST_PATH, manifestBytes]]) {
    const target = new URL(path, ROOT);
    if (!existsSync(target) || readFileSync(target, "utf8") !== expected) fail(`${path} is stale; run npm run build:data`);
  }
  process.stdout.write(`daily dashboard replay matched ${manifest.output.sha256}\n`);
  process.exit(0);
}

mkdirSync(new URL("data/public-dashboard/", ROOT), { recursive: true });
writeFileSync(new URL(OUTPUT_PATH, ROOT), datasetBytes);
writeFileSync(new URL(MANIFEST_PATH, ROOT), manifestBytes);
process.stdout.write(`wrote ${OUTPUT_PATH} and ${MANIFEST_PATH}\n`);
