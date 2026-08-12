import assert from "node:assert/strict";
import test from "node:test";
import {
  applySellerIdentityResolution,
  compareCodepoint,
  derivePerMpnSeries,
  medianMinor,
  monthIdForTimestamp,
  speedFromMpn,
  buildSeriesFromRepository,
  loadSeriesObservations,
  SELLER_RESOLUTION_FILE,
  SERIES_TRANCHES,
} from "../lib/per-mpn-price-series.mjs";

const obs = (overrides) => ({
  observation_id: `sf-test-${Math.random().toString(36).slice(2)}`,
  observed_at: "2025-03-04T00:00:00Z",
  mpn: "TEST-MPN-1",
  seller_display_name: "Seller A",
  seller_legal_name: null,
  amount_minor: 10000,
  currency: "GBP",
  vat_included: true,
  capture_kind: "archive_capture",
  source_file: "test.json",
  ...overrides,
});

test("medianMinor returns the central value and rejects non-integer minor units", () => {
  assert.equal(medianMinor([300, 100, 200]), 200);
  assert.equal(medianMinor([500]), 500);
  // Even count: the two central values are averaged and rounded half-up, so the
  // result stays an exact number of pence.
  assert.equal(medianMinor([101, 102]), 102);
  assert.equal(medianMinor([100, 102]), 101);
  assert.equal(medianMinor([100, 200, 300, 400]), 250);
  assert.throws(() => medianMinor([]), /at least one value/u);
  assert.throws(() => medianMinor([100.5, 200]), /integer minor units/u);
});

test("medianMinor does not mutate its input", () => {
  const values = [300, 100, 200];
  medianMinor(values);
  assert.deepEqual(values, [300, 100, 200]);
});

test("a seller captured many times counts once toward the month's median", () => {
  // Three captures from one seller at 100.00 and a single capture from another
  // at 200.00. Counting captures individually would put the median at 100.00;
  // one seller one vote puts it at 150.00. The two answers differ, so this
  // fails against an implementation that ignores the rule.
  const series = derivePerMpnSeries([
    obs({ seller_display_name: "Seller A", amount_minor: 10000, observed_at: "2025-03-01T00:00:00Z" }),
    obs({ seller_display_name: "Seller A", amount_minor: 10000, observed_at: "2025-03-11T00:00:00Z" }),
    obs({ seller_display_name: "Seller A", amount_minor: 10000, observed_at: "2025-03-21T00:00:00Z" }),
    obs({ seller_display_name: "Seller B", amount_minor: 20000, observed_at: "2025-03-05T00:00:00Z" }),
  ]);

  const [point] = series[0].points;
  assert.equal(point.median_minor, 15000);
  assert.equal(point.seller_count, 2);
  assert.equal(point.single_seller, false);
  const a = point.contributors.find((c) => c.seller_display_name === "Seller A");
  assert.equal(a.capture_count, 3);
  assert.equal(a.amount_minor, 10000);
});

test("a seller's own repeated captures are collapsed by that seller's median", () => {
  // 100, 120 and 500 from one seller. Taking the first or last capture would
  // give 100 or 500; the seller's median gives 120.
  const series = derivePerMpnSeries([
    obs({ seller_display_name: "Seller A", amount_minor: 10000, observed_at: "2025-03-01T00:00:00Z" }),
    obs({ seller_display_name: "Seller A", amount_minor: 12000, observed_at: "2025-03-11T00:00:00Z" }),
    obs({ seller_display_name: "Seller A", amount_minor: 50000, observed_at: "2025-03-21T00:00:00Z" }),
  ]);
  assert.equal(series[0].points[0].contributors[0].amount_minor, 12000);
  assert.equal(series[0].points[0].median_minor, 12000);
});

test("prices whose VAT basis is unresolved are retained but never enter the median", () => {
  // The unresolved price is far above the comparable one, so including it would
  // move the median from 100.00 to 300.00.
  const series = derivePerMpnSeries([
    obs({ seller_display_name: "Seller A", amount_minor: 10000, vat_included: true }),
    obs({ seller_display_name: "Seller B", amount_minor: 50000, vat_included: null }),
  ]);

  const [point] = series[0].points;
  assert.equal(point.median_minor, 10000);
  assert.equal(point.seller_count, 1);
  assert.equal(point.single_seller, true);
  assert.deepEqual(point.contributors.map((c) => c.seller_display_name), ["Seller A"]);
  // Retained rather than dropped, so the exclusion stays visible to a reader.
  assert.equal(point.excluded_contributors.length, 1);
  assert.equal(point.excluded_contributors[0].seller_display_name, "Seller B");
  assert.equal(point.excluded_contributors[0].amount_minor, 50000);
  assert.equal(point.excluded_contributors[0].exclusion_reason, "VAT_BASIS_NOT_COMPARABLE");
});

test("a VAT-exclusive price is excluded rather than converted", () => {
  const series = derivePerMpnSeries([
    obs({ seller_display_name: "Seller A", amount_minor: 10000, vat_included: true }),
    obs({ seller_display_name: "Seller B", amount_minor: 8333, vat_included: false }),
  ]);
  const [point] = series[0].points;
  assert.equal(point.median_minor, 10000);
  // 8333 grossed up at 20% would be 9999.6; no such figure may appear anywhere.
  assert.equal(point.contributors.length, 1);
  assert.equal(point.excluded_contributors[0].amount_minor, 8333);
  assert.equal(point.excluded_contributors[0].vat_included, false);
});

test("a month with no comparable price yields no median instead of a guess", () => {
  const series = derivePerMpnSeries([obs({ amount_minor: 12345, vat_included: null })], {
    minMonths: 0,
    minSellers: 0,
  });
  const [point] = series[0].points;
  assert.equal(point.state, "no_comparable_price");
  assert.equal(point.median_minor, null);
  assert.equal(point.seller_count, 0);
  assert.equal(point.excluded_contributors.length, 1);
  // The month is still described, so the interface can distinguish "we looked
  // and nothing was comparable" from "we have no capture at all".
  assert.equal(point.excluded_contributors[0].amount_minor, 12345);
});

test("a product with no comparable price anywhere is not a graphable series", () => {
  // month_count counts only months that produced a median, so such a product
  // falls below the default floor rather than appearing as an empty line.
  const rows = [
    obs({ mpn: "UNRESOLVED", observed_at: "2025-01-02T00:00:00Z", vat_included: null }),
    obs({ mpn: "UNRESOLVED", observed_at: "2025-02-02T00:00:00Z", vat_included: null }),
  ];
  assert.deepEqual(derivePerMpnSeries(rows), []);
  const [kept] = derivePerMpnSeries(rows, { minMonths: 0, minSellers: 0 });
  assert.equal(kept.month_count, 0);
  assert.equal(kept.points.length, 2);
});

test("months with no observation are absent, never interpolated", () => {
  const series = derivePerMpnSeries([
    obs({ observed_at: "2025-01-10T00:00:00Z", amount_minor: 10000 }),
    obs({ observed_at: "2025-04-10T00:00:00Z", amount_minor: 20000 }),
  ]);
  assert.deepEqual(series[0].points.map((p) => p.month), ["2025-01", "2025-04"]);
  assert.equal(series[0].month_count, 2);
});

test("points are ordered chronologically and low/high bracket the median", () => {
  const series = derivePerMpnSeries([
    obs({ observed_at: "2025-05-02T00:00:00Z", seller_display_name: "S1", amount_minor: 11000 }),
    obs({ observed_at: "2025-02-02T00:00:00Z", seller_display_name: "S1", amount_minor: 9000 }),
    obs({ observed_at: "2025-02-03T00:00:00Z", seller_display_name: "S2", amount_minor: 13000 }),
    obs({ observed_at: "2025-02-04T00:00:00Z", seller_display_name: "S3", amount_minor: 10000 }),
  ]);
  assert.deepEqual(series[0].points.map((p) => p.month), ["2025-02", "2025-05"]);
  const feb = series[0].points[0];
  assert.equal(feb.median_minor, 10000);
  assert.equal(feb.low_minor, 9000);
  assert.equal(feb.high_minor, 13000);
  assert.ok(feb.low_minor <= feb.median_minor && feb.median_minor <= feb.high_minor);
});

test("series carry per-product seller coverage and multi-seller month counts", () => {
  const series = derivePerMpnSeries([
    obs({ mpn: "A", observed_at: "2025-01-02T00:00:00Z", seller_display_name: "S1" }),
    obs({ mpn: "A", observed_at: "2025-01-03T00:00:00Z", seller_display_name: "S2" }),
    obs({ mpn: "A", observed_at: "2025-02-03T00:00:00Z", seller_display_name: "S1" }),
  ]);
  const a = series.find((s) => s.mpn === "A");
  assert.equal(a.month_count, 2);
  assert.equal(a.seller_count, 2);
  assert.deepEqual(a.sellers, ["S1", "S2"]);
  assert.equal(a.multi_seller_month_count, 1);
});

test("minMonths and minSellers filter the returned series", () => {
  const rows = [
    obs({ mpn: "DEEP", observed_at: "2025-01-02T00:00:00Z", seller_display_name: "S1" }),
    obs({ mpn: "DEEP", observed_at: "2025-02-02T00:00:00Z", seller_display_name: "S2" }),
    obs({ mpn: "SHALLOW", observed_at: "2025-01-02T00:00:00Z", seller_display_name: "S1" }),
  ];
  assert.deepEqual(derivePerMpnSeries(rows).map((s) => s.mpn).sort(), ["DEEP", "SHALLOW"]);
  assert.deepEqual(derivePerMpnSeries(rows, { minMonths: 2 }).map((s) => s.mpn), ["DEEP"]);
  assert.deepEqual(derivePerMpnSeries(rows, { minSellers: 2 }).map((s) => s.mpn), ["DEEP"]);
});

test("speed is derived from the MPN for grouping only, and is nullable", () => {
  assert.equal(speedFromMpn("CMH32GX5M2B5200C40"), 5200);
  assert.equal(speedFromMpn("AX5U6400C3216G-DCLARWH"), 6400);
  assert.equal(speedFromMpn("F5-6000J3038F16GX2-TZ5NR"), 6000);
  assert.equal(speedFromMpn("CT2K16G48C40U5"), 4800);
  assert.equal(speedFromMpn("cmh32gx5m2b5600z36k"), 5600);
  // An unreadable part number groups as unknown rather than being guessed at.
  assert.equal(speedFromMpn("KF560C32RSAK2-32"), null);
  assert.equal(speedFromMpn(""), null);
  assert.equal(speedFromMpn(null), null);
});

test("derived speed is labelled as grouping-only and never as verified product data", () => {
  const [known] = derivePerMpnSeries([obs({ mpn: "CMH32GX5M2B5200C40" })]);
  assert.equal(known.speed_mts, 5200);
  assert.equal(known.speed_basis, "derived_from_mpn_for_grouping_only");
  const [unknown] = derivePerMpnSeries([obs({ mpn: "KF560C32RSAK2-32" })]);
  assert.equal(unknown.speed_mts, null);
  assert.equal(unknown.speed_basis, "not_derivable_from_mpn");
});

test("month derivation validates its input", () => {
  assert.equal(monthIdForTimestamp("2025-03-04T00:00:00Z"), "2025-03");
  assert.throws(() => monthIdForTimestamp("2025-13-04T00:00:00Z"), /invalid calendar month/u);
  assert.throws(() => monthIdForTimestamp("not-a-date"), /could not derive/u);
  assert.throws(() => monthIdForTimestamp(null), /ISO instant/u);
});

test("ordering is codepoint-based and independent of locale collation", () => {
  assert.equal(compareCodepoint("A", "B"), -1);
  assert.equal(compareCodepoint("B", "A"), 1);
  assert.equal(compareCodepoint("A", "A"), 0);
  // Locale collation commonly orders "a" before "B"; codepoint ordering does not.
  assert.equal(compareCodepoint("B", "a"), -1);
});

test("the repository builds a series whose points are internally consistent", () => {
  const root = new URL("../", import.meta.url);
  const series = buildSeriesFromRepository(root, { minMonths: 6, minSellers: 2 });
  assert.ok(series.length > 0, "expected products with depth at more than one retailer");

  for (const s of series) {
    assert.ok(s.month_count >= 6, `${s.mpn} should meet the month floor`);
    assert.ok(s.seller_count >= 2, `${s.mpn} should meet the seller floor`);
    const months = s.points.map((p) => p.month);
    assert.deepEqual(months, [...months].sort(compareCodepoint), `${s.mpn} points must be chronological`);
    assert.equal(new Set(months).size, months.length, `${s.mpn} must not repeat a month`);

    for (const p of s.points) {
      if (p.state !== "observed") {
        assert.equal(p.median_minor, null);
        continue;
      }
      const amounts = p.contributors.map((c) => c.amount_minor);
      assert.equal(p.median_minor, medianMinor(amounts));
      assert.equal(p.seller_count, p.contributors.length);
      assert.equal(p.single_seller, p.contributors.length === 1);
      assert.equal(p.low_minor, Math.min(...amounts));
      assert.equal(p.high_minor, Math.max(...amounts));
      // One seller must never appear twice inside a single point.
      const sellers = p.contributors.map((c) => c.seller_display_name);
      assert.equal(new Set(sellers).size, sellers.length, `${s.mpn} ${p.month} repeated a seller`);
      for (const c of p.contributors) assert.equal(c.vat_included, true);
    }
  }
});

const RESOLUTION = {
  resolution_id: "test-resolution",
  canonical_sellers: ["CCL Online", "Scan Computers"],
  resolutions: [{ observed_display_name: "CCL Computers", canonical_display_name: "CCL Online" }],
};

test("one retailer recorded under two names cannot corroborate itself", () => {
  // Both names denote the same retailer and carry the same price. Unresolved,
  // this month reports two contributing retailers in perfect agreement.
  const rows = applySellerIdentityResolution(
    [
      obs({ seller_display_name: "CCL Computers", amount_minor: 11399 }),
      obs({ seller_display_name: "CCL Online", amount_minor: 11399 }),
    ],
    RESOLUTION,
  );
  const [point] = derivePerMpnSeries(rows)[0].points;
  assert.equal(point.seller_count, 1);
  assert.equal(point.single_seller, true);
  assert.deepEqual(point.contributors.map((c) => c.seller_display_name), ["CCL Online"]);
  assert.equal(point.contributors[0].capture_count, 2);
});

test("seller resolution is non-mutating and retains the observed name", () => {
  const original = [obs({ seller_display_name: "CCL Computers" })];
  const resolved = applySellerIdentityResolution(original, RESOLUTION);
  assert.equal(original[0].seller_display_name, "CCL Computers", "input must not be mutated");
  assert.equal(resolved[0].seller_display_name, "CCL Online");
  assert.equal(resolved[0].seller_display_name_observed, "CCL Computers");
  assert.equal(resolved[0].seller_identity_resolution_id, "test-resolution");
});

test("an unrostered seller is rejected rather than admitted as a new retailer", () => {
  assert.throws(
    () => applySellerIdentityResolution([obs({ seller_display_name: "Some New Shop" })], RESOLUTION),
    /unrostered seller display name/u,
  );
});

test("a malformed seller resolution is rejected before anything is applied", () => {
  assert.throws(
    () => applySellerIdentityResolution([obs({})], { canonical_sellers: [] }),
    /must list canonical_sellers/u,
  );
  assert.throws(
    () =>
      applySellerIdentityResolution([obs({})], {
        canonical_sellers: ["Scan Computers"],
        resolutions: [{ observed_display_name: "X", canonical_display_name: "Not On Roster" }],
      }),
    /absent from the roster/u,
  );
  assert.throws(
    () =>
      applySellerIdentityResolution([obs({})], {
        canonical_sellers: ["Scan Computers"],
        resolutions: [
          { observed_display_name: "X", canonical_display_name: "Scan Computers" },
          { observed_display_name: "X", canonical_display_name: "Scan Computers" },
        ],
      }),
    /duplicate resolution/u,
  );
  assert.throws(
    () =>
      applySellerIdentityResolution([obs({})], {
        canonical_sellers: ["Scan Computers"],
        resolutions: [{ observed_display_name: "Scan Computers", canonical_display_name: "Scan Computers" }],
      }),
    /must not also be an alias/u,
  );
});

test("the repository's observations all resolve to rostered retailers", () => {
  const root = new URL("../", import.meta.url);
  const rows = loadSeriesObservations(root);
  const names = new Set(rows.map((o) => o.seller_display_name));
  assert.ok(names.size > 0);
  // The alias must be gone once resolution has been applied.
  assert.ok(!names.has("CCL Computers"), "CCL Computers must resolve to its canonical name");
  assert.ok(names.has("CCL Online"));
  assert.ok(rows.some((o) => o.seller_display_name_observed === "CCL Computers"), "the observed name must be retained");
});

test("no point counts the same retailer twice once the repository is resolved", () => {
  const root = new URL("../", import.meta.url);
  for (const s of buildSeriesFromRepository(root, { minMonths: 1, minSellers: 1 })) {
    for (const p of s.points) {
      const names = p.contributors.map((c) => c.seller_display_name);
      assert.equal(new Set(names).size, names.length, `${s.mpn} ${p.month} counted a retailer twice`);
    }
  }
});

test("the seller resolution file is referenced by a stable path", () => {
  assert.match(SELLER_RESOLUTION_FILE, /^research\/evidence\/.+\/resolution\.v1\.json$/u);
});

test("the series draws on the multi-retailer backfill as well as the envelope tranches", () => {
  const files = SERIES_TRANCHES.map((t) => t.file);
  assert.ok(
    files.includes("uk-primary-retail-multi-retailer-2026-08-11T090000Z.v1.json"),
    "multi-retailer backfill must be an input to the per-product series",
  );
  assert.equal(new Set(files).size, files.length, "a tranche must not be counted twice");
});
