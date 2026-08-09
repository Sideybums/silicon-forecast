import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  deriveCandidateProductMovements,
  qualifyPrimaryRetailObservation,
  validateCandidateObservationFixture,
} from "../lib/primary-retail-observations.mjs";

const fixtureUrl = new URL(
  "../data/fixtures/primary-retail-observations.gb.v1.json",
  import.meta.url,
);
const loadFixture = async () => JSON.parse(await readFile(fixtureUrl, "utf8"));
const clone = (value) => structuredClone(value);

test("credential-free fixture is candidate-only and all consequential flags remain false", async () => {
  const fixture = await loadFixture();
  const validation = validateCandidateObservationFixture(fixture);

  assert.equal(validation.observationCount, 8);
  assert.equal(fixture.status, "candidate_fixture_only");
  assert.deepEqual(fixture.governance, {
    production_import_allowed: false,
    production_activation_allowed: false,
    index_inclusion_allowed: false,
    publication_allowed: false,
  });
  assert.ok(fixture.observations.every((item) => item.scope === "candidate_only"));
  assert.doesNotMatch(JSON.stringify(fixture), /bearer|api[_-]?key|password|secret/i);
});

test("qualification requires exact identity and complete primary-retail landed-price semantics", async () => {
  const fixture = await loadFixture();
  const eligible = qualifyPrimaryRetailObservation(fixture.observations[0]);
  assert.deepEqual(eligible, { status: "eligible", reasons: [], landed_price_minor: 10498 });

  const freeDelivery = qualifyPrimaryRetailObservation(fixture.observations[2]);
  assert.deepEqual(freeDelivery, { status: "eligible", reasons: [], landed_price_minor: 9999 });
});

test("qualification abstains for unresolved identity, seller, VAT, delivery, availability, or non-retail channel", async () => {
  const fixture = await loadFixture();
  const base = fixture.observations[0];
  const cases = [
    ["identity", (item) => { item.identity.mpn_observed = null; item.identity.match_basis = "unresolved"; }, "exact_mpn_unresolved"],
    ["seller", (item) => { item.retailer.seller_relationship = "unresolved"; }, "retailer_owned_seller_unresolved"],
    ["VAT", (item) => { item.item_price.vat_state = "unknown"; }, "vat_inclusion_unresolved"],
    ["delivery", (item) => { item.delivery.state = "unknown"; item.delivery.amount_minor = null; }, "mandatory_delivery_unresolved"],
    ["availability", (item) => { item.availability = "unknown"; }, "availability_unresolved"],
    ["channel", (item) => { item.channel = "MARKETPLACE"; }, "channel_not_primary_retail"],
  ];

  for (const [label, mutate, expectedReason] of cases) {
    const item = clone(base);
    mutate(item);
    const result = qualifyPrimaryRetailObservation(item);
    assert.equal(result.status, "abstain", label);
    assert.ok(result.reasons.includes(expectedReason), label);
    assert.equal("landed_price_minor" in result, false, label);
  }
});

test("qualification rejects contradictory landed totals and ineligible stock without inventing values", async () => {
  const fixture = await loadFixture();
  const contradictory = clone(fixture.observations[0]);
  contradictory.landed_price.amount_minor += 1;
  assert.deepEqual(qualifyPrimaryRetailObservation(contradictory), {
    status: "abstain",
    reasons: ["landed_price_arithmetic_mismatch"],
  });

  const unavailable = clone(fixture.observations[0]);
  unavailable.availability = "out_of_stock";
  assert.deepEqual(qualifyPrimaryRetailObservation(unavailable), {
    status: "abstain",
    reasons: ["not_available_to_purchase"],
  });
});

test("movement is deterministic, stays within each retailer-product line, and retains exact lineage", async () => {
  const fixture = await loadFixture();
  const expected = deriveCandidateProductMovements(fixture);
  const replay = deriveCandidateProductMovements(clone(fixture));
  const reordered = clone(fixture);
  reordered.observations.reverse();

  assert.deepEqual(replay, expected);
  assert.deepEqual(deriveCandidateProductMovements(reordered), expected);
  assert.equal(expected.calculation_version, "candidate-primary-retail-movement-v1");
  assert.equal(expected.scope, "candidate_only");
  assert.deepEqual(expected.governance, {
    production_import_allowed: false,
    production_activation_allowed: false,
    index_inclusion_allowed: false,
    publication_allowed: false,
  });
  assert.deepEqual(expected.movements, [
    {
      product_key: "kingston-fury-beast-kf560c30bbek2-32",
      retailer_key: "scan-fixture",
      from_date: "2026-08-01",
      to_date: "2026-08-08",
      from_landed_price_minor: 9999,
      to_landed_price_minor: 9498,
      change_minor: -501,
      change_basis_points: -501,
      direction: "down",
      from_observation_ids: ["fixture-scan-beast-2026-08-01"],
      to_observation_ids: ["fixture-scan-beast-2026-08-08"],
    },
    {
      product_key: "patriot-viper-venom-vv532g60c30ak",
      retailer_key: "currys-fixture",
      from_date: "2026-08-01",
      to_date: "2026-08-08",
      from_landed_price_minor: 11000,
      to_landed_price_minor: 11000,
      change_minor: 0,
      change_basis_points: 0,
      direction: "flat",
      from_observation_ids: ["fixture-currys-patriot-2026-08-01"],
      to_observation_ids: ["fixture-currys-patriot-2026-08-08"],
    },
  ]);
  assert.deepEqual(expected.abstentions, [
    { observation_id: "fixture-scan-beast-2026-08-08-vat-unknown", reasons: ["vat_inclusion_unresolved"] },
    { observation_id: "fixture-scan-patriot-2026-08-08-mpn-missing", reasons: ["exact_mpn_unresolved"] },
  ]);
  assert.deepEqual(expected.insufficient_history, [
    {
      product_key: "kingston-fury-beast-kf560c30bbek2-32",
      retailer_key: "currys-fixture",
      eligible_dates: ["2026-08-01"],
      reason: "requires_at_least_two_eligible_dates",
    },
    {
      product_key: "kingston-fury-beast-kf560c30bbek2-32",
      retailer_key: "overclockers-fixture",
      eligible_dates: ["2026-08-01"],
      reason: "requires_at_least_two_eligible_dates",
    },
    {
      product_key: "patriot-viper-venom-vv532g60c30ak",
      retailer_key: "scan-fixture",
      eligible_dates: [],
      reason: "requires_at_least_two_eligible_dates",
    },
  ]);
});

test("movement abstains unless a product has eligible observations on at least two dates", async () => {
  const fixture = await loadFixture();
  fixture.observations = fixture.observations.filter((item) => (
    item.product_key.includes("beast")
    && item.retailer.retailer_key === "scan-fixture"
    && item.observed_at.startsWith("2026-08-01")
  ));

  const result = deriveCandidateProductMovements(fixture);
  assert.deepEqual(result.movements, []);
  assert.deepEqual(result.insufficient_history, [{
    product_key: "kingston-fury-beast-kf560c30bbek2-32",
    retailer_key: "scan-fixture",
    eligible_dates: ["2026-08-01"],
    reason: "requires_at_least_two_eligible_dates",
  }]);
});

test("movement refuses multiple eligible same-day observations without an approved selection rule", async () => {
  const fixture = await loadFixture();
  const duplicateDay = clone(fixture.observations[2]);
  duplicateDay.observation_id = "fixture-scan-beast-2026-08-01-later";
  duplicateDay.observed_at = "2026-08-01T15:00:00Z";
  duplicateDay.item_price.amount_minor = 9899;
  duplicateDay.landed_price.amount_minor = 9899;
  fixture.observations.push(duplicateDay);

  assert.throws(
    () => deriveCandidateProductMovements(fixture),
    /require an approved daily selection rule/,
  );
});

test("fixture validation rejects duplicate IDs and any attempt to unlock governance", async () => {
  const fixture = await loadFixture();
  const duplicate = clone(fixture);
  duplicate.observations[1].observation_id = duplicate.observations[0].observation_id;
  assert.throws(() => validateCandidateObservationFixture(duplicate), /observation_id must be unique/);

  const unlocked = clone(fixture);
  unlocked.governance.publication_allowed = true;
  assert.throws(() => validateCandidateObservationFixture(unlocked), /publication_allowed must remain false/);
});
