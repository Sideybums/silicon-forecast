import { createHash } from "node:crypto";
import { validateCombinedCatalogues } from "./catalogue-fixtures.mjs";

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const utcTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const lifecycleStates = new Set([
  "ACTIVE",
  "AVAILABILITY_AT_RISK",
  "DISCONTINUED",
  "SUCCESSOR_CANDIDATE",
  "IDENTITY_INVALID",
]);
const allowedTransitions = new Map([
  [null, new Set(["ACTIVE", "SUCCESSOR_CANDIDATE"])],
  ["ACTIVE", new Set(["AVAILABILITY_AT_RISK", "IDENTITY_INVALID"])],
  ["AVAILABILITY_AT_RISK", new Set(["ACTIVE", "DISCONTINUED", "IDENTITY_INVALID"])],
  ["SUCCESSOR_CANDIDATE", new Set(["ACTIVE", "IDENTITY_INVALID"])],
  ["DISCONTINUED", new Set()],
  ["IDENTITY_INVALID", new Set()],
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, keys, context) {
  invariant(value && typeof value === "object" && !Array.isArray(value), `${context} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  invariant(JSON.stringify(actual) === JSON.stringify(expected), `${context} fields must be exactly: ${expected.join(", ")}`);
}

function nonBlank(value, context) {
  invariant(typeof value === "string" && value.trim().length > 0, `${context} must be non-blank`);
}

function sortedEntries(counts) {
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => ({ key, count }));
}

export function validateResilienceFixture(fixture, catalogues, { reviewArtifactsByReference = new Map() } = {}) {
  exactKeys(
    fixture,
    ["schema_version", "fixture_set_id", "status", "catalogue_fixture_set_ids", "catalogue_review_bindings", "locks", "research_coverage_targets", "product_dimensions", "pool_memberships", "lifecycle_scenarios"],
    "resilience fixture",
  );
  invariant(fixture.schema_version === 1, "unsupported resilience fixture schema_version");
  invariant(slug.test(fixture.fixture_set_id), "resilience fixture.fixture_set_id must be a slug");
  invariant(fixture.status === "fixture_only_pending_human_review", "resilience fixture must remain pending human review");
  invariant(Array.isArray(catalogues) && catalogues.length > 0, "catalogues must be non-empty");

  const expectedFixtureIds = catalogues.map((catalogue) => catalogue.fixture_set_id).sort();
  invariant(
    JSON.stringify([...fixture.catalogue_fixture_set_ids].sort()) === JSON.stringify(expectedFixtureIds),
    "resilience fixture must reference every supplied catalogue exactly once",
  );
  validateCombinedCatalogues(catalogues);
  invariant(reviewArtifactsByReference instanceof Map, "reviewArtifactsByReference must be a Map");
  invariant(Array.isArray(fixture.catalogue_review_bindings), "catalogue_review_bindings must be an array");
  invariant(fixture.catalogue_review_bindings.length === catalogues.length, "every catalogue requires one review binding");
  const catalogueByFixtureId = new Map(catalogues.map((catalogue) => [catalogue.fixture_set_id, catalogue]));
  const reviewedProductKeysByFixtureId = new Map();
  for (const [index, binding] of fixture.catalogue_review_bindings.entries()) {
    const context = `catalogue_review_bindings[${index}]`;
    exactKeys(binding, ["catalogue_fixture_set_id", "catalogue_content_sha256", "reviewed_product_keys", "review_reference", "review_sha256"], context);
    const catalogue = catalogueByFixtureId.get(binding.catalogue_fixture_set_id);
    invariant(catalogue, `${context} references an unknown catalogue`);
    invariant(!reviewedProductKeysByFixtureId.has(binding.catalogue_fixture_set_id), `${context} duplicates a catalogue`);
    invariant(/^[0-9a-f]{64}$/u.test(binding.catalogue_content_sha256), `${context}.catalogue_content_sha256 must be SHA-256`);
    const actualCatalogueContentSha256 = createHash("sha256").update(JSON.stringify(catalogue)).digest("hex");
    invariant(binding.catalogue_content_sha256 === actualCatalogueContentSha256, `${context} catalogue content checksum disagrees with its binding`);
    invariant(Array.isArray(binding.reviewed_product_keys), `${context}.reviewed_product_keys must be an array`);
    const reviewedProductKeys = new Set(binding.reviewed_product_keys);
    invariant(reviewedProductKeys.size === binding.reviewed_product_keys.length, `${context}.reviewed_product_keys must be unique`);
    const catalogueProductKeys = new Set(catalogue.products.map((product) => product.product_key));
    for (const productKey of reviewedProductKeys) invariant(catalogueProductKeys.has(productKey), `${context} reviews a product outside its catalogue: ${productKey}`);

    if (reviewedProductKeys.size > 0) {
      nonBlank(binding.review_reference, `${context}.review_reference`);
      invariant(/^[0-9a-f]{64}$/u.test(binding.review_sha256), `${context}.review_sha256 must be SHA-256`);
      const suppliedReview = reviewArtifactsByReference.get(binding.review_reference);
      invariant(Buffer.isBuffer(suppliedReview) || typeof suppliedReview === "string", `${context} reviewed products require raw approval artifact bytes`);
      const reviewBytes = Buffer.isBuffer(suppliedReview) ? suppliedReview : Buffer.from(suppliedReview, "utf8");
      const reviewSha256 = createHash("sha256").update(reviewBytes).digest("hex");
      invariant(reviewSha256 === binding.review_sha256, `${context} approval artifact checksum disagrees with its binding`);
      let review;
      try {
        review = JSON.parse(reviewBytes.toString("utf8"));
      } catch {
        throw new Error(`${context} approval artifact bytes are not valid JSON`);
      }
      invariant(review.catalogue_fixture_set_id === catalogue.fixture_set_id, `${context} approval artifact references the wrong catalogue`);
      invariant(review.reviewed_by?.role === "project_owner", `${context} approval artifact is not attributable to the project owner`);
      const artifactProductKeys = review.review_type === "human_catalogue_selection_review"
        ? review.approved_product_keys
        : review.product_keys;
      const expectedDecision = review.review_type === "human_catalogue_selection_review"
        ? "approved_selected_for_fixture_use"
        : "approved_for_fixture_use";
      invariant(review.decision === expectedDecision, `${context} approval artifact has an unexpected decision`);
      invariant(Array.isArray(artifactProductKeys), `${context} approval artifact reviewed product keys must be an array`);
      invariant(JSON.stringify([...artifactProductKeys].sort()) === JSON.stringify([...reviewedProductKeys].sort()), `${context} approval artifact does not cover the exact reviewed products`);
      if (review.review_type === "human_catalogue_selection_review") {
        invariant(review.catalogue_content_sha256 === binding.catalogue_content_sha256, `${context} selected approval catalogue checksum disagrees with its binding`);
        const heldProductKeys = new Set(review.held_product_keys);
        invariant(JSON.stringify([...reviewedProductKeys, ...heldProductKeys].sort()) === JSON.stringify([...catalogueProductKeys].sort()), `${context} selected approval does not partition the catalogue`);
      } else {
        invariant(reviewedProductKeys.size === catalogueProductKeys.size, `${context} legacy approval must cover the whole catalogue`);
      }
      invariant(Array.isArray(review.limitations), `${context} approval artifact limitations must be an array`);
      for (const limitation of ["does_not_approve_production_activation", "does_not_approve_index_methodology_or_baseline", "does_not_approve_source_access_or_publication", "does_not_enable_automatic_product_matching"]) {
        invariant(review.limitations.includes(limitation), `${context} approval artifact is missing limitation: ${limitation}`);
      }
    } else {
      invariant(binding.review_reference === null, `${context} unreviewed catalogue cannot carry an approval reference`);
      invariant(binding.review_sha256 === null, `${context} unreviewed catalogue cannot carry an approval checksum`);
    }
    reviewedProductKeysByFixtureId.set(binding.catalogue_fixture_set_id, reviewedProductKeys);
  }

  exactKeys(fixture.locks, ["production_activation", "methodology_change", "source_approval", "external_publication", "automatic_pool_promotion", "basket_mutation"], "resilience fixture.locks");
  for (const [name, state] of Object.entries(fixture.locks)) invariant(state === "locked", `${name} must remain locked`);

  invariant(Array.isArray(fixture.research_coverage_targets) && fixture.research_coverage_targets.length > 0, "research coverage targets must be non-empty");
  const targetKeys = new Set();
  for (const [index, target] of fixture.research_coverage_targets.entries()) {
    const context = `research_coverage_targets[${index}]`;
    exactKeys(target, ["manufacturer_key", "manufacturer_name", "priority"], context);
    invariant(slug.test(target.manufacturer_key), `${context}.manufacturer_key must be a slug`);
    nonBlank(target.manufacturer_name, `${context}.manufacturer_name`);
    invariant(target.priority === "required_research", `${context}.priority must remain required_research`);
    invariant(!targetKeys.has(target.manufacturer_key), `${context}.manufacturer_key must be unique`);
    targetKeys.add(target.manufacturer_key);
  }

  const products = catalogues.flatMap((catalogue) => catalogue.products);
  const productByKey = new Map(products.map((product) => [product.product_key, product]));
  const expectedCatalogueStatusByProduct = new Map(catalogues.flatMap((catalogue) => catalogue.products.map((product) => [
    product.product_key,
    reviewedProductKeysByFixtureId.get(catalogue.fixture_set_id).has(product.product_key) ? "reviewed_fixture" : "candidate_pending_review",
  ])));
  invariant(productByKey.size === products.length, "catalogues contain duplicate product keys");

  invariant(Array.isArray(fixture.product_dimensions), "product_dimensions must be an array");
  const dimensionsByProduct = new Map();
  for (const [index, dimension] of fixture.product_dimensions.entries()) {
    const context = `product_dimensions[${index}]`;
    exactKeys(dimension, ["product_key", "family_key", "family_name"], context);
    invariant(productByKey.has(dimension.product_key), `${context} references an unknown product`);
    invariant(!dimensionsByProduct.has(dimension.product_key), `${context} duplicates a product`);
    invariant(slug.test(dimension.family_key), `${context}.family_key must be a slug`);
    nonBlank(dimension.family_name, `${context}.family_name`);
    dimensionsByProduct.set(dimension.product_key, dimension);
  }
  invariant(dimensionsByProduct.size === productByKey.size, "every catalogue product requires one family dimension");

  invariant(Array.isArray(fixture.pool_memberships), "pool_memberships must be an array");
  const membershipsByProduct = new Map();
  for (const [index, membership] of fixture.pool_memberships.entries()) {
    const context = `pool_memberships[${index}]`;
    exactKeys(membership, ["product_key", "monitored_universe", "canonical_catalogue_status", "baseline_eligible", "reserve_candidate", "basket_vintage_ids", "eligibility_blockers"], context);
    invariant(productByKey.has(membership.product_key), `${context} references an unknown product`);
    invariant(!membershipsByProduct.has(membership.product_key), `${context} duplicates a product`);
    invariant(membership.monitored_universe === true, `${context} must remain in the monitored-universe pilot`);
    invariant(new Set(["reviewed_fixture", "candidate_pending_review"]).has(membership.canonical_catalogue_status), `${context} has an invalid catalogue status`);
    invariant(membership.canonical_catalogue_status === expectedCatalogueStatusByProduct.get(membership.product_key), `${context} catalogue status disagrees with its approval binding`);
    invariant(membership.baseline_eligible === false, `${context} cannot claim baseline eligibility`);
    invariant(membership.reserve_candidate === false, `${context} cannot claim reserve readiness`);
    invariant(Array.isArray(membership.basket_vintage_ids) && membership.basket_vintage_ids.length === 0, `${context} cannot claim basket membership`);
    invariant(Array.isArray(membership.eligibility_blockers) && membership.eligibility_blockers.length > 0, `${context} requires explicit blockers`);
    invariant(new Set(membership.eligibility_blockers).size === membership.eligibility_blockers.length, `${context} blockers must be unique`);
    for (const blocker of membership.eligibility_blockers) invariant(slug.test(blocker), `${context} blocker must be a slug`);
    if (membership.canonical_catalogue_status === "candidate_pending_review") {
      invariant(membership.eligibility_blockers.includes("additive-catalogue-review-pending"), `${context} must retain the additive review blocker`);
    }
    membershipsByProduct.set(membership.product_key, membership);
  }
  invariant(membershipsByProduct.size === productByKey.size, "every catalogue product requires one pool membership");

  invariant(Array.isArray(fixture.lifecycle_scenarios) && fixture.lifecycle_scenarios.length > 0, "lifecycle_scenarios must be non-empty");
  const eventIds = new Set();
  for (const [scenarioIndex, scenario] of fixture.lifecycle_scenarios.entries()) {
    const scenarioContext = `lifecycle_scenarios[${scenarioIndex}]`;
    exactKeys(scenario, ["scenario_key", "fixture_scope", "events"], scenarioContext);
    invariant(slug.test(scenario.scenario_key), `${scenarioContext}.scenario_key must be a slug`);
    invariant(scenario.fixture_scope === "synthetic_control_plane_only", `${scenarioContext} cannot imply an empirical lifecycle decision`);
    invariant(Array.isArray(scenario.events) && scenario.events.length > 0, `${scenarioContext}.events must be non-empty`);
    let previousState = null;
    let previousEventId = null;
    let previousEffectiveAt = null;
    for (const [eventIndex, event] of scenario.events.entries()) {
      const context = `${scenarioContext}.events[${eventIndex}]`;
      exactKeys(event, ["event_id", "effective_at", "recorded_at", "from_state", "to_state", "supersedes_event_id", "basis", "review_status", "evidence_references"], context);
      invariant(slug.test(event.event_id), `${context}.event_id must be a slug`);
      invariant(!eventIds.has(event.event_id), `${context}.event_id must be globally unique`);
      eventIds.add(event.event_id);
      invariant(utcTimestamp.test(event.effective_at) && utcTimestamp.test(event.recorded_at), `${context} timestamps must be UTC ISO-8601`);
      invariant(!previousEffectiveAt || event.effective_at > previousEffectiveAt, `${context}.effective_at must increase additively`);
      invariant(event.from_state === previousState, `${context}.from_state must equal the prior state`);
      invariant(lifecycleStates.has(event.to_state), `${context}.to_state is invalid`);
      invariant(allowedTransitions.get(previousState).has(event.to_state), `${context} contains an invalid lifecycle transition`);
      invariant(event.supersedes_event_id === previousEventId, `${context}.supersedes_event_id must reference the prior event`);
      invariant(event.basis === "synthetic-control-plane-fixture", `${context} basis cannot imply observed evidence`);
      invariant(event.review_status === "draft", `${context} must remain draft`);
      invariant(Array.isArray(event.evidence_references) && event.evidence_references.length === 0, `${context} synthetic events cannot claim evidence`);
      previousState = event.to_state;
      previousEventId = event.event_id;
      previousEffectiveAt = event.effective_at;
    }
  }

  return { productByKey, dimensionsByProduct, membershipsByProduct, targetKeys, eventIds };
}

export function buildCoverageReport(fixture, catalogues, options = {}) {
  const validated = validateResilienceFixture(fixture, catalogues, options);
  const manufacturerCounts = new Map();
  const familyCounts = new Map();
  const speedCounts = new Map();
  const presentManufacturerKeys = new Set();
  let reviewedFixtureCount = 0;
  let candidatePendingReviewCount = 0;

  for (const product of validated.productByKey.values()) {
    presentManufacturerKeys.add(product.manufacturer.key);
    manufacturerCounts.set(product.manufacturer.key, (manufacturerCounts.get(product.manufacturer.key) ?? 0) + 1);
    const familyKey = validated.dimensionsByProduct.get(product.product_key).family_key;
    familyCounts.set(familyKey, (familyCounts.get(familyKey) ?? 0) + 1);
    const speedKey = String(product.specification.speed_mt_s);
    speedCounts.set(speedKey, (speedCounts.get(speedKey) ?? 0) + 1);
    const status = validated.membershipsByProduct.get(product.product_key).canonical_catalogue_status;
    if (status === "reviewed_fixture") reviewedFixtureCount += 1;
    else candidatePendingReviewCount += 1;
  }

  return {
    schema_version: 1,
    report_type: "candidate_catalogue_coverage",
    fixture_set_id: fixture.fixture_set_id,
    status: "fixture_only_not_methodology_approved",
    layers: {
      monitored_universe: validated.productByKey.size,
      reviewed_fixture: reviewedFixtureCount,
      candidate_pending_review: candidatePendingReviewCount,
      baseline_eligible: 0,
      reserve_candidates: 0,
      basket_memberships: 0,
    },
    manufacturer_counts: sortedEntries(manufacturerCounts),
    family_counts: sortedEntries(familyCounts),
    speed_mt_s_counts: sortedEntries(speedCounts),
    missing_required_research_manufacturers: [...validated.targetKeys]
      .filter((key) => !presentManufacturerKeys.has(key))
      .sort(),
    locks: { ...fixture.locks },
  };
}
