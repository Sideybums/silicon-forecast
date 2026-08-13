// Re-serialises the two tranches written by collector v1 into the established
// prospective schema.
//
// Collector v1 emitted the historical-backfill observation shape. The
// prospective governance machinery reads identity.mpn_observed and
// seller.legal_name, so those observations keyed as (null, undefined): 21
// distinct products across three retailers were reported as one 21-way
// duplicate, while a genuine same-day duplicate against the retired collector's
// output went entirely undetected.
//
// This is a re-serialisation, not a correction of evidence. Every price, MPN,
// timestamp, byte count and response hash is carried across unchanged, the
// evidence ledgers are untouched, and each tranche records that it was
// reissued. It is only defensible because these two tranches have never been
// merged to main or published; anything that had been is corrected additively
// instead.
import { readFileSync, writeFileSync } from "node:fs";
import { ESTABLISHED_SELLER_LEGAL_NAMES } from "../lib/canonical-collector.mjs";

const repo = new URL("../", import.meta.url);
const TRANCHES = [
  { file: "uk-primary-retail-20260812T114904Z.v1.json", stamp: "20260812T114904Z" },
  { file: "uk-primary-retail-20260812T124505Z.v1.json", stamp: "20260812T124505Z" },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");

for (const { file, stamp } of TRANCHES) {
  const path = new URL(`data/observations/candidate/${file}`, repo);
  const tranche = JSON.parse(readFileSync(path, "utf8"));
  if (tranche.reissued_from_schema) {
    process.stdout.write(`${file}: already reissued, skipping\n`);
    continue;
  }

  const ledger = JSON.parse(readFileSync(new URL(`research/evidence/primary-retail-${stamp}/ledger.v1.json`, repo), "utf8"));
  const byEvidenceId = new Map(ledger.entries.map((e) => [e.evidence_id, e]));

  tranche.observations = tranche.observations.map((o) => {
    const e = byEvidenceId.get(o.source.evidence_id);
    if (!e) throw new Error(`no evidence entry for ${o.observation_id}`);
    const seller = o.seller.display_name;
    const legalName = ESTABLISHED_SELLER_LEGAL_NAMES[seller] ?? null;
    return {
      observation_id: `${slug(seller)}-${o.product.mpn.toLowerCase()}-${o.observed_at.toLowerCase()}`,
      status: "candidate_private_immutable",
      scope: "candidate_only",
      observed_at: o.observed_at,
      product_key: o.product.mpn.toLowerCase(),
      source: {
        source_key: `${slug(seller)}-uk-public-page`,
        source_name: `${seller} public product page`,
        source_url: e.source_url,
        supplied_url_status: `http_${e.http_status}`,
        collection_method: "scheduled unattended HTTP retrieval by the canonical collector",
        source_approved_for_production: false,
      },
      identity: { mpn_expected: o.product.mpn, mpn_observed: o.product.mpn, match_basis: "exact_mpn" },
      product: {
        capacity_gb: o.product.capacity_gb,
        module_count: o.product.module_count,
        memory_type: o.product.memory_type,
        capacity_basis: o.eligibility.capacity_basis,
        capacity_basis_reference: o.eligibility.capacity_basis_reference ?? null,
      },
      seller: {
        display_name: seller,
        legal_name: legalName,
        legal_name_state: legalName ? "established_from_prior_retained_extract" : "not_established_from_retained_extract",
        relationship: "retailer_owned",
      },
      item_price: { amount_minor: o.price.item_price_minor, currency: o.price.currency, vat_state: "included" },
      availability: {
        normalised: o.availability.raw_text === "In stock" ? "in_stock" : o.availability.raw_text ? "other" : "unknown",
        schema: o.availability.raw_text ?? null,
        display: o.availability.raw_text ?? null,
        eligibility_semantics: o.availability.raw_text ? "explicit" : "unknown",
      },
      delivery: { amount_minor: null, currency: "GBP", claim: null, destination_basis: null, destination_verified: false },
      landed_price: { amount_minor: null, currency: "GBP", eligibility: "abstain" },
      qualification: {
        status: "candidate_retained_not_landed_price_eligible",
        item_price_minor: o.price.item_price_minor,
        reasons: ["delivery_not_read_by_collector", ...(legalName ? [] : ["seller_legal_name_unresolved"])],
      },
      evidence: {
        extract_path: `research/evidence/primary-retail-${stamp}/ledger.v1.json`,
        extract_sha256: null,
        response_sha256: e.response_sha256,
        response_bytes: e.response_bytes,
        response_bytes_retained: false,
        source_url: e.source_url,
      },
      governance: {
        production_import_allowed: false,
        production_activation_allowed: false,
        index_eligibility: false,
        methodology_approval: false,
        publication_allowed: false,
      },
    };
  });

  tranche.reissued_from_schema = {
    original_schema: "historical_backfill_observation_shape",
    reissued_at: "2026-08-13T00:00:00Z",
    reason:
      "Collector v1 emitted the historical-backfill observation shape, which the prospective audit and collision machinery cannot read. Re-serialised into the established prospective schema so this collector's output is actually covered by those controls.",
    facts_preserved:
      "Every price, MPN, timestamp, byte count and response hash is carried across unchanged and the evidence ledger is untouched. No observation was added, removed or revalued.",
    never_published: "Neither tranche had been merged to main or published when it was reissued.",
  };

  writeFileSync(path, `${JSON.stringify(tranche, null, 2)}\n`);
  process.stdout.write(`${file}: reissued ${tranche.observations.length} observations\n`);
}
