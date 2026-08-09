import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildCoverageReport, validateResilienceFixture } from "../lib/catalogue-resilience.mjs";
import { loadJson } from "../lib/catalogue-fixtures.mjs";

const fixturePath = "data/fixtures/ddr5-32gb-resilience-pilot.v1.json";
const cataloguePaths = [
  "data/catalogue/ddr5-32gb-seed.v1.json",
  "data/catalogue/ddr5-32gb-expansion.v1.json",
  "data/catalogue/ddr5-32gb-diversification.v1.json",
];

function load() {
  const reviewReferences = [
    "data/reviews/ddr5-32gb-seed-review-2026-08-06.json",
    "data/reviews/ddr5-32gb-diversification-review-2026-08-09.json",
  ];
  return {
    fixture: loadJson(fixturePath),
    catalogues: cataloguePaths.map(loadJson),
    reviewArtifactsByReference: new Map(reviewReferences.map((reviewReference) => [
      reviewReference,
      readFileSync(reviewReference),
    ])),
  };
}

function copy(value) {
  return structuredClone(value);
}

test("resilience pilot keeps monitored, reviewed, reserve and basket states separate", () => {
  const { fixture, catalogues, reviewArtifactsByReference } = load();
  const result = validateResilienceFixture(fixture, catalogues, { reviewArtifactsByReference });
  assert.equal(result.productByKey.size, 16);
  assert.equal(result.membershipsByProduct.size, 16);
  assert.ok(fixture.pool_memberships.every((membership) => membership.monitored_universe));
  assert.ok(fixture.pool_memberships.every((membership) => !membership.baseline_eligible));
  assert.ok(fixture.pool_memberships.every((membership) => !membership.reserve_candidate));
  assert.ok(fixture.pool_memberships.every((membership) => membership.basket_vintage_ids.length === 0));
  assert.deepEqual(new Set(fixture.pool_memberships.map((membership) => membership.canonical_catalogue_status)), new Set(["reviewed_fixture", "candidate_pending_review"]));
});

test("coverage report is deterministic and exposes current manufacturer gaps", () => {
  const { fixture, catalogues, reviewArtifactsByReference } = load();
  const report = buildCoverageReport(fixture, catalogues, { reviewArtifactsByReference });
  assert.deepEqual(report.layers, {
    monitored_universe: 16,
    reviewed_fixture: 6,
    candidate_pending_review: 10,
    baseline_eligible: 0,
    reserve_candidates: 0,
    basket_memberships: 0,
  });
  assert.deepEqual(report.manufacturer_counts, [
    { key: "adata-xpg", count: 2 },
    { key: "corsair", count: 1 },
    { key: "crucial", count: 4 },
    { key: "gskill", count: 2 },
    { key: "kingston-technology", count: 3 },
    { key: "patriot-viper", count: 1 },
    { key: "teamgroup", count: 3 },
  ]);
  assert.deepEqual(report.speed_mt_s_counts, [
    { key: "4800", count: 1 },
    { key: "5600", count: 3 },
    { key: "6000", count: 9 },
    { key: "6400", count: 3 },
  ]);
  assert.deepEqual(report.missing_required_research_manufacturers, ["lexar"]);
});

test("coverage report renderer is independent of caller working directory", () => {
  const script = fileURLToPath(new URL("../scripts/render-catalogue-coverage-report.mjs", import.meta.url));
  const fromProject = execFileSync(process.execPath, [script], { encoding: "utf8" });
  const fromTemporaryDirectory = execFileSync(process.execPath, [script], { encoding: "utf8", cwd: "/tmp" });
  assert.equal(fromProject, fromTemporaryDirectory);
  const { fixture, catalogues, reviewArtifactsByReference } = load();
  assert.deepEqual(JSON.parse(fromProject), buildCoverageReport(fixture, catalogues, { reviewArtifactsByReference }));
});

test("catalogue reporting status is bound to an exact approval artifact", () => {
  const { fixture, catalogues, reviewArtifactsByReference } = load();

  const forgedMembership = copy(fixture);
  const candidateMembership = forgedMembership.pool_memberships.find((membership) => membership.canonical_catalogue_status === "candidate_pending_review");
  candidateMembership.canonical_catalogue_status = "reviewed_fixture";
  candidateMembership.eligibility_blockers = candidateMembership.eligibility_blockers.filter((blocker) => blocker !== "additive-catalogue-review-pending");
  assert.throws(() => validateResilienceFixture(forgedMembership, catalogues, { reviewArtifactsByReference }), /status disagrees with its approval binding/);

  const forgedBinding = copy(fixture);
  const pendingBinding = forgedBinding.catalogue_review_bindings.find((binding) => binding.reviewed_product_keys.length === 0);
  pendingBinding.reviewed_product_keys.push(catalogues[1].products[0].product_key);
  assert.throws(() => validateResilienceFixture(forgedBinding, catalogues, { reviewArtifactsByReference }), /review_reference/);

  const wrongChecksum = copy(fixture);
  wrongChecksum.catalogue_review_bindings[0].review_sha256 = "0".repeat(64);
  assert.throws(() => validateResilienceFixture(wrongChecksum, catalogues, { reviewArtifactsByReference }), /checksum disagrees/);

  const tamperedReviews = new Map(reviewArtifactsByReference);
  const selectionReference = "data/reviews/ddr5-32gb-diversification-review-2026-08-09.json";
  const tamperedSelection = JSON.parse(tamperedReviews.get(selectionReference).toString("utf8"));
  tamperedSelection.approved_product_keys.push(tamperedSelection.held_product_keys.shift());
  tamperedReviews.set(selectionReference, Buffer.from(`${JSON.stringify(tamperedSelection, null, 2)}\n`));
  assert.throws(() => validateResilienceFixture(fixture, catalogues, { reviewArtifactsByReference: tamperedReviews }), /approval artifact checksum disagrees/);

  const mutatedReviewedCatalogues = copy(catalogues);
  mutatedReviewedCatalogues[0].products[0].specification.speed_mt_s = 6200;
  assert.throws(() => validateResilienceFixture(fixture, mutatedReviewedCatalogues, { reviewArtifactsByReference }), /catalogue content checksum disagrees/);
});

test("automatic reserve promotion and basket mutation remain fail-closed", () => {
  const { fixture, catalogues, reviewArtifactsByReference } = load();
  const reservePromotion = copy(fixture);
  reservePromotion.pool_memberships[0].reserve_candidate = true;
  assert.throws(() => validateResilienceFixture(reservePromotion, catalogues, { reviewArtifactsByReference }), /reserve readiness/);

  const basketMutation = copy(fixture);
  basketMutation.pool_memberships[0].basket_vintage_ids.push("unapproved-vintage");
  assert.throws(() => validateResilienceFixture(basketMutation, catalogues, { reviewArtifactsByReference }), /basket membership/);

  const unlocked = copy(fixture);
  unlocked.locks.automatic_pool_promotion = "unlocked";
  assert.throws(() => validateResilienceFixture(unlocked, catalogues, { reviewArtifactsByReference }), /must remain locked/);
});

test("lifecycle fixtures are additive, synthetic and transition-checked", () => {
  const { fixture, catalogues, reviewArtifactsByReference } = load();
  const result = validateResilienceFixture(fixture, catalogues, { reviewArtifactsByReference });
  assert.equal(result.eventIds.size, 7);
  assert.ok(fixture.lifecycle_scenarios.every((scenario) => scenario.fixture_scope === "synthetic_control_plane_only"));
  assert.ok(fixture.lifecycle_scenarios.flatMap((scenario) => scenario.events).every((event) => event.review_status === "draft" && event.evidence_references.length === 0));

  const invalidTransition = copy(fixture);
  invalidTransition.lifecycle_scenarios[0].events[1].to_state = "SUCCESSOR_CANDIDATE";
  assert.throws(() => validateResilienceFixture(invalidTransition, catalogues, { reviewArtifactsByReference }), /invalid lifecycle transition/);

  const rewrittenHistory = copy(fixture);
  rewrittenHistory.lifecycle_scenarios[0].events[2].supersedes_event_id = null;
  assert.throws(() => validateResilienceFixture(rewrittenHistory, catalogues, { reviewArtifactsByReference }), /prior event/);
});
