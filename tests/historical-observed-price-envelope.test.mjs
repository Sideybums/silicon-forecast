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
