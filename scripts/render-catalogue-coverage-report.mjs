#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCoverageReport } from "../lib/catalogue-resilience.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const load = (relativePath) => JSON.parse(readFileSync(resolve(projectRoot, relativePath), "utf8"));

const fixture = load("data/fixtures/ddr5-32gb-resilience-pilot.v1.json");
const catalogues = [
  load("data/catalogue/ddr5-32gb-seed.v1.json"),
  load("data/catalogue/ddr5-32gb-expansion.v1.json"),
  load("data/catalogue/ddr5-32gb-diversification.v1.json"),
];

const reviewReferences = [
  "data/reviews/ddr5-32gb-seed-review-2026-08-06.json",
  "data/reviews/ddr5-32gb-diversification-review-2026-08-09.json",
];
const reviewArtifactsByReference = new Map(reviewReferences.map((reviewReference) => [
  reviewReference,
  readFileSync(resolve(projectRoot, reviewReference)),
]));

process.stdout.write(`${JSON.stringify(buildCoverageReport(fixture, catalogues, { reviewArtifactsByReference }), null, 2)}\n`);
