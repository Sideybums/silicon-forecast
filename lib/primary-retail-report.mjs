import {
  deriveCandidateProductMovements,
  qualifyPrimaryRetailObservation,
  validateCandidateObservationFixture,
} from "./primary-retail-observations.mjs";

function markdown(value) {
  return String(value).replace(/([\\|`*_{}\[\]<>])/gu, "\\$1");
}

function formatGbp(amountMinor) {
  const pounds = Math.floor(amountMinor / 100);
  const pence = String(amountMinor % 100).padStart(2, "0");
  return `£${pounds}.${pence}`;
}

function lineKey(observation) {
  return `${observation.product_key}\u0000${observation.retailer.retailer_key}`;
}

function compareObservations(left, right) {
  return lineKey(left).localeCompare(lineKey(right))
    || left.observed_at.localeCompare(right.observed_at)
    || left.observation_id.localeCompare(right.observation_id);
}

function renderLine(productKey, retailerKey, observations, calculation) {
  const lines = [];
  const expectedMpns = [...new Set(observations.map((observation) => observation.identity.mpn_expected))].sort();
  const retailerNames = [...new Set(observations.map((observation) => observation.retailer.retailer_name))].sort();
  const eligible = observations
    .map((observation) => ({ observation, qualification: qualifyPrimaryRetailObservation(observation) }))
    .filter(({ qualification }) => qualification.status === "eligible");
  const movements = calculation.movements.filter((movement) => (
    movement.product_key === productKey && movement.retailer_key === retailerKey
  ));
  const insufficient = calculation.insufficient_history.find((item) => (
    item.product_key === productKey && item.retailer_key === retailerKey
  ));

  lines.push(`### ${markdown(productKey)} — ${markdown(retailerKey)}`);
  lines.push("");
  lines.push(`- Retailer name: ${retailerNames.map(markdown).join(", ")}`);
  lines.push(`- Expected MPN: ${expectedMpns.map(markdown).join(", ")}`);
  lines.push("");
  lines.push("#### Eligible landed prices");
  lines.push("");
  if (eligible.length === 0) {
    lines.push("None. No landed price is inferred from abstained observations.");
  } else {
    lines.push("| Observed at | Landed price | Observation lineage | Source lineage |");
    lines.push("|---|---:|---|---|");
    for (const { observation, qualification } of eligible) {
      lines.push(`| ${markdown(observation.observed_at)} | ${formatGbp(qualification.landed_price_minor)} GBP | ${markdown(observation.observation_id)} | ${markdown(observation.evidence.source_url)} |`);
    }
  }
  lines.push("");
  lines.push("#### Movement assessment");
  lines.push("");
  if (movements.length === 0) {
    lines.push(`**INSUFFICIENT HISTORY** — reason code: \`${insufficient.reason}\`.`);
    lines.push(`Eligible dates: ${insufficient.eligible_dates.length > 0 ? insufficient.eligible_dates.map(markdown).join(", ") : "none"}.`);
  } else {
    lines.push("| Period | Direction | From | To | Change | Basis points | Observation lineage |");
    lines.push("|---|---|---:|---:|---:|---:|---|");
    for (const movement of movements) {
      const signedChange = `${movement.change_minor > 0 ? "+" : ""}${formatGbp(Math.abs(movement.change_minor))}`;
      const displayChange = movement.change_minor < 0 ? `-${formatGbp(Math.abs(movement.change_minor))}` : signedChange;
      const lineage = `${movement.from_observation_ids.join(", ")} → ${movement.to_observation_ids.join(", ")}`;
      lines.push(`| ${movement.from_date} → ${movement.to_date} | ${movement.direction} | ${formatGbp(movement.from_landed_price_minor)} | ${formatGbp(movement.to_landed_price_minor)} | ${displayChange} | ${movement.change_basis_points} | ${markdown(lineage)} |`);
    }
  }
  lines.push("");
  return lines;
}

export function renderPrivateCandidateRetailMovementReport(fixture) {
  validateCandidateObservationFixture(fixture);
  const calculation = deriveCandidateProductMovements(fixture);
  const observations = [...fixture.observations].sort(compareObservations);
  const groups = new Map();
  for (const observation of observations) {
    const key = lineKey(observation);
    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }

  const lines = [
    "# PRIVATE CANDIDATE-RETAIL MOVEMENT REPORT",
    "",
    "> **CANDIDATE / PRIVATE — NOT AN INDEX — NOT METHODOLOGY-APPROVED — NOT PUBLIC**",
    ">",
    "> This fixture-only report is not approved for production import, production activation, index inclusion, or publication.",
    "",
    "## Scope and guard rails",
    "",
    `- Fixture set: ${markdown(fixture.fixture_set_id)}`,
    `- Fixture status: ${markdown(fixture.status)}`,
    `- Region: ${markdown(fixture.region)}`,
    `- Methodology status: ${markdown(fixture.methodology_status)}`,
    `- Calculation version: ${markdown(calculation.calculation_version)}`,
    `- Fixture notice: ${markdown(fixture.fixture_notice)}`,
    "- Production import allowed: **NO**",
    "- Production activation allowed: **NO**",
    "- Index inclusion allowed: **NO**",
    "- Publication allowed: **NO**",
    "",
    "## Retailer-product lines",
    "",
  ];

  for (const [key, group] of groups) {
    const [productKey, retailerKey] = key.split("\u0000");
    lines.push(...renderLine(productKey, retailerKey, group, calculation));
  }

  lines.push("## Reason-coded abstentions and lineage", "");
  const abstentions = observations
    .map((observation) => ({ observation, qualification: qualifyPrimaryRetailObservation(observation) }))
    .filter(({ qualification }) => qualification.status === "abstain")
    .sort((left, right) => left.observation.observation_id.localeCompare(right.observation.observation_id));

  if (abstentions.length === 0) {
    lines.push("None.", "");
  } else {
    for (const { observation, qualification } of abstentions) {
      lines.push(`### ${markdown(observation.observation_id)}`);
      lines.push("");
      lines.push(`- Retailer-product line: ${markdown(observation.product_key)} — ${markdown(observation.retailer.retailer_key)}`);
      lines.push(`- Observed at: ${markdown(observation.observed_at)}`);
      lines.push(`- Reason codes: ${qualification.reasons.map((reason) => `\`${reason}\``).join(", ")}`);
      lines.push(`- Source lineage: ${markdown(observation.evidence.source_url)}`);
      lines.push(`- Retained factual lineage: ${observation.evidence.retained_facts.map(markdown).join("; ")}`);
      lines.push("");
    }
  }

  lines.push("---", "**END OF PRIVATE CANDIDATE REPORT — NOT AN INDEX — NOT FOR PUBLICATION**", "");
  return lines.join("\n");
}

function trancheInvariant(condition, message) {
  if (!condition) throw new Error(message);
}

function validateCandidateObservationTranche(tranche) {
  trancheInvariant(tranche?.schema_version === 1, "candidate observation tranche schema_version must be 1");
  trancheInvariant(typeof tranche.tranche_id === "string" && tranche.tranche_id.length > 0, "candidate observation tranche_id is required");
  trancheInvariant(tranche.status === "candidate_private_immutable", "candidate observation tranche must remain private and immutable");
  trancheInvariant(tranche.scope === "candidate_only", "candidate observation tranche scope must remain candidate_only");
  trancheInvariant(tranche.channel === "PRIMARY_RETAIL", "candidate observation tranche channel must remain PRIMARY_RETAIL");
  for (const [key, value] of Object.entries(tranche.governance ?? {})) {
    trancheInvariant(value === false, `candidate observation tranche governance flag ${key} must remain false`);
  }
  trancheInvariant(Object.keys(tranche.governance ?? {}).length === 5, "candidate observation tranche must carry all five governance locks");
  trancheInvariant(Array.isArray(tranche.observations) && tranche.observations.length > 0, "candidate observation tranche requires observations");
  for (const observation of tranche.observations) {
    trancheInvariant(observation.status === "candidate_private_immutable", `${observation.observation_id}: status must remain candidate_private_immutable`);
    trancheInvariant(observation.scope === "candidate_only", `${observation.observation_id}: scope must remain candidate_only`);
    trancheInvariant(observation.identity?.match_basis === "exact_mpn", `${observation.observation_id}: exact MPN evidence is required`);
    trancheInvariant(Number.isSafeInteger(observation.item_price?.amount_minor) && observation.item_price.amount_minor > 0, `${observation.observation_id}: positive safe-integer item price is required`);
    trancheInvariant(observation.item_price.currency === "GBP", `${observation.observation_id}: currency must be GBP`);
    trancheInvariant(observation.landed_price?.eligibility === "abstain" && observation.landed_price.amount_minor === null, `${observation.observation_id}: this tranche must not infer a landed price`);
    trancheInvariant(observation.qualification?.status === "candidate_retained_not_landed_price_eligible", `${observation.observation_id}: qualification must remain candidate-only and ineligible`);
    trancheInvariant(Array.isArray(observation.qualification.reasons) && observation.qualification.reasons.length > 0, `${observation.observation_id}: abstention reasons are required`);
    trancheInvariant(observation.qualification.reasons.every((reason) => /^[a-z0-9_]+$/u.test(reason)), `${observation.observation_id}: abstention reasons must use stable reason-code syntax`);
    trancheInvariant(Object.keys(observation.governance ?? {}).length === 5, `${observation.observation_id}: all five governance locks are required`);
    trancheInvariant(Object.values(observation.governance ?? {}).every((value) => value === false), `${observation.observation_id}: governance flags must remain false`);
  }
}

export function renderPrivateCandidateRetailTrancheReport(tranche) {
  validateCandidateObservationTranche(tranche);
  const observations = [...tranche.observations].sort((left, right) => (
    left.identity.mpn_observed.localeCompare(right.identity.mpn_observed)
    || left.observed_at.localeCompare(right.observed_at)
    || left.observation_id.localeCompare(right.observation_id)
  ));
  const lines = [
    "# PRIVATE CANDIDATE PRIMARY-RETAIL OBSERVATION HISTORY",
    "",
    "> **CANDIDATE / PRIVATE — RAW ITEM-PRICE RESEARCH — NOT AN INDEX — NOT LANDED-PRICE ELIGIBLE — NOT PUBLIC**",
    ">",
    "> These retained observations preserve research history. They do not establish source approval, methodology approval, index eligibility, production authority, or publication authority.",
    "",
    "## Tranche",
    "",
    `- Tranche ID: ${markdown(tranche.tranche_id)}`,
    "- Report coverage: **TRANCHE-LOCAL ONLY** — no global date coverage is claimed.",
    `- Created at: ${markdown(tranche.created_at)}`,
    `- Region: ${markdown(tranche.region)}`,
    `- Channel: ${markdown(tranche.channel)}`,
    `- Observations retained: ${observations.length}`,
    "- Derived movements: **NONE** — each retailer-product line has only one retained date and no observation is landed-price eligible.",
    "",
    "## Retained item-price observations",
    "",
    "| Exact MPN | Retailer / seller | Observed at | Item price | VAT | Availability | Delivery claim | Landed-price status | Source |",
    "|---|---|---|---:|---|---|---|---|---|",
  ];
  for (const observation of observations) {
    lines.push(`| ${markdown(observation.identity.mpn_observed)} | ${markdown(observation.seller.display_name)} / ${markdown(observation.seller.legal_name)} | ${markdown(observation.observed_at)} | ${formatGbp(observation.item_price.amount_minor)} GBP | ${markdown(observation.item_price.vat_state)} | ${markdown(observation.availability.display)} | ${markdown(observation.delivery.claim)} | abstain: ${observation.qualification.reasons.map((reason) => `\`${reason}\``).join(", ")} | ${markdown(observation.source.source_url)} |`);
  }
  lines.push("", "## Evidence lineage", "");
  for (const observation of observations) {
    lines.push(`- ${markdown(observation.observation_id)} — ${markdown(observation.evidence.extract_path)} — extract SHA-256 \`${observation.evidence.extract_sha256}\` — response SHA-256 \`${observation.evidence.response_sha256}\` (response bytes not retained).`);
  }
  lines.push("", "---", "**END OF PRIVATE CANDIDATE OBSERVATION HISTORY — NOT AN INDEX — NOT FOR PUBLICATION**", "");
  return lines.join("\n");
}

export function renderPrivateCandidateRetailReport(input) {
  if (input?.fixture_set_id) return renderPrivateCandidateRetailMovementReport(input);
  if (input?.tranche_id) return renderPrivateCandidateRetailTrancheReport(input);
  throw new Error("input must be a candidate observation fixture or immutable candidate observation tranche");
}
