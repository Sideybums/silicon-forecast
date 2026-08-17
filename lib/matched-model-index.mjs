// Derives a matched-model chained price index for UK 32GB (2x16GB) DDR5.
//
// The whole design exists to answer one question honestly: when the number
// moves, did prices move, or did the set of products we happened to observe
// move? A simple average of everything on sale cannot tell those apart. This
// index can, because a period-to-period link is computed ONLY over products
// observed in both periods. A product entering or leaving the sample therefore
// cannot move the index at all — composition is removed by construction rather
// than assumed away.
//
// That is also why clock speed needs no special handling. Every comparison is a
// product against itself, so a 6000MT/s kit is only ever compared with that
// same 6000MT/s kit. Speed cannot distort the index because it never enters a
// comparison. Pooling prices across products is the thing that would let speed
// in, via the speed mix.
//
// PARAMETERS ARE OPERATOR-SELECTED, NOT CHOSEN HERE. Formula, evidence floor,
// reference period and frequency are recorded in INDEX_PARAMETERS because they
// are methodology decisions reserved to the operator. This module implements
// them; it does not pick them, and it approves nothing.
import { buildSeriesFromRepository, compareCodepoint, medianMinor } from "./per-mpn-price-series.mjs";

export const INDEX_VERSION = 1;

export const INDEX_PARAMETERS = {
  frequency: "quarterly",
  formula: "jevons_geometric_mean_of_price_relatives",
  minimum_matched_products_per_link: 10,
  reference_period: "2024Q1",
  reference_value: 100,
  weighting: "unweighted_equal_product_weight",
  weighting_basis:
    "No expenditure, volume or market-share data exists for any observed retailer, so no weighted formula is available. Every matched product contributes equally, and that must be stated wherever the index is shown rather than left implicit.",
  gap_policy: "stop_chain",
  gap_policy_basis:
    "A link resting on fewer than the required matched products is not computed, and the chain stops rather than bridging across the gap. Bridging would silently compare two non-adjacent periods as though they were consecutive, which is exactly the composition effect this index exists to exclude.",
  selected_by: "operator",
  approved: false,
};

export function quarterIdForMonth(month) {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/u.test(month)) {
    throw new Error(`expected a YYYY-MM calendar month, got: ${month}`);
  }
  return `${month.slice(0, 4)}Q${Math.floor((Number(month.slice(5, 7)) - 1) / 3) + 1}`;
}

/**
 * Jevons elementary index: the geometric mean of price relatives.
 *
 * Computed as exp(mean(log ratio)) rather than by multiplying ratios, which
 * would overflow or lose precision across a long sample. Jevons is the
 * international standard for unweighted elementary aggregates and is symmetric:
 * a rise followed by an equal proportional fall returns exactly to the start,
 * which the arithmetic-mean (Carli) alternative does not do.
 */
export function jevonsLink(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) throw new Error("jevonsLink requires at least one matched pair");
  let logSum = 0;
  for (const { from, to } of pairs) {
    if (!Number.isInteger(from) || from <= 0) throw new Error(`base price must be a positive integer minor value, got: ${from}`);
    if (!Number.isInteger(to) || to <= 0) throw new Error(`current price must be a positive integer minor value, got: ${to}`);
    logSum += Math.log(to / from);
  }
  return Math.exp(logSum / pairs.length);
}

// Rounded so the published series is stable and reproducible rather than
// carrying float noise that differs between machines.
const round3 = (n) => Math.round(n * 1000) / 1000;
const round4 = (n) => Math.round(n * 10000) / 10000;

/**
 * Collapses the per-MPN monthly series into one price per product per period.
 *
 * A product captured in more than one month of a quarter is represented by the
 * median of those months, so a product that happens to be crawled more often
 * does not thereby speak louder within its own quarter.
 */
export function collapseToPeriods(series, { periodOf = quarterIdForMonth } = {}) {
  const byPeriod = new Map();
  for (const s of series) {
    for (const p of s.points) {
      if (p.state !== "observed") continue;
      const period = periodOf(p.month);
      if (!byPeriod.has(period)) byPeriod.set(period, new Map());
      const products = byPeriod.get(period);
      if (!products.has(s.mpn)) products.set(s.mpn, []);
      products.get(s.mpn).push(p.median_minor);
    }
  }
  const out = new Map();
  for (const [period, products] of byPeriod) {
    const collapsed = new Map();
    for (const mpn of [...products.keys()].sort(compareCodepoint)) {
      collapsed.set(mpn, medianMinor(products.get(mpn)));
    }
    out.set(period, collapsed);
  }
  return out;
}

function nextQuarter(period) {
  const match = /^(\d{4})Q([1-4])$/u.exec(period);
  if (!match) throw new Error(`expected YYYYQn period, got: ${period}`);
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  return quarter === 4 ? `${year + 1}Q1` : `${year}Q${quarter + 1}`;
}

export function quarterSpine(first, last) {
  const out = [];
  for (let period = first; ; period = nextQuarter(period)) {
    out.push(period);
    if (period === last) return out;
    if (out.length > 1000) throw new Error("quarter spine did not reach its end");
  }
}

/**
 * Chains matched-model links outward from the reference period.
 *
 * The chain runs forwards and backwards from the base and stops in each
 * direction at the first link with too little matched evidence. Periods beyond
 * that point are reported with their matched count and no index value, so a
 * thin patch is visible as a stated limit rather than as an absent row.
 */
export function deriveMatchedModelIndex(series, parameters = INDEX_PARAMETERS) {
  const {
    minimum_matched_products_per_link: floor,
    reference_period: base,
    reference_value: baseValue,
  } = parameters;

  const periods = collapseToPeriods(series);
  const observedPeriods = [...periods.keys()].sort(compareCodepoint);
  if (!observedPeriods.length) throw new Error("matched-model index has no observed periods");
  const ordered = quarterSpine(observedPeriods[0], observedPeriods.at(-1));
  if (!periods.has(base)) {
    throw new Error(`reference period ${base} has no observations; it cannot anchor the index`);
  }

  const linkFor = (fromPeriod, toPeriod) => {
    const a = periods.get(fromPeriod);
    const b = periods.get(toPeriod);
    if (!a || !b) return { matched_count: null, link: null, pairs: [], missing_period: !a ? fromPeriod : toPeriod };
    const matched = [...b.keys()].filter((mpn) => a.has(mpn)).sort(compareCodepoint);
    const pairs = matched.map((mpn) => ({ mpn, from: a.get(mpn), to: b.get(mpn) }));
    if (pairs.length < floor) return { matched_count: pairs.length, link: null, pairs };
    return { matched_count: pairs.length, link: jevonsLink(pairs), pairs };
  };

  const describe = (period, value, link, matchedCount, pairs, stateOverride = null) => {
    const relatives = pairs.map((p) => p.to / p.from).sort((x, y) => x - y);
    return {
      period_id: period,
      state: stateOverride ?? (value === null ? "insufficient_matched_evidence" : "observed"),
      index_value: value === null ? null : round3(value),
      link: link === null ? null : round4(link),
      matched_product_count: matchedCount,
      // Dispersion is reported so a link driven by one extreme product is
      // visible rather than hidden inside its geometric mean.
      relative_min: relatives.length ? round4(relatives[0]) : null,
      relative_median: relatives.length ? round4(relatives[relatives.length >> 1]) : null,
      relative_max: relatives.length ? round4(relatives.at(-1)) : null,
      distinct_products_in_period: periods.get(period)?.size ?? 0,
    };
  };

  const rows = new Map();
  rows.set(base, {
    period_id: base,
    state: "observed",
    index_value: round3(baseValue),
    link: null,
    matched_product_count: null,
    relative_min: null,
    relative_median: null,
    relative_max: null,
    distinct_products_in_period: periods.get(base).size,
    reference_period: true,
  });

  const baseIndex = ordered.indexOf(base);

  let value = baseValue;
  let stopped = false;
  for (let i = baseIndex + 1; i < ordered.length; i += 1) {
    const period = ordered[i];
    if (stopped) {
      rows.set(period, describe(period, null, null, null, [], periods.has(period) ? "outside_stopped_chain" : "no_observations"));
      continue;
    }
    const { matched_count, link, pairs } = linkFor(ordered[i - 1], period);
    if (link === null) {
      rows.set(period, describe(period, null, null, matched_count, pairs, periods.has(period) ? "insufficient_matched_evidence" : "no_observations"));
      stopped = true;
      continue;
    }
    value *= link;
    rows.set(period, describe(period, value, link, matched_count, pairs));
  }

  value = baseValue;
  stopped = false;
  for (let i = baseIndex; i > 0; i -= 1) {
    const period = ordered[i - 1];
    if (stopped) {
      rows.set(period, describe(period, null, null, null, [], periods.has(period) ? "outside_stopped_chain" : "no_observations"));
      continue;
    }
    const { matched_count, link, pairs } = linkFor(period, ordered[i]);
    if (link === null) {
      rows.set(period, describe(period, null, null, matched_count, pairs, periods.has(period) ? "insufficient_matched_evidence" : "no_observations"));
      stopped = true;
      continue;
    }
    value /= link;
    rows.set(period, { ...describe(period, value, null, matched_count, pairs), link: null });
  }

  const chained = ordered.filter((p) => rows.has(p)).map((p) => rows.get(p));
  const observed = chained.filter((r) => r.state === "observed");

  return {
    index_version: INDEX_VERSION,
    parameters,
    coverage: {
      first_period: observed.length ? observed[0].period_id : null,
      last_period: observed.length ? observed.at(-1).period_id : null,
      observed_period_count: observed.length,
      periods_with_evidence_outside_chain: observedPeriods.length - observed.length,
      total_periods_with_observations: observedPeriods.length,
    },
    periods: chained,
  };
}

export function buildIndexFromRepository(root, parameters = INDEX_PARAMETERS) {
  const series = buildSeriesFromRepository(root, { minMonths: 1, minSellers: 1 });
  return deriveMatchedModelIndex(series, parameters);
}

// Canonical bytes for the golden fixture, so an unintended change to the
// derivation fails a byte comparison rather than passing unnoticed.
export function canonicalIndexBytes(index) {
  return `${JSON.stringify(index, null, 2)}\n`;
}
