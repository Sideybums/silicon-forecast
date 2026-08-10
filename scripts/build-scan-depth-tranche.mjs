// Turns the raw Scan harvest into an immutable candidate observation tranche
// plus its evidence ledger. Applies two corrections identified while auditing
// the raw records, both recorded explicitly rather than applied silently.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const here = new URL("./", import.meta.url);
const repo = new URL("file:///Users/weetoddy/Desktop/Projects/Silicon_Forecast/");

// Scan uses 99999.99 as a placeholder for an unorderable product. It is not a
// price. Availability alone does not identify these — at least one such record
// reads "In stock" — so an explicit ceiling is required. No 32GB DDR5 kit has
// ever approached GBP 5,000; the threshold sits far above any real observation.
const SENTINEL_MINOR = 999900;

const raw = JSON.parse(readFileSync(new URL("scan-harvest.json", here), "utf8")).results;

// Capacity and module count are properties of the MPN, not of a capture. Scan
// dropped the description heading from its template around 2024, so later
// captures show "32GB ... DDR5" in the title but not "(2x16GB)". Establish the
// kit shape once per MPN from any capture that states it in visible text, then
// carry it across that MPN's other captures with the basis recorded. An MPN no
// capture ever describes stays unresolved and is not retained.
const shapeByMpn = new Map();
for (const r of raw) {
  if (r.mpn && r.capacity_gb === 32 && r.module_count === 2) {
    if (!shapeByMpn.has(r.mpn)) shapeByMpn.set(r.mpn, { capacity_gb: 32, module_count: 2, evidence_timestamp: r.timestamp });
  }
}

const kept = [];
const rejected = [];

for (const r of raw) {
  const reject = (code) => rejected.push({ timestamp: r.timestamp, mpn: r.mpn ?? null, url: r.original, code });

  if (!r.mpn) { reject("MPN_NOT_VISIBLE"); continue; }
  if (!r.amount_minor) { reject("PRICE_NOT_VISIBLE"); continue; }
  if (r.amount_minor >= SENTINEL_MINOR) { reject("SENTINEL_PLACEHOLDER_PRICE"); continue; }
  if (r.vat_included !== true && r.vat_included !== false) { reject("VAT_DISPLAY_MODE_NOT_VISIBLE"); continue; }
  if (!/DDR5/i.test(`${r.title} ${r.description}`)) { reject("DDR5_NOT_CONFIRMED_IN_VISIBLE_TEXT"); continue; }

  const onPage = r.capacity_gb === 32 && r.module_count === 2;
  const shape = shapeByMpn.get(r.mpn);
  if (!onPage && !shape) { reject("KIT_SHAPE_NEVER_ESTABLISHED_FOR_MPN"); continue; }

  kept.push({
    ...r,
    capacity_gb: 32,
    module_count: 2,
    capacity_basis: onPage ? "visible_on_page" : "established_from_sibling_capture",
    capacity_basis_reference: onPage ? null : shape.evidence_timestamp,
  });
}

// Two Scan captures were already retained by an earlier wave. Retaining them
// again would double-count the same evidence in any derived range, so they are
// excluded here and the earlier immutable records remain authoritative. Their
// prices were independently reproduced by this harvest, which is why the
// exclusion is a de-duplication rather than a conflict.
const alreadyRetained = new Set();
for (const file of [
  "uk-primary-retail-historical-backfill-2026-08-10T065616Z.v1.json",
  "uk-primary-retail-historical-backfill-2026-08-10T130500Z.v1.json",
  "uk-primary-retail-historical-backfill-2026-08-09T145021Z.v1.json",
  "uk-primary-retail-historical-backfill-2026-08-10T040544Z.v1.json",
  "uk-primary-retail-2026-08-09T122437Z.v1.json",
  "uk-primary-retail-2026-08-09T234337Z.v1.json",
]) {
  const parsed = JSON.parse(readFileSync(new URL(`data/observations/candidate/${file}`, repo), "utf8"));
  for (const o of parsed.observations) {
    const mpn = o.product?.mpn ?? o.identity?.mpn_observed;
    if (o.seller.display_name === "Scan Computers" && mpn) alreadyRetained.add(`${mpn}|${o.observed_at}`);
  }
}

const iso = (ts) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}Z`;

// One observation per MPN per capture timestamp.
const byId = new Map();
for (const k of kept) {
  const id = `sf-hist-scan-${k.mpn.toLowerCase()}-${k.timestamp}`;
  if (alreadyRetained.has(`${k.mpn}|${iso(k.timestamp)}`)) {
    rejected.push({ timestamp: k.timestamp, mpn: k.mpn, url: k.original, code: "ALREADY_RETAINED_BY_EARLIER_WAVE" });
    continue;
  }
  if (!byId.has(id)) byId.set(id, { id, ...k });
}
const rows = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const observations = rows.map((k) => ({
  observation_id: k.id,
  observed_at: iso(k.timestamp),
  product: { mpn: k.mpn, capacity_gb: 32, module_count: 2, memory_type: "DDR5" },
  source: {
    source_key: "scan-uk-wayback-product-page",
    display_name: "Archived Scan Computers product page",
    source_class: "archived_primary_retail_storefront",
    evidence_id: `sf-wayback-scan-${k.mpn.toLowerCase()}-${k.timestamp}`,
  },
  seller: { display_name: "Scan Computers", legal_name: null, legal_name_state: "not_established_from_retained_extract" },
  price: { item_price_minor: k.amount_minor, currency: "GBP", vat_included: k.vat_included, delivery_minor: null, landed_price_minor: null },
  availability: { state: k.availability ? "stated_at_capture" : "unknown", raw_text: k.availability ?? null },
  eligibility: {
    identity_exact: true,
    capacity_basis: k.capacity_basis,
    capacity_basis_reference: k.capacity_basis_reference,
    historical_item_price_retained: true,
    landed_price_eligible: false,
    reason_codes: ["SELLER_LEGAL_NAME_UNRESOLVED", "DELIVERY_UNRESOLVED", "SOURCE_UNAPPROVED"],
  },
}));

const ledger = rows.map((k) => ({
  evidence_id: `sf-wayback-scan-${k.mpn.toLowerCase()}-${k.timestamp}`,
  archive_url: `https://web.archive.org/web/${k.timestamp}id_/${k.original}`,
  original_url: k.original,
  archive_captured_at: iso(k.timestamp),
  retrieved_at: "2026-08-10T17:30:00Z",
  http_status: k.http_status,
  response_bytes: k.response_bytes,
  response_sha256: k.response_sha256,
  vat_determination: 'vatToggle control data-exvat attribute; "false" means the rendered price includes VAT',
  identity_determination: 'schema.org itemprop="mpn" cross-checked against the visible "Manufacturer code:" label; never itemprop="sku", which is Scan\'s internal stock code',
  capacity_determination: k.capacity_basis,
  facts: { mpn: k.mpn, capacity_gb: 32, module_count: 2, item_price_minor: k.amount_minor, currency: "GBP", vat_included: k.vat_included },
  minimal_quote: `${k.title} — ${k.description || "(description heading absent in this template)"} — Manufacturer code: ${k.mpn} — GBP ${(k.amount_minor / 100).toFixed(2)}`.slice(0, 300),
}));

const stamp = "2026-08-10T173000Z";
const tranche = {
  schema_version: 1,
  tranche_id: `sf-gb-historical-primary-retail-scan-depth-${stamp}-v1`,
  status: "candidate_private_immutable",
  scope: "candidate_only_historical_backfill",
  created_at: "2026-08-10T17:30:00Z",
  observation_count: observations.length,
  evidence_ledger: "research/evidence/historical-primary-retail-scan-depth-2026-08-10/ledger.v1.json",
  capture_basis: {
    observed_at_semantics: "Internet Archive capture timestamp; not asserted retailer price-change time",
    acquisition_method: "Every archived capture of every Scan 32GB (2x16GB) DDR5 product URL, one per URL per calendar month. Chosen to build same-seller same-MPN depth through time rather than breadth at a single instant.",
    identity_determination: 'schema.org itemprop="mpn" cross-checked against the visible "Manufacturer code:" label',
    vat_determination: "vatToggle data-exvat attribute",
    corrections_applied: [
      {
        correction: "sentinel_placeholder_prices_excluded",
        detail: "Scan renders 99999.99 for unorderable products. Availability does not identify these reliably; at least one such capture reads 'In stock'. Any price at or above GBP 9999.00 is rejected as a placeholder.",
      },
      {
        correction: "kit_shape_established_per_mpn",
        detail: "Scan removed the description heading from its product template around 2024, so later captures state 32GB and DDR5 in the title but not the 2x16GB module count. Kit shape is established once per MPN from a capture that states it in visible text and carried across that MPN's other captures. Each observation records whether its basis was visible_on_page or established_from_sibling_capture. URL slugs were never used.",
      },
    ],
    historical_interval_values_derived: false,
    gaps_preserved: true,
  },
  observations,
  governance: {
    source_approved: false,
    methodology_approved: false,
    index_eligible: false,
    production_eligible: false,
    publication_eligible: false,
    public_claim_approved: false,
  },
};

const ledgerDoc = {
  schema_version: 1,
  ledger_id: `sf-historical-primary-retail-scan-depth-${stamp}-v1`,
  status: "candidate_private_immutable",
  created_at: "2026-08-10T17:30:00Z",
  acquisition: "Deterministic script-driven harvest. Every capture was fetched and parsed by the same code path; no model read any page.",
  entry_count: ledger.length,
  rejected_count: rejected.length,
  rejection_reasons: rejected.reduce((a, r) => { a[r.code] = (a[r.code] || 0) + 1; return a; }, {}),
  entries: ledger,
  authority: { source_approved: false, methodology_approved: false, index_eligible: false, production_eligible: false, publication_eligible: false },
};

writeFileSync(new URL(`data/observations/candidate/uk-primary-retail-scan-depth-${stamp}.v1.json`, repo), `${JSON.stringify(tranche, null, 2)}\n`);
mkdirSync(new URL("research/evidence/historical-primary-retail-scan-depth-2026-08-10/", repo), { recursive: true });
writeFileSync(new URL("research/evidence/historical-primary-retail-scan-depth-2026-08-10/ledger.v1.json", repo), `${JSON.stringify(ledgerDoc, null, 2)}\n`);

console.log(`raw records:     ${raw.length}`);
console.log(`retained:        ${observations.length}`);
console.log(`rejected:        ${rejected.length}`);
console.log(`rejection mix:   ${JSON.stringify(ledgerDoc.rejection_reasons)}`);
console.log(`distinct MPNs:   ${new Set(observations.map((o) => o.product.mpn)).size}`);
console.log(`capacity basis:  ${JSON.stringify(observations.reduce((a, o) => { a[o.eligibility.capacity_basis] = (a[o.eligibility.capacity_basis] || 0) + 1; return a; }, {}))}`);
