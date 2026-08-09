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
  validateCatalogueEvidenceBinding,
  validateCatalogueReview,
  validateCatalogueSelectionReview,
  validateCombinedCatalogues,
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

test("catalogue expansion adds eight distinct first-party candidates without rewriting the reviewed seed", () => {
  const seed = loadJson(cataloguePath);
  const expansionPath = "data/catalogue/ddr5-32gb-expansion.v1.json";
  const expansion = loadJson(expansionPath);
  const expansionResult = validateCatalogue(expansion, { evidenceExists: existsSync });
  assert.equal(expansionResult.productCount, 8);
  assert.equal(seed.products.length + expansion.products.length, 12);

  const scopedMpns = new Set();
  for (const product of [...seed.products, ...expansion.products]) {
    const scopedMpn = `${product.manufacturer.key}:${product.mpn_normalized}`;
    assert.ok(!scopedMpns.has(scopedMpn), `duplicate manufacturer-scoped MPN: ${scopedMpn}`);
    scopedMpns.add(scopedMpn);
  }
});

test("expansion evidence is minimal, checksum-pinned and bidirectional", () => {
  const expansion = loadJson("data/catalogue/ddr5-32gb-expansion.v1.json");
  const evidenceDirectory = "research/evidence/catalogue-expansion-2026-08-08";
  const manifest = loadJson(`${evidenceDirectory}/manifest.json`);
  const manifestResult = validateEvidenceManifest(manifest);
  const productMpnByEvidence = new Map();

  for (const product of expansion.products) {
    for (const reference of [...product.review.evidence_references, ...product.identifiers.map((identifier) => identifier.evidence_reference)]) {
      const existing = productMpnByEvidence.get(reference);
      assert.ok(!existing || existing === product.mpn_normalized, `${reference} cannot support two product MPNs`);
      productMpnByEvidence.set(reference, product.mpn_normalized);
    }
  }

  const manifestedPaths = new Set();
  for (const item of manifest.items) {
    const path = `${evidenceDirectory}/${item.file}`;
    const bytes = readFileSync(path);
    assert.equal(bytes.length, item.bytes, `${item.file} byte count changed`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, `${item.file} checksum changed`);
    const extract = loadJson(path);
    validateEvidenceExtract(extract);
    assert.equal(extract.product_mpn, item.product_mpn, `${item.file} MPN disagrees with manifest`);
    assert.equal(extract.product_mpn, productMpnByEvidence.get(path), `${item.file} MPN disagrees with expansion candidate`);
    manifestedPaths.add(path);
  }

  assert.equal(manifestResult.files.size, 8);
  assert.deepEqual([...productMpnByEvidence.keys()].sort(), [...manifestedPaths].sort(), "expansion manifest and catalogue evidence references must be bidirectional");
});

test("manufacturer-diversification catalogue remains draft before its additive selected-product review", () => {
  const catalogues = [
    loadJson(cataloguePath),
    loadJson("data/catalogue/ddr5-32gb-expansion.v1.json"),
    loadJson("data/catalogue/ddr5-32gb-diversification.v1.json"),
  ];
  const diversification = catalogues[2];
  const result = validateCatalogue(diversification, { evidenceExists: existsSync });
  const combined = validateCombinedCatalogues(catalogues, { evidenceExists: existsSync });
  assert.equal(result.productCount, 4);
  assert.equal(combined.productKeys.size, 16);
  assert.equal(combined.manufacturerMpns.size, 16);
  assert.ok(diversification.products.every((product) => product.review.status === "draft"));

  const scopedMpns = new Set();
  for (const product of catalogues.flatMap((catalogue) => catalogue.products)) {
    const scopedMpn = `${product.manufacturer.key}:${product.mpn_normalized}`;
    assert.ok(!scopedMpns.has(scopedMpn), `duplicate manufacturer-scoped MPN: ${scopedMpn}`);
    scopedMpns.add(scopedMpn);
  }
});

test("diversification evidence is first-party, checksum-pinned, bidirectional and caveat-preserving", () => {
  const catalogue = loadJson("data/catalogue/ddr5-32gb-diversification.v1.json");
  const evidenceDirectory = "research/evidence/catalogue-diversification-2026-08-08";
  const manifest = loadJson(`${evidenceDirectory}/manifest.json`);
  const manifestResult = validateEvidenceManifest(manifest);
  const productMpnByEvidence = new Map();
  const evidenceByReference = new Map();

  for (const product of catalogue.products) {
    assert.match(product.review.evidence_note, /pending human acceptance|pending human review/i);
    for (const reference of [...product.review.evidence_references, ...product.identifiers.map((identifier) => identifier.evidence_reference)]) {
      const existing = productMpnByEvidence.get(reference);
      assert.ok(!existing || existing === product.mpn_normalized, `${reference} cannot support two product MPNs`);
      productMpnByEvidence.set(reference, product.mpn_normalized);
    }
  }

  const manifestedPaths = new Set();
  for (const item of manifest.items) {
    const path = `${evidenceDirectory}/${item.file}`;
    const bytes = readFileSync(path);
    assert.equal(bytes.length, item.bytes, `${item.file} byte count changed`);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    assert.equal(sha256, item.sha256, `${item.file} checksum changed`);
    const extract = loadJson(path);
    evidenceByReference.set(path, bytes);
    validateEvidenceExtract(extract);
    assert.equal(extract.product_mpn, item.product_mpn, `${item.file} MPN disagrees with manifest`);
    assert.equal(extract.product_mpn, productMpnByEvidence.get(path), `${item.file} MPN disagrees with catalogue candidate`);
    manifestedPaths.add(path);
  }

  assert.equal(manifestResult.files.size, 4);
  assert.deepEqual([...productMpnByEvidence.keys()].sort(), [...manifestedPaths].sort(), "diversification manifest and catalogue evidence references must be bidirectional");
  assert.equal(validateCatalogueEvidenceBinding(catalogue, manifest, evidenceByReference), true);
  const adataExtracts = manifest.items.filter((item) => item.product_mpn.startsWith("AD5U"));
  assert.equal(adataExtracts.length, 2);
  for (const item of adataExtracts) {
    const extract = loadJson(`${evidenceDirectory}/${item.file}`);
    assert.equal(extract.facts.package_type, "Dual Tray");
    assert.match(extract.facts.module_configuration_note, /human-review caveat/);
  }
});

test("selected diversification review approves Corsair and Patriot while holding ADATA and abstaining on Lexar", () => {
  const catalogue = loadJson("data/catalogue/ddr5-32gb-diversification.v1.json");
  const reviewPath = "data/reviews/ddr5-32gb-diversification-review-2026-08-09.json";
  const reviewBytes = readFileSync(reviewPath);
  assert.equal(createHash("sha256").update(reviewBytes).digest("hex"), "cf3bc35b88cb1bcee46459da82044c185b9e6148f5980a144b9646dec1876cf6");
  const review = JSON.parse(reviewBytes.toString("utf8"));
  const manifestBytes = readFileSync(review.evidence_manifest_reference);
  const result = validateCatalogueSelectionReview(review, catalogue, { evidenceManifestBytes: manifestBytes });
  assert.deepEqual([...result.approvedProductKeys].sort(), [
    "corsair-vengeance-cmk32gx5m2b6000c36",
    "patriot-viper-venom-amd-vv532g60c30ak",
  ]);
  assert.deepEqual([...result.heldProductKeys].sort(), [
    "adata-ddr5-4800-ad5u480016g-dt",
    "adata-ddr5-5600-ad5u560016g-dt",
  ]);

  const catalogueDrift = copy(catalogue);
  catalogueDrift.products[0].specification.speed_mt_s = 6400;
  assert.throws(() => validateCatalogueSelectionReview(review, catalogueDrift, { evidenceManifestBytes: manifestBytes }), /content checksum disagrees/);

  const manifestDrift = Buffer.concat([manifestBytes, Buffer.from(" ")]);
  assert.throws(() => validateCatalogueSelectionReview(review, catalogue, { evidenceManifestBytes: manifestDrift }), /manifest checksum disagrees/);

  const overlappingApproval = copy(review);
  overlappingApproval.approved_product_keys.push(overlappingApproval.held_product_keys[0]);
  assert.throws(() => validateCatalogueSelectionReview(overlappingApproval, catalogue, { evidenceManifestBytes: manifestBytes }), /both approved and held/);

  const weakenedAbstention = copy(review);
  weakenedAbstention.abstentions[0].reason_code = "retailer_page_seen";
  assert.throws(() => validateCatalogueSelectionReview(weakenedAbstention, catalogue, { evidenceManifestBytes: manifestBytes }), /unexpected Lexar abstention reason/);
});

test("combined catalogue and evidence bindings reject cross-tranche or provenance drift", () => {
  const catalogues = [
    loadJson(cataloguePath),
    loadJson("data/catalogue/ddr5-32gb-expansion.v1.json"),
    loadJson("data/catalogue/ddr5-32gb-diversification.v1.json"),
  ];
  const duplicateMpn = copy(catalogues[2]);
  duplicateMpn.products[0].manufacturer = copy(catalogues[0].products[0].manufacturer);
  duplicateMpn.products[0].mpn_raw = catalogues[0].products[0].mpn_raw;
  duplicateMpn.products[0].mpn_normalized = catalogues[0].products[0].mpn_normalized;
  duplicateMpn.products[0].identifiers[0].raw_value = catalogues[0].products[0].mpn_raw;
  duplicateMpn.products[0].identifiers[0].normalized_value = catalogues[0].products[0].mpn_normalized;
  assert.throws(() => validateCombinedCatalogues([catalogues[0], catalogues[1], duplicateMpn]), /duplicate manufacturer-scoped MPN/);

  const catalogue = catalogues[2];
  const evidenceDirectory = "research/evidence/catalogue-diversification-2026-08-08";
  const manifest = loadJson(`${evidenceDirectory}/manifest.json`);
  const evidenceByReference = new Map(manifest.items.map((item) => {
    const path = `${evidenceDirectory}/${item.file}`;
    return [path, readFileSync(path)];
  }));

  const wrongSpeed = copy(catalogue);
  wrongSpeed.products[0].specification.speed_mt_s = 6400;
  assert.throws(() => validateCatalogueEvidenceBinding(wrongSpeed, manifest, evidenceByReference), /speed disagrees/);

  const wrongUrlManifest = copy(manifest);
  wrongUrlManifest.items[0].source_urls = ["https://example.invalid/unrelated"];
  assert.throws(() => validateCatalogueEvidenceBinding(catalogue, wrongUrlManifest, evidenceByReference), /source URLs disagree/);

  const overclaimedAdata = new Map(evidenceByReference);
  const adataReference = catalogue.products.find((product) => product.manufacturer.key === "adata-xpg").review.evidence_references[0];
  const adataExtract = JSON.parse(overclaimedAdata.get(adataReference).toString("utf8"));
  adataExtract.facts.total_capacity_gb = 32;
  adataExtract.facts.module_count = 2;
  const overclaimedAdataBytes = Buffer.from(`${JSON.stringify(adataExtract, null, 2)}\n`, "utf8");
  assert.throws(() => validateCatalogueEvidenceBinding(catalogue, manifest, new Map(overclaimedAdata).set(adataReference, overclaimedAdataBytes)), /byte count disagrees|checksum disagrees/);

  const staleManifestBinding = new Map(evidenceByReference);
  const firstReference = catalogue.products[0].review.evidence_references[0];
  const mutatedExtract = JSON.parse(staleManifestBinding.get(firstReference).toString("utf8"));
  mutatedExtract.facts.tested_speed_mt_s = 6400;
  const mutatedEvidenceBytes = Buffer.from(`${JSON.stringify(mutatedExtract, null, 2)}\n`, "utf8");
  assert.throws(() => validateCatalogueEvidenceBinding(catalogue, manifest, new Map(staleManifestBinding).set(firstReference, mutatedEvidenceBytes)), /byte count disagrees|checksum disagrees/);

  const truncatedEvidence = staleManifestBinding.get(firstReference).subarray(0, -1);
  assert.throws(() => validateCatalogueEvidenceBinding(catalogue, manifest, new Map(staleManifestBinding).set(firstReference, truncatedEvidence)), /byte count disagrees/);
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

test("reviewed catalogue SQL rendering is deterministic, validated and least-privilege", () => {
  const script = fileURLToPath(new URL("../scripts/render-catalogue-review-sql.mjs", import.meta.url));
  const fromProject = execFileSync(process.execPath, [script], { encoding: "utf8" });
  const fromTemporaryDirectory = execFileSync(process.execPath, [script], { encoding: "utf8", cwd: "/tmp" });
  assert.equal(fromProject, fromTemporaryDirectory);
  assert.match(fromProject, /SET LOCAL ROLE silicon_forecast_catalogue_reviewer/);
  assert.match(fromProject, /apply_approved_ddr5_seed_fixture_review\('[0-9a-f-]+'::uuid\)/);
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
