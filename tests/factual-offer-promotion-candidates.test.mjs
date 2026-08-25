import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFactualOfferPromotionCandidates, factualOfferPromotionCandidateBytes, PROMOTION_REPORT_PATH } from "../lib/factual-offer-promotion-candidates.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const committed = JSON.parse(readFileSync(PROMOTION_REPORT_PATH, "utf8"));

test("private promotion-candidate report replays byte-for-byte across every retained observation", () => {
  const rebuilt = buildFactualOfferPromotionCandidates();
  assert.equal(factualOfferPromotionCandidateBytes(rebuilt), readFileSync(PROMOTION_REPORT_PATH, "utf8"));
  assert.equal(rebuilt.coverage.passing_existing_rules + rebuilt.coverage.excluded_observations, rebuilt.coverage.retained_observations);
  assert.equal(rebuilt.coverage.promotion_candidates + rebuilt.coverage.already_active, rebuilt.coverage.passing_existing_rules);
  assert.equal(rebuilt.coverage.active_release_conflicts, 0);
  assert.deepEqual(rebuilt.active_release_conflicts, []);
  const outside = rebuilt.excluded_observations.filter((item) => item.disposition === "excluded_outside_approved_primary_retail_policy");
  assert.equal(outside.length, rebuilt.coverage.excluded_outside_primary_retail_contract);
  assert.equal(new Set(outside.map((item) => item.observation_id)).size, outside.length);
  assert.ok(outside.every((item) => item.observation_id && item.mpn_expected));
  assert.ok(outside.some((item) => item.mpn === null), "an absent exact MPN must remain an explicit abstention");
});

test("every bound input and executable component matches its recorded digest", () => {
  for (const input of committed.inputs) {
    const bytes = readFileSync(input.path);
    assert.equal(sha256(bytes), input.sha256, input.path);
    assert.equal(bytes.length, input.byte_length, input.path);
  }
  for (const item of [committed.generator, committed.build_script, ...committed.dependencies]) {
    const bytes = readFileSync(item.path);
    assert.equal(sha256(bytes), item.sha256, item.path);
    assert.equal(bytes.length, item.byte_length, item.path);
  }
  const manifest = JSON.parse(readFileSync("data/derived/private-candidate/ram-input-manifest.v1.json", "utf8"));
  const bound = new Set(committed.inputs.map((item) => item.path));
  for (const entry of manifest.entries) assert.ok(bound.has(entry.path), `retained candidate input is unbound: ${entry.path}`);
});

test("approved candidates are active and the private promotion queue is deterministically drained", () => {
  const active = JSON.parse(readFileSync("data/public-offers/offers-ram.v1.json", "utf8"));
  const approval = JSON.parse(readFileSync("config/factual-offer-promotion-approval-2026-08-25.v1.json", "utf8"));
  const activeIds = new Set(active.observations.map((item) => item.public_observation_id));
  assert.equal(committed.promotion_candidates.length, 0);
  assert.equal(committed.coverage.promotion_candidates, 0);
  assert.equal(committed.coverage.already_active, 65);
  assert.equal(active.observations.length, approval.expected_result.record_count);
  assert.ok(approval.approved_public_observation_ids.every((id) => activeIds.has(id)));
  assert.equal(committed.active_release_conflicts.length, 0);
});

test("known placeholder values and unrelated authority remain quarantined", () => {
  const manifest = JSON.parse(readFileSync("data/derived/private-candidate/ram-input-manifest.v1.json", "utf8"));
  let retainedPrimaryPlaceholders = 0;
  for (const entry of manifest.entries.filter((item) => item.path.startsWith("data/observations/candidate/uk-primary-retail"))) {
    const artifact = JSON.parse(readFileSync(entry.path, "utf8"));
    retainedPrimaryPlaceholders += (artifact.observations ?? []).filter((item) => (item.item_price?.amount_minor ?? item.price?.amount_minor ?? item.price?.item_price_minor) === 9999999).length;
  }
  assert.equal(committed.exclusion_reason_counts.known_retailer_placeholder_amount, retainedPrimaryPlaceholders);
  const sentinels = committed.excluded_observations.filter((item) => item.reasons.includes("known_retailer_placeholder_amount"));
  assert.equal(sentinels.length, retainedPrimaryPlaceholders);
  assert.equal(committed.status, "private_non_approving_candidate");
  assert.equal(committed.publication_eligible, false);
  assert.equal(committed.authority.candidate_generation, true);
  for (const [key, value] of Object.entries(committed.authority)) if (key !== "candidate_generation") assert.equal(value, false, key);
});
