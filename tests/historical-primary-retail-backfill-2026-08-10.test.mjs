import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const artifactPath = "data/observations/candidate/uk-primary-retail-historical-backfill-2026-08-10T040544Z.v1.json";
const manifestPath = "research/evidence/historical-primary-retail-backfill-2026-08-10/manifest.json";
const readBytes = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const lockedGovernance = {
  source_approval_allowed: false,
  methodology_approval: false,
  production_import_allowed: false,
  production_activation_allowed: false,
  index_eligibility: false,
  publication_allowed: false,
};

const expected = [
  {
    observed_at: "2025-09-07T20:30:52Z",
    mpn: "KF560C30BBEK2-32",
    amount_minor: 11399,
    availability: "10+ In Stock Now",
    promotion: "not_applied",
  },
  {
    observed_at: "2025-06-19T06:37:21Z",
    mpn: "KF564C32RSK2-32",
    amount_minor: 11399,
    availability: "Hurry, only 1 left!",
    promotion: "explicit_markdown",
  },
];

test("the 2026-08-10 CCL backfill is exact-MPN, immutable, candidate-only and authority-locked", async () => {
  const artifact = await readJson(artifactPath);
  assert.equal(artifact.status, "candidate_private_immutable");
  assert.equal(artifact.scope, "candidate_only_historical_backfill");
  assert.equal(artifact.channel, "PRIMARY_RETAIL");
  assert.deepEqual(artifact.governance, lockedGovernance);
  assert.match(artifact.capture_time_policy, /not the retailer's first-change time/u);
  assert.equal(artifact.observations.length, expected.length);

  const actual = artifact.observations.map((item) => ({
    observed_at: item.observed_at,
    mpn: item.identity.mpn_observed,
    amount_minor: item.item_price.amount_minor,
    availability: item.availability.display,
    promotion: item.promotion.state,
  }));
  assert.deepEqual(actual, expected);

  for (const observation of artifact.observations) {
    assert.equal(observation.observed_at_semantics, "wayback_capture_timestamp_not_retailer_first_change_time");
    assert.equal(observation.identity.mpn_expected, observation.identity.mpn_observed);
    assert.equal(observation.identity.match_basis, "exact_mpn");
    assert.equal(observation.item_price.currency, "GBP");
    assert.equal(observation.item_price.vat_state, "included");
    assert.equal(observation.seller.legal_name, null);
    assert.equal(observation.seller.legal_name_state, "not_extracted_from_archived_page");
    assert.ok(observation.qualification.reasons.includes("seller_legal_name_unresolved"));
    assert.deepEqual(observation.landed_price, { amount_minor: null, currency: "GBP", eligibility: "abstain" });
    assert.equal(observation.source.source_approved_for_production, false);
    assert.equal(observation.evidence.response_bytes_retained, false);
    assert.deepEqual(observation.governance, lockedGovernance);
  }
});

test("the CCL manifest pins the artifact, extracts and parent-fetched response fingerprints", async () => {
  const artifact = await readJson(artifactPath);
  const manifest = await readJson(manifestPath);
  assert.equal(manifest.status, "candidate_private_immutable");
  assert.deepEqual(manifest.governance, lockedGovernance);
  assert.match(manifest.retention_policy, /Raw HTML.*not retained/u);

  const artifactBytes = await readBytes(artifactPath);
  assert.equal(artifactBytes.byteLength, manifest.observation_artifact.bytes);
  assert.equal(sha256(artifactBytes), manifest.observation_artifact.sha256);
  assert.equal(manifest.observation_artifact.sha256, "d8fd61d59de4f41f440a7bdacc8cae8af714423ceceabaed430957d8b23efa5e");

  assert.equal(manifest.evidence.length, 2);
  for (const entry of manifest.evidence) {
    const bytes = await readBytes(entry.path);
    assert.equal(bytes.byteLength, entry.bytes, `${entry.path} byte count drifted`);
    assert.equal(sha256(bytes), entry.sha256, `${entry.path} checksum drifted`);
    assert.match(entry.response_wire_sha256, /^[a-f0-9]{64}$/u);
    assert.equal(entry.response_wire_bytes, entry.response_decoded_bytes);
    assert.equal(entry.response_wire_sha256, entry.response_decoded_sha256);
    assert.equal(entry.response_bytes_retained, false);

    const extract = JSON.parse(bytes.toString("utf8"));
    assert.equal(extract.evidence_class, "minimal_factual_extract");
    assert.equal(extract.http_status, 200);
    assert.equal(extract.response.content_encoding, "identity_as_returned_to_client");
    assert.equal(extract.response.wire_bytes, entry.response_wire_bytes);
    assert.equal(extract.response.wire_sha256, entry.response_wire_sha256);
    assert.match(extract.capture_time_semantics, /not evidence of retailer first-change time/u);

    const observation = artifact.observations.find((item) => item.evidence.extract_path === entry.path);
    assert.ok(observation, `${entry.path} lacks an observation`);
    assert.equal(observation.evidence.extract_sha256, entry.sha256);
    assert.equal(observation.evidence.retrieved_at, entry.retrieved_at);
    assert.equal(extract.facts.mpn, observation.identity.mpn_observed);
    assert.equal(extract.facts.price.amount_minor, observation.item_price.amount_minor);
    assert.equal(extract.facts.seller.legal_name, observation.seller.legal_name);
  }
});

test("the additive tranche contains unique archive observations and does not imply continuous coverage", async () => {
  const artifact = await readJson(artifactPath);
  const ids = artifact.observations.map((item) => item.observation_id);
  const mpnTimes = artifact.observations.map((item) => `${item.identity.mpn_observed}|${item.observed_at}`);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(mpnTimes).size, mpnTimes.length);
  assert.doesNotMatch(JSON.stringify(artifact), /interpolat|forward.?fill|backcast/iu);
});
