import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  INDEX_PARAMETERS,
  buildIndexFromRepository,
  canonicalIndexBytes,
  collapseToPeriods,
  deriveMatchedModelIndex,
  jevonsLink,
  quarterIdForMonth,
} from "../lib/matched-model-index.mjs";

const root = new URL("../", import.meta.url);

// A minimal synthetic series in the shape derivePerMpnSeries produces.
const series = (spec) =>
  Object.entries(spec).map(([mpn, points]) => ({
    mpn,
    points: Object.entries(points).map(([month, median_minor]) => ({ month, state: "observed", median_minor })),
  }));

const params = (over) => ({ ...INDEX_PARAMETERS, ...over });

test("quarter derivation maps months to quarters and validates input", () => {
  assert.equal(quarterIdForMonth("2024-01"), "2024Q1");
  assert.equal(quarterIdForMonth("2024-03"), "2024Q1");
  assert.equal(quarterIdForMonth("2024-04"), "2024Q2");
  assert.equal(quarterIdForMonth("2024-12"), "2024Q4");
  assert.throws(() => quarterIdForMonth("2024-13"), /YYYY-MM/u);
  assert.throws(() => quarterIdForMonth("2024-1"), /YYYY-MM/u);
});

test("Jevons is the geometric mean of relatives, not the arithmetic mean", () => {
  // Relatives 0.5 and 2.0: geometric mean is exactly 1, arithmetic mean 1.25.
  // The two answers differ, so this fails against a Carli implementation.
  const link = jevonsLink([
    { from: 10000, to: 5000 },
    { from: 10000, to: 20000 },
  ]);
  assert.ok(Math.abs(link - 1) < 1e-12, `expected 1, got ${link}`);
});

test("Jevons is symmetric: an equal proportional rise and fall returns to the start", () => {
  const up = jevonsLink([{ from: 10000, to: 12500 }]);
  const down = jevonsLink([{ from: 12500, to: 10000 }]);
  assert.ok(Math.abs(up * down - 1) < 1e-12);
});

test("Jevons rejects prices that cannot have a logarithm", () => {
  assert.throws(() => jevonsLink([]), /at least one matched pair/u);
  assert.throws(() => jevonsLink([{ from: 0, to: 100 }]), /base price must be a positive integer/u);
  assert.throws(() => jevonsLink([{ from: 100, to: 0 }]), /current price must be a positive integer/u);
  assert.throws(() => jevonsLink([{ from: 100.5, to: 100 }]), /positive integer/u);
});

test("a product captured twice in a quarter is collapsed to one price", () => {
  const collapsed = collapseToPeriods(series({ A: { "2024-01": 10000, "2024-02": 12000, "2024-03": 50000 } }));
  // Median of the quarter's months, so a heavily crawled month cannot dominate.
  assert.equal(collapsed.get("2024Q1").get("A"), 12000);
});

test("products absent from either period cannot influence a link", () => {
  // B appears only in the second quarter at a wildly different price. If it
  // entered the calculation the link would move sharply; matched-model gives
  // exactly 1.10 from A alone.
  const idx = deriveMatchedModelIndex(
    series({
      A: { "2024-01": 10000, "2024-04": 11000 },
      B: { "2024-04": 90000 },
    }),
    params({ minimum_matched_products_per_link: 1 }),
  );
  const q2 = idx.periods.find((p) => p.period_id === "2024Q2");
  assert.equal(q2.link, 1.1);
  assert.equal(q2.index_value, 110);
  assert.equal(q2.matched_product_count, 1);
  assert.equal(q2.distinct_products_in_period, 2);
});

test("the index is unmoved when the sample changes but no price does", () => {
  // Every matched product holds its price exactly; the sample gains an
  // expensive product and loses a cheap one. A lumped average would move
  // sharply here. The index must not move at all.
  const idx = deriveMatchedModelIndex(
    series({
      HELD1: { "2024-01": 10000, "2024-04": 10000 },
      HELD2: { "2024-01": 12000, "2024-04": 12000 },
      LEAVES: { "2024-01": 5000 },
      ARRIVES: { "2024-04": 80000 },
    }),
    params({ minimum_matched_products_per_link: 2 }),
  );
  const q2 = idx.periods.find((p) => p.period_id === "2024Q2");
  assert.equal(q2.link, 1);
  assert.equal(q2.index_value, 100);
});

test("the chain stops rather than bridging when matched evidence is short", () => {
  const idx = deriveMatchedModelIndex(
    series({
      A: { "2024-01": 10000, "2024-04": 11000 },
      B: { "2024-01": 10000, "2024-04": 11000 },
      // Only one product survives into Q3, below a floor of 2.
      C: { "2024-04": 10000, "2024-07": 20000 },
    }),
    params({ minimum_matched_products_per_link: 2 }),
  );
  const q3 = idx.periods.find((p) => p.period_id === "2024Q3");
  assert.equal(q3.state, "insufficient_matched_evidence");
  assert.equal(q3.index_value, null);
  assert.equal(q3.matched_product_count, 1);
  // Crucially it must not have bridged 2024Q2 -> 2024Q3 by some other route.
  assert.equal(idx.coverage.last_period, "2024Q2");
});

test("the chain runs backwards from the reference period as well as forwards", () => {
  const idx = deriveMatchedModelIndex(
    series({
      A: { "2023-10": 20000, "2024-01": 10000, "2024-04": 5000 },
      B: { "2023-10": 20000, "2024-01": 10000, "2024-04": 5000 },
    }),
    params({ minimum_matched_products_per_link: 2 }),
  );
  const at = (p) => idx.periods.find((x) => x.period_id === p).index_value;
  assert.equal(at("2023Q4"), 200);
  assert.equal(at("2024Q1"), 100);
  assert.equal(at("2024Q2"), 50);
});

test("a reference period with no observations is rejected", () => {
  assert.throws(
    () => deriveMatchedModelIndex(series({ A: { "2024-01": 100 } }), params({ reference_period: "2019Q1" })),
    /cannot anchor the index/u,
  );
});

test("link dispersion is reported so a single extreme product stays visible", () => {
  const idx = deriveMatchedModelIndex(
    series({
      A: { "2024-01": 10000, "2024-04": 10000 },
      B: { "2024-01": 10000, "2024-04": 10000 },
      C: { "2024-01": 10000, "2024-04": 40000 },
    }),
    params({ minimum_matched_products_per_link: 3 }),
  );
  const q2 = idx.periods.find((p) => p.period_id === "2024Q2");
  assert.equal(q2.relative_min, 1);
  assert.equal(q2.relative_median, 1);
  assert.equal(q2.relative_max, 4);
  // The geometric mean is well below the extreme, which is the point of
  // reporting the spread alongside it.
  assert.ok(q2.link < 1.6, `link ${q2.link} should not be dragged to the extreme`);
});

test("the repository index uses the operator's locked parameters", () => {
  assert.equal(INDEX_PARAMETERS.formula, "jevons_geometric_mean_of_price_relatives");
  assert.equal(INDEX_PARAMETERS.minimum_matched_products_per_link, 10);
  assert.equal(INDEX_PARAMETERS.reference_period, "2024Q1");
  assert.equal(INDEX_PARAMETERS.reference_value, 100);
  assert.equal(INDEX_PARAMETERS.weighting, "unweighted_equal_product_weight");
  assert.equal(INDEX_PARAMETERS.approved, false, "no index may describe itself as approved");
});

test("the repository index is internally consistent", () => {
  const idx = buildIndexFromRepository(root);
  const observed = idx.periods.filter((p) => p.state === "observed");
  assert.ok(observed.length >= 2, "expected a chain of at least two periods");

  const base = observed.find((p) => p.reference_period);
  assert.ok(base, "the reference period must appear in the chain");
  assert.equal(base.period_id, INDEX_PARAMETERS.reference_period);
  assert.equal(base.index_value, 100);

  for (const p of observed) {
    if (p.reference_period) continue;
    assert.ok(
      p.matched_product_count >= INDEX_PARAMETERS.minimum_matched_products_per_link,
      `${p.period_id} rests on ${p.matched_product_count} matched products, below the floor`,
    );
    assert.ok(p.index_value > 0, `${p.period_id} must have a positive level`);
    assert.ok(p.relative_min <= p.relative_median && p.relative_median <= p.relative_max);
  }

  // Every forward link must reproduce the level it claims to produce.
  //
  // Levels are chained from unrounded links, while the published link is
  // rounded to four decimals, so re-multiplying the published figures cannot
  // reproduce a level exactly. The tolerance is therefore derived from that
  // rounding rather than picked by eye: at most half a unit in the link's last
  // place (5e-5) scaled by the level it multiplies, plus half a unit in the
  // level's own last place (0.0005).
  for (let i = 1; i < observed.length; i += 1) {
    const prev = observed[i - 1];
    const cur = observed[i];
    if (cur.link === null) continue;
    const expected = prev.index_value * cur.link;
    const tolerance = prev.index_value * 5e-5 + 0.0005 + 0.0005;
    assert.ok(
      Math.abs(expected - cur.index_value) <= tolerance,
      `${cur.period_id}: ${prev.index_value} x ${cur.link} = ${expected.toFixed(4)}, recorded ${cur.index_value} (tolerance ${tolerance.toFixed(4)})`,
    );
  }
});

test("the index matches its golden fixture byte for byte", () => {
  const fixture = readFileSync(new URL("data/fixtures/matched-model-index.v1.json", root), "utf8");
  assert.equal(
    canonicalIndexBytes(buildIndexFromRepository(root)),
    fixture,
    "index derivation changed; re-derive the fixture deliberately and review the diff",
  );
});
