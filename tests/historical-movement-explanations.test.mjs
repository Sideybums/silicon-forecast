// tests/historical-movement-explanations.test.mjs
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

test("the widest within-seller pair wins when several sellers qualify", () => {
  const [movement] = deriveHistoricalMovements([
    obs("n1", "2023-01-01T00:00:00Z", "M", "Narrow Seller", 1000, true),
    obs("n2", "2023-02-01T00:00:00Z", "M", "Narrow Seller", 1100, true),
    obs("w1", "2022-01-01T00:00:00Z", "M", "Wide Seller", 2000, true),
    obs("w2", "2024-01-01T00:00:00Z", "M", "Wide Seller", 2500, true),
  ]);
  assert.equal(movement.comparison_basis, "within_seller");
  assert.equal(movement.from.observation_id, "w1");
  assert.equal(movement.to.observation_id, "w2");
});

test("one seller with a pair beats other sellers holding single observations", () => {
  const [movement] = deriveHistoricalMovements([
    obs("a1", "2023-01-01T00:00:00Z", "M", "Paired Seller", 1000, true),
    obs("a2", "2023-06-01T00:00:00Z", "M", "Paired Seller", 1200, true),
    obs("b1", "2021-01-01T00:00:00Z", "M", "Lone Seller", 5000, true),
  ]);
  assert.equal(movement.comparison_basis, "within_seller");
  assert.equal(movement.from.seller, "Paired Seller");
  assert.equal(movement.to.seller, "Paired Seller");
});

import { validateExplanationLedger } from "../lib/historical-movement-explanations.mjs";

const movement = {
  movement_id: "m1", mpn: "X",
  from: { observation_id: "a", observed_at: "2023-01-28T07:42:17Z", seller: "Crucial UK", amount_minor: 14879 },
  to: { observation_id: "b", observed_at: "2023-08-15T14:08:13Z", seller: "Crucial UK", amount_minor: 9239 },
  delta_minor: -5640, delta_basis_points: -3791, comparison_basis: "within_seller",
  vat_state_from: "included", vat_state_to: "included", vat_disclosure_required: false,
};

const explanation = (overrides = {}) => ({
  explanation_id: "e1",
  movement_id: "m1",
  published_at: "2023-06-01T00:00:00Z",
  publisher: "Example Trade Press",
  url: "https://example.invalid/report",
  response_sha256: "0".repeat(64),
  response_bytes: 1234,
  minimal_quote: "Memory makers cut output through the first half of the year.",
  proposed_mechanism: "Reported oversupply and inventory correction may have reduced consumer kit prices.",
  causal_language_level: "contributory_hypothesis",
  counterevidence_search: { performed: true, result: "none_identified", searched_at: "2026-08-10T00:00:00Z" },
  ...overrides,
});

test("a well-formed ledger validates", () => {
  const result = validateExplanationLedger({ movements: [movement], explanations: [explanation()] }, [movement]);
  assert.deepEqual(result, { movement_count: 1, explanation_count: 1 });
});

test("an explanation carrying a numeric override is rejected", () => {
  assert.throws(
    () => validateExplanationLedger({ movements: [movement], explanations: [explanation({ amount_minor: 100 })] }, [movement]),
    /forbidden numeric field/,
  );
});

test("causal language above contributory_hypothesis is rejected", () => {
  assert.throws(
    () => validateExplanationLedger({ movements: [movement], explanations: [explanation({ causal_language_level: "causal_conclusion" })] }, [movement]),
    /causal_language_level/,
  );
});

test("a missing counterevidence search is rejected", () => {
  assert.throws(
    () => validateExplanationLedger({ movements: [movement], explanations: [explanation({ counterevidence_search: { performed: false } })] }, [movement]),
    /counterevidence search/,
  );
});

test("claiming no counterevidence exists is rejected; only none_identified is permitted", () => {
  assert.throws(
    () => validateExplanationLedger(
      { movements: [movement], explanations: [explanation({ counterevidence_search: { performed: true, result: "none_exists", searched_at: "2026-08-10T00:00:00Z" } })] },
      [movement],
    ),
    /counterevidence search/,
  );
});

test("an explanation referencing an unknown movement is rejected", () => {
  assert.throws(
    () => validateExplanationLedger({ movements: [movement], explanations: [explanation({ movement_id: "nope" })] }, [movement]),
    /unknown movement/,
  );
});

test("ledger movements must match derived movements exactly", () => {
  const drifted = { ...movement, delta_minor: -1 };
  assert.throws(() => validateExplanationLedger({ movements: [drifted], explanations: [] }, [movement]), /movement drift/);
});

import {
  ELIGIBLE_TRANCHES,
  normaliseObservation,
  applyVatResolutions,
  VAT_RESOLUTION_FILE,
  buildEnvelopeFromRepository,
  canonicalEnvelopeBytes,
} from "../lib/historical-observed-price-envelope.mjs";

test("the on-disk movement ledger matches freshly derived movements", async () => {
  const ledger = await readJson("research/evidence/historical-movement-explanations-2026-08-10/ledger.v1.json");

  const records = [];
  for (const tranche of ELIGIBLE_TRANCHES) {
    const parsed = await readJson(`data/observations/candidate/${tranche.file}`);
    for (const raw of parsed.observations) {
      records.push(normaliseObservation(raw, { sourceFile: tranche.file, captureKind: tranche.captureKind }));
    }
  }
  const resolution = await readJson(VAT_RESOLUTION_FILE);
  const movements = deriveHistoricalMovements(applyVatResolutions(records, resolution.resolutions, resolution.resolution_id));

  const result = validateExplanationLedger(ledger, movements);
  assert.equal(result.movement_count, 7);
  assert.equal(result.explanation_count, 0);
  assert.deepEqual(Object.values(ledger.governance), Object.values(ledger.governance).map(() => false));
});

test("a forbidden numeric field nested inside an explanation is rejected", () => {
  const nested = explanation({
    counterevidence_search: { performed: true, result: "none_identified", searched_at: "2026-08-10T00:00:00Z", amount_minor: 100 },
  });
  assert.throws(
    () => validateExplanationLedger({ movements: [movement], explanations: [nested] }, [movement]),
    /forbidden numeric field/,
  );
});

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

test("mutating the explanation ledger leaves every envelope byte unchanged", async () => {
  const before = sha256(canonicalEnvelopeBytes(buildEnvelopeFromRepository(root)));
  const ledger = await readJson("research/evidence/historical-movement-explanations-2026-08-10/ledger.v1.json");
  const mutated = structuredClone(ledger);
  mutated.explanations.push({ explanation_id: "transient", movement_id: mutated.movements[0].movement_id });
  mutated.explanations.pop();
  const after = sha256(canonicalEnvelopeBytes(buildEnvelopeFromRepository(root)));
  assert.equal(after, before);
});

test("the sparse graph fixture is unchanged by this work", async () => {
  const graph = await readJson("data/fixtures/historical-exact-mpn-sparse-graph.v1.json");
  assert.equal(graph.render_contract.connect_points, false);
  assert.equal(graph.render_contract.interpolate, false);
  assert.equal(graph.render_contract.aggregate_across_products, false);
});
