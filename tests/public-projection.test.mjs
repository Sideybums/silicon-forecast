import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PASS_THROUGH_FIELDS,
  assertPublicSafe,
  projectEvents,
  projectIndex,
  projectProducts,
} from "../lib/public-projection.mjs";
import { buildIndexFromRepository } from "../lib/matched-model-index.mjs";
import { buildSeriesFromRepository } from "../lib/per-mpn-price-series.mjs";
import { repositoryPrivateTokens, repositoryReasonCodes } from "./helpers/private-tokens.mjs";

const root = new URL("../", import.meta.url);
const FLOOR = { min_months: 6, min_sellers: 2 };
const REBASING = { basis: "first_observed_month_equals_1000_permille", selected_by: "operator" };

test("the private projection manifest binds every dataset byte-for-byte", () => {
  const manifest = JSON.parse(readFileSync(new URL("data/public-projection/manifest.v1.json", root), "utf8"));
  assert.equal(manifest.publication_eligible, false);
  assert.deepEqual(manifest.datasets.map((entry) => entry.path), [...manifest.datasets.map((entry) => entry.path)].sort());
  for (const entry of manifest.datasets) {
    const bytes = readFileSync(new URL(`data/public-projection/${entry.path}`, root));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256);
    assert.equal(bytes.length, entry.byte_length);
  }
});

const rawIndex = () => buildIndexFromRepository(root);
const rawSeries = () => buildSeriesFromRepository(root, { minMonths: FLOOR.min_months, minSellers: FLOOR.min_sellers });
const ledger = () =>
  JSON.parse(readFileSync(new URL("research/evidence/historical-movement-explanations-2026-08-10/ledger.v1.json", root), "utf8"));

// --- the structural proof ----------------------------------------------------

/**
 * Replaces every leaf string with a traceable sentinel and adds an extra key at
 * every object node. If the projection copies anything it was not explicitly
 * told to copy, a sentinel surfaces in the output.
 */
function poison(value, counter = { n: 0 }) {
  if (typeof value === "string") return `SF_POISON_${counter.n++}`;
  if (Array.isArray(value)) return value.map((item) => poison(item, counter));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = poison(child, counter);
    out[`sf_poison_extra_${counter.n++}`] = `SF_POISON_${counter.n++}`;
    return out;
  }
  return value;
}

function stringsWithPaths(node, path = "", found = []) {
  if (typeof node === "string") {
    found.push({ path, value: node });
    return found;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => stringsWithPaths(item, `${path}[]`, found));
    return found;
  }
  if (node && typeof node === "object") {
    for (const [key, child] of Object.entries(node)) stringsWithPaths(child, path ? `${path}.${key}` : key, found);
  }
  return found;
}

const leafName = (path) => path.split(".").pop().replace("[]", "");

test("the projection cannot leak a field that does not exist yet", () => {
  // The difference between "safe today" and "safe": an upstream module gaining
  // a field tomorrow must not be able to carry it into public output.
  const cases = [
    ["index", () => projectIndex(poison(rawIndex()), "ram")],
    ["products", () => projectProducts(poison(rawSeries()), { datasetId: "ram", floor: FLOOR, rebasing: REBASING, excludedBelowFloorCount: 0 })],
    ["events", () => projectEvents(poison(ledger()), { datasetId: "ram", movementCount: 99 })],
  ];

  for (const [dataset, run] of cases) {
    const projected = run();
    const leaked = stringsWithPaths(projected)
      .filter((entry) => entry.value.startsWith("SF_POISON_"))
      .filter((entry) => !PASS_THROUGH_FIELDS[dataset].includes(leafName(entry.path)));
    assert.deepEqual(leaked, [], `${dataset} projection leaked poisoned input at undeclared paths`);

    // And no poisoned *key* may survive into the output at all.
    const keys = new Set();
    const walkKeys = (n) => {
      if (Array.isArray(n)) return n.forEach(walkKeys);
      if (!n || typeof n !== "object") return;
      for (const [k, v] of Object.entries(n)) { keys.add(k); walkKeys(v); }
    };
    walkKeys(projected);
    assert.deepEqual([...keys].filter((k) => k.startsWith("sf_poison_extra_")), [], `${dataset} projection copied an unknown key`);
  }
});

test("every declared pass-through is genuinely reachable", () => {
  // Guards the poison test itself: a pass-through list that named fields the
  // projection never emits would silently widen the exemption.
  const emitted = {
    index: new Set(stringsWithPaths(projectIndex(rawIndex(), "ram")).map((e) => leafName(e.path))),
    products: new Set(stringsWithPaths(projectProducts(rawSeries(), { datasetId: "ram", floor: FLOOR, rebasing: REBASING, excludedBelowFloorCount: 0 })).map((e) => leafName(e.path))),
  };
  for (const dataset of ["index", "products"]) {
    for (const field of PASS_THROUGH_FIELDS[dataset]) {
      assert.ok(emitted[dataset].has(field), `${dataset} declares pass-through "${field}" but never emits it`);
    }
  }
});

// --- the closed key set ------------------------------------------------------

test("projected output contains only schema keys and integer numerics", () => {
  const tokens = repositoryPrivateTokens();
  const codes = repositoryReasonCodes();
  assertPublicSafe(projectIndex(rawIndex(), "ram"), "index", { privateTokens: tokens, reasonCodes: codes });
  assertPublicSafe(
    projectProducts(rawSeries(), { datasetId: "ram", floor: FLOOR, rebasing: REBASING, excludedBelowFloorCount: 0 }),
    "products",
    { privateTokens: tokens, reasonCodes: codes },
  );
  assertPublicSafe(projectEvents(ledger(), { datasetId: "ram", movementCount: 99 }), "events", { privateTokens: tokens, reasonCodes: codes });
});

test("assertPublicSafe actually rejects what it claims to", () => {
  const ok = projectIndex(rawIndex(), "ram");
  const withExtraKey = JSON.parse(JSON.stringify(ok));
  withExtraKey.periods[0].observed_at = "2024-01-01T00:00:00Z";
  assert.throws(() => assertPublicSafe(withExtraKey, "index"), /not in the index public schema/u);

  const withMoney = JSON.parse(JSON.stringify(ok));
  withMoney.periods[0].amount_minor = 12999;
  assert.throws(() => assertPublicSafe(withMoney, "index"), /money-bearing key/u);

  const withFloat = JSON.parse(JSON.stringify(ok));
  withFloat.periods[0].index_milli = 103.568;
  assert.throws(() => assertPublicSafe(withFloat, "index"), /non-integer number/u);

  const withCurrency = JSON.parse(JSON.stringify(ok));
  withCurrency.parameters_public.formula = "mean of £129.99";
  assert.throws(() => assertPublicSafe(withCurrency, "index"), /currency value|two-decimal/u);

  const withToken = JSON.parse(JSON.stringify(ok));
  withToken.parameters_public.formula = "leaked-token-here";
  assert.throws(() => assertPublicSafe(withToken, "index", { privateTokens: new Set(["leaked-token-here"]) }), /private token/u);

  const withCode = JSON.parse(JSON.stringify(ok));
  withCode.parameters_public.gap_policy = "SOURCE_UNAPPROVED";
  assert.throws(() => assertPublicSafe(withCode, "index", { reasonCodes: new Set(["SOURCE_UNAPPROVED"]) }), /reason code/u);
});

// --- money-free zone ---------------------------------------------------------

test("no projected value is a price in any rendering", () => {
  for (const [dataset, projected] of [
    ["index", projectIndex(rawIndex(), "ram")],
    ["products", projectProducts(rawSeries(), { datasetId: "ram", floor: FLOOR, rebasing: REBASING, excludedBelowFloorCount: 0 })],
  ]) {
    const bytes = JSON.stringify(projected);
    assert.doesNotMatch(bytes, /\d\.\d{2}(?!\d)/u, `${dataset} contains a two-decimal value`);
    assert.doesNotMatch(bytes, /£|\bGBP\b/u, `${dataset} contains a currency marker`);
  }
});

test("per-product output carries relative change only, never a level", () => {
  const projected = projectProducts(rawSeries(), { datasetId: "ram", floor: FLOOR, rebasing: REBASING, excludedBelowFloorCount: 0 });
  assert.ok(projected.products.length > 0);
  for (const product of projected.products) {
    // Every product's first observed month is its own base.
    assert.equal(product.points[0].relative_permille, 1000, `${product.mpn} is not rebased to its first month`);
    for (const point of product.points) {
      assert.ok(Number.isInteger(point.relative_permille));
      assert.ok(point.relative_permille > 0);
    }
  }
  // The private contributor detail must not survive projection.
  const bytes = JSON.stringify(projected);
  for (const field of ["contributors", "observed_at", "median_minor", "low_minor", "high_minor", "seller_display_name"]) {
    assert.equal(bytes.includes(field), false, `product projection leaked ${field}`);
  }
});

// --- honesty of the derived series ------------------------------------------

test("the index projection preserves gaps and parks unapproved dispersion diagnostics", () => {
  const projected = projectIndex(rawIndex(), "ram");
  const gaps = projected.periods.filter((p) => p.state !== "observed");
  assert.ok(gaps.length > 0, "expected the real chain to stop at both ends");
  for (const gap of gaps) {
    assert.equal(gap.index_milli, null, "a period with insufficient evidence must carry no level");
  }
  const observed = projected.periods.filter((p) => p.state === "observed");
  const reference = observed.filter((p) => p.is_reference);
  assert.equal(reference.length, 1, "exactly one private calculation anchor");
  assert.equal(reference[0].index_milli, 100000, "private calculation anchor is 100 in thousandths");
  assert.equal(JSON.stringify(projected).includes("dispersion"), false, "unapproved dispersion must not enter the projection");
});

test("the parameters a reader needs to judge the number are published, including that it is unapproved", () => {
  const p = projectIndex(rawIndex(), "ram").parameters_public;
  assert.equal(p.formula, "jevons_geometric_mean_of_price_relatives");
  assert.equal(p.reference_period, "2024Q1");
  assert.equal(p.weighting, "unweighted_equal_product_weight");
  assert.ok(p.weighting_basis.length > 40, "the reason there is no weighting must travel with the parameter");
  assert.equal(p.approved, false);
});

test("the event line reports what it does not know", () => {
  const projected = projectEvents(ledger(), { datasetId: "ram", movementCount: 99 });
  assert.deepEqual(projected.markers, [], "the ledger currently holds no explanations");
  assert.equal(projected.movement_count, 99);
  assert.equal(projected.explained_movement_count, 0);
  assert.equal(projected.unexplained_movement_count, 99);
  assert.equal(
    projected.explained_movement_count + projected.unexplained_movement_count,
    projected.movement_count,
    "every movement must be either explained or explicitly unexplained",
  );
  assert.match(projected.pending_reason, /research has not been done, not that no explanation exists/u);
});

test("a marker never carries the movement id or the retained response", () => {
  const withExplanation = ledger();
  withExplanation.explanations = [{
    explanation_id: "exp-1",
    movement_id: "movement-cmk32gx5m2b6000z30-sf-hist-scan-aaa-sf-hist-scan-bbb",
    period_id: "2025Q4",
    causal_language_level: "temporal_association",
    response_sha256: "a".repeat(64),
    minimal_quote: "a quoted sentence from the publisher",
    source: {
      title: "Memory prices climb", author: "A Writer", publisher: "Example Trade Press",
      url: "https://example.test/story", published_on: "2025-11-04", accessed_on: "2025-11-05",
    },
  }];
  const projected = projectEvents(withExplanation, { datasetId: "ram", movementCount: 99 });
  const bytes = JSON.stringify(projected);
  assert.equal(projected.markers.length, 1);
  assert.match(projected.markers[0].marker_id, /^ev-[0-9a-f]{12}$/u);
  for (const forbidden of ["movement_id", "sf-hist-scan-aaa", "a".repeat(64), "minimal_quote", "a quoted sentence", "exp-1"]) {
    assert.equal(bytes.includes(forbidden), false, `marker leaked ${forbidden}`);
  }
  assert.equal(projected.markers[0].source.title, "Memory prices climb");
  assert.equal(projected.markers[0].source.publisher, "Example Trade Press");
  assert.equal(projected.unexplained_movement_count, 98);
});
