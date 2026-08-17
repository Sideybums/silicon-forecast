import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { assertPublicOffers, buildPublicOffers, publicOfferCanonicalBytes } from "../lib/public-offers.mjs";

const repo = process.cwd();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = (relativePath, root = repo) => JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
const dataset = readJson("data/public-offers/offers-ram.v1.json");
const manifest = readJson("data/derived/private-candidate/public-offers-manifest.v1.json");
const queue = readJson("data/review-queue/public-offer-exceptions.v1.json");
const DIRECT_TRANCHE = "data/observations/candidate/uk-primary-retail-20260817T103006Z.v1.json";
const DIRECT_LEDGER = "research/evidence/primary-retail-20260817T103006Z/ledger.v1.json";
const DIRECT_ID = "kingstonmemoryshop-kf560c30bbek2-32-2026-08-17t10:30:06z";
const ARCHIVE_TRANCHE = "data/observations/candidate/uk-primary-retail-multi-retailer-2026-08-11T090000Z.v1.json";
const ARCHIVE_LEDGER = "research/evidence/historical-primary-retail-multi-retailer-2026-08-11/ledger.v1.json";
const ARCHIVE_ID = "sf-hist-ccl-kf564c32rsk2-32-20230131164606";
const ARCHIVE_EVIDENCE_ID = "sf-wayback-ccl-kf564c32rsk2-32-20230131164606";

function temporaryFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "sf-public-offers-"));
  for (const relativePath of ["config", "data/catalogue", "data/reviews", "data/observations/candidate", "research/evidence"]) {
    cpSync(path.join(repo, relativePath), path.join(root, relativePath), { recursive: true });
  }
  for (const relativePath of ["lib/public-offers.mjs", "scripts/build-public-offers.mjs"]) {
    mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
    cpSync(path.join(repo, relativePath), path.join(root, relativePath));
  }
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function mutateJson(root, relativePath, mutate) {
  const target = path.join(root, relativePath);
  const value = JSON.parse(readFileSync(target, "utf8"));
  mutate(value);
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

const rootUrl = (root) => pathToFileURL(`${root}${path.sep}`);
const keyOf = (item) => `${item.mpn}|${item.retailer_id}|${item.observed_at}`;
const directObservation = (tranche) => tranche.observations.find((item) => item.observation_id === DIRECT_ID);
const directEvidence = (ledger) => ledger.entries.find((item) => item.facts?.mpn === "KF560C30BBEK2-32" && item.seller_display_name === "KingstonMemoryShop");

function assertDirectExcluded(result, reason) {
  const item = result.reviewQueue.items.find((entry) => entry.observation_id === DIRECT_ID);
  assert.ok(item, `missing exception for ${DIRECT_ID}`);
  assert.ok(item.reasons.includes(reason), `${reason}: ${item.reasons.join(", ")}`);
}

function clonePayload() {
  return structuredClone(dataset);
}

test("standing factual-offer approval is exact, narrow, and explicitly supersedes only blanket factual-publication locks", () => {
  const policy = readJson("config/factual-offer-publication-policy.v1.json");
  assert.equal(policy.status, "approved");
  assert.deepEqual(Object.entries(policy.authority).filter(([, value]) => value === false).map(([key]) => key), ["aggregate_index", "methodology", "basket", "baseline", "historical_reference", "deflator", "research_publication", "production_deployment"]);
  assert.equal(policy.candidate_lock_supersession.scope, "dated_factual_primary_retail_offer_observation_only");
  assert.equal(policy.candidate_lock_supersession.does_not_approve_sources_indexes_methodology_baskets_or_deployment, true);
  assert.deepEqual(policy.retailer_identity_contract.map((item) => item.display_name), ["AWD-IT", "CCL", "KingstonMemoryShop", "Overclockers UK", "Scan Computers"]);
  assert.match(readFileSync("lib/publication-gate.ts", "utf8"), /isPublic: false/);
});

test("public offer projection replays byte-for-byte and remains non-empty", () => {
  const rebuilt = buildPublicOffers();
  assert.ok(rebuilt.payload.observations.length > 0);
  assert.equal(publicOfferCanonicalBytes(rebuilt.payload), readFileSync("data/public-offers/offers-ram.v1.json", "utf8"));
  assert.equal(publicOfferCanonicalBytes(rebuilt.manifest), readFileSync("data/derived/private-candidate/public-offers-manifest.v1.json", "utf8"));
  assert.equal(publicOfferCanonicalBytes(rebuilt.reviewQueue), readFileSync("data/review-queue/public-offer-exceptions.v1.json", "utf8"));
});

test("manifest binds generator, build script, policy, payload, and every discovered candidate input", () => {
  assert.equal(manifest.generator.sha256, sha256(readFileSync(manifest.generator.path)));
  assert.equal(manifest.build_script.sha256, sha256(readFileSync(manifest.build_script.path)));
  assert.equal(manifest.policy.sha256, sha256(readFileSync(manifest.policy.path)));
  assert.equal(manifest.payload.sha256, sha256(readFileSync(manifest.payload.path)));
  for (const input of manifest.inputs) assert.equal(input.sha256, sha256(readFileSync(input.path)), input.path);
  const candidateInputs = manifest.inputs.filter((entry) => entry.path.startsWith("data/observations/candidate/uk-primary-retail"));
  assert.ok(candidateInputs.length > 0);
  assert.equal(candidateInputs.length, new Set(candidateInputs.map((entry) => entry.path)).size);
});

test("release products are an observed subset of policy-approved products and factual keys are unique", () => {
  const approved = new Set(readJson("config/factual-offer-publication-policy.v1.json").approved_products.map((item) => item.mpn));
  assert.ok(dataset.products.every((item) => approved.has(item.mpn)));
  assert.deepEqual(dataset.products.map((item) => item.mpn), [...new Set(dataset.observations.map((item) => item.mpn))].sort());
  assert.equal(new Set(dataset.observations.map(keyOf)).size, dataset.observations.length);
  assert.equal(new Set(dataset.observations.map((item) => item.public_observation_id)).size, dataset.observations.length);
  assert.equal(manifest.payload.record_count, dataset.observations.length);
  assert.equal(queue.routine_observations_published, dataset.observations.length);
  assert.equal(queue.exception_count, queue.items.length);
});

test("assertPublicOffers enforces the complete closed public contract", () => {
  assert.equal(assertPublicOffers(dataset), true);
  const duplicateId = clonePayload();
  duplicateId.observations[1].public_observation_id = duplicateId.observations[0].public_observation_id;
  assert.throws(() => assertPublicOffers(duplicateId), /duplicated/);
  const staleLatest = clonePayload();
  staleLatest.latest_observed_at = staleLatest.observations[0].observed_at;
  assert.throws(() => assertPublicOffers(staleLatest), /latest timestamp is stale/);
  const missingProduct = clonePayload();
  missingProduct.products = missingProduct.products.filter((item) => item.mpn !== missingProduct.observations[0].mpn);
  assert.throws(() => assertPublicOffers(missingProduct), /referential integrity/);
  const unknownRetailerField = clonePayload();
  unknownRetailerField.retailers[0].source_approved = true;
  assert.throws(() => assertPublicOffers(unknownRetailerField), /retailer shape/);
  const wrongUrlKind = clonePayload();
  wrongUrlKind.observations[0].observation_kind = wrongUrlKind.observations[0].observation_kind === "archived_retail_observation" ? "direct_retail_observation" : "archived_retail_observation";
  assert.throws(() => assertPublicOffers(wrongUrlKind), /URL-kind/);
});

test("arbitrary direct host is excluded even when the ledger is mutated to agree", (t) => {
  const root = temporaryFixture(t);
  const evil = "https://evil.example/product";
  mutateJson(root, DIRECT_TRANCHE, (tranche) => { directObservation(tranche).source.source_url = evil; directObservation(tranche).evidence.source_url = evil; });
  mutateJson(root, DIRECT_LEDGER, (ledger) => { directEvidence(ledger).source_url = evil; directEvidence(ledger).final_url = evil; });
  assertDirectExcluded(buildPublicOffers(rootUrl(root)), "source_url_contract_mismatch");
});

test("omitted or hash-mismatched evidence and omitted product scope are fail-closed", (t) => {
  const evidenceRoot = temporaryFixture(t);
  mutateJson(evidenceRoot, DIRECT_LEDGER, (ledger) => { ledger.entries = ledger.entries.filter((item) => item !== directEvidence(ledger)); });
  assertDirectExcluded(buildPublicOffers(rootUrl(evidenceRoot)), "missing_evidence_ledger_entry");

  const hashRoot = temporaryFixture(t);
  mutateJson(hashRoot, DIRECT_TRANCHE, (tranche) => { directObservation(tranche).evidence.response_sha256 = "0".repeat(64); });
  assertDirectExcluded(buildPublicOffers(rootUrl(hashRoot)), "evidence_facts_mismatch");

  const productRoot = temporaryFixture(t);
  mutateJson(productRoot, DIRECT_TRANCHE, (tranche) => { delete directObservation(tranche).product; });
  assertDirectExcluded(buildPublicOffers(rootUrl(productRoot)), "evidence_facts_mismatch");
});

test("future observation and ambiguous availability are fail-closed", (t) => {
  const futureRoot = temporaryFixture(t);
  mutateJson(futureRoot, DIRECT_TRANCHE, (tranche) => { directObservation(tranche).observed_at = "2026-08-17T10:30:07Z"; });
  assertDirectExcluded(buildPublicOffers(rootUrl(futureRoot)), "invalid_or_future_observed_at");

  const ambiguousRoot = temporaryFixture(t);
  mutateJson(ambiguousRoot, DIRECT_TRANCHE, (tranche) => { directObservation(tranche).availability.eligibility_semantics = "ambiguous"; });
  const result = buildPublicOffers(rootUrl(ambiguousRoot));
  assertDirectExcluded(result, "availability_not_explicitly_orderable");
  assertDirectExcluded(result, "record_specific_ambiguity_restriction_or_rejection");
});

test("conflicting same-key archived facts suppress every record for that key", (t) => {
  const root = temporaryFixture(t);
  mutateJson(root, ARCHIVE_TRANCHE, (tranche) => {
    const original = tranche.observations.find((item) => item.observation_id === ARCHIVE_ID);
    const clone = structuredClone(original);
    clone.observation_id = `${ARCHIVE_ID}-conflict`;
    clone.source.evidence_id = `${ARCHIVE_EVIDENCE_ID}-conflict`;
    clone.price.item_price_minor += 1;
    tranche.observations.push(clone);
  });
  mutateJson(root, ARCHIVE_LEDGER, (ledger) => {
    const clone = structuredClone(ledger.entries.find((item) => item.evidence_id === ARCHIVE_EVIDENCE_ID));
    clone.evidence_id = `${ARCHIVE_EVIDENCE_ID}-conflict`;
    clone.facts.item_price_minor += 1;
    ledger.entries.push(clone);
  });
  const result = buildPublicOffers(rootUrl(root));
  const key = "KF564C32RSK2-32|ccl|2023-01-31T16:46:06Z";
  assert.equal(result.payload.observations.some((item) => keyOf(item) === key), false);
  assert.equal(result.reviewQueue.items.filter((item) => item.reasons.includes("conflicting_same_retailer_timestamp") && item.observed_at === "2023-01-31T16:46:06Z").length, 2);
});

test("an exact duplicate retains one record and queues the rest", (t) => {
  const root = temporaryFixture(t);
  mutateJson(root, ARCHIVE_TRANCHE, (tranche) => {
    const clone = structuredClone(tranche.observations.find((item) => item.observation_id === ARCHIVE_ID));
    clone.observation_id = `${ARCHIVE_ID}-duplicate`;
    clone.source.evidence_id = `${ARCHIVE_EVIDENCE_ID}-duplicate`;
    tranche.observations.push(clone);
  });
  mutateJson(root, ARCHIVE_LEDGER, (ledger) => {
    const clone = structuredClone(ledger.entries.find((item) => item.evidence_id === ARCHIVE_EVIDENCE_ID));
    clone.evidence_id = `${ARCHIVE_EVIDENCE_ID}-duplicate`;
    ledger.entries.push(clone);
  });
  const result = buildPublicOffers(rootUrl(root));
  const key = "KF564C32RSK2-32|ccl|2023-01-31T16:46:06Z";
  assert.equal(result.payload.observations.filter((item) => keyOf(item) === key).length, 1);
  assert.ok(result.reviewQueue.items.some((item) => item.reasons.includes("duplicate_fact") && item.observation_id.endsWith("-duplicate")));
});

test("missing review/product mapping and policy authority drift stop the build", (t) => {
  const reviewRoot = temporaryFixture(t);
  mutateJson(reviewRoot, "config/factual-offer-publication-policy.v1.json", (policy) => { policy.approved_products[0].catalogue_review_id = "missing-review"; });
  assert.throws(() => buildPublicOffers(rootUrl(reviewRoot)), /catalogue\/review mapping missing/);

  const authorityRoot = temporaryFixture(t);
  mutateJson(authorityRoot, "config/factual-offer-publication-policy.v1.json", (policy) => { policy.authority.aggregate_index = true; });
  assert.throws(() => buildPublicOffers(rootUrl(authorityRoot)), /exceeds or lacks its authority/);
});

test("out-of-stock, ambiguous, malformed, and evidence-less records remain private", () => {
  assert.ok(queue.items.some((entry) => entry.reasons.includes("availability_not_explicitly_orderable")));
  assert.ok(queue.items.some((entry) => entry.reasons.includes("record_specific_ambiguity_restriction_or_rejection")));
  assert.ok(queue.items.some((entry) => entry.reasons.includes("missing_evidence_ledger_entry")));
  for (const item of dataset.observations) {
    assert.ok(["in_stock", "available_to_order"].includes(item.availability));
    assert.equal(item.observed_at.startsWith("2026-08-11"), false, "11 August remains unobserved_no_run");
  }
});
