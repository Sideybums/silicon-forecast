import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const artifactPath = "data/observations/candidate/uk-primary-retail-historical-backfill-2026-08-09T145021Z.v1.json";
const manifestPath = "research/evidence/historical-primary-retail-backfill-2026-08-09/manifest.json";
const priorTranchePath = "data/observations/candidate/uk-primary-retail-2026-08-09T122437Z.v1.json";
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
    observed_at: "2022-08-11T08:40:20Z",
    mpn: "KF564C32RSK2-32",
    seller: "SweetCow Ltd t/a KingstonMemoryShop",
    amount_minor: 48799,
    availability: "Available To Order (Est. 3-5 Day Delivery To UK)",
    delivery: "Free UK Delivery",
    reasons: ["availability_semantics_ambiguous", "delivery_destination_not_fixed"],
  },
  {
    observed_at: "2026-01-10T14:56:07Z",
    mpn: "F5-6000J3636F16GX2-FX5",
    seller: "ADMI Limited",
    amount_minor: 39999,
    availability: "In stock",
    delivery: "FREE UK Mainland Delivery / Free Delivery Available",
    reasons: ["delivery_destination_not_fixed"],
  },
  {
    observed_at: "2026-01-17T21:48:32Z",
    mpn: "F5-6000J3636F16GX2-FX5",
    seller: "ADMI Limited",
    amount_minor: 39999,
    availability: "In stock",
    delivery: "FREE UK Mainland Delivery / Free Delivery Available",
    reasons: ["delivery_destination_not_fixed"],
  },
  {
    observed_at: "2026-03-09T11:37:02Z",
    mpn: "KF560C30BBEK2-32",
    seller: "SweetCow Ltd t/a KingstonMemoryShop",
    amount_minor: 54728,
    availability: "4 in stock",
    delivery: "Next-business-day UK delivery via TNT/FedEx £6.99 shipping option; free delivery also available",
    reasons: ["mandatory_delivery_method_unresolved", "delivery_destination_not_fixed"],
  },
];

test("historical backfill is an immutable private exact-MPN item-price tranche with every authority locked", async () => {
  const artifact = await readJson(artifactPath);
  assert.equal(artifact.status, "candidate_private_immutable");
  assert.equal(artifact.scope, "candidate_only_historical_backfill");
  assert.equal(artifact.channel, "PRIMARY_RETAIL");
  assert.deepEqual(artifact.governance, lockedGovernance);
  assert.equal(artifact.observations.length, expected.length);
  assert.match(artifact.capture_time_policy, /not the retailer's first-change time/u);

  const actual = artifact.observations.map((item) => ({
    observed_at: item.observed_at,
    mpn: item.identity.mpn_observed,
    seller: item.seller.legal_name,
    amount_minor: item.item_price.amount_minor,
    availability: item.availability.display,
    delivery: item.delivery.claim,
    reasons: item.qualification.reasons,
  }));
  assert.deepEqual(actual, expected);

  for (const observation of artifact.observations) {
    assert.equal(observation.status, "candidate_private_immutable");
    assert.equal(observation.scope, "candidate_only_historical_backfill");
    assert.equal(observation.observed_at_semantics, "wayback_capture_timestamp_not_retailer_first_change_time");
    assert.equal(observation.identity.mpn_expected, observation.identity.mpn_observed);
    assert.equal(observation.identity.match_basis, "exact_mpn");
    assert.equal(observation.item_price.currency, "GBP");
    assert.equal(observation.item_price.vat_state, "included");
    assert.deepEqual(observation.landed_price, { amount_minor: null, currency: "GBP", eligibility: "abstain" });
    assert.equal(observation.qualification.status, "candidate_retained_not_landed_price_eligible");
    assert.equal(observation.source.source_approved_for_production, false);
    assert.equal(observation.evidence.response_bytes_retained, false);
    assert.deepEqual(observation.governance, lockedGovernance);
  }
});

test("manifest deterministically pins artifact, extracts, retrievals and gzip-decoded response metadata", async () => {
  const artifact = await readJson(artifactPath);
  const manifest = await readJson(manifestPath);
  assert.equal(manifest.status, "candidate_private_immutable");
  assert.deepEqual(manifest.governance, lockedGovernance);
  assert.match(manifest.retention_policy, /Raw HTML.*not retained/u);

  const artifactBytes = await readBytes(artifactPath);
  assert.equal(artifactBytes.byteLength, manifest.observation_artifact.bytes);
  assert.equal(sha256(artifactBytes), manifest.observation_artifact.sha256);
  assert.equal(manifest.observation_artifact.sha256, "c54210ddc8a607826fc229480eb88c31bbd974111c93f940d3835a12e72cace8");

  assert.equal(manifest.evidence.length, 4);
  for (const entry of manifest.evidence) {
    const bytes = await readBytes(entry.path);
    assert.equal(bytes.byteLength, entry.bytes, `${entry.path} byte count drifted`);
    assert.equal(sha256(bytes), entry.sha256, `${entry.path} checksum drifted`);
    assert.match(entry.response_wire_sha256, /^[a-f0-9]{64}$/u);
    assert.match(entry.response_decoded_sha256, /^[a-f0-9]{64}$/u);
    assert.ok(entry.response_wire_bytes > 0);
    assert.ok(entry.response_decoded_bytes > entry.response_wire_bytes, "gzip decoding must expand each replayed page");
    assert.equal(entry.response_bytes_retained, false);

    const extract = JSON.parse(bytes.toString("utf8"));
    assert.equal(extract.evidence_class, "minimal_factual_extract");
    assert.equal(extract.http_status, 200);
    assert.equal(extract.response.content_encoding, "gzip");
    assert.equal(extract.response.wire_bytes, entry.response_wire_bytes);
    assert.equal(extract.response.wire_sha256, entry.response_wire_sha256);
    assert.equal(extract.response.decoded_bytes, entry.response_decoded_bytes);
    assert.equal(extract.response.decoded_sha256, entry.response_decoded_sha256);
    assert.equal(extract.response.bytes_retained, false);
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

test("backfill lineage is unique, chronologically ordered and leaves the 2026-08-09 tranche byte-for-byte unchanged", async () => {
  const artifact = await readJson(artifactPath);
  const ids = artifact.observations.map((item) => item.observation_id);
  const times = artifact.observations.map((item) => item.observed_at);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(times, [...times].sort());
  assert.equal(sha256(await readBytes(priorTranchePath)), "efe276384a828f32b86891422c9519c6b3e15cb4640c0bbc2095edcca4564fb6");
});
