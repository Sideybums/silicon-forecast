import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const artifactPath = "data/observations/candidate/uk-primary-retail-2026-08-09T122437Z.v1.json";
const manifestPath = "research/evidence/primary-retail-2026-08-09/manifest.json";
const readBytes = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const lockedGovernance = {
  production_import_allowed: false,
  production_activation_allowed: false,
  index_eligibility: false,
  methodology_approval: false,
  publication_allowed: false,
};

const expected = [
  {
    observation_id: "kms-kf560c30bbek2-32-2026-08-09T122553Z",
    observed_at: "2026-08-09T12:25:53Z",
    mpn: "KF560C30BBEK2-32",
    source_key: "kingston-memory-shop-uk-public-page",
    source_url: "https://www.kingstonmemoryshop.co.uk/kingston-fury-beast-kf560c30bbek2-32-32gb-16gb-x2-ddr5-6000mt-s-black-memory-dimm-expo",
    seller: { display_name: "KingstonMemoryShop", legal_name: "SweetCow Ltd t/a KingstonMemoryShop", relationship: "retailer_owned" },
    price: { amount_minor: 61144, currency: "GBP", vat_state: "included" },
    availability: { normalised: "available_to_order", schema: "InStock", display: "Available To Order - 4-5 Business Day Delivery*", eligibility_semantics: "ambiguous" },
    delivery: { amount_minor: 0, currency: "GBP", claim: "FREE UK Delivery & Returns", destination_basis: "UK unspecified", destination_verified: false },
    landed: { amount_minor: null, currency: "GBP", eligibility: "abstain" },
    extract_sha256: "3b26672a7c429bcc1c3b85c3180ca20f2cbd9a862e5166243a7a61ced4685dcb",
    response_sha256: "b2c328412e7c479230e2183e252a150782c4ffa09b6f1f0a3fdef0cf36fddc62",
    reasons: ["availability_semantics_ambiguous", "delivery_destination_not_fixed"],
  },
  {
    observation_id: "kms-kf564c32rsk2-32-2026-08-09T122554Z",
    observed_at: "2026-08-09T12:25:54Z",
    mpn: "KF564C32RSK2-32",
    source_key: "kingston-memory-shop-uk-public-page",
    source_url: "https://www.kingstonmemoryshop.co.uk/kingston-fury-renegade-silver-kf564c32rsk2-32-32gb-16gb-x2-ddr5-6400mt-s-non-ecc-dimm",
    seller: { display_name: "KingstonMemoryShop", legal_name: "SweetCow Ltd t/a KingstonMemoryShop", relationship: "retailer_owned" },
    price: { amount_minor: 62026, currency: "GBP", vat_state: "included" },
    availability: { normalised: "available_to_order", schema: "InStock", display: "Available To Order - 4-5 Business Day Delivery*", eligibility_semantics: "ambiguous" },
    delivery: { amount_minor: 0, currency: "GBP", claim: "FREE UK Delivery & Returns", destination_basis: "UK unspecified", destination_verified: false },
    landed: { amount_minor: null, currency: "GBP", eligibility: "abstain" },
    extract_sha256: "a366d52c9bdedc4d375cce249dbde923e8183c15d2900bde16b3abf6d318c15f",
    response_sha256: "e44455fa7994e5f1edc3b10e4399726e74889cc07b4eab45245075dc5cec9c34",
    reasons: ["availability_semantics_ambiguous", "delivery_destination_not_fixed"],
  },
  {
    observation_id: "awdit-f5-6000j3636f16gx2-fx5-2026-08-09T122437Z",
    observed_at: "2026-08-09T12:24:37Z",
    mpn: "F5-6000J3636F16GX2-FX5",
    source_key: "awd-it-uk-public-page",
    source_url: "https://www.awd-it.co.uk/g-skill-flare-x5-32gb-16gb-x2-ddr5-6000mt-s-cl36-memory-kit-black-f5-6000j3636f16gx2-fx5.html",
    seller: { display_name: "AWD-IT", legal_name: "ADMI Limited", relationship: "retailer_owned" },
    price: { amount_minor: 46999, currency: "GBP", vat_state: "included" },
    availability: { normalised: "in_stock", schema: "InStock", display: "In stock", eligibility_semantics: "explicit" },
    delivery: { amount_minor: 0, currency: "GBP", claim: "FREE UK Mainland Delivery / Free Delivery Available", destination_basis: "UK mainland unspecified", destination_verified: false },
    landed: { amount_minor: null, currency: "GBP", eligibility: "abstain" },
    extract_sha256: "a33271fe107022e4b001bd80a315bbf1133c2aaa8739497eb171746157e0598c",
    response_sha256: "32c1457be5324423430bad8a27e297c72f7265e556d9202980eef03801ab8931",
    reasons: ["delivery_destination_not_fixed"],
  },
];

test("retail tranche is immutable candidate/private data with every consequential gate locked", async () => {
  const artifact = await readJson(artifactPath);
  assert.equal(artifact.status, "candidate_private_immutable");
  assert.equal(artifact.scope, "candidate_only");
  assert.equal(artifact.channel, "PRIMARY_RETAIL");
  assert.deepEqual(artifact.governance, lockedGovernance);
  assert.equal(artifact.observations.length, 3);
  for (const observation of artifact.observations) {
    assert.equal(observation.status, "candidate_private_immutable");
    assert.equal(observation.scope, "candidate_only");
    assert.deepEqual(observation.governance, lockedGovernance);
    assert.equal(observation.source.source_approved_for_production, false);
    assert.equal(observation.evidence.response_bytes_retained, false);
  }
});

test("exact MPN, timestamp, source, seller, VAT, availability, delivery, price and landed-price abstention cannot drift", async () => {
  const artifact = await readJson(artifactPath);
  const actual = artifact.observations.map((observation) => ({
    observation_id: observation.observation_id,
    observed_at: observation.observed_at,
    mpn: observation.identity.mpn_observed,
    source_key: observation.source.source_key,
    source_url: observation.source.source_url,
    seller: observation.seller,
    price: observation.item_price,
    availability: observation.availability,
    delivery: observation.delivery,
    landed: observation.landed_price,
    extract_sha256: observation.evidence.extract_sha256,
    response_sha256: observation.evidence.response_sha256,
    reasons: observation.qualification.reasons,
  }));
  assert.deepEqual(actual, expected);
  assert.ok(artifact.observations.every((item) => item.identity.match_basis === "exact_mpn"));
  assert.ok(artifact.observations.every((item) => item.qualification.status === "candidate_retained_not_landed_price_eligible"));
});

test("manifest pins exact observation and minimal evidence bytes plus source-response checksums", async () => {
  const manifest = await readJson(manifestPath);
  assert.equal(manifest.status, "candidate_private_immutable");
  assert.deepEqual(manifest.governance, lockedGovernance);
  assert.match(manifest.retention_policy, /response bytes are not retained/i);

  assert.equal(manifest.observation_artifact.path, artifactPath);
  assert.equal(sha256(await readBytes(artifactPath)), manifest.observation_artifact.sha256);
  assert.equal(manifest.observation_artifact.sha256, "efe276384a828f32b86891422c9519c6b3e15cb4640c0bbc2095edcca4564fb6");

  const artifact = await readJson(artifactPath);
  for (const entry of manifest.evidence) {
    assert.equal(entry.response_bytes_retained, false);
    assert.equal(sha256(await readBytes(entry.path)), entry.sha256);
    const extract = await readJson(entry.path);
    assert.equal(extract.evidence_class, "minimal_factual_extract");
    assert.equal(extract.response_bytes_retained, false);
    assert.match(extract.retention_note, /response bytes are not retained/i);
    assert.equal(extract.response_sha256, entry.response_sha256);
    const observation = artifact.observations.find((item) => item.evidence.extract_path === entry.path);
    assert.ok(observation, entry.path);
    assert.equal(observation.evidence.extract_sha256, entry.sha256);
    assert.equal(observation.evidence.response_sha256, entry.response_sha256);
    assert.equal(extract.facts.mpn, observation.identity.mpn_observed);
    assert.equal(extract.facts.price.amount_minor, observation.item_price.amount_minor);
    assert.equal(extract.facts.seller.legal_name, observation.seller.legal_name);
  }
});

test("changed Kingston slugs are preserved as normal-access 404 checks, not silently rewritten", async () => {
  const manifest = await readJson(manifestPath);
  const kingstonEntries = manifest.evidence.filter((entry) => entry.path.includes("kingston-"));
  assert.equal(kingstonEntries.length, 2);
  for (const entry of kingstonEntries) {
    const extract = await readJson(entry.path);
    assert.equal(extract.supplied_url_check.http_status, 404);
    assert.equal(extract.supplied_url_check.response_bytes_retained, false);
    assert.match(extract.canonical_url_discovery, /normal public sitemap/);
    assert.match(extract.supplied_url_check.response_sha256, /^[a-f0-9]{64}$/);
  }
});
