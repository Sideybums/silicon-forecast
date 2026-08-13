// The only place derived data becomes public data.
//
// Two rules do the work here, and both are structural rather than a list of
// things to remember.
//
// FIRST: every output object is built from named fields, one at a time. There
// is no object spread, no rest capture and no cloning of an input node anywhere
// in this file. A field added upstream tomorrow cannot appear downstream by
// accident, because nothing here copies anything it was not told to copy. The
// poison-injection test in tests/public-projection.test.mjs proves this holds
// for fields that do not exist yet.
//
// SECOND: the public projection is a money-free zone. It carries index levels,
// relative changes, counts, period identifiers and editorial attribution. It
// carries no amount in any currency, in any unit, ever. That single rule
// removes the whole retained-price ban class from the data in one stroke, and
// it is mechanically checkable rather than a matter of care.
//
// Everything numeric is an integer in thousandths — index_milli, permille — so
// no serialised value can ever equal a two-decimal price literal. Renderers
// format to zero or one decimal place at the last moment.
import { createHash } from "node:crypto";

export const PROJECTION_SCHEMA_VERSION = 1;

// A closed set of key names per dataset. Any key outside it is a leak by
// definition, whether or not it happens to look harmless.
export const PUBLIC_SCHEMA = {
  index: new Set([
    "schema_version", "dataset_id", "derived_from", "parameters_public", "coverage", "summary", "periods",
    "frequency", "formula", "minimum_matched_products_per_link", "reference_period", "reference_value",
    "weighting", "weighting_basis", "gap_policy", "gap_policy_basis", "approved",
    "first_period", "last_period", "observed_period_count", "periods_with_evidence_outside_chain",
    "total_periods_with_observations",
    "latest_period", "latest_index_milli", "change_from_reference_permille", "direction",
    "period_id", "state", "index_milli", "link_permille", "change_permille", "matched_product_count",
    "dispersion_permille", "min", "median", "max", "distinct_products_in_period", "is_reference",
  ]),
  products: new Set([
    "schema_version", "dataset_id", "derived_from", "floor", "min_months", "min_sellers",
    "product_count", "excluded_below_floor_count", "rebasing", "basis", "selected_by", "products",
    "mpn", "month_count", "seller_count", "multi_seller_month_count", "first_month", "last_month",
    "change_permille", "points", "month", "relative_permille", "single_seller",
  ]),
  events: new Set([
    "schema_version", "dataset_id", "derived_from", "markers", "movement_count",
    "explained_movement_count", "unexplained_movement_count", "pending_reason",
    "marker_id", "period_id", "causal_language_level", "source",
    "title", "author", "publisher", "url", "published_on",
  ]),
};

// Output fields that legitimately carry a string copied from the input. Every
// other string in the output must be one this module authored. The poison test
// uses this list, so adding a pass-through here is a deliberate, reviewable act.
export const PASS_THROUGH_FIELDS = {
  index: ["period_id", "state", "frequency", "formula", "reference_period", "weighting", "weighting_basis", "gap_policy", "gap_policy_basis", "first_period", "last_period", "latest_period"],
  products: ["mpn", "month", "first_month", "last_month"],
  events: ["period_id", "causal_language_level", "title", "author", "publisher", "url", "published_on"],
};

const MONEY_KEY = /minor|amount|price|gbp|cost|pence|sterling/iu;
const TWO_DP = /\d\.\d{2}(?!\d)/u;

const milli = (n) => (n === null || n === undefined ? null : Math.round(n * 1000));

// --- index -------------------------------------------------------------------

export function projectIndex(raw, datasetId) {
  const p = raw.parameters;
  const observed = raw.periods.filter((row) => row.state === "observed");
  const reference = observed.find((row) => row.reference_period === true) ?? null;
  const latest = observed.length ? observed[observed.length - 1] : null;

  const periods = raw.periods.map((row) => ({
    period_id: row.period_id,
    state: row.state,
    index_milli: milli(row.index_value),
    link_permille: milli(row.link),
    // Stated separately so a reader does not have to do arithmetic on a ratio
    // to see which way the quarter went.
    change_permille: row.link === null || row.link === undefined ? null : Math.round((row.link - 1) * 1000),
    matched_product_count: row.matched_product_count,
    dispersion_permille: {
      min: milli(row.relative_min),
      median: milli(row.relative_median),
      max: milli(row.relative_max),
    },
    distinct_products_in_period: row.distinct_products_in_period,
    is_reference: row.reference_period === true,
  }));

  const latestMilli = latest ? milli(latest.index_value) : null;
  const referenceValue = reference ? reference.index_value : p.reference_value;

  return {
    schema_version: PROJECTION_SCHEMA_VERSION,
    dataset_id: datasetId,
    derived_from: "matched_model_chained_index",
    parameters_public: {
      frequency: p.frequency,
      formula: p.formula,
      minimum_matched_products_per_link: p.minimum_matched_products_per_link,
      reference_period: p.reference_period,
      reference_value: p.reference_value,
      weighting: p.weighting,
      weighting_basis: p.weighting_basis,
      gap_policy: p.gap_policy,
      gap_policy_basis: p.gap_policy_basis,
      // Must render. A reader is entitled to know the parameters were chosen
      // by the operator and that nothing here is an approved statistic.
      approved: p.approved === true,
    },
    coverage: {
      first_period: raw.coverage.first_period,
      last_period: raw.coverage.last_period,
      observed_period_count: raw.coverage.observed_period_count,
      periods_with_evidence_outside_chain: raw.coverage.periods_with_evidence_outside_chain,
      total_periods_with_observations: raw.coverage.total_periods_with_observations,
    },
    summary: {
      latest_period: latest ? latest.period_id : null,
      latest_index_milli: latestMilli,
      change_from_reference_permille:
        latest && referenceValue ? Math.round((latest.index_value / referenceValue - 1) * 1000) : null,
      direction: !latest || !referenceValue
        ? "unknown"
        : latest.index_value > referenceValue
          ? "higher"
          : latest.index_value < referenceValue
            ? "lower"
            : "level",
    },
    periods,
  };
}

// --- products ----------------------------------------------------------------

/**
 * Per-product movement, published as relative change only.
 *
 * A level would reintroduce the entire retained-price ban class and tell a
 * reader nothing a ratio does not. Each product is rebased to its own first
 * observed month, so 1000 permille is that month and 1250 is a quarter dearer
 * than when we first saw it.
 *
 * points[].contributors is where the private material lives — observed_at,
 * seller_display_name and amount_minor on every contributor. It is never read
 * here. Only median_minor is touched, and only as the numerator of a ratio.
 */
export function projectProducts(series, { datasetId, floor, rebasing, excludedBelowFloorCount }) {
  const products = series.map((s) => {
    const observed = s.points.filter((point) => point.state === "observed");
    const base = observed.length ? observed[0].median_minor : null;
    const points = observed.map((point) => ({
      month: point.month,
      relative_permille: base ? Math.round((point.median_minor / base) * 1000) : null,
      seller_count: point.seller_count,
      single_seller: point.single_seller === true,
    }));
    const last = points.length ? points[points.length - 1] : null;
    return {
      mpn: s.mpn,
      month_count: s.month_count,
      seller_count: s.seller_count,
      multi_seller_month_count: s.multi_seller_month_count,
      first_month: points.length ? points[0].month : null,
      last_month: last ? last.month : null,
      change_permille: last && last.relative_permille !== null ? last.relative_permille - 1000 : null,
      points,
    };
  });

  return {
    schema_version: PROJECTION_SCHEMA_VERSION,
    dataset_id: datasetId,
    derived_from: "per_mpn_monthly_median_across_retailers",
    floor: { min_months: floor.min_months, min_sellers: floor.min_sellers },
    product_count: products.length,
    // Published so thin coverage is a stated limit rather than an absent row.
    excluded_below_floor_count: excludedBelowFloorCount,
    rebasing: { basis: rebasing.basis, selected_by: rebasing.selected_by },
    products,
  };
}

// --- events ------------------------------------------------------------------

/**
 * Event markers from the movement explanation ledger.
 *
 * movement_id is never projected. It is literally
 * movement-<mpn>-<observation_id>-<observation_id>, and observation_id is a
 * banned identifier class contributing well over a thousand tokens. Markers get
 * a content-derived id instead.
 *
 * response_sha256 and minimal_quote are never projected either: the first is a
 * banned key, and reproducing a publisher's words is a rights decision that has
 * not been made. The marker carries attribution and a link, nothing more — the
 * reader goes to the publisher for the article.
 */
export function projectEvents(ledger, { datasetId, movementCount }) {
  const explanations = ledger.explanations ?? [];
  const markers = explanations.map((e) => {
    const source = e.source ?? {};
    return {
      marker_id: `ev-${createHash("sha256").update(String(e.explanation_id)).digest("hex").slice(0, 12)}`,
      period_id: e.period_id ?? null,
      causal_language_level: e.causal_language_level,
      source: {
        title: source.title,
        author: source.author,
        publisher: source.publisher,
        url: source.url,
        published_on: source.published_on,
      },
    };
  });

  return {
    schema_version: PROJECTION_SCHEMA_VERSION,
    dataset_id: datasetId,
    derived_from: "historical_movement_explanation_ledger",
    markers,
    movement_count: movementCount,
    explained_movement_count: markers.length,
    // The count that keeps the event line honest. A rail with no markers and a
    // stated 99 unexplained movements says something true; a rail with no
    // markers and no count implies there was nothing to explain.
    unexplained_movement_count: movementCount - markers.length,
    pending_reason:
      markers.length === movementCount
        ? null
        : "Movements without a reviewed explanation are shown as unexplained. An absent marker means research has not been done, not that no explanation exists.",
  };
}

// --- safety ------------------------------------------------------------------

export function assertPublicSafe(value, dataset, { privateTokens = new Set(), reasonCodes = new Set() } = {}) {
  const allowed = PUBLIC_SCHEMA[dataset];
  if (!allowed) throw new Error(`no public schema for dataset ${dataset}`);
  const problems = [];

  const walk = (node, path) => {
    if (Array.isArray(node)) return node.forEach((item, i) => walk(item, `${path}[${i}]`));
    if (!node || typeof node !== "object") return;
    const keys = Object.keys(node);
    if (keys.includes("mpn_expected") && keys.includes("mpn_observed")) {
      problems.push(`${path} carries the identity comparison`);
    }
    for (const [key, child] of Object.entries(node)) {
      if (!allowed.has(key)) problems.push(`${path}.${key} is not in the ${dataset} public schema`);
      if (MONEY_KEY.test(key)) problems.push(`${path}.${key} is a money-bearing key`);
      if (typeof child === "number" && !Number.isInteger(child)) {
        problems.push(`${path}.${key} is a non-integer number (${child}); public numerics are integers in thousandths`);
      }
      if (typeof child === "string" && (child.includes("£") || /\bGBP\b/u.test(child))) {
        problems.push(`${path}.${key} carries a currency value`);
      }
      walk(child, `${path}.${key}`);
    }
  };
  walk(value, "");

  const bytes = JSON.stringify(value);
  if (TWO_DP.test(bytes)) problems.push(`serialised ${dataset} contains a two-decimal value, which may collide with a retained price`);
  for (const token of privateTokens) {
    if (bytes.includes(token)) problems.push(`serialised ${dataset} contains the private token ${token}`);
  }
  for (const code of reasonCodes) {
    if (bytes.includes(code)) problems.push(`serialised ${dataset} contains the reason code ${code}`);
  }

  if (problems.length) {
    throw new Error(`public projection is not safe to publish:\n  ${problems.join("\n  ")}`);
  }
  return true;
}

export function canonicalProjectionBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
