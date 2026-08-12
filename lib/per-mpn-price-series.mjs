// Derives a per-MPN monthly price series with a per-retailer breakdown.
//
// This is the series the private per-product graph draws: one line per exact
// manufacturer part number, each point the median of what the retailers we
// hold were asking for that same part in that calendar month, with every
// contributing price retained so a reader can see exactly what the point is
// made of.
//
// It deliberately does NOT aggregate across products. Pooling different MPNs
// into one line reintroduces product-set churn — the number then moves when the
// mix of products changes rather than when prices change — which is the defect
// the observed-price envelope was built to avoid. Clock speed is exposed here
// only as a navigation attribute for grouping the lines, never as an
// aggregation axis: splitting the pool by speed measurably worsens churn,
// because it thins each bucket without making the products comparable.
//
// AGGREGATION RULE. Taking a central tendency is an aggregation decision, and
// this module makes exactly one, at the operator's direction: the median across
// distinct sellers, within a calendar month, for a single exact MPN. It is
// private and unapproved — no index, publication or public claim rests on it.
import { ELIGIBLE_TRANCHES, loadJson, normaliseObservation } from "./historical-observed-price-envelope.mjs";

export const SERIES_VERSION = 1;

// The envelope's tranche list plus the multi-retailer backfill. Kept separate
// from ELIGIBLE_TRANCHES on purpose: the envelope's derived output is pinned by
// a byte-compared golden fixture, and widening its inputs is a separate
// decision from drawing per-product lines.
export const SERIES_TRANCHES = [
  ...ELIGIBLE_TRANCHES,
  { file: "uk-primary-retail-multi-retailer-2026-08-11T090000Z.v1.json", captureKind: "archive_capture" },
];

const MONTH_ID = /^(\d{4})-(\d{2})$/u;

export function monthIdForTimestamp(iso) {
  if (typeof iso !== "string" || iso.length < 7) throw new Error(`timestamp must be an ISO instant, got: ${iso}`);
  const month = iso.slice(0, 7);
  if (!MONTH_ID.test(month)) throw new Error(`could not derive a calendar month from: ${iso}`);
  const monthNumber = Number(month.slice(5, 7));
  if (monthNumber < 1 || monthNumber > 12) throw new Error(`invalid calendar month in: ${iso}`);
  return month;
}

// Codepoint ordering, never localeCompare: locale-sensitive collation would
// make derived output depend on the machine's locale. Must not be swapped back.
export function compareCodepoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Median over integer minor units. With an even count the two central values
// are averaged and rounded half-up, so the result stays an exact integer number
// of pence rather than carrying a half-penny that cannot be displayed.
export function medianMinor(values) {
  if (!Array.isArray(values) || values.length === 0) throw new Error("medianMinor requires at least one value");
  for (const v of values) {
    if (!Number.isInteger(v)) throw new Error(`medianMinor requires integer minor units, got: ${v}`);
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// DDR5 speeds are quoted in MT/s and appear verbatim inside most vendors' part
// numbers (CMH32GX5M2B5200C40, AX5U6400C3216G, F5-6000J3038F16GX2). Crucial
// encodes it as a two-digit prefix instead (CT2K16G48C40U5 -> 4800), handled as
// an explicit case rather than a guess.
//
// This is a DERIVED attribute for grouping lines in the interface. It is not
// verified product data and never qualifies a price or an identity: an MPN
// whose speed cannot be read simply groups as unknown.
const SPEEDS = [4800, 5200, 5600, 6000, 6200, 6400, 6600, 7200, 7600, 8000];

export function speedFromMpn(mpn) {
  if (typeof mpn !== "string" || !mpn) return null;
  const upper = mpn.toUpperCase();
  for (const s of SPEEDS) if (upper.includes(String(s))) return s;
  const crucial = upper.match(/^CT2K16G(48|52|56|60|64)C\d/u);
  if (crucial) return Number(crucial[1]) * 100;
  return null;
}

/**
 * Groups normalised observations into per-MPN monthly points.
 *
 * Two rules do the real work here:
 *
 * One seller, one vote. A seller captured five times in a month must not count
 * five times toward that month's median — that would weight retailers by how
 * often the archive happened to crawl them rather than by their price. Each
 * seller is collapsed to a single figure first, using that seller's own median
 * across its captures in the month.
 *
 * Only comparable prices form the median. A VAT-inclusive price and a price
 * whose VAT basis was never established are not the same quantity, so only
 * VAT-inclusive figures contribute. Anything else is still retained and shown
 * against the point, marked excluded, rather than silently dropped or silently
 * mixed in. Prices are never converted between VAT bases: that would be
 * inventing a figure no retailer displayed.
 */
export function derivePerMpnSeries(observations, { minMonths = 1, minSellers = 1 } = {}) {
  if (!Array.isArray(observations)) throw new Error("observations must be an array");

  const byMpn = new Map();
  for (const o of observations) {
    if (!byMpn.has(o.mpn)) byMpn.set(o.mpn, new Map());
    const months = byMpn.get(o.mpn);
    const month = monthIdForTimestamp(o.observed_at);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(o);
  }

  const series = [];
  for (const [mpn, months] of byMpn) {
    const points = [];
    for (const month of [...months.keys()].sort(compareCodepoint)) {
      const rows = months.get(month);

      const bySeller = new Map();
      for (const o of rows) {
        if (!bySeller.has(o.seller_display_name)) bySeller.set(o.seller_display_name, []);
        bySeller.get(o.seller_display_name).push(o);
      }

      const contributors = [];
      const excluded = [];
      for (const seller of [...bySeller.keys()].sort(compareCodepoint)) {
        const rowsForSeller = bySeller.get(seller);
        const comparable = rowsForSeller.filter((o) => o.vat_included === true);
        const entry = {
          seller_display_name: seller,
          capture_count: rowsForSeller.length,
          observed_at: rowsForSeller
            .map((o) => o.observed_at)
            .sort(compareCodepoint)
            .at(-1),
        };
        if (comparable.length) {
          contributors.push({
            ...entry,
            amount_minor: medianMinor(comparable.map((o) => o.amount_minor)),
            vat_included: true,
          });
        } else {
          excluded.push({
            ...entry,
            amount_minor: medianMinor(rowsForSeller.map((o) => o.amount_minor)),
            vat_included: rowsForSeller[0].vat_included,
            exclusion_reason: "VAT_BASIS_NOT_COMPARABLE",
          });
        }
      }

      if (!contributors.length) {
        points.push({
          month,
          state: "no_comparable_price",
          median_minor: null,
          seller_count: 0,
          contributors: [],
          excluded_contributors: excluded,
        });
        continue;
      }

      points.push({
        month,
        state: "observed",
        median_minor: medianMinor(contributors.map((c) => c.amount_minor)),
        seller_count: contributors.length,
        // A point resting on one retailer is not a market median. It is kept —
        // dropping it would erase real evidence — but it is flagged so the
        // interface can render it as the weaker thing it is.
        single_seller: contributors.length === 1,
        low_minor: Math.min(...contributors.map((c) => c.amount_minor)),
        high_minor: Math.max(...contributors.map((c) => c.amount_minor)),
        contributors,
        excluded_contributors: excluded,
      });
    }

    const observed = points.filter((p) => p.state === "observed");
    const sellers = new Set();
    for (const p of observed) for (const c of p.contributors) sellers.add(c.seller_display_name);

    // month_count deliberately counts only months that produced a median. A
    // product whose captures were never comparable has nothing to draw, so it
    // falls below the floor rather than appearing as an empty line; the
    // no_comparable_price state then only ever marks a gap inside a series that
    // is otherwise graphable.
    series.push({
      mpn,
      speed_mts: speedFromMpn(mpn),
      speed_basis: speedFromMpn(mpn) === null ? "not_derivable_from_mpn" : "derived_from_mpn_for_grouping_only",
      month_count: observed.length,
      seller_count: sellers.size,
      sellers: [...sellers].sort(compareCodepoint),
      multi_seller_month_count: observed.filter((p) => p.seller_count >= 2).length,
      // Gaps are never filled. A month with no capture is simply absent, and
      // the interface must not join across it as though it were continuous.
      points,
    });
  }

  return series
    .filter((s) => s.month_count >= minMonths && s.seller_count >= minSellers)
    .sort((a, b) => b.month_count - a.month_count || compareCodepoint(a.mpn, b.mpn));
}

export const SELLER_RESOLUTION_FILE = "research/evidence/seller-identity-resolution-2026-08-12/resolution.v1.json";

/**
 * Resolves seller display names to one canonical name per retailer.
 *
 * Different acquisition waves recorded the same retailer under different names
 * ("CCL Computers" and "CCL Online" both denote cclonline.com). Left alone, one
 * retailer counts as two: a point resting on a single seller reports two
 * contributing sellers, and a cross-seller median is taken over what is really
 * one seller's price. In the affected months the two names carried the *same*
 * price, so the artefact was a pair of retailers in perfect agreement.
 *
 * Applied here rather than by editing the tranches, which are immutable. Every
 * resolved name is validated before any is applied, and the observed name is
 * retained so the substitution stays visible downstream.
 */
export function applySellerIdentityResolution(observations, resolution) {
  if (!Array.isArray(observations)) throw new Error("observations must be an array");
  if (!resolution || typeof resolution !== "object") throw new Error("resolution document must be an object");

  const roster = resolution.canonical_sellers;
  if (!Array.isArray(roster) || roster.length === 0) throw new Error("resolution must list canonical_sellers");
  const known = new Set(roster);

  const mapping = new Map();
  for (const r of resolution.resolutions ?? []) {
    const from = r.observed_display_name;
    const to = r.canonical_display_name;
    if (typeof from !== "string" || !from.trim()) throw new Error("resolution entry needs observed_display_name");
    if (typeof to !== "string" || !to.trim()) throw new Error("resolution entry needs canonical_display_name");
    if (!known.has(to)) throw new Error(`resolution maps to a seller absent from the roster: ${to}`);
    if (mapping.has(from)) throw new Error(`duplicate resolution for seller: ${from}`);
    if (known.has(from)) throw new Error(`a roster seller must not also be an alias: ${from}`);
    mapping.set(from, to);
  }

  // Validate every record before changing any, so a rejected input cannot leave
  // a half-resolved set behind.
  for (const o of observations) {
    const resolved = mapping.get(o.seller_display_name) ?? o.seller_display_name;
    if (!known.has(resolved)) {
      throw new Error(
        `unrostered seller display name: ${o.seller_display_name} (${o.observation_id}). ` +
          "Add it to canonical_sellers, or map it to an existing retailer, in " +
          `${SELLER_RESOLUTION_FILE}. It is not admitted as a new retailer by default.`,
      );
    }
  }

  return observations.map((o) => {
    const resolved = mapping.get(o.seller_display_name);
    if (!resolved) return o;
    return {
      ...o,
      seller_display_name: resolved,
      seller_display_name_observed: o.seller_display_name,
      seller_identity_resolution_id: resolution.resolution_id,
    };
  });
}

export function loadSeriesObservations(root) {
  const records = [];
  for (const tranche of SERIES_TRANCHES) {
    const parsed = loadJson(new URL(`data/observations/candidate/${tranche.file}`, root));
    for (const raw of parsed.observations) {
      records.push(normaliseObservation(raw, { sourceFile: tranche.file, captureKind: tranche.captureKind }));
    }
  }
  return applySellerIdentityResolution(records, loadJson(new URL(SELLER_RESOLUTION_FILE, root)));
}

export function buildSeriesFromRepository(root, options) {
  return derivePerMpnSeries(loadSeriesObservations(root), options);
}
