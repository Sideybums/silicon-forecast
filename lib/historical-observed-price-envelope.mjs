import { readFileSync } from "node:fs";

export const ENVELOPE_VERSION = "historical-observed-price-envelope-v1";

const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function nonBlank(value, context) {
  invariant(typeof value === "string" && value.trim().length > 0, `${context} must be non-blank`);
}

function normaliseVatState(value) {
  if (value === "included") return true;
  if (value === "excluded") return false;
  return null;
}

export function normaliseObservation(raw, { sourceFile, captureKind }) {
  invariant(raw && typeof raw === "object", "observation must be an object");
  nonBlank(raw.observation_id, "observation_id");
  invariant(
    captureKind === "archive_capture" || captureKind === "prospective_capture",
    "captureKind must be archive_capture or prospective_capture",
  );

  let mpn;
  let amountMinor;
  let currency;
  let vatIncluded;

  if (raw.price && typeof raw.price === "object") {
    // Family B — wave 2 backfill shape.
    mpn = raw.product?.mpn;
    amountMinor = raw.price.item_price_minor;
    currency = raw.price.currency;
    invariant(
      raw.price.vat_included === true || raw.price.vat_included === false || raw.price.vat_included === null,
      "price.vat_included must be true, false or null",
    );
    vatIncluded = raw.price.vat_included;
  } else if (raw.item_price && typeof raw.item_price === "object") {
    // Family A — v1 retail shape.
    mpn = raw.identity?.mpn_observed;
    amountMinor = raw.item_price.amount_minor;
    currency = raw.item_price.currency;
    vatIncluded = normaliseVatState(raw.item_price.vat_state);
  } else {
    throw new Error(`unrecognised observation schema for ${raw.observation_id}`);
  }

  nonBlank(raw.observed_at, "observed_at");
  invariant(
    UTC_INSTANT.test(raw.observed_at),
    `observed_at must be a fixed-width UTC instant (YYYY-MM-DDTHH:MM:SSZ), got: ${raw.observed_at}`,
  );
  nonBlank(mpn, "mpn");
  invariant(Number.isInteger(amountMinor) && amountMinor > 0, "amount must be a positive integer minor value");
  invariant(currency === "GBP", "currency must be GBP");
  nonBlank(raw.seller?.display_name, "seller.display_name");

  return {
    observation_id: raw.observation_id,
    observed_at: raw.observed_at,
    mpn: mpn.normalize("NFKC").trim().toUpperCase(),
    seller_display_name: raw.seller.display_name,
    seller_legal_name: raw.seller.legal_name ?? null,
    amount_minor: amountMinor,
    currency,
    vat_included: vatIncluded,
    capture_kind: captureKind,
    source_file: sourceFile,
  };
}

export function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const QUARTER_ID = /^(\d{4})-Q([1-4])$/u;

export function quarterIdForTimestamp(iso) {
  nonBlank(iso, "timestamp");
  const at = new Date(iso);
  invariant(!Number.isNaN(at.getTime()), `unparseable timestamp: ${iso}`);
  const quarter = Math.floor(at.getUTCMonth() / 3) + 1;
  return `${at.getUTCFullYear()}-Q${quarter}`;
}

function parseQuarterId(quarterId) {
  const match = QUARTER_ID.exec(quarterId ?? "");
  invariant(match, `invalid quarter id: ${quarterId}`);
  return { year: Number(match[1]), quarter: Number(match[2]) };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function quarterBounds(quarterId) {
  const { year, quarter } = parseQuarterId(quarterId);
  const startMonth = (quarter - 1) * 3 + 1;
  const endYear = quarter === 4 ? year + 1 : year;
  const endMonth = quarter === 4 ? 1 : startMonth + 3;
  return {
    start: `${year}-${pad(startMonth)}-01T00:00:00Z`,
    end: `${endYear}-${pad(endMonth)}-01T00:00:00Z`,
  };
}

export function quarterRange(firstId, lastId) {
  const first = parseQuarterId(firstId);
  const last = parseQuarterId(lastId);
  const firstIndex = first.year * 4 + (first.quarter - 1);
  const lastIndex = last.year * 4 + (last.quarter - 1);
  invariant(firstIndex <= lastIndex, "quarter range must not run backwards");
  const ids = [];
  for (let index = firstIndex; index <= lastIndex; index += 1) {
    ids.push(`${Math.floor(index / 4)}-Q${(index % 4) + 1}`);
  }
  return ids;
}

function extremeBy(records, pick) {
  // records are pre-sorted ascending by observation_id, so the first record
  // reached with a given extreme amount already has the smallest id — that
  // ordering is what makes tie-breaking deterministic.
  let best = records[0];
  for (const record of records.slice(1)) {
    if (pick(record, best)) best = record;
  }
  return { amount_minor: best.amount_minor, observation_id: best.observation_id, mpn: best.mpn, seller: best.seller_display_name };
}

export function deriveObservedPriceEnvelope(observations) {
  invariant(Array.isArray(observations) && observations.length > 0, "observations must be a non-empty array");

  const byQuarter = new Map();
  for (const record of observations) {
    const quarterId = quarterIdForTimestamp(record.observed_at);
    if (!byQuarter.has(quarterId)) byQuarter.set(quarterId, []);
    byQuarter.get(quarterId).push(record);
  }

  const present = [...byQuarter.keys()].sort();
  const periods = quarterRange(present[0], present.at(-1)).map((periodId) => {
    const { start, end } = quarterBounds(periodId);
    const records = (byQuarter.get(periodId) ?? []).slice().sort((a, b) => a.observation_id.localeCompare(b.observation_id));

    if (records.length === 0) {
      return {
        period_id: periodId, start, end, state: "no_eligible_evidence",
        low: null, high: null,
        observation_count: 0, distinct_mpn_count: 0, distinct_seller_count: 0,
        vat_resolved_count: 0, vat_unresolved_count: 0, contributing_observation_ids: [],
      };
    }

    return {
      period_id: periodId, start, end, state: "observed",
      low: extremeBy(records, (candidate, best) => candidate.amount_minor < best.amount_minor),
      high: extremeBy(records, (candidate, best) => candidate.amount_minor > best.amount_minor),
      observation_count: records.length,
      distinct_mpn_count: new Set(records.map((r) => r.mpn)).size,
      distinct_seller_count: new Set(records.map((r) => r.seller_display_name)).size,
      vat_resolved_count: records.filter((r) => r.vat_included !== null).length,
      vat_unresolved_count: records.filter((r) => r.vat_included === null).length,
      contributing_observation_ids: records.map((r) => r.observation_id),
    };
  });

  return {
    schema_version: 1,
    fixture_id: "sf-gb-ddr5-32gb-observed-price-envelope-v1",
    status: "candidate_private_fixture",
    version: ENVELOPE_VERSION,
    region: "GB",
    channel: "PRIMARY_RETAIL",
    currency: "GBP",
    price_basis: "quoted_item_price_with_per_period_vat_disclosure_not_landed_price",
    render_contract: {
      mark: "range_band_with_evidence_scatter",
      central_tendency: false,
      median_state: "UNAVAILABLE_AGGREGATION_NOT_APPROVED",
      connect_periods: false,
      interpolate: false,
      forward_fill: false,
      backcast: false,
      minimum_observation_threshold: null,
      evidence_counts_must_be_visible: true,
      vat_disclosure_must_be_visible: true,
      gaps_must_be_visible: true,
      scatter_must_show_every_contributing_observation: true,
    },
    governance: {
      methodology_approval: false,
      aggregation_rule_approval: false,
      reference_period_approval: false,
      basket_approval: false,
      source_approval: false,
      index_eligibility: false,
      publication_allowed: false,
    },
    periods,
  };
}

export const ELIGIBLE_TRANCHES = [
  { file: "uk-primary-retail-2026-08-09T122437Z.v1.json", captureKind: "prospective_capture" },
  { file: "uk-primary-retail-2026-08-09T234337Z.v1.json", captureKind: "prospective_capture" },
  { file: "uk-primary-retail-historical-backfill-2026-08-09T145021Z.v1.json", captureKind: "archive_capture" },
  { file: "uk-primary-retail-historical-backfill-2026-08-10T040544Z.v1.json", captureKind: "archive_capture" },
  { file: "uk-primary-retail-historical-backfill-2026-08-10T065616Z.v1.json", captureKind: "archive_capture" },
];

export function buildEnvelopeFromRepository(root) {
  const records = [];
  for (const tranche of ELIGIBLE_TRANCHES) {
    const path = new URL(`data/observations/candidate/${tranche.file}`, root);
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    for (const raw of parsed.observations) {
      records.push(normaliseObservation(raw, { sourceFile: tranche.file, captureKind: tranche.captureKind }));
    }
  }
  const ids = new Set(records.map((r) => r.observation_id));
  invariant(ids.size === records.length, "duplicate observation_id across tranches");
  const resolution = JSON.parse(readFileSync(new URL(VAT_RESOLUTION_FILE, root), "utf8"));
  const resolved = applyVatResolutions(records, resolution.resolutions, resolution.resolution_id);
  return deriveObservedPriceEnvelope(resolved);
}

export function canonicalEnvelopeBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export const VAT_RESOLUTION_FILE = "research/evidence/scan-vat-display-resolution-2026-08-10/resolution.v1.json";

export function applyVatResolutions(records, resolutions, resolutionId = "sf-scan-vat-display-resolution-2026-08-10") {
  const byId = new Map(records.map((record) => [record.observation_id, record]));
  const overrides = new Map();
  for (const resolution of resolutions) {
    const record = byId.get(resolution.observation_id);
    invariant(record, `unknown observation in VAT resolution: ${resolution.observation_id}`);
    invariant(
      record.vat_included === resolution.vat_included_before,
      `resolution before-state mismatch for ${resolution.observation_id}`,
    );
    overrides.set(resolution.observation_id, resolution.vat_included_after);
  }
  return records.map((record) =>
    overrides.has(record.observation_id)
      ? { ...record, vat_included: overrides.get(record.observation_id), vat_resolution_source: resolutionId }
      : record,
  );
}
