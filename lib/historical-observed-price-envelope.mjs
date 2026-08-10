import { readFileSync } from "node:fs";

export const ENVELOPE_VERSION = "historical-observed-price-envelope-v1";

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
