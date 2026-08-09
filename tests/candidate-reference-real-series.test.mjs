import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CANDIDATE_REFERENCE_REAL_SERIES_VERSION,
  compareAdditiveRealRevisions,
  deriveCandidateReferenceRealSeries,
  sha256FixtureBytes,
} from "../lib/candidate-reference-real-series.mjs";

const fixtureUrl = new URL("../data/fixtures/candidate-reference-real-series.gb.v1.json", import.meta.url);
const loadFixture = async () => JSON.parse(await readFile(fixtureUrl, "utf8"));
const clone = (value) => structuredClone(value);

function syntheticApproval(fixture, { monthlyStrategyId, historicalReferenceId, deflatorSeriesId, releaseVintageId, constantPriceReferenceMonth }) {
  const monthly = fixture.monthly_strategy_candidates.find((item) => item.strategy_id === monthlyStrategyId);
  const reference = fixture.historical_reference_candidates.find((item) => item.reference_id === historicalReferenceId);
  const series = fixture.deflator_series_candidates.find((item) => item.series_id === deflatorSeriesId);
  const release = series?.release_vintages.find((item) => item.release_vintage_id === releaseVintageId);
  assert.ok(monthly && reference && series && release, "test must explicitly name existing synthetic candidates");
  const unsigned = {
    schema_version: 1,
    scope: "synthetic_test_only",
    decision: "approved",
    authority: {
      authority_type: "external_human_test_fixture",
      authority_id: "test-only-human-authority-not-production",
      decided_at: "2026-08-09T18:00:00Z",
    },
    binding: {
      native_snapshot_sha256: fixture.native_snapshot_sha256,
      linked_nominal_series_sha256: fixture.linked_nominal_series_sha256,
      monthly_strategy_id: monthlyStrategyId,
      monthly_strategy_sha256: sha256FixtureBytes(monthly),
      historical_reference_id: historicalReferenceId,
      historical_reference_sha256: sha256FixtureBytes(reference),
      deflator_series_id: deflatorSeriesId,
      deflator_series_sha256: sha256FixtureBytes(series.series_metadata),
      deflator_release_vintage_id: releaseVintageId,
      deflator_release_sha256: sha256FixtureBytes(release),
      constant_price_reference_month: constantPriceReferenceMonth,
    },
  };
  return { ...unsigned, envelope_sha256: sha256FixtureBytes(unsigned) };
}

function approvalFor(fixture, releaseVintageId = "synthetic-release-2026-03-a") {
  return syntheticApproval(fixture, {
    monthlyStrategyId: "synthetic-monthly-two-required-dates-mean",
    historicalReferenceId: "synthetic-reference-january",
    deflatorSeriesId: "SYNTHETIC-OFFICIAL-DEFLATOR-X",
    releaseVintageId,
    constantPriceReferenceMonth: "2026-01",
  });
}

test("fixture baseline contains no selection or approval and every dependent layer fails closed with null", async () => {
  const fixture = await loadFixture();
  const result = deriveCandidateReferenceRealSeries(fixture);

  assert.equal(fixture.approval_envelope, null);
  assert.equal(fixture.selections, null);
  assert.ok(fixture.monthly_strategy_candidates.every((item) => item.selected === false));
  assert.ok(fixture.historical_reference_candidates.every((item) => item.selected === false));
  assert.ok(fixture.deflator_series_candidates.every((item) => item.selected === false));
  assert.equal(result.calculation_version, CANDIDATE_REFERENCE_REAL_SERIES_VERSION);
  assert.equal(result.status, "unavailable_unapproved_fixture_baseline");
  assert.equal(result.series_revisions, null);
  assert.deepEqual(result.monthly_nominal.map((item) => [item.quality_state, item.value]), [["UNAVAILABLE_MONTHLY_METHOD_NOT_APPROVED", null]]);
  assert.equal(result.historical_reference.quality_state, "UNAVAILABLE_HISTORICAL_REFERENCE_NOT_APPROVED");
  assert.equal(result.historical_reference.value, null);
  assert.deepEqual(result.monthly_constant_price.map((item) => [item.quality_state, item.value]), [["UNAVAILABLE_DEFLATOR_NOT_APPROVED", null]]);
});

test("exact named candidates calculate only through an external checksum-bound synthetic approval envelope", async () => {
  const fixture = await loadFixture();
  const result = deriveCandidateReferenceRealSeries(fixture, approvalFor(fixture));
  const replay = deriveCandidateReferenceRealSeries(clone(fixture), approvalFor(clone(fixture)));

  assert.deepEqual(replay, result);
  assert.equal(result.status, "synthetic_fixture_calculated_from_external_checksum_bound_envelope");
  assert.deepEqual(Object.keys(result.series_revisions).sort(), ["historical_reference_100", "monthly_constant_price", "monthly_nominal"]);
  for (const [layer, revision] of Object.entries(result.series_revisions)) {
    assert.match(revision.series_id, /^synthetic-fixture-/u);
    assert.equal(revision.revision_id, result.approval_envelope_sha256);
    assert.match(revision.input_binding_sha256, /^[a-f0-9]{64}$/u);
    assert.match(revision.output_sha256, /^[a-f0-9]{64}$/u);
    const output = layer === "monthly_nominal" ? result.monthly_nominal : layer === "historical_reference_100" ? result.historical_reference_100 : result.monthly_constant_price;
    assert.equal(revision.output_sha256, sha256FixtureBytes(output));
  }
  assert.deepEqual(result.monthly_nominal.map((point) => [point.period, point.value]), [
    ["2026-01", { numerator: "101", denominator: "1" }],
    ["2026-02", { numerator: "105", denominator: "1" }],
  ]);
  assert.deepEqual(result.historical_reference.value, { numerator: "101", denominator: "1" });
  assert.deepEqual(result.historical_reference_100.map((point) => [point.period, point.value]), [
    ["2026-01", { numerator: "100", denominator: "1" }],
    ["2026-02", { numerator: "10500", denominator: "101" }],
  ]);
  assert.deepEqual(result.monthly_constant_price.map((point) => [point.period, point.value]), [
    ["2026-01", { numerator: "101", denominator: "1" }],
    ["2026-02", { numerator: "100", denominator: "1" }],
  ]);
  assert.equal(JSON.stringify(result).includes("."), false, "stored calculated values must not use decimal/floating point text");
});

test("approval cannot be inferred from approved-looking field names or survive byte drift", async () => {
  const fixture = await loadFixture();
  fixture.approved_monthly_strategy_id = "synthetic-monthly-two-required-dates-mean";
  fixture.approved_historical_reference_id = "synthetic-reference-january";
  fixture.approved_deflator_series_id = "SYNTHETIC-OFFICIAL-DEFLATOR-X";
  const stillUnavailable = deriveCandidateReferenceRealSeries(fixture);
  assert.equal(stillUnavailable.status, "unavailable_unapproved_fixture_baseline");

  const clean = await loadFixture();
  const envelope = approvalFor(clean);
  envelope.binding.monthly_strategy_sha256 = "0".repeat(64);
  const unsigned = { ...envelope };
  delete unsigned.envelope_sha256;
  envelope.envelope_sha256 = sha256FixtureBytes(unsigned);
  assert.throws(() => deriveCandidateReferenceRealSeries(clean, envelope), /does not bind the exact monthly strategy bytes/u);

  const alteredRelease = await loadFixture();
  const staleEnvelope = approvalFor(alteredRelease);
  alteredRelease.deflator_series_candidates[0].release_vintages[0].observations[0].value.numerator = "999";
  assert.throws(() => deriveCandidateReferenceRealSeries(alteredRelease, staleEnvelope), /does not bind the exact deflator release bytes/u);
});

test("missing required daily points make a month, its reference use, and its real point unavailable without fill", async () => {
  const fixture = await loadFixture();
  fixture.linked_nominal_series.points = fixture.linked_nominal_series.points.filter((point) => point.date !== "2026-01-19");
  fixture.linked_nominal_series_sha256 = sha256FixtureBytes(fixture.linked_nominal_series);
  const result = deriveCandidateReferenceRealSeries(fixture, approvalFor(fixture));

  assert.deepEqual(result.monthly_nominal[0], {
    layer: "monthly_linked_nominal",
    period: "2026-01",
    quality_state: "UNAVAILABLE_MONTH_INCOMPLETE",
    secondary_reasons: ["required_daily_points_missing"],
    value: null,
    lineage: {
      missing_dates: ["2026-01-19"],
      strategy_id: "synthetic-monthly-two-required-dates-mean",
    },
  });
  assert.equal(result.historical_reference.quality_state, "UNAVAILABLE_HISTORICAL_REFERENCE_INPUT");
  assert.equal(result.historical_reference.value, null);
  assert.equal(result.historical_reference_100[0].value, null);
  assert.equal(result.monthly_constant_price[0].value, null);
  assert.equal(JSON.stringify(result).includes('"numerator":"0"'), false, "a gap must not become zero");
  assert.equal(JSON.stringify(result).includes("carry"), false, "a gap must not be carried forward");
});

test("checksum-bound monthly contracts reject duplicate and cross-month required dates before calculation", async () => {
  const duplicate = await loadFixture();
  duplicate.monthly_strategy_candidates[0].month_contracts[0].required_dates = [
    "2026-01-05",
    "2026-01-05",
  ];
  assert.throws(
    () => deriveCandidateReferenceRealSeries(duplicate, approvalFor(duplicate)),
    /contains duplicate required date 2026-01-05/u,
  );

  const crossMonth = await loadFixture();
  crossMonth.monthly_strategy_candidates[0].month_contracts[0].required_dates[1] = "2026-02-02";
  assert.throws(
    () => deriveCandidateReferenceRealSeries(crossMonth, approvalFor(crossMonth)),
    /contains cross-month required date 2026-02-02/u,
  );

  const duplicateMonth = await loadFixture();
  duplicateMonth.monthly_strategy_candidates[0].month_contracts.push(
    clone(duplicateMonth.monthly_strategy_candidates[0].month_contracts[0]),
  );
  assert.throws(
    () => deriveCandidateReferenceRealSeries(duplicateMonth, approvalFor(duplicateMonth)),
    /duplicate monthly contract 2026-01/u,
  );
});

test("a release containing mixed-vintage observation bytes is rejected even when the envelope binds those exact bytes", async () => {
  const fixture = await loadFixture();
  fixture.deflator_series_candidates[0].release_vintages[0].observations[1].release_vintage_id = "synthetic-release-2026-04-b";
  const result = deriveCandidateReferenceRealSeries(fixture, approvalFor(fixture));

  assert.ok(result.monthly_constant_price.every((point) => point.value === null));
  assert.ok(result.monthly_constant_price.every((point) => point.quality_state === "UNAVAILABLE_DEFLATOR_VINTAGE_MISSING"));
  assert.ok(result.monthly_constant_price.every((point) => point.secondary_reasons.includes("mixed_release_vintage_observation")));
});

test("checksum-bound but incomplete official-release lineage remains unavailable", async () => {
  const fixture = await loadFixture();
  fixture.deflator_series_candidates[0].release_vintages[0].capture_sha256 = null;
  const result = deriveCandidateReferenceRealSeries(fixture, approvalFor(fixture));

  assert.ok(result.monthly_constant_price.every((point) => point.value === null));
  assert.ok(result.monthly_constant_price.every((point) => point.quality_state === "UNAVAILABLE_DEFLATOR_VINTAGE_MISSING"));
  assert.ok(result.monthly_constant_price.every((point) => point.secondary_reasons.includes("release_lineage_incomplete")));
});

test("later statistical release is additive: both real revisions replay and an exact impact is separate", async () => {
  const fixture = await loadFixture();
  const earlier = deriveCandidateReferenceRealSeries(fixture, approvalFor(fixture, "synthetic-release-2026-03-a"));
  const earlierBytes = JSON.stringify(earlier);
  const later = deriveCandidateReferenceRealSeries(fixture, approvalFor(fixture, "synthetic-release-2026-04-b"));
  const impact = compareAdditiveRealRevisions(earlier, later);

  assert.equal(JSON.stringify(earlier), earlierBytes, "calculating a later release must not rewrite the earlier result");
  assert.notEqual(earlier.approval_envelope_sha256, later.approval_envelope_sha256);
  assert.deepEqual(later.monthly_constant_price.map((point) => [point.period, point.value]), [
    ["2026-01", { numerator: "101", denominator: "1" }],
    ["2026-02", { numerator: "12705", denominator: "124" }],
  ]);
  assert.deepEqual(impact.impacts, [
    { period: "2026-01", value: { numerator: "0", denominator: "1" }, quality_state: "AVAILABLE_ADDITIVE_IMPACT" },
    { period: "2026-02", value: { numerator: "305", denominator: "124" }, quality_state: "AVAILABLE_ADDITIVE_IMPACT" },
  ]);
});

test("reference and real operations cannot mutate native or linked nominal bytes or hashes", async () => {
  const fixture = await loadFixture();
  const nativeBytes = JSON.stringify(fixture.native_snapshot);
  const linkedBytes = JSON.stringify(fixture.linked_nominal_series);
  const nativeHash = fixture.native_snapshot_sha256;
  const linkedHash = fixture.linked_nominal_series_sha256;

  const first = deriveCandidateReferenceRealSeries(fixture, approvalFor(fixture, "synthetic-release-2026-03-a"));
  const second = deriveCandidateReferenceRealSeries(fixture, approvalFor(fixture, "synthetic-release-2026-04-b"));

  assert.equal(JSON.stringify(fixture.native_snapshot), nativeBytes);
  assert.equal(JSON.stringify(fixture.linked_nominal_series), linkedBytes);
  assert.equal(fixture.native_snapshot_sha256, nativeHash);
  assert.equal(fixture.linked_nominal_series_sha256, linkedHash);
  assert.equal(sha256FixtureBytes(fixture.native_snapshot), nativeHash);
  assert.equal(sha256FixtureBytes(fixture.linked_nominal_series), linkedHash);
  assert.deepEqual(first.upstream, second.upstream);
  assert.deepEqual(first.upstream, { native_snapshot_sha256: nativeHash, linked_nominal_series_sha256: linkedHash });
});
