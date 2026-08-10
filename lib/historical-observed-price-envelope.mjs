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
