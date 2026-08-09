import { createHash } from "node:crypto";

export const CANDIDATE_REFERENCE_REAL_SERIES_VERSION = "candidate-reference-real-series-fixture-v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;
const DATE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;
const INTEGER = /^-?(?:0|[1-9]\d*)$/u;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, keys, context) {
  invariant(value && typeof value === "object" && !Array.isArray(value), `${context} must be an object`);
  invariant(Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000"), `${context} must contain exactly: ${keys.join(", ")}`);
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  invariant(value === null || ["string", "boolean", "number"].includes(typeof value), "canonical fixture bytes contain an unsupported value");
  invariant(typeof value !== "number" || Number.isSafeInteger(value), "canonical fixture bytes permit safe integers only");
  return JSON.stringify(value);
}

export function canonicalFixtureBytes(value) {
  return canonicalize(value);
}

export function sha256FixtureBytes(value) {
  return createHash("sha256").update(canonicalFixtureBytes(value), "utf8").digest("hex");
}

function gcd(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function rational(value, context) {
  exactKeys(value, ["numerator", "denominator"], context);
  invariant(INTEGER.test(value.numerator), `${context}.numerator must be a canonical integer string`);
  invariant(/^(?:[1-9]\d*)$/u.test(value.denominator), `${context}.denominator must be a positive canonical integer string`);
  const numerator = BigInt(value.numerator);
  const denominator = BigInt(value.denominator);
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function wire(value) {
  return { numerator: String(value.numerator), denominator: String(value.denominator) };
}

function add(left, right) {
  const numerator = left.numerator * right.denominator + right.numerator * left.denominator;
  const denominator = left.denominator * right.denominator;
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function subtract(left, right) {
  return add(left, { numerator: -right.numerator, denominator: right.denominator });
}

function multiply(left, right) {
  const divisorA = gcd(left.numerator, right.denominator);
  const divisorB = gcd(right.numerator, left.denominator);
  return {
    numerator: (left.numerator / divisorA) * (right.numerator / divisorB),
    denominator: (left.denominator / divisorB) * (right.denominator / divisorA),
  };
}

function divide(left, right, context) {
  invariant(right.numerator !== 0n, `${context} cannot divide by zero`);
  const sign = right.numerator < 0n ? -1n : 1n;
  return multiply(left, { numerator: right.denominator * sign, denominator: right.numerator * sign });
}

function mean(values, context) {
  invariant(values.length > 0, `${context} cannot average an empty set`);
  const sum = values.reduce(add, { numerator: 0n, denominator: 1n });
  return divide(sum, { numerator: BigInt(values.length), denominator: 1n }, context);
}

function unavailable(layer, period, reason, secondaryReasons = [], lineage = {}) {
  return {
    layer,
    period,
    quality_state: reason,
    secondary_reasons: secondaryReasons,
    value: null,
    lineage,
  };
}

function validateFixture(fixture) {
  invariant(fixture?.schema_version === 1, "fixture.schema_version must be 1");
  invariant(fixture.fixture_kind === "candidate_reference_real_series", "fixture_kind is unsupported");
  invariant(fixture.scope === "synthetic_fixture_only", "fixture must remain synthetic_fixture_only");
  invariant(fixture.status === "candidate_unapproved", "fixture must remain candidate_unapproved");
  invariant(fixture.approval_envelope === null, "fixture baseline approval_envelope must remain null");
  invariant(fixture.selections === null, "fixture must contain no selected candidate");
  invariant(fixture.governance?.methodology_approved === false && fixture.governance?.production_activation_allowed === false && fixture.governance?.publication_allowed === false, "all fixture authority locks must remain false");
  invariant(SHA256.test(fixture.native_snapshot_sha256) && sha256FixtureBytes(fixture.native_snapshot) === fixture.native_snapshot_sha256, "native snapshot checksum mismatch");
  invariant(SHA256.test(fixture.linked_nominal_series_sha256) && sha256FixtureBytes(fixture.linked_nominal_series) === fixture.linked_nominal_series_sha256, "linked nominal series checksum mismatch");
  invariant(Array.isArray(fixture.monthly_strategy_candidates) && fixture.monthly_strategy_candidates.length > 0, "monthly strategy candidates are required without a default");
  invariant(Array.isArray(fixture.historical_reference_candidates) && fixture.historical_reference_candidates.length > 0, "historical reference candidates are required without a default");
  invariant(Array.isArray(fixture.deflator_series_candidates) && fixture.deflator_series_candidates.length > 0, "deflator series candidates are required without a default");
}

function locateById(items, id, field, context) {
  invariant(typeof id === "string" && id.length > 0, `${context} ID is required; no default exists`);
  const matches = items.filter((item) => item[field] === id);
  invariant(matches.length === 1, `${context} ID must identify exactly one candidate`);
  return matches[0];
}

function validateApproval(fixture, envelope) {
  exactKeys(envelope, ["schema_version", "scope", "decision", "authority", "binding", "envelope_sha256"], "approval envelope");
  invariant(envelope.schema_version === 1 && envelope.scope === "synthetic_test_only" && envelope.decision === "approved", "approval envelope is not an externally approved synthetic-test decision");
  exactKeys(envelope.authority, ["authority_type", "authority_id", "decided_at"], "approval envelope.authority");
  invariant(envelope.authority.authority_type === "external_human_test_fixture", "approval must come from an explicitly external human test-fixture authority");
  invariant(typeof envelope.authority.authority_id === "string" && envelope.authority.authority_id.length > 0, "approval authority ID is required");
  invariant(typeof envelope.authority.decided_at === "string" && envelope.authority.decided_at.length > 0, "approval decision instant is required");
  exactKeys(envelope.binding, [
    "native_snapshot_sha256", "linked_nominal_series_sha256", "monthly_strategy_id", "monthly_strategy_sha256",
    "historical_reference_id", "historical_reference_sha256", "deflator_series_id", "deflator_series_sha256",
    "deflator_release_vintage_id", "deflator_release_sha256", "constant_price_reference_month",
  ], "approval envelope.binding");
  const unsigned = { ...envelope };
  delete unsigned.envelope_sha256;
  invariant(SHA256.test(envelope.envelope_sha256) && sha256FixtureBytes(unsigned) === envelope.envelope_sha256, "approval envelope checksum mismatch");

  const binding = envelope.binding;
  const monthly = locateById(fixture.monthly_strategy_candidates, binding.monthly_strategy_id, "strategy_id", "monthly strategy");
  const reference = locateById(fixture.historical_reference_candidates, binding.historical_reference_id, "reference_id", "historical reference");
  const series = locateById(fixture.deflator_series_candidates, binding.deflator_series_id, "series_id", "deflator series");
  const release = locateById(series.release_vintages, binding.deflator_release_vintage_id, "release_vintage_id", "deflator release vintage");

  invariant(binding.native_snapshot_sha256 === fixture.native_snapshot_sha256, "approval does not bind the exact native snapshot bytes");
  invariant(binding.linked_nominal_series_sha256 === fixture.linked_nominal_series_sha256, "approval does not bind the exact linked nominal bytes");
  invariant(binding.monthly_strategy_sha256 === sha256FixtureBytes(monthly), "approval does not bind the exact monthly strategy bytes");
  invariant(binding.historical_reference_sha256 === sha256FixtureBytes(reference), "approval does not bind the exact historical reference bytes");
  invariant(binding.deflator_series_sha256 === sha256FixtureBytes(series.series_metadata), "approval does not bind the exact deflator series bytes");
  invariant(binding.deflator_release_sha256 === sha256FixtureBytes(release), "approval does not bind the exact deflator release bytes");
  invariant(MONTH.test(binding.constant_price_reference_month), "approved constant-price reference month is invalid");
  return { monthly, reference, series, release, binding };
}

function aggregateMonths(fixture, strategy) {
  invariant(strategy.operator === "arithmetic_mean_exact_rational", "candidate monthly operator is unsupported and cannot be inferred");
  const dailyByDate = new Map();
  for (const [index, point] of fixture.linked_nominal_series.points.entries()) {
    invariant(DATE.test(point.date), `linked nominal point ${index} date is invalid`);
    invariant(!dailyByDate.has(point.date), `duplicate linked nominal date ${point.date}`);
    dailyByDate.set(point.date, rational(point.value, `linked nominal point ${point.date}.value`));
  }
  return strategy.month_contracts.map((contract) => {
    invariant(MONTH.test(contract.month) && Array.isArray(contract.required_dates) && contract.required_dates.length > 0, "monthly contract is invalid");
    const missing = contract.required_dates.filter((date) => !dailyByDate.has(date));
    if (missing.length > 0) return unavailable("monthly_linked_nominal", contract.month, "UNAVAILABLE_MONTH_INCOMPLETE", ["required_daily_points_missing"], { missing_dates: missing, strategy_id: strategy.strategy_id });
    const values = contract.required_dates.map((date) => dailyByDate.get(date));
    return {
      layer: "monthly_linked_nominal",
      period: contract.month,
      quality_state: "AVAILABLE_SYNTHETIC_APPROVED_ENVELOPE",
      secondary_reasons: [],
      value: wire(mean(values, `month ${contract.month}`)),
      lineage: { required_dates: [...contract.required_dates], strategy_id: strategy.strategy_id },
    };
  });
}

function historicalReference(months, reference) {
  invariant(reference.operator === "arithmetic_mean_exact_rational", "candidate historical-reference operator is unsupported and cannot be inferred");
  const byMonth = new Map(months.map((point) => [point.period, point]));
  const missing = reference.months.filter((month) => byMonth.get(month)?.value === null || !byMonth.has(month));
  if (missing.length > 0) return unavailable("historical_reference", reference.reference_id, "UNAVAILABLE_HISTORICAL_REFERENCE_INPUT", ["approved_reference_month_unavailable"], { missing_months: missing, reference_id: reference.reference_id });
  const level = mean(reference.months.map((month) => rational(byMonth.get(month).value, `monthly value ${month}`)), "historical reference");
  return {
    layer: "historical_reference",
    period: reference.reference_id,
    quality_state: "AVAILABLE_SYNTHETIC_APPROVED_ENVELOPE",
    secondary_reasons: [],
    value: wire(level),
    lineage: { months: [...reference.months], reference_id: reference.reference_id },
  };
}

function referencePresentation(months, historical) {
  return months.map((point) => point.value === null || historical.value === null
    ? unavailable("historical_reference_100", point.period, "UNAVAILABLE_HISTORICAL_REFERENCE_INPUT", [point.quality_state], { monthly_period: point.period })
    : {
      layer: "historical_reference_100",
      period: point.period,
      quality_state: "AVAILABLE_SYNTHETIC_APPROVED_ENVELOPE",
      secondary_reasons: [],
      value: wire(multiply({ numerator: 100n, denominator: 1n }, divide(rational(point.value, `monthly value ${point.period}`), rational(historical.value, "historical reference value"), "historical reference presentation"))),
      lineage: { monthly_period: point.period, reference_id: historical.period },
    });
}

function validateDeflator(series, release) {
  invariant(series.series_metadata.provider_kind === "official_statistics_fixture" && series.series_metadata.not_real_official_data === true, "fixture deflator must be explicitly synthetic official-statistics-shaped data");
  invariant(series.series_metadata.frequency === "monthly" && series.series_metadata.unit === "index_points", "deflator frequency or unit is invalid");
  if (
    typeof series.series_metadata.provider !== "string"
    || typeof series.series_metadata.series_code !== "string"
    || typeof series.series_metadata.title !== "string"
    || typeof series.series_metadata.adjustment_status !== "string"
    || !series.series_metadata.canonical_source_url?.startsWith("https://")
  ) return { error: "UNAVAILABLE_DEFLATOR_VINTAGE_MISSING", secondary: ["series_lineage_incomplete"] };
  if (
    typeof release.release_id !== "string"
    || !DATE.test(release.release_date)
    || typeof release.retrieved_at !== "string"
    || !release.retrieved_at.endsWith("Z")
    || !SHA256.test(release.capture_sha256)
    || typeof release.parser_version !== "string"
  ) return { error: "UNAVAILABLE_DEFLATOR_VINTAGE_MISSING", secondary: ["release_lineage_incomplete"] };
  invariant(Array.isArray(release.observations) && release.observations.length > 0, "deflator release observations are required");
  const byMonth = new Map();
  for (const observation of release.observations) {
    if (observation.release_vintage_id !== release.release_vintage_id) return { error: "UNAVAILABLE_DEFLATOR_VINTAGE_MISSING", secondary: ["mixed_release_vintage_observation"] };
    if (!MONTH.test(observation.month) || typeof observation.observation_status !== "string" || observation.observation_status.length === 0) return { error: "UNAVAILABLE_DEFLATOR_VINTAGE_MISSING", secondary: ["observation_lineage_incomplete"] };
    let value;
    try { value = rational(observation.value, `deflator ${observation.month}.value`); } catch { return { error: "UNAVAILABLE_DEFLATOR_VALUE_INVALID", secondary: ["deflator_value_not_exact_positive_rational"] }; }
    if (value.numerator <= 0n) return { error: "UNAVAILABLE_DEFLATOR_VALUE_INVALID", secondary: ["deflator_value_not_positive"] };
    if (byMonth.has(observation.month)) return { error: "UNAVAILABLE_DEFLATOR_VINTAGE_MISSING", secondary: ["duplicate_observation_month"] };
    byMonth.set(observation.month, value);
  }
  return { byMonth };
}

function realSeries(months, series, release, referenceMonth) {
  const validation = validateDeflator(series, release);
  if (validation.error) return months.map((point) => unavailable("monthly_constant_price", point.period, validation.error, validation.secondary, { release_vintage_id: release.release_vintage_id }));
  const referenceDeflator = validation.byMonth.get(referenceMonth);
  return months.map((point) => {
    if (point.value === null) return unavailable("monthly_constant_price", point.period, point.quality_state, ["monthly_nominal_unavailable"], { release_vintage_id: release.release_vintage_id });
    const current = validation.byMonth.get(point.period);
    if (!referenceDeflator || !current) return unavailable("monthly_constant_price", point.period, "UNAVAILABLE_DEFLATOR_VINTAGE_MISSING", [!referenceDeflator ? "constant_price_reference_month_missing" : "observation_month_missing"], { release_vintage_id: release.release_vintage_id });
    const nominal = rational(point.value, `monthly value ${point.period}`);
    return {
      layer: "monthly_constant_price",
      period: point.period,
      quality_state: "AVAILABLE_SYNTHETIC_APPROVED_ENVELOPE",
      secondary_reasons: [],
      value: wire(multiply(nominal, divide(referenceDeflator, current, `real month ${point.period}`))),
      lineage: { release_vintage_id: release.release_vintage_id, deflator_series_id: series.series_id, constant_price_reference_month: referenceMonth },
    };
  });
}

export function deriveCandidateReferenceRealSeries(fixture, approvalEnvelope = null) {
  validateFixture(fixture);
  const immutableUpstream = {
    native_snapshot_sha256: fixture.native_snapshot_sha256,
    linked_nominal_series_sha256: fixture.linked_nominal_series_sha256,
  };
  if (approvalEnvelope === null) {
    return {
      calculation_version: CANDIDATE_REFERENCE_REAL_SERIES_VERSION,
      status: "unavailable_unapproved_fixture_baseline",
      upstream: immutableUpstream,
      monthly_nominal: [unavailable("monthly_linked_nominal", null, "UNAVAILABLE_MONTHLY_METHOD_NOT_APPROVED")],
      historical_reference: unavailable("historical_reference", null, "UNAVAILABLE_HISTORICAL_REFERENCE_NOT_APPROVED"),
      historical_reference_100: [unavailable("historical_reference_100", null, "UNAVAILABLE_HISTORICAL_REFERENCE_NOT_APPROVED")],
      monthly_constant_price: [unavailable("monthly_constant_price", null, "UNAVAILABLE_DEFLATOR_NOT_APPROVED")],
    };
  }

  const approved = validateApproval(fixture, approvalEnvelope);
  const monthlyNominal = aggregateMonths(fixture, approved.monthly);
  const reference = historicalReference(monthlyNominal, approved.reference);
  const reference100 = referencePresentation(monthlyNominal, reference);
  const real = realSeries(monthlyNominal, approved.series, approved.release, approved.binding.constant_price_reference_month);
  return {
    calculation_version: CANDIDATE_REFERENCE_REAL_SERIES_VERSION,
    status: "synthetic_fixture_calculated_from_external_checksum_bound_envelope",
    approval_envelope_sha256: approvalEnvelope.envelope_sha256,
    upstream: immutableUpstream,
    monthly_nominal: monthlyNominal,
    historical_reference: reference,
    historical_reference_100: reference100,
    monthly_constant_price: real,
  };
}

export function compareAdditiveRealRevisions(earlier, later) {
  invariant(earlier.approval_envelope_sha256 !== later.approval_envelope_sha256, "statistical revisions require distinct approval envelopes");
  const earlierByMonth = new Map(earlier.monthly_constant_price.map((point) => [point.period, point]));
  return {
    impact_kind: "additive_statistical_release_revision",
    earlier_approval_envelope_sha256: earlier.approval_envelope_sha256,
    later_approval_envelope_sha256: later.approval_envelope_sha256,
    impacts: later.monthly_constant_price.map((point) => {
      const prior = earlierByMonth.get(point.period);
      return {
        period: point.period,
        value: prior?.value && point.value
          ? wire(subtract(rational(point.value, `later real ${point.period}`), rational(prior.value, `earlier real ${point.period}`)))
          : null,
        quality_state: prior?.value && point.value ? "AVAILABLE_ADDITIVE_IMPACT" : "UNAVAILABLE_REVISION_COMPARISON_INPUT",
      };
    }),
  };
}
