// The single definition of what counts as private material.
//
// Extracted so that the public boundary test and the public projection test
// police the same set. Two tests with two drifting copies of "banned" is how a
// leak gets through the one that was not updated.
import { globSync, readFileSync, statSync } from "node:fs";

export const PRIVATE_JSON_GLOBS = [
  "data/observations/candidate/**/*.json",
  "data/fixtures/private-candidate*.json",
  "data/reviews/**/*.json",
];

export function privateJsonFiles() {
  return PRIVATE_JSON_GLOBS.flatMap((pattern) => globSync(pattern));
}

// Identifier keys whose values may never appear in public output.
//
// mpn_expected and mpn_observed were removed on 2026-08-13 by
// data/reviews/part-number-disclosure-ruling-2026-08-13.json. A manufacturer
// part number is public data printed on the retailer page it was read from.
// What the control actually protected — the comparison between the identity we
// expected and the identity we observed, and the eligibility reasoning attached
// to it — is protected instead by MATCHING_STATE_KEYS and the reason-code
// vocabulary below, which is a narrowing with a replacement rather than a
// removal.
export const BANNED_KEY_PATTERN =
  /^(tranche_id|observation_id|source_key|source_url|archive_url|original_url|extract_path|extract_sha256|response_sha256|observed_at|legal_name|review_id|approval_id)$/u;

export const PRIVATE_MARKERS = [
  "candidate_private_immutable",
  "candidate_diagnostic_available",
  "private-candidate-quoted-item-relative-diagnostic",
  "candidate_private_unapproved",
  "captured_candidate_private_unapproved",
];

// Keys that describe the identity decision rather than the product.
export const MATCHING_STATE_KEYS = ["mpn_expected", "mpn_observed", "match_basis", "identity_exact"];

// Keys under which the collector records why it abstained or how a record
// qualified. Collected from the data rather than hardcoded, so a reason code
// added by a future collector is covered without anyone remembering to update
// a list here.
const REASON_BEARING_KEYS = new Set([
  "reason_codes",
  "reasons",
  "reason_code",
  "exclusion_reason",
  "abstention_reasons",
  "rejection_reasons",
  "code",
]);

const REASON_CODE_SHAPE = /^[A-Z][A-Z0-9_]{5,}$/u;

export function collectMatchingReasonCodes(value, tokens = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectMatchingReasonCodes(item, tokens);
    return tokens;
  }
  if (!value || typeof value !== "object") return tokens;

  for (const [key, child] of Object.entries(value)) {
    if (REASON_BEARING_KEYS.has(key)) {
      if (typeof child === "string" && REASON_CODE_SHAPE.test(child)) tokens.add(child);
      if (Array.isArray(child)) {
        for (const item of child) if (typeof item === "string" && REASON_CODE_SHAPE.test(item)) tokens.add(item);
      }
      // abstention_reasons is a {CODE: count} map.
      if (child && typeof child === "object" && !Array.isArray(child)) {
        for (const nestedKey of Object.keys(child)) if (REASON_CODE_SHAPE.test(nestedKey)) tokens.add(nestedKey);
      }
    }
    collectMatchingReasonCodes(child, tokens);
  }
  return tokens;
}

export function repositoryReasonCodes() {
  const tokens = new Set();
  for (const file of privateJsonFiles()) collectMatchingReasonCodes(JSON.parse(readFileSync(file, "utf8")), tokens);
  for (const file of globSync("research/evidence/**/ledger.v1.json")) {
    collectMatchingReasonCodes(JSON.parse(readFileSync(file, "utf8")), tokens);
  }
  return tokens;
}

export function collectPrivateTokens(value, tokens = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectPrivateTokens(item, tokens);
    return tokens;
  }
  if (!value || typeof value !== "object") return tokens;

  for (const [childKey, childValue] of Object.entries(value)) {
    if (typeof childValue === "string" && BANNED_KEY_PATTERN.test(childKey)) {
      tokens.add(childValue);
    }
    if (childKey === "item_price" && childValue && typeof childValue === "object") {
      const amount = childValue.amount_minor;
      if (Number.isInteger(amount) && amount > 100) {
        tokens.add(`£${(amount / 100).toFixed(2)}`);
        tokens.add((amount / 100).toFixed(2));
        tokens.add(`GBP ${(amount / 100).toFixed(2)}`);
      }
    }
    collectPrivateTokens(childValue, tokens);
  }
  return tokens;
}

export function collectAllDistinctStrings(value, tokens = new Set()) {
  if (typeof value === "string") {
    if (value.length >= 12) tokens.add(value);
    return tokens;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectAllDistinctStrings(item, tokens);
    return tokens;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectAllDistinctStrings(item, tokens);
  }
  return tokens;
}

export function workerRunFiles() {
  return globSync("data/private-worker-runs/**/*").filter((file) => statSync(file).isFile());
}

export function collectWorkerRunTokens(files = workerRunFiles()) {
  const tokens = new Set();
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    try {
      collectAllDistinctStrings(JSON.parse(content), tokens);
    } catch {
      for (const token of content.match(/[A-Za-z0-9][A-Za-z0-9._:@/-]{11,}/gu) ?? []) tokens.add(token);
    }
  }
  return tokens;
}

export function repositoryPrivateTokens() {
  const tokens = new Set();
  for (const file of privateJsonFiles()) collectPrivateTokens(JSON.parse(readFileSync(file, "utf8")), tokens);
  for (const token of collectWorkerRunTokens()) tokens.add(token);
  return tokens;
}
