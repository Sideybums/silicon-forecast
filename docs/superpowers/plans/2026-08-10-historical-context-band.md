# Historical Context Band Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a derived, quarter-grained observed-price envelope over all eligible UK 32GB DDR5 storefront observations, plus a retrospective movement-explanation ledger, so the sparse exact-MPN graph gains readable market context without asserting an index.

**Architecture:** A normalising adapter reads three incompatible observation schemas into one internal record shape. A pure derivation function buckets those records into UTC calendar quarters and computes low/high plus evidence counts — never a central tendency. Output is written to a golden fixture that a test re-derives and compares byte-for-byte, so no number can be hand-edited into the band. A separate ledger holds movement records and candidate explanations, structurally forbidden from touching any numeric value.

**Tech Stack:** Node 22+ ESM (`.mjs`), `node:test` runner, `node:assert/strict`, no new dependencies. Follows existing `lib/*.mjs` conventions (`invariant`, `exactKeys`, `nonBlank` helper style from `lib/catalogue-fixtures.mjs`).

## Global Constraints

- Design authority: `docs/superpowers/specs/2026-08-10-historical-context-band-design.md`. Do not exceed it.
- No new npm dependencies. Node built-ins only.
- Approves no source, methodology threshold, basket, reference period, deflator, aggregation rule, causal claim, production action or publication. Every new artefact carries `governance` flags that are all `false`.
- **No central tendency.** No mean, median or weighted average anywhere. Median remains `UNAVAILABLE_AGGREGATION_NOT_APPROVED`.
- **No minimum observation count.** A minimum is a methodology threshold and thresholds are locked.
- No interpolation, forward fill, backcast, or connecting lines between periods.
- Archive capture timestamps are never represented as retailer price-change times.
- The canonical collector `7e98d1467473` remains the sole prospective fetcher. Nothing in this plan fetches a live or current retailer offer.
- Period grain is **UTC calendar quarter**, id format `YYYY-Qn`.
- Currency is GBP; all amounts are integer minor units. Never use floating point for money.
- Editorial anchors never enter the envelope.
- Causal language capped at `contributory_hypothesis`.
- Standing verification bar before any commit is claimed complete: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:db`, `git diff --check`.

---

## Critical Context: Three Incompatible Observation Schemas

The implementer will hit this immediately. `data/observations/candidate/` contains **three different shapes**, verified 2026-08-10:

**Family A — 12 observations** across `uk-primary-retail-2026-08-09T122437Z`, `uk-primary-retail-2026-08-09T234337Z`, `uk-primary-retail-historical-backfill-2026-08-09T145021Z`, `uk-primary-retail-historical-backfill-2026-08-10T040544Z`:
```
observation_id, observed_at,
identity.mpn_observed, item_price.amount_minor, item_price.vat_state ("included"),
seller.display_name, seller.legal_name
```

**Family B — 6 observations** in `uk-primary-retail-historical-backfill-2026-08-10T065616Z`:
```
observation_id, observed_at,
product.mpn, price.item_price_minor, price.vat_included (true | null),
seller.display_name, seller.legal_name
```

**Family C — 4 observations** in `amazon-uk-2026-08-06T103140Z`: marketplace platform offers, entirely different shape (`display_price`, `platform`, `offer_basis`). **Excluded from the envelope** — marketplace is a deferred channel per `.planning/PROJECT.md`.

Verified VAT value distribution: Family A → `vat_state: "included"` ×12. Family B → `vat_included: true` ×4, `vat_included: null` ×2 (both Scan Computers).

**Trap:** do NOT normalise VAT with `raw.price?.vat_included ?? raw.item_price?.vat_state`. Family B's meaningful `null` falls through `??` and silently becomes Family A's field, producing `undefined`. VAT must be read per-family after explicit family detection. This exact bug was hit while surveying the data.

---

## File Structure

**Create:**
- `lib/historical-observed-price-envelope.mjs` — normaliser, quarter bucketing, envelope derivation. One responsibility: turn immutable observations into a deterministic envelope. No I/O beyond a `loadJson` helper.
- `lib/historical-movement-explanations.mjs` — movement derivation and explanation-ledger validation. Separate file because it changes for different reasons and must be provably unable to alter envelope output.
- `scripts/render-historical-observed-price-envelope.mjs` — CLI that writes the golden fixture.
- `data/fixtures/historical-observed-price-envelope.v1.json` — golden derived output.
- `data/reviews/historical-context-comparability-review-2026-08-10.json` — additive decision record for the two approved relaxations.
- `research/evidence/historical-movement-explanations-2026-08-10/ledger.v1.json` — movement + explanation ledger.
- `tests/historical-observed-price-envelope.test.mjs` — derivation and adversarial tests.
- `tests/historical-movement-explanations.test.mjs` — movement, ledger and numeric-immutability tests.

**Modify:**
- `research/HISTORICAL-SOURCE-COVERAGE-2026-08-10.md` — add envelope coverage section.
- `.planning/STATE.md` — wave entry.
- `.planning/HANDOFF.json` — state, counts, next action; also correct the dangling `wave_2_commit`.

---

## Phase A — Envelope machinery (build before acquiring, so new evidence flows straight in)

### Task 1: Observation normaliser

**Files:**
- Create: `lib/historical-observed-price-envelope.mjs`
- Test: `tests/historical-observed-price-envelope.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `normaliseObservation(raw, context)` returning
  `{ observation_id, observed_at, mpn, seller_display_name, seller_legal_name, amount_minor, currency, vat_included, capture_kind, source_file }`
  where `vat_included` is `true | false | null` and `capture_kind` is `"archive_capture" | "prospective_capture"`.
  Also `ENVELOPE_VERSION`, `loadTrancheObservations(trancheJson, sourceFile)`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/historical-observed-price-envelope.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { normaliseObservation } from "../lib/historical-observed-price-envelope.mjs";

const familyB = {
  observation_id: "sf-hist-scan-cmk32gx5m2b6000c36-2022-07-03T173438Z",
  observed_at: "2022-07-03T17:34:38Z",
  product: { mpn: "CMK32GX5M2B6000C36" },
  price: { item_price_minor: 27548, currency: "GBP", vat_included: null },
  seller: { display_name: "Scan Computers", legal_name: null },
};

const familyA = {
  observation_id: "awdit-f5-6000j3636f16gx2-fx5-2026-08-09t234337z",
  observed_at: "2026-08-09T23:43:37Z",
  identity: { mpn_observed: "F5-6000J3636F16GX2-FX5" },
  item_price: { amount_minor: 46999, currency: "GBP", vat_state: "included" },
  seller: { display_name: "AWD-IT", legal_name: "ADMI Limited" },
};

const ctx = { sourceFile: "t.json", captureKind: "archive_capture" };

test("family B preserves an explicit null VAT state", () => {
  const out = normaliseObservation(familyB, ctx);
  assert.equal(out.mpn, "CMK32GX5M2B6000C36");
  assert.equal(out.amount_minor, 27548);
  assert.equal(out.vat_included, null);
  assert.equal(out.seller_display_name, "Scan Computers");
});

test("family A maps vat_state included to true", () => {
  const out = normaliseObservation(familyA, { ...ctx, captureKind: "prospective_capture" });
  assert.equal(out.mpn, "F5-6000J3636F16GX2-FX5");
  assert.equal(out.amount_minor, 46999);
  assert.equal(out.vat_included, true);
  assert.equal(out.capture_kind, "prospective_capture");
});

test("an unrecognised observation shape fails closed", () => {
  assert.throws(
    () => normaliseObservation({ observation_id: "x", display_price: "£10" }, ctx),
    /unrecognised observation schema/,
  );
});

test("a non-GBP amount fails closed", () => {
  const bad = { ...familyB, price: { ...familyB.price, currency: "USD" } };
  assert.throws(() => normaliseObservation(bad, ctx), /currency must be GBP/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/historical-observed-price-envelope.test.mjs`
Expected: FAIL — `Cannot find module '../lib/historical-observed-price-envelope.mjs'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// lib/historical-observed-price-envelope.mjs
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
  nonBlank(raw.observed_at, "observed_at");
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/historical-observed-price-envelope.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/historical-observed-price-envelope.mjs tests/historical-observed-price-envelope.test.mjs
git commit -m "feat: normalise heterogeneous historical observation schemas"
```

---

### Task 2: Quarter bucketing

**Files:**
- Modify: `lib/historical-observed-price-envelope.mjs`
- Test: `tests/historical-observed-price-envelope.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `quarterIdForTimestamp(iso)` → `"YYYY-Qn"`; `quarterBounds(quarterId)` → `{ start, end }` ISO strings; `quarterRange(firstId, lastId)` → ordered `string[]` inclusive.

- [ ] **Step 1: Write the failing test**

```javascript
// append to tests/historical-observed-price-envelope.test.mjs
import { quarterIdForTimestamp, quarterBounds, quarterRange } from "../lib/historical-observed-price-envelope.mjs";

test("timestamps bucket into UTC calendar quarters", () => {
  assert.equal(quarterIdForTimestamp("2021-11-02T17:18:37Z"), "2021-Q4");
  assert.equal(quarterIdForTimestamp("2023-01-28T07:42:17Z"), "2023-Q1");
  assert.equal(quarterIdForTimestamp("2023-08-15T14:08:13Z"), "2023-Q3");
  assert.equal(quarterIdForTimestamp("2026-08-09T23:43:37Z"), "2026-Q3");
});

test("quarter bounds are half-open UTC instants", () => {
  assert.deepEqual(quarterBounds("2023-Q1"), {
    start: "2023-01-01T00:00:00Z",
    end: "2023-04-01T00:00:00Z",
  });
});

test("quarter range is inclusive, ordered and gapless", () => {
  assert.deepEqual(quarterRange("2022-Q3", "2023-Q2"), ["2022-Q3", "2022-Q4", "2023-Q1", "2023-Q2"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/historical-observed-price-envelope.test.mjs`
Expected: FAIL — `quarterIdForTimestamp is not a function`

- [ ] **Step 3: Write minimal implementation**

```javascript
// append to lib/historical-observed-price-envelope.mjs
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/historical-observed-price-envelope.test.mjs`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/historical-observed-price-envelope.mjs tests/historical-observed-price-envelope.test.mjs
git commit -m "feat: bucket observations into UTC calendar quarters"
```

---

### Task 3: Envelope derivation

**Files:**
- Modify: `lib/historical-observed-price-envelope.mjs`
- Test: `tests/historical-observed-price-envelope.test.mjs`

**Interfaces:**
- Consumes: `normaliseObservation`, `quarterIdForTimestamp`, `quarterRange`.
- Produces: `deriveObservedPriceEnvelope(observations)` → `{ schema_version, fixture_id, status, version, region, channel, currency, price_basis, render_contract, governance, periods[] }`. Each period: `{ period_id, start, end, state, low, high, observation_count, distinct_mpn_count, distinct_seller_count, vat_resolved_count, vat_unresolved_count, contributing_observation_ids }`. `low`/`high` are `{ amount_minor, observation_id, mpn, seller }` or `null` when `state === "no_eligible_evidence"`.

Tie-breaking: when two observations share the extreme amount, the lexicographically smallest `observation_id` wins. This keeps derivation deterministic.

- [ ] **Step 1: Write the failing test**

```javascript
// append to tests/historical-observed-price-envelope.test.mjs
import { deriveObservedPriceEnvelope } from "../lib/historical-observed-price-envelope.mjs";

const obs = (id, at, mpn, seller, amount, vat) => ({
  observation_id: id, observed_at: at, mpn, seller_display_name: seller,
  seller_legal_name: null, amount_minor: amount, currency: "GBP",
  vat_included: vat, capture_kind: "archive_capture", source_file: "t.json",
});

test("a quarter envelope reports low, high and evidence breadth", () => {
  const envelope = deriveObservedPriceEnvelope([
    obs("a", "2023-01-28T07:42:17Z", "CT2K16G56C46U5", "Crucial UK", 14879, true),
    obs("b", "2023-03-15T07:59:07Z", "CMK32GX5M2B6000C36", "Scan Computers", 13000, null),
  ]);
  const q1 = envelope.periods.find((p) => p.period_id === "2023-Q1");
  assert.equal(q1.state, "observed");
  assert.equal(q1.low.amount_minor, 13000);
  assert.equal(q1.low.observation_id, "b");
  assert.equal(q1.high.amount_minor, 14879);
  assert.equal(q1.observation_count, 2);
  assert.equal(q1.distinct_mpn_count, 2);
  assert.equal(q1.distinct_seller_count, 2);
  assert.equal(q1.vat_resolved_count, 1);
  assert.equal(q1.vat_unresolved_count, 1);
  assert.deepEqual(q1.contributing_observation_ids, ["a", "b"]);
});

test("a quarter with no evidence is an explicit gap, never zero", () => {
  const envelope = deriveObservedPriceEnvelope([
    obs("a", "2022-07-03T17:34:38Z", "X", "Scan Computers", 27548, null),
    obs("b", "2023-01-28T07:42:17Z", "Y", "Crucial UK", 14879, true),
  ]);
  const q4 = envelope.periods.find((p) => p.period_id === "2022-Q4");
  assert.equal(q4.state, "no_eligible_evidence");
  assert.equal(q4.low, null);
  assert.equal(q4.high, null);
  assert.equal(q4.observation_count, 0);
});

test("a single-observation quarter is a degenerate envelope with an honest count", () => {
  const envelope = deriveObservedPriceEnvelope([obs("a", "2024-05-01T00:00:00Z", "X", "Box", 9999, true)]);
  const only = envelope.periods[0];
  assert.equal(only.low.amount_minor, only.high.amount_minor);
  assert.equal(only.observation_count, 1);
});

test("the envelope asserts no central tendency", () => {
  const envelope = deriveObservedPriceEnvelope([obs("a", "2024-05-01T00:00:00Z", "X", "Box", 9999, true)]);
  assert.equal(envelope.render_contract.central_tendency, false);
  assert.equal(envelope.render_contract.median_state, "UNAVAILABLE_AGGREGATION_NOT_APPROVED");
  assert.equal(JSON.stringify(envelope).includes("median_value"), false);
  assert.deepEqual(Object.values(envelope.governance), [false, false, false, false, false, false, false]);
});

test("ties break deterministically on observation id", () => {
  const envelope = deriveObservedPriceEnvelope([
    obs("zzz", "2024-05-01T00:00:00Z", "X", "Box", 5000, true),
    obs("aaa", "2024-05-02T00:00:00Z", "Y", "CCL", 5000, true),
  ]);
  assert.equal(envelope.periods[0].low.observation_id, "aaa");
  assert.equal(envelope.periods[0].high.observation_id, "aaa");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/historical-observed-price-envelope.test.mjs`
Expected: FAIL — `deriveObservedPriceEnvelope is not a function`

- [ ] **Step 3: Write minimal implementation**

```javascript
// append to lib/historical-observed-price-envelope.mjs
function extremeBy(records, pick) {
  let best = records[0];
  for (const record of records.slice(1)) {
    if (pick(record, best)) best = record;
    else if (record.amount_minor === best.amount_minor && record.observation_id < best.observation_id) best = record;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/historical-observed-price-envelope.test.mjs`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/historical-observed-price-envelope.mjs tests/historical-observed-price-envelope.test.mjs
git commit -m "feat: derive quarter observed-price envelope without central tendency"
```

---

### Task 4: Golden fixture and render script

**Files:**
- Create: `scripts/render-historical-observed-price-envelope.mjs`
- Create: `data/fixtures/historical-observed-price-envelope.v1.json`
- Modify: `lib/historical-observed-price-envelope.mjs`
- Test: `tests/historical-observed-price-envelope.test.mjs`

**Interfaces:**
- Consumes: `deriveObservedPriceEnvelope`, `normaliseObservation`.
- Produces: `ELIGIBLE_TRANCHES` (ordered array of `{ file, captureKind }`), `buildEnvelopeFromRepository(root)` → envelope object, `canonicalEnvelopeBytes(value)` → `string`.

The Amazon marketplace tranche is excluded by omission from `ELIGIBLE_TRANCHES`, and a test asserts it stays excluded.

- [ ] **Step 1: Write the failing test**

```javascript
// append to tests/historical-observed-price-envelope.test.mjs
import { readFile } from "node:fs/promises";
import { buildEnvelopeFromRepository, canonicalEnvelopeBytes, ELIGIBLE_TRANCHES } from "../lib/historical-observed-price-envelope.mjs";

const root = new URL("../", import.meta.url);

test("the marketplace tranche is excluded from the envelope", () => {
  assert.equal(ELIGIBLE_TRANCHES.some((t) => t.file.includes("amazon")), false);
});

test("the golden fixture re-derives byte-for-byte from immutable observations", async () => {
  const golden = await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8");
  const rederived = canonicalEnvelopeBytes(buildEnvelopeFromRepository(root));
  assert.equal(rederived, golden);
});

test("every contributing observation id resolves to a real observation", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  const known = new Set();
  for (const tranche of ELIGIBLE_TRANCHES) {
    const raw = JSON.parse(await readFile(new URL(`data/observations/candidate/${tranche.file}`, root), "utf8"));
    for (const o of raw.observations) known.add(o.observation_id);
  }
  for (const period of golden.periods) {
    for (const id of period.contributing_observation_ids) assert.equal(known.has(id), true, `dangling observation id: ${id}`);
    if (period.low) assert.equal(known.has(period.low.observation_id), true);
    if (period.high) assert.equal(known.has(period.high.observation_id), true);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/historical-observed-price-envelope.test.mjs`
Expected: FAIL — `buildEnvelopeFromRepository is not a function`

- [ ] **Step 3: Write minimal implementation**

```javascript
// append to lib/historical-observed-price-envelope.mjs
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
  return deriveObservedPriceEnvelope(records);
}

export function canonicalEnvelopeBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
```

```javascript
// scripts/render-historical-observed-price-envelope.mjs
import { writeFileSync } from "node:fs";
import { buildEnvelopeFromRepository, canonicalEnvelopeBytes } from "../lib/historical-observed-price-envelope.mjs";

const root = new URL("../", import.meta.url);
const target = new URL("data/fixtures/historical-observed-price-envelope.v1.json", root);
const envelope = buildEnvelopeFromRepository(root);
writeFileSync(target, canonicalEnvelopeBytes(envelope));
const observed = envelope.periods.filter((p) => p.state === "observed").length;
process.stdout.write(`wrote ${envelope.periods.length} quarters (${observed} observed) to ${target.pathname}\n`);
```

- [ ] **Step 4: Generate the fixture, then run tests**

Run: `node scripts/render-historical-observed-price-envelope.mjs && node --test tests/historical-observed-price-envelope.test.mjs`
Expected: script reports 20 quarters spanning 2021-Q4 to 2026-Q3 (verified: `2026*4+2 - (2021*4+3) + 1 = 20`); tests PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/historical-observed-price-envelope.mjs scripts/render-historical-observed-price-envelope.mjs data/fixtures/historical-observed-price-envelope.v1.json tests/historical-observed-price-envelope.test.mjs
git commit -m "feat: pin observed-price envelope to a re-derivable golden fixture"
```

---

### Task 5: Adversarial tests

**Files:**
- Test: `tests/historical-observed-price-envelope.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 1–4. Produces no new exports.

- [ ] **Step 1: Write the failing tests**

```javascript
// append to tests/historical-observed-price-envelope.test.mjs
test("a hand-edited band value cannot survive re-derivation", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  const tampered = structuredClone(golden);
  const target = tampered.periods.find((p) => p.state === "observed");
  target.low.amount_minor -= 1;
  assert.notEqual(canonicalEnvelopeBytes(tampered), canonicalEnvelopeBytes(buildEnvelopeFromRepository(root)));
});

test("a period cannot claim an observation outside its own quarter", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  const byId = new Map();
  for (const tranche of ELIGIBLE_TRANCHES) {
    const raw = JSON.parse(await readFile(new URL(`data/observations/candidate/${tranche.file}`, root), "utf8"));
    for (const o of raw.observations) byId.set(o.observation_id, o.observed_at);
  }
  for (const period of golden.periods) {
    for (const id of period.contributing_observation_ids) {
      assert.equal(quarterIdForTimestamp(byId.get(id)), period.period_id);
    }
  }
});

test("every period carries VAT disclosure counts that sum to its observation count", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  for (const period of golden.periods) {
    assert.equal(period.vat_resolved_count + period.vat_unresolved_count, period.observation_count);
  }
});

test("no period fabricates a value for an empty quarter", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  for (const period of golden.periods.filter((p) => p.state === "no_eligible_evidence")) {
    assert.equal(period.low, null);
    assert.equal(period.high, null);
    assert.deepEqual(period.contributing_observation_ids, []);
  }
});
```

- [ ] **Step 2: Run tests**

Run: `node --test tests/historical-observed-price-envelope.test.mjs`
Expected: PASS, 19 tests. (These assert properties the implementation already satisfies; if any fails, the derivation is wrong — fix `lib/`, not the test.)

- [ ] **Step 3: Commit**

```bash
git add tests/historical-observed-price-envelope.test.mjs
git commit -m "test: add adversarial envelope integrity checks"
```

---

### Task 6: Comparability decision record

**Files:**
- Create: `data/reviews/historical-context-comparability-review-2026-08-10.json`
- Test: `tests/historical-movement-explanations.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: a decision artefact other tasks reference by path. No code exports.

- [ ] **Step 1: Write the decision record**

```json
{
  "schema_version": 1,
  "review_id": "sf-historical-context-comparability-2026-08-10",
  "status": "human_approved_additive_decision",
  "decided_at": "2026-08-10",
  "decided_by": "David Sidebottom",
  "scope": "context_layer_only",
  "design_reference": "docs/superpowers/specs/2026-08-10-historical-context-band-design.md",
  "decisions": [
    {
      "decision_id": "cross-seller-comparison-permitted-as-fallback",
      "rule_relaxed": "movement comparison previously required the same seller legal entity plus exact MPN",
      "approved": true,
      "rationale": "The object of interest is the market price level, not any individual retailer's conduct. Where the same MPN cannot be found at the same retailer at two separated dates, a cross-seller pairing is more informative than no evidence.",
      "constraints": [
        "within_seller pairing must be attempted first",
        "every movement record carries comparison_basis",
        "cross_seller movements must be disclosed wherever rendered"
      ],
      "known_cost": "A cross-seller movement conflates seller price-level differences with change over time; the number is a real comparison of two real observed prices but its cause is mixed."
    },
    {
      "decision_id": "vat-unresolved-points-admitted-with-disclosure",
      "rule_relaxed": "VAT-unresolved points were excluded from comparison and aggregation",
      "approved": true,
      "rationale": "Excluding unresolved points discards real observed prices. Disclosure carries the honesty instead of exclusion.",
      "constraints": [
        "every period records vat_resolved_count and vat_unresolved_count",
        "any period containing unresolved points renders a visible disclosure",
        "the per-product exact-MPN sparse graph retains its existing stricter contract"
      ],
      "known_cost": "Periods mixing VAT-inclusive and VAT-unresolved points have a wider and less comparable envelope than the counts alone imply."
    },
    {
      "decision_id": "vat-must-not-be-inferred-from-price-endings",
      "rule_relaxed": "none; this records a determination method",
      "approved": true,
      "rationale": "UK consumer-facing prices must include VAT under the Price Marking Order 2004, so inc-VAT is the default for consumer retailers regardless of price ending. Endings such as .99 and .95 are marketing price points appearing in both inc- and ex-VAT displays. Trade-oriented sellers have historically offered an ex/inc-VAT display toggle.",
      "constraints": [
        "VAT state is read from an explicit statement or display-mode indicator in captured bytes",
        "where absent, VAT remains unresolved and is disclosed",
        "price endings are never used to infer VAT state"
      ],
      "known_cost": "Scan Computers captures of GBP 275.48 and GBP 130.00 read unlike consumer marketing price points, which prompts display-mode review rather than a determination."
    }
  ],
  "governance": {
    "methodology_approved": false,
    "aggregation_rule_approved": false,
    "source_approved": false,
    "basket_approved": false,
    "reference_period_approved": false,
    "index_eligible": false,
    "production_eligible": false,
    "publication_eligible": false
  }
}
```

- [ ] **Step 2: Write the failing test**

```javascript
// tests/historical-movement-explanations.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

test("the comparability review is additive, scoped and approves no production capability", async () => {
  const review = await readJson("data/reviews/historical-context-comparability-review-2026-08-10.json");
  assert.equal(review.status, "human_approved_additive_decision");
  assert.equal(review.scope, "context_layer_only");
  assert.equal(review.decisions.length, 3);
  assert.deepEqual(Object.values(review.governance), [false, false, false, false, false, false, false, false]);
  for (const decision of review.decisions) {
    assert.ok(decision.rationale.length > 0);
    assert.ok(decision.known_cost.length > 0);
    assert.ok(Array.isArray(decision.constraints) && decision.constraints.length > 0);
  }
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `node --test tests/historical-movement-explanations.test.mjs`
Expected: PASS, 1 test.

- [ ] **Step 4: Commit**

```bash
git add data/reviews/historical-context-comparability-review-2026-08-10.json tests/historical-movement-explanations.test.mjs
git commit -m "docs: record approved context-layer comparability decisions"
```

---

### Task 6B: Additive Scan VAT resolution

**Files:**
- Create: `research/evidence/scan-vat-display-resolution-2026-08-10/resolution.v1.json`
- Modify: `lib/historical-observed-price-envelope.mjs`
- Test: `tests/historical-observed-price-envelope.test.mjs`

**Background (verified 2026-08-10, parent re-fetch):** both archived Scan pages re-fetch byte-identical to the wave-2 ledger hashes (`cb30d619…` and `a41b7213…`) and both contain:

```html
<li class="vatToggle"><button data-action="vatToggle" data-exvat="false">Show <strong>Ex Vat</strong> Prices</button>
```

`data-exvat="false"` means the rendered page was not in ex-VAT mode; the control offers to switch to ex-VAT. Both pages also carry `itemprop="price" content="275.48"` / `content="130.00"`, matching the displayed figures. Both Scan observations are therefore **VAT-inclusive**.

The immutable tranche is NOT edited. An additive resolution artefact overrides VAT state at load time, matching the project rule that corrections are additive.

**Interfaces:**
- Consumes: `normaliseObservation` from Task 1.
- Produces: `applyVatResolutions(records, resolutions)` → records with `vat_included` overridden and `vat_resolution_source` set; `VAT_RESOLUTIONS` loaded inside `buildEnvelopeFromRepository`.

- [ ] **Step 1: Write the resolution artefact**

```json
{
  "schema_version": 1,
  "resolution_id": "sf-scan-vat-display-resolution-2026-08-10",
  "status": "candidate_private_additive_correction",
  "created_at": "2026-08-10",
  "method": "machine_readable_vat_toggle_state_in_archived_bytes",
  "rationale": "Scan product pages carry a vatToggle control whose data-exvat attribute records the rendered display mode. data-exvat=\"false\" means the page was not showing ex-VAT prices and the control offers to switch to them. The microdata itemprop=\"price\" value matches the displayed figure in both captures.",
  "does_not_mutate_source_tranche": true,
  "resolutions": [
    {
      "observation_id": "sf-hist-scan-cmk32gx5m2b6000c36-2022-07-03T173438Z",
      "response_sha256": "cb30d619cc6072387df0795dd7f0995a99fdaeb722d7d8eb4d3fc86043d62765",
      "evidence_marker": "<li class=\"vatToggle\"><button data-action=\"vatToggle\" data-exvat=\"false\">Show <strong>Ex Vat</strong> Prices</button>",
      "microdata_price": "275.48",
      "vat_included_before": null,
      "vat_included_after": true
    },
    {
      "observation_id": "sf-hist-scan-cmk32gx5m2b6000c36-2023-03-15T075907Z",
      "response_sha256": "a41b72131ad98883fe3ca29477e91659bcf4c06fb41638df9089799ecd46a39b",
      "evidence_marker": "<li class=\"vatToggle\"><button data-action=\"vatToggle\" data-exvat=\"false\">Show <strong>Ex Vat</strong> Prices</button>",
      "microdata_price": "130.00",
      "vat_included_before": null,
      "vat_included_after": true
    }
  ],
  "governance": {
    "source_approved": false,
    "methodology_approved": false,
    "index_eligible": false,
    "production_eligible": false,
    "publication_eligible": false
  }
}
```

- [ ] **Step 2: Write the failing test**

```javascript
// append to tests/historical-observed-price-envelope.test.mjs
import { applyVatResolutions } from "../lib/historical-observed-price-envelope.mjs";

test("an additive resolution overrides VAT state and records its source", () => {
  const records = [{
    observation_id: "sf-hist-scan-cmk32gx5m2b6000c36-2022-07-03T173438Z",
    vat_included: null, amount_minor: 27548,
  }];
  const [out] = applyVatResolutions(records, [{
    observation_id: "sf-hist-scan-cmk32gx5m2b6000c36-2022-07-03T173438Z",
    vat_included_before: null, vat_included_after: true,
  }]);
  assert.equal(out.vat_included, true);
  assert.equal(out.vat_resolution_source, "sf-scan-vat-display-resolution-2026-08-10");
});

test("a resolution whose before-state disagrees with the observation fails closed", () => {
  assert.throws(() => applyVatResolutions(
    [{ observation_id: "a", vat_included: true }],
    [{ observation_id: "a", vat_included_before: null, vat_included_after: true }],
  ), /resolution before-state mismatch/);
});

test("a resolution for an unknown observation fails closed", () => {
  assert.throws(() => applyVatResolutions(
    [{ observation_id: "a", vat_included: null }],
    [{ observation_id: "ghost", vat_included_before: null, vat_included_after: true }],
  ), /unknown observation/);
});

test("the Scan observations resolve to VAT-inclusive in the golden fixture", async () => {
  const golden = JSON.parse(await readFile(new URL("data/fixtures/historical-observed-price-envelope.v1.json", root), "utf8"));
  const q = golden.periods.find((p) => p.period_id === "2022-Q3");
  assert.equal(q.vat_unresolved_count, 0);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/historical-observed-price-envelope.test.mjs`
Expected: FAIL — `applyVatResolutions is not a function`

- [ ] **Step 4: Write minimal implementation**

```javascript
// append to lib/historical-observed-price-envelope.mjs
export const VAT_RESOLUTION_FILE = "research/evidence/scan-vat-display-resolution-2026-08-10/resolution.v1.json";

export function applyVatResolutions(records, resolutions, resolutionId = "sf-scan-vat-display-resolution-2026-08-10") {
  const byId = new Map(records.map((r) => [r.observation_id, r]));
  for (const resolution of resolutions) {
    const record = byId.get(resolution.observation_id);
    invariant(record, `unknown observation in VAT resolution: ${resolution.observation_id}`);
    invariant(
      record.vat_included === resolution.vat_included_before,
      `resolution before-state mismatch for ${resolution.observation_id}`,
    );
    record.vat_included = resolution.vat_included_after;
    record.vat_resolution_source = resolutionId;
  }
  return records;
}
```

Then wire it into `buildEnvelopeFromRepository`, immediately before `deriveObservedPriceEnvelope(records)`:

```javascript
  const resolution = JSON.parse(readFileSync(new URL(VAT_RESOLUTION_FILE, root), "utf8"));
  applyVatResolutions(records, resolution.resolutions, resolution.resolution_id);
```

- [ ] **Step 5: Regenerate the fixture and run tests**

Run: `node scripts/render-historical-observed-price-envelope.mjs && node --test tests/historical-observed-price-envelope.test.mjs`
Expected: PASS. 2022-Q3 and 2023-Q1 now report `vat_unresolved_count: 0`.

- [ ] **Step 6: Add the Scan VAT marker to future acquisition briefs**

In Task 8's worker briefs, add: for Scan captures, extract the `vatToggle` element's `data-exvat` attribute as the VAT display-mode indicator. `data-exvat="false"` means displayed prices are VAT-inclusive.

- [ ] **Step 7: Commit**

```bash
git add research/evidence/scan-vat-display-resolution-2026-08-10/ lib/historical-observed-price-envelope.mjs data/fixtures/historical-observed-price-envelope.v1.json tests/historical-observed-price-envelope.test.mjs
git commit -m "fix: resolve Scan VAT state from archived toggle evidence"
```

---

### Task 7: Movement derivation

**Files:**
- Create: `lib/historical-movement-explanations.mjs`
- Test: `tests/historical-movement-explanations.test.mjs`

**Interfaces:**
- Consumes: normalised observation records from `lib/historical-observed-price-envelope.mjs`.
- Produces: `deriveHistoricalMovements(observations)` → array of
  `{ movement_id, mpn, from, to, delta_minor, delta_basis_points, comparison_basis, vat_state_from, vat_state_to, vat_disclosure_required }`
  where `from`/`to` are `{ observation_id, observed_at, seller, amount_minor }` and `comparison_basis` is `"within_seller" | "cross_seller"`.

Rule: for each MPN, prefer the widest-separated within-seller pair. Emit a cross-seller pair only when no within-seller pair exists for that MPN. `delta_basis_points` is integer, computed as `Math.round((to - from) * 10000 / from)` — integer arithmetic only, no float money.

- [ ] **Step 1: Write the failing test**

```javascript
// append to tests/historical-movement-explanations.test.mjs
import { deriveHistoricalMovements } from "../lib/historical-movement-explanations.mjs";

const obs = (id, at, mpn, seller, amount, vat) => ({
  observation_id: id, observed_at: at, mpn, seller_display_name: seller,
  seller_legal_name: null, amount_minor: amount, currency: "GBP",
  vat_included: vat, capture_kind: "archive_capture", source_file: "t.json",
});

test("a within-seller pair is preferred and marked", () => {
  const [movement] = deriveHistoricalMovements([
    obs("a", "2023-01-28T07:42:17Z", "CT2K16G56C46U5", "Crucial UK", 14879, true),
    obs("b", "2023-08-15T14:08:13Z", "CT2K16G56C46U5", "Crucial UK", 9239, true),
  ]);
  assert.equal(movement.comparison_basis, "within_seller");
  assert.equal(movement.from.amount_minor, 14879);
  assert.equal(movement.to.amount_minor, 9239);
  assert.equal(movement.delta_minor, -5640);
  assert.equal(movement.delta_basis_points, -3791);
  assert.equal(movement.vat_disclosure_required, false);
});

test("a cross-seller pair is emitted only as a disclosed fallback", () => {
  const [movement] = deriveHistoricalMovements([
    obs("a", "2025-06-19T06:37:21Z", "KF564C32RSK2-32", "CCL Computers", 11399, true),
    obs("b", "2026-08-09T23:43:37Z", "KF564C32RSK2-32", "KingstonMemoryShop", 62026, true),
  ]);
  assert.equal(movement.comparison_basis, "cross_seller");
  assert.equal(movement.delta_basis_points, 44414);
});

test("an unresolved VAT state at either end requires disclosure", () => {
  const [movement] = deriveHistoricalMovements([
    obs("a", "2022-07-03T17:34:38Z", "CMK32GX5M2B6000C36", "Scan Computers", 27548, null),
    obs("b", "2023-03-15T07:59:07Z", "CMK32GX5M2B6000C36", "Scan Computers", 13000, null),
  ]);
  assert.equal(movement.comparison_basis, "within_seller");
  assert.equal(movement.vat_disclosure_required, true);
  assert.equal(movement.vat_state_from, "unresolved");
});

test("a single observation for an MPN yields no movement", () => {
  assert.deepEqual(deriveHistoricalMovements([obs("a", "2024-01-01T00:00:00Z", "X", "Box", 100, true)]), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/historical-movement-explanations.test.mjs`
Expected: FAIL — `Cannot find module '../lib/historical-movement-explanations.mjs'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// lib/historical-movement-explanations.mjs
function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const vatLabel = (value) => (value === null ? "unresolved" : value ? "included" : "excluded");

function widestPair(records) {
  const sorted = records.slice().sort((a, b) => a.observed_at.localeCompare(b.observed_at));
  return [sorted[0], sorted.at(-1)];
}

function toEndpoint(record) {
  return {
    observation_id: record.observation_id,
    observed_at: record.observed_at,
    seller: record.seller_display_name,
    amount_minor: record.amount_minor,
  };
}

export function deriveHistoricalMovements(observations) {
  const byMpn = new Map();
  for (const record of observations) {
    if (!byMpn.has(record.mpn)) byMpn.set(record.mpn, []);
    byMpn.get(record.mpn).push(record);
  }

  const movements = [];
  for (const mpn of [...byMpn.keys()].sort()) {
    const records = byMpn.get(mpn);
    if (records.length < 2) continue;

    const bySeller = new Map();
    for (const record of records) {
      if (!bySeller.has(record.seller_display_name)) bySeller.set(record.seller_display_name, []);
      bySeller.get(record.seller_display_name).push(record);
    }

    const withinCandidates = [...bySeller.keys()].sort().map((s) => bySeller.get(s)).filter((r) => r.length >= 2);

    let pair;
    let basis;
    if (withinCandidates.length > 0) {
      // Prefer the within-seller line with the widest time separation.
      let best = null;
      for (const candidate of withinCandidates) {
        const [from, to] = widestPair(candidate);
        const span = Date.parse(to.observed_at) - Date.parse(from.observed_at);
        if (best === null || span > best.span) best = { span, pair: [from, to] };
      }
      pair = best.pair;
      basis = "within_seller";
    } else {
      pair = widestPair(records);
      basis = "cross_seller";
    }

    const [from, to] = pair;
    invariant(from.amount_minor > 0, "from amount must be positive");
    movements.push({
      movement_id: `movement-${mpn.toLowerCase()}-${from.observation_id}-${to.observation_id}`,
      mpn,
      from: toEndpoint(from),
      to: toEndpoint(to),
      delta_minor: to.amount_minor - from.amount_minor,
      delta_basis_points: Math.round(((to.amount_minor - from.amount_minor) * 10000) / from.amount_minor),
      comparison_basis: basis,
      vat_state_from: vatLabel(from.vat_included),
      vat_state_to: vatLabel(to.vat_included),
      vat_disclosure_required: from.vat_included === null || to.vat_included === null,
    });
  }
  return movements;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/historical-movement-explanations.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/historical-movement-explanations.mjs tests/historical-movement-explanations.test.mjs
git commit -m "feat: derive movements with explicit comparison basis and VAT disclosure"
```

---

## Phase B — Acquisition wave (research, not code)

### Task 8: Bounded read-only acquisition wave

**Files:**
- Create: `data/observations/candidate/uk-primary-retail-historical-backfill-<UTC timestamp>.v1.json` (Family B schema — match `uk-primary-retail-historical-backfill-2026-08-10T065616Z.v1.json` exactly)
- Create: `research/evidence/historical-primary-retail-backfill-2026-08-10-wave3/ledger.v1.json`
- Create: `research/evidence/historical-primary-retail-backfill-2026-08-10-wave3/manifest.json`

**Interfaces:**
- Consumes: nothing from code tasks.
- Produces: new observation files that Task 9 adds to `ELIGIBLE_TRANCHES`.

This task is orchestrated by the parent, not by a coding subagent. It dispatches three bounded read-only workers.

- [ ] **Step 1: Confirm no prospective collision**

Verify the canonical collector is not mid-run and that no worker brief permits fetching a live or current retailer offer. Archive and dated-editorial retrieval only.

- [ ] **Step 2: Dispatch three read-only workers in parallel**

Each brief must state verbatim: return reproducible evidence candidates only; do not write project files; do not fetch live or current retailer offers; do not infer a price from a search snippet, an MSRP, a discount percentage, a graph shape or a neighbouring product; where the exact MPN is not visible in captured bytes, hold the lead rather than guess.

Each returned candidate must carry: archive URL, archive capture timestamp, retrieval timestamp, exact MPN, seller display name, item price in GBP minor units, any visible VAT statement or display-mode indicator, availability text where visible, and a minimal factual quotation.

- Worker A — UK retailer archive sweep, 2021-Q4 to 2023, any 32GB (2×16) DDR5 desktop kit, across Scan, CCL, KingstonMemoryShop, Crucial UK, Overclockers UK, AWD-IT, Box, Novatech, Ebuyer.
- Worker B — same sweep, 2024 to 2026-08-08. Prioritise 2024, the worst gap in the coverage matrix.
- Worker C — archived DDR5 **category and listing pages** (highest density: one capture can yield many MPN/price pairs), plus URL-binding extraction for the three held KitGuru leads recorded in `research/evidence/historical-editorial-price-anchors-2026-08-10-wave2/anchors.v1.json`.

- [ ] **Step 3: Parent verification of every decisive lead**

For each candidate the parent intends to retain: independently re-fetch the archive URL, hash the response, confirm the exact MPN and price are both visible in the retrieved bytes, and record byte count and SHA-256. Reject anything unreproducible. Worker prose is not evidence.

- [ ] **Step 4: Write the tranche, ledger and manifest**

Use the Family B schema so Task 1's normaliser handles it without change. Set `governance` flags all `false`, `capture_basis.observed_at_semantics` to the archive-timestamp wording, and `historical_interval_values_derived: false`.

- [ ] **Step 5: Commit**

```bash
git add data/observations/candidate/ research/evidence/historical-primary-retail-backfill-2026-08-10-wave3/
git commit -m "research: retain verified wave three historical observations"
```

---

## Phase C — Integrate new evidence and explain movements

### Task 9: Re-derive the envelope over the expanded evidence

**Files:**
- Modify: `lib/historical-observed-price-envelope.mjs` (extend `ELIGIBLE_TRANCHES`)
- Modify: `data/fixtures/historical-observed-price-envelope.v1.json` (regenerate)
- Test: `tests/historical-observed-price-envelope.test.mjs`

**Interfaces:**
- Consumes: Task 8's tranche file; Task 4's `ELIGIBLE_TRANCHES` and render script.
- Produces: an updated golden fixture. No signature changes.

- [ ] **Step 1: Add the new tranche to `ELIGIBLE_TRANCHES`**

Append `{ file: "<Task 8 filename>", captureKind: "archive_capture" }` to the array in `lib/historical-observed-price-envelope.mjs`.

- [ ] **Step 2: Regenerate the golden fixture**

Run: `node scripts/render-historical-observed-price-envelope.mjs`
Expected: quarter count and observed-quarter count both increase.

- [ ] **Step 3: Run the full envelope suite**

Run: `node --test tests/historical-observed-price-envelope.test.mjs`
Expected: PASS. The byte-equality, dangling-id, quarter-membership and VAT-sum tests all still hold over the larger set.

- [ ] **Step 4: Commit**

```bash
git add lib/historical-observed-price-envelope.mjs data/fixtures/historical-observed-price-envelope.v1.json
git commit -m "feat: extend observed-price envelope with wave three evidence"
```

---

### Task 10: Retrospective explanation ledger

**Files:**
- Create: `research/evidence/historical-movement-explanations-2026-08-10/ledger.v1.json`
- Modify: `lib/historical-movement-explanations.mjs` (add `validateExplanationLedger`)
- Test: `tests/historical-movement-explanations.test.mjs`

**Interfaces:**
- Consumes: `deriveHistoricalMovements`.
- Produces: `validateExplanationLedger(ledger, movements)` → throws on violation, returns `{ movement_count, explanation_count }` on success.

Forbidden fields, rejected on sight anywhere in an explanation record: `amount_minor`, `price`, `weight`, `link_factor`, `deflator`, `reference_period`, `imputed_value`, `gap_fill`.

Allowed `causal_language_level` values: `descriptive`, `temporal_association`, `contributory_hypothesis`. Anything higher is rejected.

- [ ] **Step 1: Write the failing test**

```javascript
// append to tests/historical-movement-explanations.test.mjs
import { validateExplanationLedger } from "../lib/historical-movement-explanations.mjs";

const movement = {
  movement_id: "m1", mpn: "X",
  from: { observation_id: "a", observed_at: "2023-01-28T07:42:17Z", seller: "Crucial UK", amount_minor: 14879 },
  to: { observation_id: "b", observed_at: "2023-08-15T14:08:13Z", seller: "Crucial UK", amount_minor: 9239 },
  delta_minor: -5640, delta_basis_points: -3791, comparison_basis: "within_seller",
  vat_state_from: "included", vat_state_to: "included", vat_disclosure_required: false,
};

const explanation = (overrides = {}) => ({
  explanation_id: "e1",
  movement_id: "m1",
  published_at: "2023-06-01T00:00:00Z",
  publisher: "Example Trade Press",
  url: "https://example.invalid/report",
  response_sha256: "0".repeat(64),
  response_bytes: 1234,
  minimal_quote: "Memory makers cut output through the first half of the year.",
  proposed_mechanism: "Reported oversupply and inventory correction may have reduced consumer kit prices.",
  causal_language_level: "contributory_hypothesis",
  counterevidence_search: { performed: true, result: "none_identified", searched_at: "2026-08-10T00:00:00Z" },
  ...overrides,
});

test("a well-formed ledger validates", () => {
  const result = validateExplanationLedger({ movements: [movement], explanations: [explanation()] }, [movement]);
  assert.deepEqual(result, { movement_count: 1, explanation_count: 1 });
});

test("an explanation carrying a numeric override is rejected", () => {
  assert.throws(
    () => validateExplanationLedger({ movements: [movement], explanations: [explanation({ amount_minor: 100 })] }, [movement]),
    /forbidden numeric field/,
  );
});

test("causal language above contributory_hypothesis is rejected", () => {
  assert.throws(
    () => validateExplanationLedger({ movements: [movement], explanations: [explanation({ causal_language_level: "causal_conclusion" })] }, [movement]),
    /causal_language_level/,
  );
});

test("a missing counterevidence search is rejected", () => {
  assert.throws(
    () => validateExplanationLedger({ movements: [movement], explanations: [explanation({ counterevidence_search: { performed: false } })] }, [movement]),
    /counterevidence search/,
  );
});

test("claiming no counterevidence exists is rejected; only none_identified is permitted", () => {
  assert.throws(
    () => validateExplanationLedger(
      { movements: [movement], explanations: [explanation({ counterevidence_search: { performed: true, result: "none_exists", searched_at: "2026-08-10T00:00:00Z" } })] },
      [movement],
    ),
    /counterevidence search/,
  );
});

test("an explanation referencing an unknown movement is rejected", () => {
  assert.throws(
    () => validateExplanationLedger({ movements: [movement], explanations: [explanation({ movement_id: "nope" })] }, [movement]),
    /unknown movement/,
  );
});

test("ledger movements must match derived movements exactly", () => {
  const drifted = { ...movement, delta_minor: -1 };
  assert.throws(() => validateExplanationLedger({ movements: [drifted], explanations: [] }, [movement]), /movement drift/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/historical-movement-explanations.test.mjs`
Expected: FAIL — `validateExplanationLedger is not a function`

- [ ] **Step 3: Write minimal implementation**

```javascript
// append to lib/historical-movement-explanations.mjs
const FORBIDDEN_FIELDS = new Set([
  "amount_minor", "price", "weight", "link_factor",
  "deflator", "reference_period", "imputed_value", "gap_fill",
]);

const ALLOWED_CAUSAL_LEVELS = new Set(["descriptive", "temporal_association", "contributory_hypothesis"]);

export function validateExplanationLedger(ledger, derivedMovements) {
  invariant(ledger && Array.isArray(ledger.movements), "ledger.movements must be an array");
  invariant(Array.isArray(ledger.explanations), "ledger.explanations must be an array");

  const derivedById = new Map(derivedMovements.map((m) => [m.movement_id, m]));
  for (const recorded of ledger.movements) {
    const derived = derivedById.get(recorded.movement_id);
    invariant(derived, `movement drift: ${recorded.movement_id} is not derivable from observations`);
    invariant(
      JSON.stringify(recorded) === JSON.stringify(derived),
      `movement drift: ${recorded.movement_id} does not match derived values`,
    );
  }

  const knownMovements = new Set(ledger.movements.map((m) => m.movement_id));
  for (const explanation of ledger.explanations) {
    for (const field of Object.keys(explanation)) {
      invariant(!FORBIDDEN_FIELDS.has(field), `forbidden numeric field on explanation: ${field}`);
    }
    invariant(knownMovements.has(explanation.movement_id), `unknown movement: ${explanation.movement_id}`);
    invariant(
      ALLOWED_CAUSAL_LEVELS.has(explanation.causal_language_level),
      `causal_language_level not permitted: ${explanation.causal_language_level}`,
    );
    const search = explanation.counterevidence_search;
    invariant(
      search && search.performed === true && typeof search.searched_at === "string" &&
        (search.result === "none_identified" || search.result === "counterevidence_recorded"),
      `counterevidence search missing or invalid for ${explanation.explanation_id}`,
    );
    invariant(typeof explanation.response_sha256 === "string" && explanation.response_sha256.length === 64, "response_sha256 must be a 64-character digest");
    invariant(typeof explanation.minimal_quote === "string" && explanation.minimal_quote.length > 0, "minimal_quote required");
  }

  return { movement_count: ledger.movements.length, explanation_count: ledger.explanations.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/historical-movement-explanations.test.mjs`
Expected: PASS, 12 tests.

- [ ] **Step 5: Populate the real ledger**

Derive movements from the repository observations. For each movement the parent chooses to explain, research dated reportable sources, re-fetch and hash each one, and record it with a `contributory_hypothesis` cap and a genuine counterevidence search. The AI-datacentre-demand and global-shortage hypotheses for the 2026 surge are candidates to be evidenced and challenged, not conclusions to confirm. `none_identified` is permitted; `none_exists` is not.

Write the result to `research/evidence/historical-movement-explanations-2026-08-10/ledger.v1.json` with `governance` flags all `false`, then add a test asserting the on-disk ledger validates against freshly derived movements.

- [ ] **Step 6: Commit**

```bash
git add lib/historical-movement-explanations.mjs research/evidence/historical-movement-explanations-2026-08-10/ tests/historical-movement-explanations.test.mjs
git commit -m "feat: add retrospective movement explanation ledger"
```

---

### Task 11: Numeric immutability proof and integration

**Files:**
- Test: `tests/historical-movement-explanations.test.mjs`
- Modify: `research/HISTORICAL-SOURCE-COVERAGE-2026-08-10.md`, `.planning/STATE.md`, `.planning/HANDOFF.json`

**Interfaces:**
- Consumes: everything. Produces no new exports.

- [ ] **Step 1: Write the numeric-immutability test**

```javascript
// append to tests/historical-movement-explanations.test.mjs
import { createHash } from "node:crypto";
import { buildEnvelopeFromRepository, canonicalEnvelopeBytes } from "../lib/historical-observed-price-envelope.mjs";

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

test("mutating the explanation ledger leaves every envelope byte unchanged", async () => {
  const before = sha256(canonicalEnvelopeBytes(buildEnvelopeFromRepository(root)));
  const ledger = await readJson("research/evidence/historical-movement-explanations-2026-08-10/ledger.v1.json");
  const mutated = structuredClone(ledger);
  mutated.explanations.push({ explanation_id: "transient", movement_id: mutated.movements[0].movement_id });
  mutated.explanations.pop();
  const after = sha256(canonicalEnvelopeBytes(buildEnvelopeFromRepository(root)));
  assert.equal(after, before);
});

test("the sparse graph fixture is unchanged by this work", async () => {
  const graph = await readJson("data/fixtures/historical-exact-mpn-sparse-graph.v1.json");
  assert.equal(graph.render_contract.connect_points, false);
  assert.equal(graph.render_contract.interpolate, false);
  assert.equal(graph.render_contract.aggregate_across_products, false);
});
```

- [ ] **Step 2: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS. Baseline before this plan was 146 tests; this plan adds roughly 38, so expect approximately 184. Treat the count as a sanity check, not an exact assertion.

- [ ] **Step 3: Run the standing verification bar**

Run: `npm run lint && npx tsc --noEmit && npm run build && npm run test:db && git diff --check`
Expected: all pass. Delete any generated `tsconfig.tsbuildinfo` before committing — check `git status`.

- [ ] **Step 4: Update the governing records**

In `research/HISTORICAL-SOURCE-COVERAGE-2026-08-10.md`, add a section recording envelope quarter coverage, observed-vs-gap quarter counts, and the wave-three acquisition result.

In `.planning/STATE.md`, add a wave entry with real verification counts.

In `.planning/HANDOFF.json`: set `handoff_state`, update `retained_evidence` counts, add a `historical_wave_3` entry, refresh `verification`, and **correct `verification.wave_2_commit` from the dangling `a58ea71` to the reachable `dfcca73`** (the original was left unreachable by a commit amend).

- [ ] **Step 5: Commit**

```bash
git add tests/historical-movement-explanations.test.mjs research/HISTORICAL-SOURCE-COVERAGE-2026-08-10.md .planning/STATE.md .planning/HANDOFF.json
git commit -m "docs: integrate historical context band into governing records"
```

---

## Self-Review

**Spec coverage.** Three-layer architecture → Tasks 3, 4, 9 (envelope + scatter data; the sparse graph is untouched per Task 11 Step 1). Derived-not-authored data flow → Task 4. Quarter grain → Task 2. Eligibility and marketplace exclusion → Tasks 1, 4. Per-period record → Task 3. No thresholds → Task 3 (`minimum_observation_threshold: null`) and the Global Constraints. Cross-seller relaxation → Tasks 6, 7. VAT relaxation and disclosure → Tasks 1, 3, 5, 6. VAT determination method → Task 6. Governance record → Task 6. Acquisition wave → Task 8. Explanation ledger → Task 10. Fail-closed rules → Tasks 1, 5, 10. Testing → Tasks 5, 10, 11. Open items → Task 11 Step 4 covers the dangling SHA; the collector-schedule check is Task 8 Step 1; Scan display-mode review is recorded as a known cost in Task 6 rather than resolved here, which matches the spec.

**Placeholder scan.** No TBDs, no "add appropriate error handling", no "similar to Task N". Every code step carries runnable code. Task 8 and Task 10 Step 5 are research steps whose output cannot be pre-written; both specify exact schema, exact constraints and exact acceptance criteria instead.

**Type consistency.** `normaliseObservation` returns `seller_display_name`; Tasks 3 and 7 both read `seller_display_name` and expose it outward as `seller`. `vat_included` is `true|false|null` throughout the envelope path; `deriveHistoricalMovements` converts it to the string labels `included|excluded|unresolved` only at its own output boundary, and its tests assert that conversion. `canonicalEnvelopeBytes` is defined in Task 4 and reused unchanged in Tasks 5, 9 and 11. `ELIGIBLE_TRANCHES` is defined in Task 4 and extended (not redefined) in Task 9. `quarterIdForTimestamp` is imported into the test file in Task 2 and reused in Task 5.

**Known ordering constraint.** Task 9 depends on Task 8 producing a file; if the acquisition wave returns nothing admissible, Task 9 is a no-op and Tasks 10–11 proceed over the existing 18 observations. The plan is still complete in that case, with a thinner band — which the evidence counts will state honestly.
