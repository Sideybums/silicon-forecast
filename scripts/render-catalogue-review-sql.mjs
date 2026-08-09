import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  loadJson,
  validateCatalogue,
  validateCatalogueReview,
  validateListingFixtures,
} from "../lib/catalogue-fixtures.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const catalogue = loadJson(resolve(projectRoot, "data/catalogue/ddr5-32gb-seed.v1.json"));
const fixtures = loadJson(resolve(projectRoot, "data/fixtures/listing-matches.v1.json"));
const reviewPath = "data/reviews/ddr5-32gb-seed-review-2026-08-06.json";
const reviewAbsolutePath = resolve(projectRoot, reviewPath);
const reviewBytes = readFileSync(reviewAbsolutePath);
const review = JSON.parse(reviewBytes.toString("utf8"));
const expectedReviewSha256 = "86fef1c0bd47279ece52be6dbbb03502138ea42dd5586a94c06a84beb6c7f801";
const actualReviewSha256 = createHash("sha256").update(reviewBytes).digest("hex");
if (actualReviewSha256 !== expectedReviewSha256) {
  throw new Error(`approved review artefact checksum mismatch: ${actualReviewSha256}`);
}

validateCatalogue(catalogue, { evidenceExists: (reference) => existsSync(resolve(projectRoot, reference)) });
validateListingFixtures(fixtures, catalogue);
validateCatalogueReview(review, catalogue, fixtures);

function stableUuid(key) {
  const chars = createHash("sha256").update(`silicon-forecast:${key}`).digest("hex").slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = "8";
  const hex = chars.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sql(value) {
  const text = String(value);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) {
    throw new Error("refusing to render SQL containing control characters");
  }
  return `'${text.replaceAll("'", "''")}'`;
}

const requestId = stableUuid(`catalogue-review-request:${review.review_id}`);
const lines = [
  "BEGIN;",
  "SET LOCAL standard_conforming_strings = on;",
  "SET LOCAL ROLE silicon_forecast_catalogue_reviewer;",
  `SELECT silicon_forecast.apply_approved_ddr5_seed_fixture_review(${sql(requestId)}::uuid);`,
  "COMMIT;",
  "",
];

process.stdout.write(lines.join("\n"));
