// Builds the durable registry of collection targets: which exact MPN to observe
// at which retailer, at which URL.
//
// Why this file needs to exist at all. Until now the collector's targets lived
// nowhere. The three URLs it fetched each run were present only inside past
// evidence extracts, so there was no artefact to widen, review, or hand to a
// future run — the target list existed only in whatever was orchestrating the
// fetch. This registry makes the target set an explicit, reviewable object.
//
// THIS IS NOT AN INDEX BASKET, and inclusion here selects nothing. What enters
// the index is decided at derivation time by the matched-model rule: a product
// contributes to a link only if it was observed in both periods. That is also
// why widening collection is safe — adding targets cannot bias the index, it
// can only add matched pairs. Basket, methodology and source approval all
// remain locked and untouched by this file.
//
// Every URL here is evidence-backed rather than guessed: each was seen in a real
// archived capture, or is currently being collected. None has been checked for
// whether it still resolves, because verifying a live retailer URL is a
// prospective fetch and the canonical collector is the sole prospective
// fetcher. Targets therefore carry an explicit unverified state for the
// collector to resolve on its first run.
import { readFileSync, writeFileSync } from "node:fs";

const repo = new URL("../", import.meta.url);
const load = (p) => JSON.parse(readFileSync(new URL(p, repo), "utf8"));

const targets = new Map();
const key = (mpn, seller) => `${mpn}|${seller}`;

// 1. Currently collected targets. These are known-good today and must survive
//    any widening, so they are added first and never overwritten.
const activeTranche = "data/observations/candidate/uk-primary-retail-2026-08-10T165537Z.v1.json";
for (const o of load(activeTranche).observations) {
  targets.set(key(o.identity.mpn_expected, o.seller.display_name), {
    mpn: o.identity.mpn_expected,
    seller_display_name: o.seller.display_name,
    seller_legal_name: o.seller.legal_name ?? null,
    url: o.source.source_url,
    source_key: o.source.source_key,
    last_observed_at: o.observed_at,
    provenance: "active_collection",
    url_state: "observed_live_by_canonical_collector",
  });
}

// 2. Archive-derived targets. Each URL was carrying the stated MPN at the
//    stated retailer when the Internet Archive captured it.
//
//    Both archive ledgers are read. An earlier version of this script used only
//    the multi-retailer ledger and therefore omitted Scan Computers entirely —
//    the single largest source in the project at 604 captures over 96 MPNs.
//    Scan's ledger predates the seller_display_name field, so its seller is
//    supplied here rather than read from the entry.
const SOURCE_KEYS = {
  "CCL Online": "ccl-uk-public-page",
  "AWD-IT": "awd-it-uk-public-page",
  Novatech: "novatech-uk-public-page",
  "Overclockers UK": "ocuk-uk-public-page",
  "Scan Computers": "scan-uk-public-page",
};
const archiveEntries = [
  ...load("research/evidence/historical-primary-retail-multi-retailer-2026-08-11/ledger.v1.json").entries,
  ...load("research/evidence/historical-primary-retail-scan-depth-2026-08-10/ledger.v1.json").entries.map((e) => ({
    ...e,
    seller_display_name: "Scan Computers",
  })),
];
for (const e of archiveEntries) {
  const k = key(e.facts.mpn, e.seller_display_name);
  const existing = targets.get(k);
  if (existing?.provenance === "active_collection") continue;
  // Keep the most recent capture's URL: retailers do re-slug product pages.
  if (existing && existing.last_observed_at >= e.archive_captured_at) continue;
  targets.set(k, {
    mpn: e.facts.mpn,
    seller_display_name: e.seller_display_name,
    seller_legal_name: null,
    url: e.original_url,
    source_key: SOURCE_KEYS[e.seller_display_name] ?? null,
    last_observed_at: e.archive_captured_at,
    provenance: "archived_capture",
    url_state: "unverified_pending_collector_check",
  });
}

const rows = [...targets.values()];

// Catalogue products carry a reviewed identity, so a target matching one is
// worth collecting ahead of a target that does not.
const catalogueMpns = new Set();
for (const file of ["ddr5-32gb-seed.v1.json", "ddr5-32gb-expansion.v1.json", "ddr5-32gb-diversification.v1.json"]) {
  for (const p of load(`data/catalogue/${file}`).products) catalogueMpns.add(p.mpn_normalized);
}

// Retailers offering the same MPN are what make a cross-retailer comparison
// possible at all, so breadth on a shared MPN is worth more than another
// single-retailer product.
const retailersPerMpn = new Map();
for (const r of rows) retailersPerMpn.set(r.mpn, (retailersPerMpn.get(r.mpn) ?? 0) + 1);

const RECENT = "2026-01";
for (const r of rows) {
  r.in_reviewed_catalogue = catalogueMpns.has(r.mpn);
  r.retailers_holding_this_mpn = retailersPerMpn.get(r.mpn);
  r.recently_seen = r.last_observed_at >= RECENT;
  // Ordering only — a hint about where the collector should start, not a
  // selection of anything.
  r.collection_priority =
    r.provenance === "active_collection"
      ? 1
      : r.in_reviewed_catalogue && r.recently_seen
        ? 2
        : r.recently_seen && r.retailers_holding_this_mpn >= 2
          ? 3
          : r.recently_seen
            ? 4
            : r.retailers_holding_this_mpn >= 2
              ? 5
              : 6;
}

rows.sort(
  (a, b) =>
    a.collection_priority - b.collection_priority ||
    (a.mpn < b.mpn ? -1 : a.mpn > b.mpn ? 1 : 0) ||
    (a.seller_display_name < b.seller_display_name ? -1 : 1),
);

const bySeller = rows.reduce((acc, r) => ({ ...acc, [r.seller_display_name]: (acc[r.seller_display_name] ?? 0) + 1 }), {});
const byPriority = rows.reduce((acc, r) => ({ ...acc, [r.collection_priority]: (acc[r.collection_priority] ?? 0) + 1 }), {});

const registry = {
  schema_version: 1,
  registry_id: "sf-gb-ddr5-32gb-collection-targets-2026-08-12-v1",
  status: "candidate_private_immutable",
  created_at: "2026-08-12T00:00:00Z",
  scope: "GB primary retail, 32GB (2x16GB) DDR5 desktop memory kits",
  purpose:
    "The durable list of exact-MPN product pages the canonical collector should observe. Replaces an arrangement where the collector's targets existed only inside past evidence extracts and could not be reviewed or widened.",
  not_an_index_basket:
    "Inclusion here selects nothing for any index. What contributes to an index link is decided at derivation time by the matched-model rule — a product counts only when observed in both periods. Adding targets therefore cannot bias the index; it can only add matched pairs. No basket, methodology, source or publication is approved by this file.",
  url_verification:
    "No URL here has been checked for whether it still resolves. Verifying a live retailer URL is a prospective fetch, and the canonical collector is the sole prospective fetcher. Archive-derived targets carry url_state 'unverified_pending_collector_check' and must be resolved by a collector run, which should record dead URLs additively rather than deleting them here.",
  provenance_rule:
    "Every target is evidence-backed. Active targets are those the collector is already observing. Archived targets were carrying the stated MPN at the stated retailer in a real Internet Archive capture, and retain that capture's timestamp so staleness is visible.",
  target_count: rows.length,
  distinct_mpn_count: new Set(rows.map((r) => r.mpn)).size,
  targets_by_seller: bySeller,
  targets_by_priority: byPriority,
  priority_meaning: {
    1: "already collected live",
    2: "reviewed catalogue product, seen in a 2026 capture",
    3: "seen in a 2026 capture, MPN available at 2+ retailers",
    4: "seen in a 2026 capture",
    5: "MPN available at 2+ retailers, last seen before 2026",
    6: "single retailer, last seen before 2026",
  },
  targets: rows,
  governance: {
    source_approved: false,
    methodology_approved: false,
    basket_approved: false,
    index_eligible: false,
    production_eligible: false,
    publication_eligible: false,
  },
};

writeFileSync(new URL("data/catalogue/collection-targets.v1.json", repo), `${JSON.stringify(registry, null, 2)}\n`);

process.stdout.write(`targets:          ${rows.length}\n`);
process.stdout.write(`distinct MPNs:    ${registry.distinct_mpn_count}\n`);
process.stdout.write(`by seller:        ${JSON.stringify(bySeller)}\n`);
process.stdout.write(`by priority:      ${JSON.stringify(byPriority)}\n`);
process.stdout.write(`recently seen:    ${rows.filter((r) => r.recently_seen).length}\n`);
process.stdout.write(`catalogue-backed: ${rows.filter((r) => r.in_reviewed_catalogue).length}\n`);
