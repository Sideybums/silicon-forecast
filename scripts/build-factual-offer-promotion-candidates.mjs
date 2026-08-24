#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { buildFactualOfferPromotionCandidates, factualOfferPromotionCandidateBytes, PROMOTION_REPORT_PATH } from "../lib/factual-offer-promotion-candidates.mjs";

const check = process.argv.slice(2).includes("--check");
const unexpected = process.argv.slice(2).filter((item) => item !== "--check");
if (unexpected.length) throw new Error(`unexpected argument: ${unexpected.join(" ")}`);
const report = buildFactualOfferPromotionCandidates();
const bytes = factualOfferPromotionCandidateBytes(report);
if (check) {
  if (!existsSync(PROMOTION_REPORT_PATH) || readFileSync(PROMOTION_REPORT_PATH, "utf8") !== bytes) {
    process.stderr.write("private factual-offer promotion candidate report is stale\n");
    process.exit(1);
  }
  process.stdout.write(`private promotion candidate replay matched: ${report.coverage.promotion_candidates} candidates, ${report.coverage.excluded_observations} exclusions\n`);
} else {
  writeFileSync(PROMOTION_REPORT_PATH, bytes);
  process.stdout.write(`wrote ${PROMOTION_REPORT_PATH}: ${report.coverage.promotion_candidates} non-approving candidates, ${report.coverage.excluded_observations} exclusions\n`);
}
