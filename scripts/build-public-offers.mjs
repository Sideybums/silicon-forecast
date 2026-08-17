#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { buildPublicOffers, publicOfferCanonicalBytes } from "../lib/public-offers.mjs";

const repo = new URL("../", import.meta.url);
const checkOnly = process.argv.includes("--check");
const { payload, manifest, reviewQueue } = buildPublicOffers(repo);
const outputs = {
  "data/public-offers/offers-ram.v1.json": payload,
  "data/derived/private-candidate/public-offers-manifest.v1.json": manifest,
  "data/review-queue/public-offer-exceptions.v1.json": reviewQueue,
};

let drift = 0;
for (const [relativePath, value] of Object.entries(outputs)) {
  const target = new URL(relativePath, repo);
  const bytes = publicOfferCanonicalBytes(value);
  if (checkOnly) {
    if (!existsSync(target) || readFileSync(target, "utf8") !== bytes) {
      process.stderr.write(`stale or missing generated factual-offer artifact: ${relativePath}\n`);
      drift += 1;
    }
    continue;
  }
  mkdirSync(new URL("./", target), { recursive: true });
  writeFileSync(target, bytes);
}
if (drift) process.exit(1);
if (checkOnly) {
  process.stdout.write(`public factual offers are up to date (${payload.observations.length} observations, ${reviewQueue.exception_count} exceptions)\n`);
} else {
  process.stdout.write(`wrote factual offers: ${payload.observations.length} public observations across ${payload.products.length} products; ${reviewQueue.exception_count} exceptions remain private\n`);
}
