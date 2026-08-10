import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const artifactPath = "data/observations/candidate/uk-primary-retail-historical-backfill-2026-08-10T065616Z.v1.json";
const ledgerPath = "research/evidence/historical-primary-retail-backfill-2026-08-10-wave2/ledger.v1.json";
const manifestPath = "research/evidence/historical-primary-retail-backfill-2026-08-10-wave2/manifest.json";
const editorialPath = "research/evidence/historical-editorial-price-anchors-2026-08-10-wave2/anchors.v1.json";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const readBytes = (path) => readFile(new URL(path, root));

test("wave-2 historical storefront tranche is exact-MPN, sparse and locked", async () => {
  const artifact = JSON.parse((await readBytes(artifactPath)).toString("utf8"));
  const ledger = JSON.parse((await readBytes(ledgerPath)).toString("utf8"));
  assert.equal(artifact.status, "candidate_private_immutable");
  assert.equal(artifact.observation_count, 6);
  assert.equal(artifact.observations.length, 6);
  assert.equal(ledger.entries.length, 6);
  assert.equal(artifact.capture_basis.historical_interval_values_derived, false);
  assert.equal(artifact.capture_basis.gaps_preserved, true);
  assert.deepEqual(Object.values(artifact.governance), [false, false, false, false, false, false]);
  assert.deepEqual(Object.values(ledger.authority), [false, false, false, false, false]);

  const evidenceById = new Map(ledger.entries.map((entry) => [entry.evidence_id, entry]));
  const ids = new Set();
  for (const observation of artifact.observations) {
    assert.equal(ids.has(observation.observation_id), false);
    ids.add(observation.observation_id);
    const evidence = evidenceById.get(observation.source.evidence_id);
    assert.ok(evidence);
    assert.equal(evidence.facts.mpn, observation.product.mpn);
    assert.equal(evidence.facts.item_price_minor, observation.price.item_price_minor);
    assert.equal(evidence.archive_captured_at, observation.observed_at);
    assert.equal(observation.eligibility.identity_exact, true);
    assert.equal(observation.eligibility.historical_item_price_retained, true);
    assert.equal(observation.eligibility.landed_price_eligible, false);
    assert.equal(observation.price.landed_price_minor, null);
  }
});

test("wave-2 manifest pins artifact, ledger and parent-fetched response fingerprints", async () => {
  const manifest = JSON.parse((await readBytes(manifestPath)).toString("utf8"));
  for (const entry of manifest.files) {
    const bytes = await readBytes(entry.path);
    assert.equal(bytes.length, entry.bytes);
    assert.equal(sha256(bytes), entry.sha256);
  }
  assert.equal(manifest.response_fingerprints.length, 6);
  for (const response of manifest.response_fingerprints) {
    assert.match(response.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(response.bytes > 90000);
  }
  assert.deepEqual(Object.values(manifest.authority), [false, false, false, false, false]);
});

test("wave-2 editorial anchors remain separate, exact-MPN and non-numeric inputs", async () => {
  const bytes = await readBytes(editorialPath);
  assert.equal(sha256(bytes), "503d7a69bbc6c06f7fda098f2ab2371035c0aedee0759c0d9690e078a6ca81ad");
  const ledger = JSON.parse(bytes.toString("utf8"));
  assert.equal(ledger.status, "candidate_private_immutable");
  assert.equal(ledger.anchors.length, 5);
  assert.equal(ledger.held_leads.length, 3);
  assert.deepEqual(Object.values(ledger.governance), [false, false, false, false, false, false]);
  for (const anchor of ledger.anchors) {
    assert.equal(anchor.identity.basis, "exact_mpn");
    assert.match(anchor.identity.mpn, /^[A-Z0-9-]+$/u);
    assert.ok(anchor.price_statement.amount_minor > 0);
    assert.equal(anchor.price_statement.currency, "GBP");
    assert.equal(anchor.price_statement.observed_storefront_offer, false);
    assert.equal(anchor.source.http_status, 200);
    assert.match(anchor.source.response_sha256, /^[a-f0-9]{64}$/u);
  }
});
