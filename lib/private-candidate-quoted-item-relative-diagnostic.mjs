const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const MPN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/u;
const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const IDENTIFIER = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const AUTHORITY_LOCKS = [
  "production_import_allowed",
  "production_activation_allowed",
  "index_eligibility",
  "methodology_approval",
  "publication_allowed",
];

export const PRIVATE_CANDIDATE_QUOTED_ITEM_DIAGNOSTIC_VERSION = "private-candidate-quoted-item-relative-diagnostic-v1";
export const PRIVATE_CANDIDATE_INCEPTION_BASE_DATE = "2026-08-09";
const DIAGNOSTIC_SCALE = 1_000_000n;
const DIAGNOSTIC_BASE = 100n;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function validateInstant(value, context) {
  invariant(typeof value === "string" && UTC_INSTANT.test(value) && !Number.isNaN(Date.parse(value)), `${context} must be a valid whole-second UTC instant`);
}

function validateLocks(value, context) {
  invariant(value && typeof value === "object" && !Array.isArray(value), `${context} must be an object`);
  invariant(Object.keys(value).sort().join("\u0000") === [...AUTHORITY_LOCKS].sort().join("\u0000"), `${context} must contain exactly the five candidate authority locks`);
  for (const lock of AUTHORITY_LOCKS) invariant(value[lock] === false, `${context}.${lock} must remain false`);
}

function lineIdentity(observation) {
  return {
    retailer_key: observation.source.source_key,
    retailer_legal_name: observation.seller.legal_name,
    mpn: observation.identity.mpn_observed,
  };
}

function lineKey(identity) {
  return `${identity.retailer_key}\u0000${identity.retailer_legal_name}\u0000${identity.mpn}`;
}

function qualifyQuotedItemPrice(observation) {
  const reasons = [];
  if (
    observation.identity.match_basis !== "exact_mpn"
    || observation.identity.mpn_observed === null
    || observation.identity.mpn_observed !== observation.identity.mpn_expected
  ) reasons.push("exact_mpn_unresolved");
  if (observation.seller.relationship !== "retailer_owned") reasons.push("retailer_owned_seller_unresolved");
  if (!Number.isSafeInteger(observation.item_price.amount_minor) || observation.item_price.amount_minor <= 0) reasons.push("item_price_not_positive_safe_integer");
  if (observation.item_price.currency !== "GBP") reasons.push("currency_not_gbp");
  if (observation.item_price.vat_state !== "included") reasons.push("vat_inclusion_unresolved");
  return reasons.length === 0
    ? { status: "eligible", reasons: [], item_price_minor: observation.item_price.amount_minor }
    : { status: "abstain", reasons };
}

function validateObservation(observation, context) {
  invariant(observation && typeof observation === "object" && !Array.isArray(observation), `${context} must be an object`);
  invariant(typeof observation.observation_id === "string" && IDENTIFIER.test(observation.observation_id), `${context}.observation_id must be a stable hyphenated identifier`);
  invariant(observation.status === "candidate_private_immutable", `${context}.status must remain candidate_private_immutable`);
  invariant(observation.scope === "candidate_only", `${context}.scope must remain candidate_only`);
  validateInstant(observation.observed_at, `${context}.observed_at`);
  invariant(typeof observation.source?.source_key === "string" && KEY.test(observation.source.source_key), `${context}.source.source_key must be a lowercase slug`);
  invariant(typeof observation.source.source_url === "string" && observation.source.source_url.startsWith("https://"), `${context}.source.source_url must use HTTPS`);
  invariant(observation.source.source_approved_for_production === false, `${context}.source must remain unapproved for production`);
  invariant(typeof observation.identity?.mpn_expected === "string" && MPN.test(observation.identity.mpn_expected), `${context}.identity.mpn_expected must be a normalized MPN`);
  invariant(observation.identity.mpn_observed === null || (typeof observation.identity.mpn_observed === "string" && MPN.test(observation.identity.mpn_observed)), `${context}.identity.mpn_observed must be null or a normalized MPN`);
  invariant(["exact_mpn", "unresolved"].includes(observation.identity.match_basis), `${context}.identity.match_basis is unsupported`);
  invariant(["retailer_owned", "third_party", "unresolved"].includes(observation.seller?.relationship), `${context}.seller.relationship is unsupported`);
  invariant(typeof observation.seller.legal_name === "string" && observation.seller.legal_name.trim().length > 0, `${context}.seller.legal_name is required for exact retailer identity`);
  invariant(observation.item_price && typeof observation.item_price === "object", `${context}.item_price is required`);
  invariant(["GBP"].includes(observation.item_price.currency), `${context}.item_price.currency must be GBP`);
  invariant(["included", "excluded", "unknown"].includes(observation.item_price.vat_state), `${context}.item_price.vat_state is unsupported`);
  invariant(Number.isSafeInteger(observation.item_price.amount_minor) && observation.item_price.amount_minor >= 0, `${context}.item_price.amount_minor must be a non-negative safe integer`);
  invariant(observation.evidence && typeof observation.evidence === "object", `${context}.evidence is required`);
  invariant(typeof observation.evidence.extract_path === "string" && observation.evidence.extract_path.length > 0, `${context}.evidence.extract_path is required`);
  invariant(SHA256.test(observation.evidence.extract_sha256), `${context}.evidence.extract_sha256 must be SHA-256 hex`);
  invariant(SHA256.test(observation.evidence.response_sha256), `${context}.evidence.response_sha256 must be SHA-256 hex`);
  invariant(observation.evidence.response_bytes_retained === false, `${context}.evidence.response_bytes_retained must remain false`);
  validateLocks(observation.governance, `${context}.governance`);
}

function validateTranches(tranches) {
  invariant(Array.isArray(tranches) && tranches.length > 0, "candidate tranches must be a non-empty array in append order");
  const trancheIds = new Set();
  const observationIds = new Set();
  const lineDates = new Set();
  let previousCreatedAt = null;
  let previousMaxObservedAt = null;

  for (const [trancheIndex, tranche] of tranches.entries()) {
    const context = `candidate tranches[${trancheIndex}]`;
    invariant(tranche?.schema_version === 1, `${context}.schema_version must be 1`);
    invariant(typeof tranche.tranche_id === "string" && IDENTIFIER.test(tranche.tranche_id), `${context}.tranche_id must be a stable hyphenated identifier`);
    invariant(!trancheIds.has(tranche.tranche_id), `${context}.tranche_id must be unique`);
    trancheIds.add(tranche.tranche_id);
    invariant(tranche.status === "candidate_private_immutable", `${context}.status must remain candidate_private_immutable`);
    invariant(tranche.scope === "candidate_only", `${context}.scope must remain candidate_only`);
    invariant(tranche.region === "GB", `${context}.region must be GB`);
    invariant(tranche.channel === "PRIMARY_RETAIL", `${context}.channel must be PRIMARY_RETAIL`);
    validateInstant(tranche.created_at, `${context}.created_at`);
    invariant(previousCreatedAt === null || tranche.created_at > previousCreatedAt, "candidate tranches must be supplied in strictly increasing append order by created_at");
    previousCreatedAt = tranche.created_at;
    validateLocks(tranche.governance, `${context}.governance`);
    invariant(Array.isArray(tranche.observations) && tranche.observations.length > 0, `${context}.observations must be non-empty`);
    const trancheObservedAts = [];

    for (const [observationIndex, observation] of tranche.observations.entries()) {
      const observationContext = `${context}.observations[${observationIndex}]`;
      validateObservation(observation, observationContext);
      invariant(observation.observed_at <= tranche.created_at, `${observationContext}.observed_at cannot follow tranche.created_at`);
      invariant(previousMaxObservedAt === null || observation.observed_at > previousMaxObservedAt, `${observationContext}.observed_at must follow every observation in earlier append tranches; backdated additions require a new version`);
      trancheObservedAts.push(observation.observed_at);
      const date = observation.observed_at.slice(0, 10);
      invariant(!observationIds.has(observation.observation_id), `${observationContext}.observation_id must be globally unique`);
      observationIds.add(observation.observation_id);
      const identity = lineIdentity(observation);
      invariant(identity.mpn !== null, `${observationContext} cannot establish exact retailer+MPN line identity without an observed MPN`);
      const duplicateKey = `${lineKey(identity)}\u0000${date}`;
      invariant(!lineDates.has(duplicateKey), `duplicate observation for retailer ${identity.retailer_key}, MPN ${identity.mpn} on ${date} requires an approved same-line/same-date selection rule`);
      lineDates.add(duplicateKey);
    }
    previousMaxObservedAt = trancheObservedAts.sort().at(-1);
  }
}

function gcd(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function addFractions(left, right) {
  const common = gcd(left.denominator, right.denominator);
  const numerator = left.numerator * (right.denominator / common) + right.numerator * (left.denominator / common);
  const denominator = (left.denominator / common) * right.denominator;
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function roundPositiveFraction(numerator, denominator) {
  let quotient = numerator / denominator;
  if ((numerator % denominator) * 2n >= denominator) quotient += 1n;
  invariant(quotient <= BigInt(Number.MAX_SAFE_INTEGER), "rounded diagnostic level exceeds the safe integer range");
  return Number(quotient);
}

function dayDistance(fromDate, toDate) {
  return (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000;
}

function lineage(record) {
  const { tranche, observation } = record;
  return {
    tranche_id: tranche.tranche_id,
    observation_id: observation.observation_id,
    observed_at: observation.observed_at,
    source_url: observation.source.source_url,
    retailer_key: observation.source.source_key,
    retailer_legal_name: observation.seller.legal_name,
    evidence_extract_path: observation.evidence.extract_path,
    evidence_extract_sha256: observation.evidence.extract_sha256,
    response_sha256: observation.evidence.response_sha256,
    item_price_minor: observation.item_price.amount_minor,
    currency: observation.item_price.currency,
    vat_state: observation.item_price.vat_state,
  };
}

export function derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches) {
  validateTranches(tranches);
  const records = tranches.flatMap((tranche) => tranche.observations.map((observation) => ({
    tranche,
    observation,
    date: observation.observed_at.slice(0, 10),
    identity: lineIdentity(observation),
    qualification: qualifyQuotedItemPrice(observation),
  }))).filter((record) => record.date >= PRIVATE_CANDIDATE_INCEPTION_BASE_DATE);
  records.sort((left, right) => lineKey(left.identity).localeCompare(lineKey(right.identity)) || left.date.localeCompare(right.date) || left.observation.observation_id.localeCompare(right.observation.observation_id));

  const dates = [...new Set(records.map((record) => record.date))].sort();
  const allLineKeys = [...new Set(records.map((record) => lineKey(record.identity)))].sort();
  const byLineDate = new Map(records.map((record) => [`${lineKey(record.identity)}\u0000${record.date}`, record]));
  const firstSeenByLine = new Map(allLineKeys.map((line) => [
    line,
    records.find((record) => lineKey(record.identity) === line).date,
  ]));
  const baseEligible = new Map();
  for (const line of allLineKeys) {
    const record = byLineDate.get(`${line}\u0000${PRIVATE_CANDIDATE_INCEPTION_BASE_DATE}`);
    if (record?.qualification.status === "eligible") baseEligible.set(line, record);
  }

  const dateDiagnostics = [];
  const candidatePoints = [];
  for (const date of dates) {
    const coverageLines = [];
    const contributions = [];
    const linesAsOfDate = allLineKeys.filter((line) => firstSeenByLine.get(line) <= date);
    for (const line of linesAsOfDate) {
      const identityRecord = records.find((record) => lineKey(record.identity) === line);
      const base = baseEligible.get(line);
      const current = byLineDate.get(`${line}\u0000${date}`);
      let diagnostic;
      if (!base) {
        const baseRecord = byLineDate.get(`${line}\u0000${PRIVATE_CANDIDATE_INCEPTION_BASE_DATE}`);
        diagnostic = {
          ...identityRecord.identity,
          status: baseRecord ? "baseline_ineligible" : "no_baseline_observation",
          reasons: baseRecord?.qualification.reasons ?? ["no_observation_on_immutable_base_date"],
        };
      } else if (!current) {
        const prior = records.filter((record) => lineKey(record.identity) === line && record.date < date && record.qualification.status === "eligible").at(-1);
        diagnostic = {
          ...identityRecord.identity,
          status: "missing_current_observation_no_imputation",
          reasons: ["no_same_date_observation"],
          last_eligible_date: prior?.date ?? null,
          stale_days: prior ? dayDistance(prior.date, date) : null,
        };
      } else if (current.qualification.status === "abstain") {
        diagnostic = {
          ...identityRecord.identity,
          status: "current_observation_ineligible_no_imputation",
          reasons: current.qualification.reasons,
          current_observation_lineage: lineage(current),
        };
      } else {
        diagnostic = {
          ...identityRecord.identity,
          status: "eligible_paired_line",
          reasons: [],
          base_observation_id: base.observation.observation_id,
          current_observation_id: current.observation.observation_id,
        };
        contributions.push({
          ...identityRecord.identity,
          price_relative: {
            numerator: String(current.qualification.item_price_minor),
            denominator: String(base.qualification.item_price_minor),
          },
          base_observation_lineage: lineage(base),
          current_observation_lineage: lineage(current),
        });
      }
      coverageLines.push(diagnostic);
    }

    const hasCompleteBaseBasket = baseEligible.size > 0 && contributions.length === baseEligible.size;
    const diagnostic = {
      date,
      baseline_eligible_line_count: baseEligible.size,
      eligible_paired_line_count: contributions.length,
      coverage_basis_points: baseEligible.size === 0 ? 0 : roundPositiveFraction(BigInt(contributions.length) * 10_000n, BigInt(baseEligible.size)),
      lines: coverageLines,
      quality_state: hasCompleteBaseBasket
        ? "calculable_complete_base_basket_without_imputation"
        : contributions.length > 0
          ? "abstain_incomplete_base_basket_coverage"
          : "abstain_no_eligible_paired_lines",
    };
    dateDiagnostics.push(diagnostic);

    if (hasCompleteBaseBasket) {
      let sum = { numerator: 0n, denominator: 1n };
      for (const contribution of contributions) {
        sum = addFractions(sum, {
          numerator: BigInt(contribution.price_relative.numerator),
          denominator: BigInt(contribution.price_relative.denominator),
        });
      }
      const averageDenominator = sum.denominator * BigInt(baseEligible.size);
      const divisor = gcd(sum.numerator, averageDenominator);
      const average = { numerator: sum.numerator / divisor, denominator: averageDenominator / divisor };
      const levelNumerator = average.numerator * DIAGNOSTIC_BASE;
      const levelDivisor = gcd(levelNumerator, average.denominator);
      candidatePoints.push({
        date,
        diagnostic_level_micros: roundPositiveFraction(levelNumerator * DIAGNOSTIC_SCALE, average.denominator),
        diagnostic_level_rational: {
          numerator: String(levelNumerator / levelDivisor),
          denominator: String(average.denominator / levelDivisor),
        },
        eligible_line_count: contributions.length,
        contributions,
      });
    }
  }

  const postBasePoints = candidatePoints.filter((point) => point.date > PRIVATE_CANDIDATE_INCEPTION_BASE_DATE);
  const hasTwoRetainedDates = dates.length >= 2;
  const hasRealLine = hasTwoRetainedDates && postBasePoints.length > 0 && candidatePoints.some((point) => point.date === PRIVATE_CANDIDATE_INCEPTION_BASE_DATE);
  return {
    calculation_version: PRIVATE_CANDIDATE_QUOTED_ITEM_DIAGNOSTIC_VERSION,
    calculation_kind: "unapproved_equal_arithmetic_mean_of_retailer_mpn_quoted_item_price_relatives",
    not_an_index: true,
    historical_input_policy: "separate_backfill_schema_excluded_no_backcast_no_chain_link_no_rebase",
    scope: "candidate_only",
    region: "GB",
    visibility: "private",
    price_basis: "vat_inclusive_gbp_quoted_item_price",
    delivery_treatment: "excluded_from_calculation_not_a_landed_price",
    availability_treatment: "not_qualified_price_tag_diagnostic_only",
    immutable_base_date: PRIVATE_CANDIDATE_INCEPTION_BASE_DATE,
    diagnostic_base_level: 100,
    rounding: "nearest_0.000001_index_point_half_up; maximum absolute rounding error 0.0000005 index point",
    governance: Object.fromEntries(AUTHORITY_LOCKS.map((lock) => [lock, false])),
    status: hasRealLine ? "candidate_diagnostic_available" : "abstain",
    abstention_reasons: hasRealLine ? [] : [
      ...(hasTwoRetainedDates ? [] : ["requires_at_least_two_retained_dates"]),
      ...(hasTwoRetainedDates && postBasePoints.length === 0 ? ["requires_eligible_base_and_later_line_pair"] : []),
    ],
    retained_dates: dates,
    points: hasRealLine ? candidatePoints : [],
    date_diagnostics: dateDiagnostics,
  };
}
