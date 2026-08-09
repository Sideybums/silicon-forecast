import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PRIVATE_CANDIDATE_INCEPTION_BASE_DATE,
  PRIVATE_CANDIDATE_QUOTED_ITEM_DIAGNOSTIC_VERSION,
  derivePrivateCandidateQuotedItemRelativeDiagnostic,
} from "../lib/private-candidate-quoted-item-relative-diagnostic.mjs";

const fixtureUrl = new URL("../data/fixtures/private-candidate-quoted-item-relative-diagnostic-tranches.gb.v1.json", import.meta.url);
const realTrancheUrl = new URL("../data/observations/candidate/uk-primary-retail-2026-08-09T122437Z.v1.json", import.meta.url);
const historicalBackfillUrl = new URL("../data/observations/candidate/uk-primary-retail-historical-backfill-2026-08-09T145021Z.v1.json", import.meta.url);
const loadFixture = async () => JSON.parse(await readFile(fixtureUrl, "utf8"));
const loadRealTranche = async () => JSON.parse(await readFile(realTrancheUrl, "utf8"));
const clone = (value) => structuredClone(value);

test("synthetic append-only tranches produce a deterministic fixed-base equal-relative line", async () => {
  const tranches = await loadFixture();
  const result = derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches);
  const replay = derivePrivateCandidateQuotedItemRelativeDiagnostic(clone(tranches));
  const reorderedObservations = clone(tranches);
  for (const tranche of reorderedObservations) tranche.observations.reverse();

  assert.deepEqual(replay, result);
  assert.deepEqual(derivePrivateCandidateQuotedItemRelativeDiagnostic(reorderedObservations), result);
  assert.equal(result.calculation_version, PRIVATE_CANDIDATE_QUOTED_ITEM_DIAGNOSTIC_VERSION);
  assert.equal(result.immutable_base_date, PRIVATE_CANDIDATE_INCEPTION_BASE_DATE);
  assert.equal(result.status, "candidate_diagnostic_available");
  assert.equal(result.not_an_index, true);
  assert.equal(result.price_basis, "vat_inclusive_gbp_quoted_item_price");
  assert.equal(result.delivery_treatment, "excluded_from_calculation_not_a_landed_price");
  assert.equal(result.availability_treatment, "not_qualified_price_tag_diagnostic_only");
  assert.equal(result.historical_input_policy, "separate_backfill_schema_excluded_no_backcast_no_chain_link_no_rebase");
  assert.deepEqual(result.governance, {
    production_import_allowed: false,
    production_activation_allowed: false,
    index_eligibility: false,
    methodology_approval: false,
    publication_allowed: false,
  });
  assert.deepEqual(result.points.map((point) => ({
    date: point.date,
    diagnostic_level_micros: point.diagnostic_level_micros,
    rational: point.diagnostic_level_rational,
    eligible: point.eligible_line_count,
  })), [
    { date: "2026-08-09", diagnostic_level_micros: 100_000_000, rational: { numerator: "100", denominator: "1" }, eligible: 2 },
    { date: "2026-08-16", diagnostic_level_micros: 100_000_000, rational: { numerator: "100", denominator: "1" }, eligible: 2 },
  ]);

  const secondDate = result.points[1];
  assert.deepEqual(secondDate.contributions.map((item) => ({
    retailer_key: item.retailer_key,
    mpn: item.mpn,
    relative: item.price_relative,
  })), [
    { retailer_key: "retailer-a-fixture", mpn: "MPN-A", relative: { numerator: "11000", denominator: "10000" } },
    { retailer_key: "retailer-b-fixture", mpn: "MPN-B", relative: { numerator: "18000", denominator: "20000" } },
  ]);
  assert.equal(secondDate.contributions[0].base_observation_lineage.observation_id, "fixture-retailer-a-mpn-a-2026-08-09");
  assert.equal(secondDate.contributions[0].current_observation_lineage.observation_id, "fixture-retailer-a-mpn-a-2026-08-16");
  assert.match(secondDate.contributions[0].base_observation_lineage.evidence_extract_sha256, /^[a-f0-9]{64}$/u);
});

test("coverage diagnostics expose missing/stale and no-baseline lines without carrying prices forward", async () => {
  const result = derivePrivateCandidateQuotedItemRelativeDiagnostic(await loadFixture());
  const diagnostic = result.date_diagnostics.find((item) => item.date === "2026-08-23");
  assert.equal(diagnostic.baseline_eligible_line_count, 2);
  assert.equal(diagnostic.eligible_paired_line_count, 1);
  assert.equal(diagnostic.coverage_basis_points, 5000);
  assert.equal(diagnostic.quality_state, "abstain_incomplete_base_basket_coverage");
  assert.deepEqual(diagnostic.lines.find((item) => item.retailer_key === "retailer-b-fixture"), {
    retailer_key: "retailer-b-fixture",
    retailer_legal_name: "Fixture Retailer Legal Entity",
    mpn: "MPN-B",
    status: "missing_current_observation_no_imputation",
    reasons: ["no_same_date_observation"],
    last_eligible_date: "2026-08-16",
    stale_days: 7,
  });
  assert.deepEqual(diagnostic.lines.find((item) => item.retailer_key === "retailer-c-fixture"), {
    retailer_key: "retailer-c-fixture",
    retailer_legal_name: "Fixture Retailer Legal Entity",
    mpn: "MPN-C",
    status: "no_baseline_observation",
    reasons: ["no_observation_on_immutable_base_date"],
  });
  assert.equal(result.points.some((point) => point.date === "2026-08-23"), false);
});

test("reduced eligible base-basket coverage cannot shrink the denominator and create a point", async () => {
  const tranches = await loadFixture();
  tranches[1].observations[1].item_price.vat_state = "unknown";
  const result = derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches);
  const diagnostic = result.date_diagnostics.find((item) => item.date === "2026-08-16");

  assert.equal(diagnostic.baseline_eligible_line_count, 2);
  assert.equal(diagnostic.eligible_paired_line_count, 1);
  assert.equal(diagnostic.coverage_basis_points, 5000);
  assert.equal(diagnostic.quality_state, "abstain_incomplete_base_basket_coverage");
  assert.equal(result.points.some((point) => point.date === "2026-08-16"), false);
  assert.equal(result.points.some((point) => point.diagnostic_level_micros === 110_000_000), false);
});

test("delivery is never added to the quoted-item-price diagnostic or represented as landed price", async () => {
  const tranches = await loadFixture();
  const result = derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches);
  const b = result.points.find((point) => point.date === "2026-08-16").contributions.find((item) => item.mpn === "MPN-B");
  assert.deepEqual(b.price_relative, { numerator: "18000", denominator: "20000" });
  assert.equal("landed_price_minor" in b, false);
  assert.equal(JSON.stringify(result).includes("23000"), false, "£180 item plus £50 delivery must not become a £230 landed input");
});

test("appending a later tranche extends rather than revises the previously replayed prefix", async () => {
  const tranches = await loadFixture();
  const prefix = derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches.slice(0, 2));
  const extended = derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches);
  assert.deepEqual(extended.points.slice(0, prefix.points.length), prefix.points);
  assert.deepEqual(extended.date_diagnostics.slice(0, prefix.date_diagnostics.length), prefix.date_diagnostics);
});

test("non-terminating rational levels use the declared deterministic half-up micro-point rounding", async () => {
  const tranches = await loadFixture();
  tranches[0].observations[0].item_price.amount_minor = 30000;
  tranches[1].observations[0].item_price.amount_minor = 30001;
  tranches[0].observations[1].item_price.amount_minor = 60000;
  tranches[1].observations[1].item_price.amount_minor = 60002;
  const point = derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches).points.find((item) => item.date === "2026-08-16");
  assert.deepEqual(point.diagnostic_level_rational, { numerator: "30001", denominator: "300" });
  assert.equal(point.diagnostic_level_micros, 100_003_333);
});

test("the retained 2026-08-09 real tranche validates as inception but abstains from a one-date movement line", async () => {
  const result = derivePrivateCandidateQuotedItemRelativeDiagnostic([await loadRealTranche()]);
  assert.equal(result.status, "abstain");
  assert.deepEqual(result.retained_dates, ["2026-08-09"]);
  assert.deepEqual(result.abstention_reasons, ["requires_at_least_two_retained_dates"]);
  assert.deepEqual(result.points, []);
  assert.equal(result.date_diagnostics[0].baseline_eligible_line_count, 3);
  assert.equal(result.date_diagnostics[0].eligible_paired_line_count, 3);
  assert.equal(result.date_diagnostics[0].coverage_basis_points, 10000);
  assert.equal(result.date_diagnostics[0].quality_state, "calculable_complete_base_basket_without_imputation");
  assert.ok(result.date_diagnostics[0].lines.every((line) => line.status === "eligible_paired_line"));
});

test("VAT, exact identity, and retailer-owned requirements abstain explicitly rather than impute", async () => {
  const tranches = await loadFixture();
  tranches[1].observations[1].item_price.vat_state = "unknown";
  const result = derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches);
  const diagnostic = result.date_diagnostics.find((item) => item.date === "2026-08-16");
  const line = diagnostic.lines.find((item) => item.mpn === "MPN-B");
  assert.equal(line.status, "current_observation_ineligible_no_imputation");
  assert.deepEqual(line.reasons, ["vat_inclusion_unresolved"]);
  assert.equal(diagnostic.eligible_paired_line_count, 1);
  assert.equal(diagnostic.quality_state, "abstain_incomplete_base_basket_coverage");
  assert.equal(result.points.some((point) => point.date === "2026-08-16"), false);

  const unresolved = await loadFixture();
  unresolved[1].observations[0].identity.match_basis = "unresolved";
  assert.deepEqual(
    derivePrivateCandidateQuotedItemRelativeDiagnostic(unresolved).date_diagnostics[1].lines.find((item) => item.mpn === "MPN-A").reasons,
    ["exact_mpn_unresolved"],
  );

  const thirdParty = await loadFixture();
  thirdParty[1].observations[0].seller.relationship = "third_party";
  assert.deepEqual(
    derivePrivateCandidateQuotedItemRelativeDiagnostic(thirdParty).date_diagnostics[1].lines.find((item) => item.mpn === "MPN-A").reasons,
    ["retailer_owned_seller_unresolved"],
  );
});

test("duplicate same-retailer+MPN dates fail closed without a selection rule", async () => {
  const tranches = await loadFixture();
  const duplicate = clone(tranches[1].observations[0]);
  duplicate.observation_id = "fixture-retailer-a-mpn-a-2026-08-16-later";
  duplicate.observed_at = "2026-08-16T10:00:00Z";
  tranches[1].observations.push(duplicate);
  assert.throws(
    () => derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches),
    /duplicate observation for retailer retailer-a-fixture, MPN MPN-A on 2026-08-16 requires an approved same-line\/same-date selection rule/u,
  );
});

test("append order, unique lineage, and authority locks fail closed", async () => {
  const reversed = await loadFixture();
  reversed.reverse();
  assert.throws(() => derivePrivateCandidateQuotedItemRelativeDiagnostic(reversed), /strictly increasing append order/u);


  const duplicateId = await loadFixture();
  duplicateId[1].observations[0].observation_id = duplicateId[0].observations[0].observation_id;
  assert.throws(() => derivePrivateCandidateQuotedItemRelativeDiagnostic(duplicateId), /observation_id must be globally unique/u);

  const unlockedTranche = await loadFixture();
  unlockedTranche[0].governance.index_eligibility = true;
  assert.throws(() => derivePrivateCandidateQuotedItemRelativeDiagnostic(unlockedTranche), /index_eligibility must remain false/u);

  const unlockedObservation = await loadFixture();
  unlockedObservation[0].observations[0].governance.publication_allowed = true;
  assert.throws(() => derivePrivateCandidateQuotedItemRelativeDiagnostic(unlockedObservation), /publication_allowed must remain false/u);

  const lateBaseAddition = await loadFixture();
  const lateTranche = clone(lateBaseAddition.at(-1));
  lateTranche.tranche_id = "fixture-late-base-addition-v1";
  lateTranche.created_at = "2026-08-30T12:00:00Z";
  lateTranche.observations = [clone(lateBaseAddition[0].observations[0])];
  lateTranche.observations[0].observation_id = "fixture-late-base-addition-observation";
  lateBaseAddition.push(lateTranche);
  assert.throws(
    () => derivePrivateCandidateQuotedItemRelativeDiagnostic(lateBaseAddition),
    /backdated additions require a new version/u,
  );
});

test("exact retailer+MPN identity prevents cross-retailer and cross-MPN pairing", async () => {
  const tranches = await loadFixture();
  tranches[1].observations[0].source.source_key = "retailer-z-fixture";
  const result = derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches);
  const date = result.date_diagnostics.find((item) => item.date === "2026-08-16");
  assert.equal(date.lines.find((item) => item.retailer_key === "retailer-a-fixture").status, "missing_current_observation_no_imputation");
  assert.equal(date.lines.find((item) => item.retailer_key === "retailer-z-fixture").status, "no_baseline_observation");
  assert.equal(date.quality_state, "abstain_incomplete_base_basket_coverage");
  assert.equal(result.points.some((point) => point.date === "2026-08-16"), false);
});

test("the real historical backfill is an intentionally separate input type, not silently rebased", async () => {
  const historical = JSON.parse(await readFile(historicalBackfillUrl, "utf8"));
  const current = await loadRealTranche();
  assert.throws(
    () => derivePrivateCandidateQuotedItemRelativeDiagnostic([historical, current]),
    /scope must remain candidate_only/u,
  );
});
