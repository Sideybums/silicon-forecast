import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const artifactPath = "data/observations/candidate/uk-primary-retail-2026-08-09T234337Z.v1.json";
const manifestPath = "research/evidence/primary-retail-2026-08-09T234337Z/manifest.json";
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
    observation_id: "awdit-f5-6000j3636f16gx2-fx5-2026-08-09t234337z",
    observed_at: "2026-08-09T23:43:37Z",
    mpn: "F5-6000J3636F16GX2-FX5",
    source_status: "http_200",
    price: { amount_minor: 46999, currency: "GBP", vat_state: "included" },
    availability: { normalised: "in_stock", schema: "InStock", display: "In stock", eligibility_semantics: "explicit" },
    delivery: { amount_minor: 0, currency: "GBP", claim: "FREE UK Mainland Delivery / Free Delivery Available", destination_basis: "UK mainland unspecified", destination_verified: false },
    response_bytes: 416068,
    response_sha256: "94bf7b1fa2d64dd95507c486fad63f3233ee397b18432422c418b59243b8f4bb",
    reasons: ["delivery_destination_not_fixed"],
  },
  {
    observation_id: "kms-kf560c30bbek2-32-2026-08-09t234337z",
    observed_at: "2026-08-09T23:43:37Z",
    mpn: "KF560C30BBEK2-32",
    source_status: "http_200",
    price: { amount_minor: 61144, currency: "GBP", vat_state: "included" },
    availability: { normalised: "available_to_order", schema: "InStock", display: "Available To Order - 4-5 Business Day Delivery*", eligibility_semantics: "ambiguous" },
    delivery: { amount_minor: 0, currency: "GBP", claim: "FREE UK Delivery & Returns", destination_basis: "UK unspecified", destination_verified: false },
    response_bytes: 594608,
    response_sha256: "f5d84dc0ab3d6b0064105221b85a143e19073e96f8c422b1193f3f1f17287de4",
    reasons: ["availability_semantics_ambiguous", "delivery_destination_not_fixed"],
  },
  {
    observation_id: "kms-kf564c32rsk2-32-2026-08-09t234337z",
    observed_at: "2026-08-09T23:43:37Z",
    mpn: "KF564C32RSK2-32",
    source_status: "http_200",
    price: { amount_minor: 62026, currency: "GBP", vat_state: "included" },
    availability: { normalised: "available_to_order", schema: "InStock", display: "Available To Order - 4-5 Business Day Delivery*", eligibility_semantics: "ambiguous" },
    delivery: { amount_minor: 0, currency: "GBP", claim: "FREE UK Delivery & Returns", destination_basis: "UK unspecified", destination_verified: false },
    response_bytes: 594266,
    response_sha256: "e2d81796458d6250027b8f8610b881d043b4b5c60024a69082eb0270734a0c94",
    reasons: ["availability_semantics_ambiguous", "delivery_destination_not_fixed"],
  },
];

test("new primary-retail tranche preserves exact facts, response byte counts, and locked candidate status", async () => {
  const artifact = await readJson(artifactPath);
  assert.equal(artifact.tranche_id, "sf-gb-primary-retail-2026-08-09T234337Z-v1");
  assert.equal(artifact.status, "candidate_private_immutable");
  assert.equal(artifact.scope, "candidate_only");
  assert.equal(artifact.channel, "PRIMARY_RETAIL");
  assert.deepEqual(artifact.governance, lockedGovernance);
  assert.equal(artifact.evidence_policy.includes("Fetched response bytes are not retained"), true);

  const actual = artifact.observations.map((observation) => ({
    observation_id: observation.observation_id,
    observed_at: observation.observed_at,
    mpn: observation.identity.mpn_observed,
    source_status: observation.source.supplied_url_status,
    price: observation.item_price,
    availability: observation.availability,
    delivery: observation.delivery,
    response_bytes: observation.evidence.response_bytes,
    response_sha256: observation.evidence.response_sha256,
    reasons: observation.qualification.reasons,
  }));
  assert.deepEqual(actual, expected);
  for (const observation of artifact.observations) {
    assert.equal(observation.source.source_approved_for_production, false);
    assert.equal(observation.identity.match_basis, "exact_mpn");
    assert.deepEqual(observation.landed_price, { amount_minor: null, currency: "GBP", eligibility: "abstain" });
    assert.equal(observation.qualification.status, "candidate_retained_not_landed_price_eligible");
    assert.deepEqual(observation.governance, lockedGovernance);
  }
});

test("new primary-retail manifest binds artifact and minimal extract bytes", async () => {
  const artifact = await readJson(artifactPath);
  const manifest = await readJson(manifestPath);
  assert.equal(manifest.status, "candidate_private_immutable");
  assert.deepEqual(manifest.governance, lockedGovernance);
  assert.equal(manifest.observation_artifact.path, artifactPath);
  assert.equal(sha256(await readBytes(artifactPath)), manifest.observation_artifact.sha256);
  assert.equal(manifest.observation_artifact.sha256, "41fd88e7e48cbb343254522d46d3ec74c999f494169da34ecfeefb3ed667428e");

  for (const entry of manifest.evidence) {
    assert.equal(entry.response_bytes_retained, false);
    assert.equal(Number.isSafeInteger(entry.response_bytes), true);
    assert.equal(sha256(await readBytes(entry.path)), entry.sha256);
    const extract = await readJson(entry.path);
    assert.equal(extract.evidence_class, "minimal_factual_extract");
    assert.equal(extract.response_bytes_retained, false);
    assert.equal(extract.response_bytes, entry.response_bytes);
    assert.equal(extract.response_sha256, entry.response_sha256);
    assert.match(extract.retention_note, /response byte count, and response SHA-256 are retained/i);
    const observation = artifact.observations.find((item) => item.evidence.extract_path === entry.path);
    assert.ok(observation, entry.path);
    assert.equal(observation.evidence.extract_sha256, entry.sha256);
    assert.equal(observation.evidence.response_bytes, entry.response_bytes);
    assert.equal(extract.facts.mpn, observation.identity.mpn_observed);
    assert.equal(extract.facts.price.amount_minor, observation.item_price.amount_minor);
  }
});
