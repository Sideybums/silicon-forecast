#!/usr/bin/env node
// Generates the public projection the static site reads.
//
// The artefacts are committed, so a human can read the exact diff of what is
// about to become public before it does. `--check` regenerates in memory and
// byte-compares, so drift between the derived data and the committed public
// view fails the build instead of shipping.
//
// Nothing is written unless assertPublicSafe passes on every dataset. A
// generator that writes first and validates afterwards leaves unsafe bytes on
// disk for whatever reads them next.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import process from "node:process";
import { buildIndexFromRepository } from "../lib/matched-model-index.mjs";
import { buildSeriesFromRepository } from "../lib/per-mpn-price-series.mjs";
import {
  PROJECTION_SCHEMA_VERSION,
  assertPublicSafe,
  canonicalProjectionBytes,
  projectEvents,
  projectIndex,
  projectProducts,
} from "../lib/public-projection.mjs";
import { repositoryPrivateTokens, repositoryReasonCodes } from "../tests/helpers/private-tokens.mjs";

const repo = new URL("../", import.meta.url);
const outDir = new URL("data/public-projection/", repo);
const checkOnly = process.argv.includes("--check");

// Operator-selected presentation parameters, recorded rather than assumed.
const FLOOR = { min_months: 6, min_sellers: 2 };
const REBASING = { basis: "first_observed_month_equals_1000_permille", selected_by: "operator" };
const DATASET = "ram";

const index = buildIndexFromRepository(repo);
const atFloor = buildSeriesFromRepository(repo, { minMonths: FLOOR.min_months, minSellers: FLOOR.min_sellers });
const allSeries = buildSeriesFromRepository(repo, { minMonths: 1, minSellers: 1 });
const ledger = JSON.parse(
  readFileSync(new URL("research/evidence/historical-movement-explanations-2026-08-10/ledger.v1.json", repo), "utf8"),
);

const datasets = {
  [`index-${DATASET}.v1.json`]: { dataset: "index", value: projectIndex(index, DATASET) },
  [`products-${DATASET}.v1.json`]: {
    dataset: "products",
    value: projectProducts(atFloor, {
      datasetId: DATASET,
      floor: FLOOR,
      rebasing: REBASING,
      excludedBelowFloorCount: allSeries.length - atFloor.length,
    }),
  },
  [`events-${DATASET}.v1.json`]: {
    dataset: "events",
    value: projectEvents(ledger, { datasetId: DATASET, movementCount: (ledger.movements ?? []).length }),
  },
};

const privateTokens = repositoryPrivateTokens();
const reasonCodes = repositoryReasonCodes();
for (const [file, { dataset, value }] of Object.entries(datasets)) {
  try {
    assertPublicSafe(value, dataset, { privateTokens, reasonCodes });
  } catch (error) {
    process.stderr.write(`refusing to write ${file}\n${error.message}\n`);
    process.exit(1);
  }
}

const datasetRecords = Object.entries(datasets)
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([file, { value }]) => {
    const bytes = canonicalProjectionBytes(value);
    return {
      path: file,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byte_length: Buffer.byteLength(bytes),
    };
  });

const manifest = {
  schema_version: PROJECTION_SCHEMA_VERSION,
  generated_by: "scripts/build-public-site-data.mjs",
  artifact_status: "private_candidate",
  publication_eligible: false,
  approvals: {
    source: false,
    methodology: false,
    basket: false,
    historical_reference: false,
    publication: false,
  },
  datasets: datasetRecords,
  coverage_note:
    "Private candidate derivation from archived and collected retailer observations. Gaps are preserved and never interpolated; a period with too little matched evidence carries no value at all.",
  approval_note:
    "No source, methodology, basket, historical reference or publication is approved. These files are private candidate engineering artefacts and are structurally ineligible for publication.",
};

const files = { "manifest.v1.json": manifest };
for (const [file, { value }] of Object.entries(datasets)) files[file] = value;

if (checkOnly) {
  let drift = 0;
  for (const [file, value] of Object.entries(files)) {
    const path = new URL(file, outDir);
    if (!existsSync(path)) {
      process.stderr.write(`missing committed projection: data/public-projection/${file}\n`);
      drift += 1;
      continue;
    }
    if (readFileSync(path, "utf8") !== canonicalProjectionBytes(value)) {
      process.stderr.write(`committed projection is stale: data/public-projection/${file}\n`);
      drift += 1;
    }
  }
  if (drift) {
    process.stderr.write("run: node scripts/build-public-site-data.mjs\n");
    process.exit(1);
  }
  process.stdout.write("public projection is up to date\n");
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
for (const [file, value] of Object.entries(files)) {
  writeFileSync(new URL(file, outDir), canonicalProjectionBytes(value));
}

const idx = datasets[`index-${DATASET}.v1.json`].value;
const products = datasets[`products-${DATASET}.v1.json`].value;
const events = datasets[`events-${DATASET}.v1.json`].value;
process.stdout.write(`wrote ${Object.keys(files).length} files to data/public-projection/\n`);
process.stdout.write(`  index:    ${idx.coverage.observed_period_count} periods ${idx.coverage.first_period}..${idx.coverage.last_period}, latest ${(idx.summary.latest_index_milli / 1000).toFixed(1)} (${idx.summary.direction})\n`);
process.stdout.write(`  products: ${products.product_count} at ${FLOOR.min_months}mo/${FLOOR.min_sellers} sellers, ${products.excluded_below_floor_count} below the floor\n`);
process.stdout.write(`  events:   ${events.markers.length} markers, ${events.unexplained_movement_count} movements unexplained\n`);
