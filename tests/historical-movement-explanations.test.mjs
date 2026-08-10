// tests/historical-movement-explanations.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

test("the comparability review is additive, scoped and approves no production capability", async () => {
  const review = await readJson("data/reviews/historical-context-comparability-review-2026-08-10.json");
  assert.equal(review.status, "human_approved_additive_decision");
  assert.equal(review.scope, "context_layer_only");
  assert.equal(review.decisions.length, 3);
  const expectedGovernanceKeys = [
    "methodology_approved",
    "aggregation_rule_approved",
    "source_approved",
    "basket_approved",
    "reference_period_approved",
    "index_eligible",
    "production_eligible",
    "publication_eligible",
  ].sort();
  assert.deepEqual(Object.keys(review.governance).sort(), expectedGovernanceKeys);
  for (const [flag, value] of Object.entries(review.governance)) {
    assert.equal(value, false, `governance flag ${flag} must be false`);
  }
  for (const decision of review.decisions) {
    assert.ok(decision.rationale.length > 0);
    assert.ok(decision.known_cost.length > 0);
    assert.ok(Array.isArray(decision.constraints) && decision.constraints.length > 0);
  }
});

import { deriveHistoricalMovements } from "../lib/historical-movement-explanations.mjs";

const obs = (id, at, mpn, seller, amount, vat) => ({
  observation_id: id, observed_at: at, mpn, seller_display_name: seller,
  seller_legal_name: null, amount_minor: amount, currency: "GBP",
  vat_included: vat, capture_kind: "archive_capture", source_file: "t.json",
});

test("a within-seller pair is preferred and marked", () => {
  const [movement] = deriveHistoricalMovements([
    obs("a", "2023-01-28T07:42:17Z", "CT2K16G56C46U5", "Crucial UK", 14879, true),
    obs("b", "2023-08-15T14:08:13Z", "CT2K16G56C46U5", "Crucial UK", 9239, true),
  ]);
  assert.equal(movement.comparison_basis, "within_seller");
  assert.equal(movement.from.amount_minor, 14879);
  assert.equal(movement.to.amount_minor, 9239);
  assert.equal(movement.delta_minor, -5640);
  assert.equal(movement.delta_basis_points, -3791);
  assert.equal(movement.vat_disclosure_required, false);
});

test("a cross-seller pair is emitted only as a disclosed fallback", () => {
  const [movement] = deriveHistoricalMovements([
    obs("a", "2025-06-19T06:37:21Z", "KF564C32RSK2-32", "CCL Computers", 11399, true),
    obs("b", "2026-08-09T23:43:37Z", "KF564C32RSK2-32", "KingstonMemoryShop", 62026, true),
  ]);
  assert.equal(movement.comparison_basis, "cross_seller");
  assert.equal(movement.delta_basis_points, 44414);
});

test("an unresolved VAT state at either end requires disclosure", () => {
  const [movement] = deriveHistoricalMovements([
    obs("a", "2022-07-03T17:34:38Z", "CMK32GX5M2B6000C36", "Scan Computers", 27548, null),
    obs("b", "2023-03-15T07:59:07Z", "CMK32GX5M2B6000C36", "Scan Computers", 13000, null),
  ]);
  assert.equal(movement.comparison_basis, "within_seller");
  assert.equal(movement.vat_disclosure_required, true);
  assert.equal(movement.vat_state_from, "unresolved");
});

test("a single observation for an MPN yields no movement", () => {
  assert.deepEqual(deriveHistoricalMovements([obs("a", "2024-01-01T00:00:00Z", "X", "Box", 100, true)]), []);
});
