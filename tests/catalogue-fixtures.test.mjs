import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  loadJson,
  normalizeMpn,
  validateCatalogue,
  validateCatalogueReview,
  validateEvidenceExtract,
  validateEvidenceManifest,
  validateListingFixtures,
} from "../lib/catalogue-fixtures.mjs";

const cataloguePath = "data/catalogue/ddr5-32gb-seed.v1.json";
const fixturesPath = "data/fixtures/listing-matches.v1.json";

function copy(value) {
  return structuredClone(value);
}

function load() {
  return {
    catalogue: loadJson(cataloguePath),
    fixtures: loadJson(fixturesPath),
  };
}

test("candidate catalogue is deterministic, in scope and backed by retained evidence", () => {
  const { catalogue } = load();
  const result = validateCatalogue(catalogue, { evidenceExists: existsSync });
  assert.equal(result.productCount, 4);
  assert.equal(result.productKeys.size, 4);
});

test("minimal factual evidence extracts match the checksum-pinned manifest", () => {
  const { catalogue } = load();
  const manifest = loadJson("research/evidence/catalogue-2026-08-06/manifest.json");
  const manifestResult = validateEvidenceManifest(manifest);
  const productMpnByEvidence = new Map();
  for (const product of catalogue.products) {
    for (const reference of [...product.review.evidence_references, ...product.identifiers.map((identifier) => identifier.evidence_reference)]) {
      const existing = productMpnByEvidence.get(reference);
      assert.ok(!existing || existing === product.mpn_normalized, `${reference} cannot support two product MPNs`);
      productMpnByEvidence.set(reference, product.mpn_normalized);
    }
  }

  const manifestedPaths = new Set();
  for (const item of manifest.items) {
    const path = `research/evidence/catalogue-2026-08-06/${item.file}`;
    const bytes = readFileSync(path);
    assert.equal(bytes.length, item.bytes, `${item.file} byte count changed`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, `${item.file} checksum changed`);
    const extract = loadJson(path);
    validateEvidenceExtract(extract);
    assert.equal(extract.product_mpn, item.product_mpn, `${item.file} MPN disagrees with manifest`);
    assert.equal(extract.product_mpn, productMpnByEvidence.get(path), `${item.file} MPN disagrees with catalogue product`);
    manifestedPaths.add(path);
  }
  assert.equal(manifestResult.files.size, manifest.items.length);
  assert.deepEqual([...productMpnByEvidence.keys()].sort(), [...manifestedPaths].sort(), "manifest and catalogue evidence references must be bidirectional");
});

test("MPN normalisation is conservative and preserves punctuation", () => {
  assert.equal(normalizeMpn("  kf560c30bbek2-32  "), "KF560C30BBEK2-32");
  assert.equal(normalizeMpn("Ｆ５-6000j3636f16gx2-fx5"), "F5-6000J3636F16GX2-FX5");
  assert.notEqual(normalizeMpn("F5-6000J3636F16GX2-FX5"), "F56000J3636F16GX2FX5");
});

test("catalogue rejects identity normalisation drift", () => {
  const { catalogue } = load();
  const broken = copy(catalogue);
  broken.products[0].mpn_normalized = "KF560C30BBEK232";
  assert.throws(() => validateCatalogue(broken), /normalization|normalised|violates/i);
});

test("catalogue rejects products outside the 32GB 2x16 UDIMM scope", () => {
  const { catalogue } = load();
  const broken = copy(catalogue);
  broken.products[0].specification.total_capacity_gb = 64;
  assert.throws(() => validateCatalogue(broken), /32GB/);
});

test("catalogue cannot claim human review without the review transition", () => {
  const { catalogue } = load();
  const broken = copy(catalogue);
  broken.products[0].review.status = "reviewed";
  assert.throws(() => validateCatalogue(broken), /remain draft/);
});

test("human review transition is additive, attributable and covers the exact fixture sets", () => {
  const { catalogue, fixtures } = load();
  const review = loadJson("data/reviews/ddr5-32gb-seed-review-2026-08-06.json");
  assert.equal(validateCatalogueReview(review, catalogue, fixtures), true);
  assert.equal(catalogue.status, "candidate_pending_human_review");
  assert.ok(catalogue.products.every((product) => product.review.status === "draft"));
  assert.equal(fixtures.auto_confirmation_gate, "locked");
});

test("manufacturer keys, names and aliases remain one-to-one", () => {
  const { catalogue } = load();
  const broken = copy(catalogue);
  broken.products[1].manufacturer.name = "Different Legal Name";
  assert.throws(() => validateCatalogue(broken), /redefines manufacturer key/);

  const aliasCollision = copy(catalogue);
  for (const product of aliasCollision.products.filter((candidate) => candidate.manufacturer.key === "kingston-technology")) {
    product.manufacturer.aliases = ["Kingston"];
  }
  for (const product of aliasCollision.products.filter((candidate) => candidate.manufacturer.key === "gskill")) {
    product.manufacturer.aliases.push("Kingston Technology");
  }
  assert.throws(() => validateCatalogue(aliasCollision), /manufacturer alias is ambiguous/);
});

test("candidate SQL rendering is deterministic and independent of caller working directory", () => {
  const script = fileURLToPath(new URL("../scripts/render-catalogue-seed-sql.mjs", import.meta.url));
  const fromProject = execFileSync(process.execPath, [script], { encoding: "utf8" });
  const fromTemporaryDirectory = execFileSync(process.execPath, [script], { encoding: "utf8", cwd: "/tmp" });
  assert.equal(fromProject, fromTemporaryDirectory);
  assert.match(fromProject, /Fresh disposable database only/);
  assert.doesNotMatch(fromProject, /ON CONFLICT/i);
});

test("labelled fixtures cover match, negative, abstention and unsupported outcomes", () => {
  const { catalogue, fixtures } = load();
  validateCatalogue(catalogue, { evidenceExists: existsSync });
  const result = validateListingFixtures(fixtures, catalogue);
  assert.equal(result.exampleCount, 20);
  assert.deepEqual([...result.decisionsSeen].sort(), ["abstain_ambiguous", "abstain_insufficient", "match", "no_match", "unsupported"]);
});

test("identity and index qualification remain separate", () => {
  const { catalogue, fixtures } = load();
  const refurbished = fixtures.examples.find((example) => example.example_id === "exact-identity-refurbished-ineligible");
  assert.equal(refurbished.expected.decision, "match");
  assert.equal(refurbished.qualification.index_eligible, false);
  validateListingFixtures(fixtures, catalogue);
});

test("global auto-confirmation lock rejects an enabled fixture", () => {
  const { catalogue, fixtures } = load();
  const broken = copy(fixtures);
  broken.examples[0].expected.auto_confirmation_allowed = true;
  assert.throws(() => validateListingFixtures(broken, catalogue), /cannot enable auto-confirmation/);
});

test("exact MPN fixture cannot target an unrelated product", () => {
  const { catalogue, fixtures } = load();
  const broken = copy(fixtures);
  broken.examples[0].expected.product_key = "gskill-trident-z5-neo-rgb-f5-6000j3636f16gx2-tz5nr";
  assert.throws(() => validateListingFixtures(broken, catalogue), /does not resolve to the expected product/);
});

test("decision and reason code cannot contradict each other", () => {
  const { catalogue, fixtures } = load();
  const broken = copy(fixtures);
  broken.examples[0].expected.reason_code = "missing_identifier";
  assert.throws(() => validateListingFixtures(broken, catalogue), /reason code contradicts/);
});

test("negative and near-MPN labels must establish their stated semantics", () => {
  const { catalogue, fixtures } = load();
  const contradictoryNegative = copy(fixtures);
  const noMatch = contradictoryNegative.examples.find((example) => example.expected.reason_code === "no_catalogue_product");
  noMatch.listing.memory_generation = "DDR4";
  assert.throws(() => validateListingFixtures(contradictoryNegative, catalogue), /scope contradiction/);

  const notActuallyNear = copy(fixtures);
  const near = notActuallyNear.examples.find((example) => example.expected.reason_code === "near_mpn_only");
  near.listing.mpn_raw = "TOTALLY-UNRELATED-MPN";
  assert.throws(() => validateListingFixtures(notActuallyNear, catalogue), /not near a catalogue MPN/);
});

test("non-match outcomes cannot smuggle in a catalogue product", () => {
  const { catalogue, fixtures } = load();
  const broken = copy(fixtures);
  const abstention = broken.examples.find((example) => example.expected.decision === "abstain_ambiguous");
  abstention.expected.product_key = catalogue.products[0].product_key;
  assert.throws(() => validateListingFixtures(broken, catalogue), /must not carry a product/);
});
