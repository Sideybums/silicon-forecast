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
  // Attribution the public event marker renders. An explanation points at
  // somebody else's work and must credit it.
  source: {
    title: "Memory makers trim output as inventories build",
    author: "A Writer",
    publisher: "Example Trade Press",
    url: "https://example.test/report",
    published_on: "2023-06-01",
    accessed_on: "2026-08-10",
  },
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
  // Pin the ledger to the derivation, not to a magic number: acquiring more
  // evidence legitimately changes the movement count, and validateExplanationLedger
  // already rejects any recorded movement that does not match a derived one.
  assert.equal(result.movement_count, movements.length);
  assert.ok(result.movement_count > 0, "expected at least one derivable movement");
  assert.equal(result.explanation_count, 0);
  // Every movement must name a comparison basis, and within-seller must be
  // preferred wherever a same-seller pair exists.
  for (const movement of ledger.movements) {
    assert.ok(["within_seller", "cross_seller"].includes(movement.comparison_basis));
  }
  const expectedGovernanceKeys = [
    "research_performed",
    "sources_fetched",
    "sources_hashed",
    "counterevidence_search_performed",
    "causal_language_reviewed",
    "publication_eligible",
  ].sort();
  assert.deepEqual(Object.keys(ledger.governance).sort(), expectedGovernanceKeys);
  for (const [flag, value] of Object.entries(ledger.governance)) {
    assert.equal(value, false, `governance flag ${flag} must be false`);
  }
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

test("adding an explanation to the on-disk ledger leaves envelope and sparse-graph bytes identical", async () => {
  const { readFileSync, writeFileSync } = await import("node:fs");
  const ledgerUrl = new URL("research/evidence/historical-movement-explanations-2026-08-10/ledger.v1.json", root);
  const graphUrl = new URL("data/fixtures/historical-exact-mpn-sparse-graph.v1.json", root);
  const original = readFileSync(ledgerUrl, "utf8");

  const envelopeBefore = sha256(canonicalEnvelopeBytes(buildEnvelopeFromRepository(root)));
  const graphBefore = sha256(readFileSync(graphUrl, "utf8"));

  try {
    const mutated = JSON.parse(original);
    mutated.explanations.push({
      explanation_id: "transient-probe",
      movement_id: mutated.movements[0].movement_id,
      published_at: "2023-06-01T00:00:00Z",
      publisher: "Transient Probe",
      url: "https://example.invalid/probe",
      response_sha256: "0".repeat(64),
      response_bytes: 1,
      minimal_quote: "probe",
      proposed_mechanism: "probe",
      causal_language_level: "contributory_hypothesis",
      counterevidence_search: { performed: true, result: "none_identified", searched_at: "2026-08-10T00:00:00Z" },
    });
    writeFileSync(ledgerUrl, `${JSON.stringify(mutated, null, 2)}\n`);

    assert.equal(sha256(canonicalEnvelopeBytes(buildEnvelopeFromRepository(root))), envelopeBefore);
    assert.equal(sha256(readFileSync(graphUrl, "utf8")), graphBefore);
  } finally {
    writeFileSync(ledgerUrl, original);
  }
  assert.equal(readFileSync(ledgerUrl, "utf8"), original);
});

test("the sparse graph fixture is unchanged by this work", async () => {
  const graph = await readJson("data/fixtures/historical-exact-mpn-sparse-graph.v1.json");
  assert.equal(graph.render_contract.connect_points, false);
  assert.equal(graph.render_contract.interpolate, false);
  assert.equal(graph.render_contract.aggregate_across_products, false);
});

// --- attribution ------------------------------------------------------------
//
// An event marker points at somebody else's work. These pin that a marker can
// never be rendered without the credit that makes it honest.

test("an explanation must credit the work it points at", async () => {
  const { validateExplanationLedger, AUTHOR_NOT_STATED } = await import("../lib/historical-movement-explanations.mjs");
  const movement = { movement_id: "m-1" };
  const base = {
    explanation_id: "exp-1",
    movement_id: "m-1",
    causal_language_level: "temporal_association",
    counterevidence_search: { performed: true, result: "none_identified", searched_at: "2026-08-13T00:00:00Z" },
    response_sha256: "a".repeat(64),
    minimal_quote: "a short retained extract",
    source: {
      title: "Memory prices climb through the autumn",
      author: "A Writer",
      publisher: "Example Trade Press",
      url: "https://example.test/story",
      published_on: "2025-11-04",
      accessed_on: "2025-11-05",
    },
  };
  const ledger = (source) => ({ movements: [movement], explanations: [{ ...base, source }] });
  const derived = [movement];

  assert.equal(validateExplanationLedger(ledger(base.source), derived).explanation_count, 1);

  // A publisher that names nobody is recorded as such, never left blank and
  // never guessed at.
  assert.equal(
    validateExplanationLedger(ledger({ ...base.source, author: AUTHOR_NOT_STATED }), derived).explanation_count,
    1,
  );

  for (const [field, value, pattern] of [
    ["title", "", /source\.title is required/u],
    ["title", "   ", /source\.title is required/u],
    ["publisher", "", /source\.publisher is required/u],
    ["author", "", /source\.author is required/u],
    ["url", "http://example.test/x", /must be an https URL/u],
    ["published_on", "Nov 2025", /must be a YYYY-MM-DD date/u],
    ["accessed_on", "", /must be a YYYY-MM-DD date/u],
  ]) {
    assert.throws(() => validateExplanationLedger(ledger({ ...base.source, [field]: value }), derived), pattern, `${field}=${value}`);
  }

  assert.throws(() => validateExplanationLedger({ movements: [movement], explanations: [{ ...base, source: undefined }] }, derived), /has no source block/u);
});

test("a synthetic fixture URL can never become a real citation", async () => {
  const { validateExplanationLedger } = await import("../lib/historical-movement-explanations.mjs");
  const movement = { movement_id: "m-1" };
  const explanation = {
    explanation_id: "exp-1",
    movement_id: "m-1",
    causal_language_level: "temporal_association",
    counterevidence_search: { performed: true, result: "none_identified", searched_at: "2026-08-13T00:00:00Z" },
    response_sha256: "a".repeat(64),
    minimal_quote: "extract",
    source: {
      title: "Synthetic", author: "Nobody", publisher: "Fixture",
      url: "https://news.fixture.invalid/story", published_on: "2025-11-04", accessed_on: "2025-11-05",
    },
  };
  assert.throws(
    () => validateExplanationLedger({ movements: [movement], explanations: [explanation] }, [movement]),
    /synthetic fixture host/u,
  );
});
