import assert from "node:assert/strict";
import test from "node:test";
import { normaliseObservation } from "../lib/historical-observed-price-envelope.mjs";

const familyB = {
  observation_id: "sf-hist-scan-cmk32gx5m2b6000c36-2022-07-03T173438Z",
  observed_at: "2022-07-03T17:34:38Z",
  product: { mpn: "CMK32GX5M2B6000C36", capacity_gb: 32, module_count: 2, memory_type: "DDR5" },
  price: { item_price_minor: 27548, currency: "GBP", vat_included: null },
  seller: { display_name: "Scan Computers", legal_name: null },
  eligibility: { identity_exact: true },
};

const familyA = {
  observation_id: "awdit-f5-6000j3636f16gx2-fx5-2026-08-09t234337z",
  observed_at: "2026-08-09T23:43:37Z",
  identity: { mpn_observed: "F5-6000J3636F16GX2-FX5" },
  item_price: { amount_minor: 46999, currency: "GBP", vat_state: "included" },
  seller: { display_name: "AWD-IT", legal_name: "ADMI Limited" },
};

const ctx = { sourceFile: "t.json", captureKind: "archive_capture" };

test("family B preserves an explicit null VAT state", () => {
  const out = normaliseObservation(familyB, ctx);
  assert.equal(out.mpn, "CMK32GX5M2B6000C36");
  assert.equal(out.amount_minor, 27548);
  assert.equal(out.vat_included, null);
  assert.equal(out.seller_display_name, "Scan Computers");
});

test("family A maps vat_state included to true", () => {
  const out = normaliseObservation(familyA, { ...ctx, captureKind: "prospective_capture" });
  assert.equal(out.mpn, "F5-6000J3636F16GX2-FX5");
  assert.equal(out.amount_minor, 46999);
  assert.equal(out.vat_included, true);
  assert.equal(out.capture_kind, "prospective_capture");
});

test("an unrecognised observation shape fails closed", () => {
  assert.throws(
    () => normaliseObservation({ observation_id: "x", display_price: "£10" }, ctx),
    /unrecognised observation schema/,
  );
});

test("a non-GBP amount fails closed", () => {
  const bad = { ...familyB, price: { ...familyB.price, currency: "USD" } };
  assert.throws(() => normaliseObservation(bad, ctx), /currency must be GBP/);
});

test("a non-UTC or variable-width timestamp fails closed, protecting chronological sorting", () => {
  const base = {
    observation_id: "x", observed_at: "2022-07-03T17:34:38Z",
    product: { mpn: "M", capacity_gb: 32, module_count: 2, memory_type: "DDR5" },
    price: { item_price_minor: 100, currency: "GBP", vat_included: true },
    seller: { display_name: "S", legal_name: null },
    eligibility: { identity_exact: true },
  };
  const ctx = { sourceFile: "t.json", captureKind: "archive_capture" };
  assert.equal(normaliseObservation(base, ctx).observed_at, "2022-07-03T17:34:38Z");
  for (const bad of ["2022-07-03T17:34:38+01:00", "2022-7-3T17:34:38Z", "2022-07-03 17:34:38Z", "2022-07-03T17:34:38.500Z"]) {
    assert.throws(() => normaliseObservation({ ...base, observed_at: bad }, ctx), /fixed-width UTC instant/, `should reject ${bad}`);
  }
});

test("a 16GB Family B kit fails closed on capacity", () => {
  const bad = { ...familyB, product: { ...familyB.product, capacity_gb: 16 } };
  assert.throws(() => normaliseObservation(bad, ctx), /capacity_gb must be 32/);
});

test("a 64GB Family B kit fails closed on capacity", () => {
  const bad = { ...familyB, product: { ...familyB.product, capacity_gb: 64 } };
  assert.throws(() => normaliseObservation(bad, ctx), /capacity_gb must be 32/);
});

test("a Family B DDR4 part fails closed on memory type", () => {
  const bad = { ...familyB, product: { ...familyB.product, memory_type: "DDR4" } };
  assert.throws(() => normaliseObservation(bad, ctx), /memory_type must be DDR5/);
});

test("a non-2-module Family B kit fails closed on module count", () => {
  const bad = { ...familyB, product: { ...familyB.product, module_count: 1 } };
  assert.throws(() => normaliseObservation(bad, ctx), /module_count must be 2/);
});

test("a Family B row that is not an exact identity match fails closed", () => {
  const bad = { ...familyB, eligibility: { identity_exact: false } };
  assert.throws(() => normaliseObservation(bad, ctx), /identity_exact must be true/);
});

test("an unrecognised Family A vat_state fails closed rather than silently becoming unresolved", () => {
  const bad = { ...familyA, item_price: { ...familyA.item_price, vat_state: "exlcuded" } };
  assert.throws(() => normaliseObservation(bad, ctx), /vat_state must be "included" or "excluded"/);
});

import { quarterIdForTimestamp, quarterBounds, quarterRange } from "../lib/historical-observed-price-envelope.mjs";

test("timestamps bucket into UTC calendar quarters", () => {
  assert.equal(quarterIdForTimestamp("2021-11-02T17:18:37Z"), "2021-Q4");
  assert.equal(quarterIdForTimestamp("2023-01-28T07:42:17Z"), "2023-Q1");
  assert.equal(quarterIdForTimestamp("2023-08-15T14:08:13Z"), "2023-Q3");
  assert.equal(quarterIdForTimestamp("2026-08-09T23:43:37Z"), "2026-Q3");
});

test("quarter bounds are half-open UTC instants", () => {
  assert.deepEqual(quarterBounds("2023-Q1"), {
    start: "2023-01-01T00:00:00Z",
    end: "2023-04-01T00:00:00Z",
  });
});

test("quarter range is inclusive, ordered and gapless", () => {
  assert.deepEqual(quarterRange("2022-Q3", "2023-Q2"), ["2022-Q3", "2022-Q4", "2023-Q1", "2023-Q2"]);
});

import { deriveObservedPriceEnvelope } from "../lib/historical-observed-price-envelope.mjs";

const obs = (id, at, mpn, seller, amount, vat) => ({
  observation_id: id, observed_at: at, mpn, seller_display_name: seller,
  seller_legal_name: null, amount_minor: amount, currency: "GBP",
  vat_included: vat, capture_kind: "archive_capture", source_file: "t.json",
});

test("a quarter envelope reports low, high and evidence breadth", () => {
  const envelope = deriveObservedPriceEnvelope([
    obs("a", "2023-01-28T07:42:17Z", "CT2K16G56C46U5", "Crucial UK", 14879, true),
    obs("b", "2023-03-15T07:59:07Z", "CMK32GX5M2B6000C36", "Scan Computers", 13000, null),
  ]);
  const q1 = envelope.periods.find((p) => p.period_id === "2023-Q1");
  assert.equal(q1.state, "observed");
  assert.equal(q1.low.amount_minor, 13000);
  assert.equal(q1.low.observation_id, "b");
  assert.equal(q1.high.amount_minor, 14879);
  assert.equal(q1.observation_count, 2);
  assert.equal(q1.distinct_mpn_count, 2);
  assert.equal(q1.distinct_seller_count, 2);
  assert.equal(q1.vat_resolved_count, 1);
  assert.equal(q1.vat_unresolved_count, 1);
  assert.deepEqual(q1.contributing_observation_ids, ["a", "b"]);
});

test("a quarter with no evidence is an explicit gap, never zero", () => {
  const envelope = deriveObservedPriceEnvelope([
    obs("a", "2022-07-03T17:34:38Z", "X", "Scan Computers", 27548, null),
    obs("b", "2023-01-28T07:42:17Z", "Y", "Crucial UK", 14879, true),
  ]);
  const q4 = envelope.periods.find((p) => p.period_id === "2022-Q4");
  assert.equal(q4.state, "no_eligible_evidence");
  assert.equal(q4.low, null);
  assert.equal(q4.high, null);
  assert.equal(q4.observation_count, 0);
});

test("a single-observation quarter is a degenerate envelope with an honest count", () => {
  const envelope = deriveObservedPriceEnvelope([obs("a", "2024-05-01T00:00:00Z", "X", "Box", 9999, true)]);
  const only = envelope.periods[0];
  assert.equal(only.low.amount_minor, only.high.amount_minor);
  assert.equal(only.observation_count, 1);
});

test("the envelope asserts no central tendency", () => {
  const envelope = deriveObservedPriceEnvelope([obs("a", "2024-05-01T00:00:00Z", "X", "Box", 9999, true)]);
  assert.equal(envelope.render_contract.central_tendency, false);
  assert.equal(envelope.render_contract.median_state, "UNAVAILABLE_AGGREGATION_NOT_APPROVED");
  assert.equal(JSON.stringify(envelope).includes("median_value"), false);
  const expectedGovernanceKeys = [
    "methodology_approval",
    "aggregation_rule_approval",
    "reference_period_approval",
    "basket_approval",
    "source_approval",
    "index_eligibility",
    "publication_allowed",
  ].sort();
  assert.deepEqual(Object.keys(envelope.governance).sort(), expectedGovernanceKeys);
  for (const [flag, value] of Object.entries(envelope.governance)) {
    assert.equal(value, false, `governance flag ${flag} must be false`);
  }
});

test("derivation is deterministic regardless of input order, including on both low and high ties", () => {
  const records = [
    obs("zzz", "2024-05-01T00:00:00Z", "X", "Box", 5000, true),
    obs("aaa", "2024-05-02T00:00:00Z", "Y", "CCL", 5000, true),
    obs("mmm", "2024-06-01T00:00:00Z", "Z", "Scan Computers", 9000, true),
    obs("bbb", "2024-06-02T00:00:00Z", "W", "AWD-IT", 9000, true),
  ];
  const forward = deriveObservedPriceEnvelope(records);
  const reversed = deriveObservedPriceEnvelope(records.slice().reverse());
  assert.equal(JSON.stringify(reversed), JSON.stringify(forward));
  // low is tied at 5000 between zzz and aaa; smallest observation_id must win.
  assert.equal(forward.periods[0].low.observation_id, "aaa");
  // high is tied at 9000 between mmm and bbb; smallest observation_id must win.
  assert.equal(forward.periods[0].high.observation_id, "bbb");
});

import { readFile } from "node:fs/promises";
import { buildEnvelopeFromRepository, canonicalEnvelopeBytes, ELIGIBLE_TRANCHES } from "../lib/historical-observed-price-envelope.mjs";

const root = new URL("../", import.meta.url);

test("the marketplace tranche is excluded from the envelope", () => {
  assert.equal(ELIGIBLE_TRANCHES.some((t) => t.file.includes("amazon")), false);
});

test("the golden fixture re-derives byte-for-byte from immutable observations", async () => {
  const golden = await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8");
  const rederived = canonicalEnvelopeBytes(buildEnvelopeFromRepository(root));
  assert.equal(rederived, golden);
});

test("every contributing observation id resolves to a real observation", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  const known = new Set();
  for (const tranche of ELIGIBLE_TRANCHES) {
    const raw = JSON.parse(await readFile(new URL(`data/observations/candidate/${tranche.file}`, root), "utf8"));
    for (const o of raw.observations) known.add(o.observation_id);
  }
  for (const period of golden.periods) {
    for (const id of period.contributing_observation_ids) assert.equal(known.has(id), true, `dangling observation id: ${id}`);
    if (period.low) assert.equal(known.has(period.low.observation_id), true);
    if (period.high) assert.equal(known.has(period.high.observation_id), true);
  }
});

test("the envelope's low tracks the actual minimum, not a fixed position", async () => {
  const golden = await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8");
  assert.equal(canonicalEnvelopeBytes(buildEnvelopeFromRepository(root)), golden);

  const records = [];
  for (const tranche of ELIGIBLE_TRANCHES) {
    const parsed = JSON.parse(await readFile(new URL(`data/observations/candidate/${tranche.file}`, root), "utf8"));
    for (const raw of parsed.observations) {
      records.push(normaliseObservation(raw, { sourceFile: tranche.file, captureKind: tranche.captureKind }));
    }
  }
  const baseline = deriveObservedPriceEnvelope(records);

  // Pick a challenger that is neither the current low nor the id-sorted first
  // entry, so an amount-blind implementation returning the sorted-first record
  // fails this test rather than passing it by coincidence.
  let period = null;
  let challengerId = null;
  for (const candidatePeriod of baseline.periods.filter((p) => p.observation_count >= 2)) {
    const candidate = candidatePeriod.contributing_observation_ids.find(
      (id, index) => index > 0 && id !== candidatePeriod.low.observation_id,
    );
    if (candidate) {
      period = candidatePeriod;
      challengerId = candidate;
      break;
    }
  }
  assert.ok(period && challengerId, "expected a period with a non-first, non-low observation");

  const undercut = period.low.amount_minor - 1;
  const nudged = records.map((r) => (r.observation_id === challengerId ? { ...r, amount_minor: undercut } : r));
  const after = deriveObservedPriceEnvelope(nudged);
  const afterPeriod = after.periods.find((p) => p.period_id === period.period_id);

  assert.equal(afterPeriod.low.observation_id, challengerId);
  assert.equal(afterPeriod.low.amount_minor, undercut);
  assert.notEqual(afterPeriod.low.observation_id, period.low.observation_id);
});

test("a period cannot claim an observation outside its own quarter", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  const byId = new Map();
  for (const tranche of ELIGIBLE_TRANCHES) {
    const raw = JSON.parse(await readFile(new URL(`data/observations/candidate/${tranche.file}`, root), "utf8"));
    for (const o of raw.observations) byId.set(o.observation_id, o.observed_at);
  }
  for (const period of golden.periods) {
    for (const id of period.contributing_observation_ids) {
      assert.equal(quarterIdForTimestamp(byId.get(id)), period.period_id);
    }
  }
});

test("every period carries VAT disclosure counts that sum to its observation count", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  for (const period of golden.periods) {
    assert.equal(period.vat_resolved_count + period.vat_unresolved_count, period.observation_count);
  }
});

test("a Q4 quarter's exclusive end rolls into January of the next year", () => {
  assert.deepEqual(quarterBounds("2023-Q4"), {
    start: "2023-10-01T00:00:00Z",
    end: "2024-01-01T00:00:00Z",
  });
  assert.equal(quarterIdForTimestamp("2023-12-31T23:59:59Z"), "2023-Q4");
  assert.equal(quarterIdForTimestamp("2024-01-01T00:00:00Z"), "2024-Q1");
});

test("no period fabricates a value for an empty quarter", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  for (const period of golden.periods.filter((p) => p.state === "no_eligible_evidence")) {
    assert.equal(period.low, null);
    assert.equal(period.high, null);
    assert.deepEqual(period.contributing_observation_ids, []);
  }
});

import { applyVatResolutions } from "../lib/historical-observed-price-envelope.mjs";

test("an additive resolution overrides VAT state and records its source", () => {
  const records = [{
    observation_id: "sf-hist-scan-cmk32gx5m2b6000c36-2022-07-03T173438Z",
    vat_included: null, amount_minor: 27548,
  }];
  const [out] = applyVatResolutions(records, [{
    observation_id: "sf-hist-scan-cmk32gx5m2b6000c36-2022-07-03T173438Z",
    vat_included_before: null, vat_included_after: true,
  }]);
  assert.equal(out.vat_included, true);
  assert.equal(out.vat_resolution_source, "sf-scan-vat-display-resolution-2026-08-10");
});

test("a resolution whose before-state disagrees with the observation fails closed", () => {
  assert.throws(() => applyVatResolutions(
    [{ observation_id: "a", vat_included: true }],
    [{ observation_id: "a", vat_included_before: null, vat_included_after: true }],
  ), /resolution before-state mismatch/);
});

test("a resolution for an unknown observation fails closed", () => {
  assert.throws(() => applyVatResolutions(
    [{ observation_id: "a", vat_included: null }],
    [{ observation_id: "ghost", vat_included_before: null, vat_included_after: true }],
  ), /unknown observation/);
});

test("the Scan observations resolve to VAT-inclusive in the golden fixture", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  const q = golden.periods.find((p) => p.period_id === "2022-Q3");
  assert.equal(q.vat_unresolved_count, 0);
});

test("applying a VAT resolution does not mutate the caller's records", () => {
  const original = [{ observation_id: "a", vat_included: null, amount_minor: 100 }];
  const out = applyVatResolutions(original, [
    { observation_id: "a", vat_included_before: null, vat_included_after: true },
  ]);
  assert.equal(original[0].vat_included, null, "input record must be untouched");
  assert.equal(original[0].vat_resolution_source, undefined);
  assert.equal(out[0].vat_included, true);
  assert.notEqual(out[0], original[0], "must return a new object, not the same reference");
});
