const OBSERVATION_FIELDS = [
  "observation_id", "scope", "region", "observed_at", "product_key", "identity",
  "channel", "retailer", "item_price", "availability", "delivery", "landed_price", "evidence",
];
const FIXTURE_FIELDS = [
  "schema_version", "fixture_set_id", "status", "region", "methodology_status",
  "fixture_notice", "governance", "observations",
];
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MPN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/u;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, expectedKeys, context) {
  invariant(value && typeof value === "object" && !Array.isArray(value), `${context} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  invariant(JSON.stringify(actual) === JSON.stringify(expected), `${context} fields must be exactly: ${expected.join(", ")}`);
}

function nonBlank(value, context) {
  invariant(typeof value === "string" && value.trim() === value && value.length > 0, `${context} must be a non-blank trimmed string`);
  invariant(!/[\u0000-\u001f\u007f]/u.test(value), `${context} contains a forbidden control character`);
}

function enumValue(value, values, context) {
  invariant(values.includes(value), `${context} must be one of: ${values.join(", ")}`);
}

function minorAmount(value, context, { nullable = false } = {}) {
  if (nullable && value === null) return;
  invariant(Number.isSafeInteger(value) && value >= 0, `${context} must be a non-negative safe integer in minor currency units`);
}

function validateObservationStructure(observation, context = "observation") {
  exactKeys(observation, OBSERVATION_FIELDS, context);
  nonBlank(observation.observation_id, `${context}.observation_id`);
  invariant(KEY.test(observation.observation_id), `${context}.observation_id must be a lowercase slug`);
  enumValue(observation.scope, ["candidate_only"], `${context}.scope`);
  enumValue(observation.region, ["GB"], `${context}.region`);
  invariant(UTC_INSTANT.test(observation.observed_at) && !Number.isNaN(Date.parse(observation.observed_at)), `${context}.observed_at must be a valid whole-second UTC instant`);
  nonBlank(observation.product_key, `${context}.product_key`);
  invariant(KEY.test(observation.product_key), `${context}.product_key must be a lowercase slug`);

  exactKeys(observation.identity, ["mpn_expected", "mpn_observed", "match_basis"], `${context}.identity`);
  nonBlank(observation.identity.mpn_expected, `${context}.identity.mpn_expected`);
  invariant(MPN.test(observation.identity.mpn_expected), `${context}.identity.mpn_expected must be normalized uppercase MPN text`);
  if (observation.identity.mpn_observed !== null) {
    nonBlank(observation.identity.mpn_observed, `${context}.identity.mpn_observed`);
    invariant(MPN.test(observation.identity.mpn_observed), `${context}.identity.mpn_observed must be normalized uppercase MPN text`);
  }
  enumValue(observation.identity.match_basis, ["exact_mpn", "unresolved"], `${context}.identity.match_basis`);

  enumValue(observation.channel, ["PRIMARY_RETAIL", "MARKETPLACE"], `${context}.channel`);
  exactKeys(observation.retailer, ["retailer_key", "retailer_name", "seller_name", "seller_relationship"], `${context}.retailer`);
  nonBlank(observation.retailer.retailer_key, `${context}.retailer.retailer_key`);
  invariant(KEY.test(observation.retailer.retailer_key), `${context}.retailer.retailer_key must be a lowercase slug`);
  nonBlank(observation.retailer.retailer_name, `${context}.retailer.retailer_name`);
  nonBlank(observation.retailer.seller_name, `${context}.retailer.seller_name`);
  enumValue(observation.retailer.seller_relationship, ["retailer_owned", "third_party", "unresolved"], `${context}.retailer.seller_relationship`);

  exactKeys(observation.item_price, ["amount_minor", "currency", "vat_state"], `${context}.item_price`);
  minorAmount(observation.item_price.amount_minor, `${context}.item_price.amount_minor`);
  enumValue(observation.item_price.currency, ["GBP"], `${context}.item_price.currency`);
  enumValue(observation.item_price.vat_state, ["included", "excluded", "unknown"], `${context}.item_price.vat_state`);
  enumValue(observation.availability, ["in_stock", "out_of_stock", "unknown"], `${context}.availability`);

  exactKeys(observation.delivery, ["amount_minor", "currency", "state", "destination_basis"], `${context}.delivery`);
  minorAmount(observation.delivery.amount_minor, `${context}.delivery.amount_minor`, { nullable: true });
  enumValue(observation.delivery.currency, ["GBP"], `${context}.delivery.currency`);
  enumValue(observation.delivery.state, ["mandatory_cost_known", "free_delivery_explicit", "unknown"], `${context}.delivery.state`);
  nonBlank(observation.delivery.destination_basis, `${context}.delivery.destination_basis`);

  exactKeys(observation.landed_price, ["amount_minor", "currency", "eligibility"], `${context}.landed_price`);
  minorAmount(observation.landed_price.amount_minor, `${context}.landed_price.amount_minor`, { nullable: true });
  enumValue(observation.landed_price.currency, ["GBP"], `${context}.landed_price.currency`);
  enumValue(observation.landed_price.eligibility, ["eligible", "unresolved"], `${context}.landed_price.eligibility`);

  exactKeys(observation.evidence, ["source_url", "retained_facts"], `${context}.evidence`);
  let sourceUrl;
  try {
    sourceUrl = new URL(observation.evidence.source_url);
  } catch {
    throw new Error(`${context}.evidence.source_url must be a valid URL`);
  }
  invariant(sourceUrl.protocol === "https:", `${context}.evidence.source_url must use HTTPS`);
  invariant(Array.isArray(observation.evidence.retained_facts) && observation.evidence.retained_facts.length > 0, `${context}.evidence.retained_facts must be non-empty`);
  for (const [index, fact] of observation.evidence.retained_facts.entries()) nonBlank(fact, `${context}.evidence.retained_facts[${index}]`);
}

export function qualifyPrimaryRetailObservation(observation) {
  validateObservationStructure(observation);
  const reasons = [];

  if (
    observation.identity.match_basis !== "exact_mpn"
    || observation.identity.mpn_observed === null
    || observation.identity.mpn_observed !== observation.identity.mpn_expected
  ) reasons.push("exact_mpn_unresolved");
  if (observation.channel !== "PRIMARY_RETAIL") reasons.push("channel_not_primary_retail");
  if (observation.retailer.seller_relationship !== "retailer_owned") reasons.push("retailer_owned_seller_unresolved");
  if (observation.item_price.amount_minor === 0) reasons.push("item_price_not_positive");
  if (observation.item_price.vat_state !== "included") reasons.push("vat_inclusion_unresolved");
  if (observation.availability === "unknown") reasons.push("availability_unresolved");
  else if (observation.availability !== "in_stock") reasons.push("not_available_to_purchase");

  const deliveryKnown = new Set(["mandatory_cost_known", "free_delivery_explicit"]).has(observation.delivery.state)
    && observation.delivery.amount_minor !== null
    && (observation.delivery.state !== "free_delivery_explicit" || observation.delivery.amount_minor === 0);
  if (!deliveryKnown) reasons.push("mandatory_delivery_unresolved");

  const semanticsResolved = reasons.length === 0;
  if (semanticsResolved && observation.landed_price.eligibility !== "eligible") {
    reasons.push("landed_price_eligibility_unresolved");
  } else if (semanticsResolved) {
    const calculated = observation.item_price.amount_minor + observation.delivery.amount_minor;
    if (observation.landed_price.amount_minor !== calculated) reasons.push("landed_price_arithmetic_mismatch");
  }

  if (reasons.length > 0) return { status: "abstain", reasons };
  return { status: "eligible", reasons: [], landed_price_minor: observation.landed_price.amount_minor };
}

export function validateCandidateObservationFixture(fixture) {
  exactKeys(fixture, FIXTURE_FIELDS, "candidate observation fixture");
  invariant(fixture.schema_version === 1, "unsupported candidate observation fixture schema_version");
  nonBlank(fixture.fixture_set_id, "candidate observation fixture.fixture_set_id");
  invariant(fixture.status === "candidate_fixture_only", "candidate observation fixture must remain candidate_fixture_only");
  invariant(fixture.region === "GB", "candidate observation fixture region must be GB");
  invariant(fixture.methodology_status === "unapproved_fixture_rule", "candidate observation fixture methodology must remain unapproved");
  nonBlank(fixture.fixture_notice, "candidate observation fixture.fixture_notice");
  exactKeys(fixture.governance, ["production_import_allowed", "production_activation_allowed", "index_inclusion_allowed", "publication_allowed"], "candidate observation fixture.governance");
  for (const flag of ["production_import_allowed", "production_activation_allowed", "index_inclusion_allowed", "publication_allowed"]) {
    invariant(fixture.governance[flag] === false, `${flag} must remain false`);
  }
  invariant(Array.isArray(fixture.observations) && fixture.observations.length > 0, "candidate observation fixture.observations must be non-empty");

  const observationIds = new Set();
  for (const [index, observation] of fixture.observations.entries()) {
    validateObservationStructure(observation, `candidate observation fixture.observations[${index}]`);
    invariant(observation.region === fixture.region, `candidate observation fixture.observations[${index}] region disagrees with fixture`);
    invariant(!observationIds.has(observation.observation_id), `candidate observation fixture.observations[${index}].observation_id must be unique`);
    observationIds.add(observation.observation_id);
  }
  return { observationCount: fixture.observations.length, observationIds };
}

function roundedBasisPoints(changeMinor, priorMinor) {
  const numerator = BigInt(changeMinor) * 10_000n;
  const denominator = BigInt(priorMinor);
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  let quotient = absolute / denominator;
  const remainder = absolute % denominator;
  if (remainder * 2n >= denominator) quotient += 1n;
  const signed = sign * quotient;
  invariant(
    signed >= BigInt(Number.MIN_SAFE_INTEGER) && signed <= BigInt(Number.MAX_SAFE_INTEGER),
    "basis-point movement exceeds safe integer range",
  );
  return Number(signed);
}

export function deriveCandidateProductMovements(fixture) {
  validateCandidateObservationFixture(fixture);
  const abstentions = [];
  const eligibleByLineAndDate = new Map();
  const allLines = new Set();

  for (const observation of fixture.observations) {
    const lineKey = `${observation.product_key}\u0000${observation.retailer.retailer_key}`;
    allLines.add(lineKey);
    const qualification = qualifyPrimaryRetailObservation(observation);
    if (qualification.status === "abstain") {
      abstentions.push({ observation_id: observation.observation_id, reasons: qualification.reasons });
      continue;
    }
    const date = observation.observed_at.slice(0, 10);
    const groupKey = `${lineKey}\u0000${date}`;
    const values = eligibleByLineAndDate.get(groupKey) ?? [];
    values.push({ observation_id: observation.observation_id, landed_price_minor: qualification.landed_price_minor });
    eligibleByLineAndDate.set(groupKey, values);
  }

  const dailyByLine = new Map([...allLines].map((lineKey) => [lineKey, []]));
  for (const [groupKey, values] of eligibleByLineAndDate) {
    const parts = groupKey.split("\u0000");
    const date = parts.pop();
    const lineKey = parts.join("\u0000");
    invariant(
      values.length === 1,
      `multiple eligible observations for ${lineKey} on ${date} require an approved daily selection rule`,
    );
    const selected = values[0];
    dailyByLine.get(lineKey).push({
      date,
      landed_price_minor: selected.landed_price_minor,
      observation_ids: [selected.observation_id],
    });
  }

  const movements = [];
  const insufficientHistory = [];
  for (const lineKey of [...allLines].sort()) {
    const [productKey, retailerKey] = lineKey.split("\u0000");
    const daily = dailyByLine.get(lineKey).sort((left, right) => left.date.localeCompare(right.date));
    if (daily.length < 2) {
      insufficientHistory.push({
        product_key: productKey,
        retailer_key: retailerKey,
        eligible_dates: daily.map((value) => value.date),
        reason: "requires_at_least_two_eligible_dates",
      });
      continue;
    }
    for (let index = 1; index < daily.length; index += 1) {
      const from = daily[index - 1];
      const to = daily[index];
      const changeMinor = to.landed_price_minor - from.landed_price_minor;
      movements.push({
        product_key: productKey,
        retailer_key: retailerKey,
        from_date: from.date,
        to_date: to.date,
        from_landed_price_minor: from.landed_price_minor,
        to_landed_price_minor: to.landed_price_minor,
        change_minor: changeMinor,
        change_basis_points: roundedBasisPoints(changeMinor, from.landed_price_minor),
        direction: changeMinor < 0 ? "down" : changeMinor > 0 ? "up" : "flat",
        from_observation_ids: from.observation_ids,
        to_observation_ids: to.observation_ids,
      });
    }
  }

  abstentions.sort((left, right) => left.observation_id.localeCompare(right.observation_id));
  return {
    calculation_version: "candidate-primary-retail-movement-v1",
    scope: "candidate_only",
    region: "GB",
    governance: {
      production_import_allowed: false,
      production_activation_allowed: false,
      index_inclusion_allowed: false,
      publication_allowed: false,
    },
    movements,
    abstentions,
    insufficient_history: insufficientHistory,
  };
}
