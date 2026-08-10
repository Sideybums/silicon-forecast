import assert from "node:assert/strict";
import test from "node:test";
import { normaliseObservation } from "../lib/historical-observed-price-envelope.mjs";

const familyB = {
  observation_id: "sf-hist-scan-cmk32gx5m2b6000c36-2022-07-03T173438Z",
  observed_at: "2022-07-03T17:34:38Z",
  product: { mpn: "CMK32GX5M2B6000C36" },
  price: { item_price_minor: 27548, currency: "GBP", vat_included: null },
  seller: { display_name: "Scan Computers", legal_name: null },
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
  assert.deepEqual(Object.values(envelope.governance), [false, false, false, false, false, false, false]);
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
