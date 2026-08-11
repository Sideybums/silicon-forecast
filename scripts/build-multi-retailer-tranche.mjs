// Turns the raw multi-retailer harvest into an immutable candidate observation
// tranche plus its evidence ledger, covering CCL Online, AWD-IT, Novatech and
// Overclockers UK. Counterpart to build-scan-depth-tranche.mjs.
//
// Every correction identified while auditing the raw records is recorded here
// explicitly rather than applied silently.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const repo = new URL("../", import.meta.url);
const harvestFile = process.argv[2];
if (!harvestFile) {
  process.stderr.write("usage: build-multi-retailer-tranche.mjs <multi-harvest.json>\n");
  process.exit(2);
}

// Same placeholder rule as the Scan tranche. No 32GB DDR5 kit has approached
// GBP 5,000; the ceiling sits far above any real observation.
const SENTINEL_MINOR = 999900;

// Seller display names must match those already used in the repository. The
// harvest keys OCUK as "ocuk", and naming it "Overclockers" would have split
// one retailer into two sellers — enough for a single seller to look like
// corroboration of itself in any cross-retailer comparison.
const SELLERS = {
  ccl: {
    display_name: "CCL Online",
    source_key: "ccl-uk-wayback-product-page",
    identity_determination:
      'visible part-number heading (id="pnlPartNumber"), cross-checked against the JSON-LD "mpn"; a disagreement between the two is rejected rather than resolved',
    vat_determination:
      'the "inc VAT" label rendered inline immediately after the displayed price inside pnlPriceText; the page-header TaxSwitch control is deliberately NOT used, because its label is ambiguous between the current mode and the switch target',
  },
  awdit: {
    display_name: "AWD-IT",
    source_key: "awdit-uk-wayback-product-page",
    identity_determination:
      'the manufacturer part number rendered as the product title suffix, accepted only when the URL slug independently carries the same token; never itemprop="sku", which is AWD-IT\'s own stock code (e.g. 173-B87-AF9)',
    vat_determination:
      "the VAT-inclusive and VAT-exclusive price elements sharing one product id, reconciled against each other at the 20% rate; Magento renders finalPrice inclusive beside basePrice exclusive",
  },
  novatech: {
    display_name: "Novatech",
    source_key: "novatech-uk-wayback-product-page",
    identity_determination: 'schema.org itemprop="mpn" meta content',
    vat_determination:
      'the visible "inc vat" wording, confirmed per capture by checking the separately stated ex-VAT figure against the recorded price at the 20% rate',
  },
  ocuk: {
    display_name: "Overclockers UK",
    source_key: "ocuk-uk-wayback-product-page",
    identity_determination:
      'JSON-LD "mpn"; never "sku", which is Overclockers\' own stock code (e.g. MY-008-GI) and also forms the URL suffix',
    vat_determination:
      'the price-incl-vat-info element rendering "(incl. VAT)" adjacent to the displayed price inside the product CTA box',
  },
};

const raw = JSON.parse(readFileSync(harvestFile, "utf8")).results;

const kept = [];
const rejected = [];
for (const r of raw) {
  const reject = (code) => rejected.push({ retailer: r.retailer, timestamp: r.timestamp, mpn: r.mpn ?? null, url: r.original, code });

  if ((r.reasons ?? []).length) { reject(r.reasons[0]); continue; }
  if (!r.mpn) { reject("MPN_NOT_VISIBLE"); continue; }
  if (!r.amount_minor) { reject("PRICE_NOT_VISIBLE"); continue; }
  if (r.amount_minor >= SENTINEL_MINOR) { reject("SENTINEL_PLACEHOLDER_PRICE"); continue; }
  if (r.vat_included !== true && r.vat_included !== false) { reject("VAT_DISPLAY_MODE_NOT_VISIBLE"); continue; }
  if (r.capacity_gb !== 32 || r.module_count !== 2) { reject("KIT_SHAPE_NOT_VISIBLE"); continue; }
  if (!/DDR5/i.test(r.title ?? "")) { reject("DDR5_NOT_CONFIRMED_IN_VISIBLE_TEXT"); continue; }
  kept.push(r);
}

const iso = (ts) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}Z`;

// Earlier waves already retained some Novatech and Overclockers captures.
// Retaining them again would double-count the same evidence, and would also let
// one seller appear twice inside a single cross-seller comparison.
const alreadyRetained = new Set();
for (const file of [
  "uk-primary-retail-historical-backfill-2026-08-09T145021Z.v1.json",
  "uk-primary-retail-historical-backfill-2026-08-10T040544Z.v1.json",
  "uk-primary-retail-historical-backfill-2026-08-10T065616Z.v1.json",
  "uk-primary-retail-historical-backfill-2026-08-10T130500Z.v1.json",
  "uk-primary-retail-scan-depth-2026-08-10T173000Z.v1.json",
  "uk-primary-retail-2026-08-09T122437Z.v1.json",
  "uk-primary-retail-2026-08-09T234337Z.v1.json",
  "uk-primary-retail-2026-08-10T165537Z.v1.json",
  "amazon-uk-2026-08-06T103140Z.v1.json",
]) {
  const parsed = JSON.parse(readFileSync(new URL(`data/observations/candidate/${file}`, repo), "utf8"));
  for (const o of parsed.observations ?? []) {
    const mpn = o.product?.mpn ?? o.identity?.mpn_observed ?? o.item?.mpn;
    const at = o.observed_at ?? o.captured_at;
    if (mpn && at) alreadyRetained.add(`${o.seller?.display_name}|${mpn}|${at}`);
  }
}

const byId = new Map();
for (const k of kept) {
  const seller = SELLERS[k.retailer];
  const at = iso(k.timestamp);
  if (alreadyRetained.has(`${seller.display_name}|${k.mpn}|${at}`)) {
    rejected.push({ retailer: k.retailer, timestamp: k.timestamp, mpn: k.mpn, url: k.original, code: "ALREADY_RETAINED_BY_EARLIER_WAVE" });
    continue;
  }
  const id = `sf-hist-${k.retailer}-${k.mpn.toLowerCase()}-${k.timestamp}`;
  if (!byId.has(id)) byId.set(id, { id, ...k });
}
const rows = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const observations = rows.map((k) => {
  const s = SELLERS[k.retailer];
  return {
    observation_id: k.id,
    observed_at: iso(k.timestamp),
    product: { mpn: k.mpn, capacity_gb: 32, module_count: 2, memory_type: "DDR5" },
    source: {
      source_key: s.source_key,
      display_name: `Archived ${s.display_name} product page`,
      source_class: "archived_primary_retail_storefront",
      evidence_id: `sf-wayback-${k.retailer}-${k.mpn.toLowerCase()}-${k.timestamp}`,
    },
    seller: { display_name: s.display_name, legal_name: null, legal_name_state: "not_established_from_retained_extract" },
    price: { item_price_minor: k.amount_minor, currency: "GBP", vat_included: k.vat_included, delivery_minor: null, landed_price_minor: null },
    availability: { state: k.availability ? "stated_at_capture" : "unknown", raw_text: k.availability ?? null },
    eligibility: {
      identity_exact: true,
      capacity_basis: "visible_on_page",
      capacity_basis_reference: null,
      historical_item_price_retained: true,
      landed_price_eligible: false,
      reason_codes: ["SELLER_LEGAL_NAME_UNRESOLVED", "DELIVERY_UNRESOLVED", "SOURCE_UNAPPROVED"],
    },
  };
});

const ledger = rows.map((k) => {
  const s = SELLERS[k.retailer];
  return {
    evidence_id: `sf-wayback-${k.retailer}-${k.mpn.toLowerCase()}-${k.timestamp}`,
    seller_display_name: s.display_name,
    archive_url: `https://web.archive.org/web/${k.timestamp}id_/${k.original}`,
    original_url: k.original,
    archive_captured_at: iso(k.timestamp),
    retrieved_at: "2026-08-11T00:00:00Z",
    http_status: k.http_status,
    response_bytes: k.response_bytes,
    response_sha256: k.response_sha256,
    vat_determination: s.vat_determination,
    identity_determination: s.identity_determination,
    capacity_determination: "visible_on_page",
    // Recorded where the capture showed a discount. Never substituted for the
    // price actually being asked.
    displayed_was_price_minor: k.was_price_minor ?? null,
    facts: { mpn: k.mpn, capacity_gb: 32, module_count: 2, item_price_minor: k.amount_minor, currency: "GBP", vat_included: k.vat_included },
    minimal_quote: `${k.title} — GBP ${(k.amount_minor / 100).toFixed(2)}`.slice(0, 300),
  };
});

const stamp = "2026-08-11T090000Z";
const sellerCounts = observations.reduce((a, o) => { a[o.seller.display_name] = (a[o.seller.display_name] || 0) + 1; return a; }, {});

const tranche = {
  schema_version: 1,
  tranche_id: `sf-gb-historical-primary-retail-multi-retailer-${stamp}-v1`,
  status: "candidate_private_immutable",
  scope: "candidate_only_historical_backfill",
  created_at: "2026-08-11T09:00:00Z",
  observation_count: observations.length,
  evidence_ledger: "research/evidence/historical-primary-retail-multi-retailer-2026-08-11/ledger.v1.json",
  capture_basis: {
    observed_at_semantics: "Internet Archive capture timestamp; not asserted retailer price-change time",
    acquisition_method:
      "Every archived capture of every CCL Online, AWD-IT, Novatech and Overclockers UK 32GB (2x16GB) DDR5 product URL, one per URL per calendar month. Chosen to widen the observed-price evidence beyond a single retailer while preserving same-MPN depth through time.",
    seller_counts: sellerCounts,
    corrections_applied: [
      {
        correction: "overclockers_sale_price_taken_from_price_current",
        detail:
          "On a discounted Overclockers product the CTA box renders a struck-through price-original followed by price-current. Reading the first figure in the box recorded the pre-discount price and biased every sale capture upward; 124 captures were affected and were caught by a cross-check against the box's own data-price attribute and the schema.org Offer. The current price is now read from its labelled element, and the was-price is retained as provenance only.",
      },
      {
        correction: "awdit_price_anchored_to_main_product",
        detail:
          "An AWD-IT product page carries roughly 200 price-including-tax elements, nearly all grid widgets for unrelated products, the first of which is a strikethrough old-price. Matching on that class alone read GBP 1399.99 for a GBP 239.99 memory kit. The main product is identified by itemprop=\"price\", which appears exactly once.",
      },
      {
        correction: "ccl_sold_out_pages_excluded",
        detail:
          "CCL renders a JSON-LD price on sold-out pages that display no price at all. A price nobody could have paid is not an observable offer, so a displayed figure is required. CCL's JSON-LD price also carries more precision than the figure displayed (101.64282 against a displayed GBP 101.64), so the displayed figure is authoritative and JSON-LD serves only as a cross-check.",
      },
      {
        correction: "overclockers_forum_pages_excluded",
        detail:
          "Domain-wide archive enumeration returned forums.overclockers.co.uk discussion threads whose titles contain '32GB (2x16GB) DDR5'. Discussion threads are not offers; only www product pages were harvested.",
      },
      {
        correction: "seller_display_name_aligned_with_existing_records",
        detail:
          "Overclockers captures are recorded as 'Overclockers UK', matching the name already used by earlier waves. Recording them as 'Overclockers' would have split one retailer into two sellers, allowing a single seller to appear as corroboration of itself in any cross-seller comparison.",
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
  ledger_id: `sf-historical-primary-retail-multi-retailer-${stamp}-v1`,
  status: "candidate_private_immutable",
  created_at: "2026-08-11T09:00:00Z",
  acquisition: "Deterministic script-driven harvest. Every capture was fetched and parsed by the same code path; no model read any page.",
  entry_count: ledger.length,
  rejected_count: rejected.length,
  rejection_reasons: rejected.reduce((a, r) => { a[r.code] = (a[r.code] || 0) + 1; return a; }, {}),
  entries: ledger,
  authority: { source_approved: false, methodology_approved: false, index_eligible: false, production_eligible: false, publication_eligible: false },
};

writeFileSync(new URL(`data/observations/candidate/uk-primary-retail-multi-retailer-${stamp}.v1.json`, repo), `${JSON.stringify(tranche, null, 2)}\n`);
mkdirSync(new URL("research/evidence/historical-primary-retail-multi-retailer-2026-08-11/", repo), { recursive: true });
writeFileSync(new URL("research/evidence/historical-primary-retail-multi-retailer-2026-08-11/ledger.v1.json", repo), `${JSON.stringify(ledgerDoc, null, 2)}\n`);

console.log(`raw records:   ${raw.length}`);
console.log(`retained:      ${observations.length}`);
console.log(`rejected:      ${rejected.length}`);
console.log(`rejection mix: ${JSON.stringify(ledgerDoc.rejection_reasons)}`);
console.log(`sellers:       ${JSON.stringify(sellerCounts)}`);
console.log(`distinct MPNs: ${new Set(observations.map((o) => o.product.mpn)).size}`);
