import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCandidateInputManifest } from "./candidate-input-manifest.mjs";
import { buildPublicOffers } from "./public-offers.mjs";

export const PROMOTION_REPORT_PATH = "data/derived/private-candidate/factual-offer-promotion-candidates.v1.json";
const CANDIDATE_MANIFEST_PATH = "data/derived/private-candidate/ram-input-manifest.v1.json";
const ACTIVE_RELEASE_PATH = "config/factual-offer-active-release.v1.json";
const ACTIVE_PAYLOAD_PATH = "data/public-offers/offers-ram.v1.json";
const DAILY_POLICY_PATH = "config/daily-market-dashboard-policy.v1.json";
const GENERATOR_PATH = "lib/factual-offer-promotion-candidates.mjs";
const BUILD_SCRIPT_PATH = "scripts/build-factual-offer-promotion-candidates.mjs";
const DEPENDENCY_PATHS = ["lib/candidate-input-manifest.mjs", "lib/public-offers.mjs"];
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonicalBytes = (value) => `${JSON.stringify(value, null, 2)}\n`;

function rootPath(rootUrl) {
  return rootUrl instanceof URL ? fileURLToPath(rootUrl) : path.resolve(rootUrl);
}

function bindFile(root, relativePath) {
  const bytes = readFileSync(path.join(root, relativePath));
  return { path: relativePath, sha256: sha256(bytes), byte_length: bytes.length };
}

function readBound(root, relativePath) {
  const bytes = readFileSync(path.join(root, relativePath));
  return { value: JSON.parse(bytes), bytes, record: { path: relativePath, sha256: sha256(bytes), byte_length: bytes.length } };
}

function observationAmount(observation) {
  return observation.item_price?.amount_minor ?? observation.price?.amount_minor ?? observation.price?.item_price_minor ?? null;
}

export function buildFactualOfferPromotionCandidates(rootUrl = new URL("../", import.meta.url)) {
  const root = rootPath(rootUrl);
  const candidateManifestBound = readBound(root, CANDIDATE_MANIFEST_PATH);
  const candidateManifest = loadCandidateInputManifest(rootUrl);
  const activeRelease = readBound(root, ACTIVE_RELEASE_PATH);
  const activePayload = readBound(root, ACTIVE_PAYLOAD_PATH);
  const dailyPolicy = readBound(root, DAILY_POLICY_PATH);
  if (JSON.stringify(dailyPolicy.value.quality?.excluded_exact_item_price_minor) !== JSON.stringify([9999999]) || dailyPolicy.value.quality?.excluded_reason !== "known retailer placeholder amount" || dailyPolicy.value.quality?.temporal_outlier_suppression !== false) throw new Error("approved known-placeholder quarantine drifted");
  if (activeRelease.value.authority?.admit_new_observation_inputs !== false || activeRelease.value.authority?.approve_publication_expansion !== false) throw new Error("active release boundary gained promotion authority");
  const lockedPayload = activeRelease.value.locked_payload;
  if (lockedPayload?.path !== ACTIVE_PAYLOAD_PATH || sha256(activePayload.bytes) !== lockedPayload.sha256 || activePayload.value.observations?.length !== lockedPayload.record_count || activePayload.value.latest_observed_at !== lockedPayload.latest_observed_at) throw new Error("active payload does not match the checksum-bound release lock");

  const primaryPaths = candidateManifest.entries.filter((entry) => entry.path.startsWith("data/observations/candidate/uk-primary-retail") && entry.path.endsWith(".json")).map((entry) => entry.path).sort(compare);
  const evaluation = buildPublicOffers(rootUrl, { privateCandidateObservationPaths: primaryPaths });
  const activeIds = new Set(activePayload.value.observations.map((item) => item.public_observation_id));
  const rawByKey = new Map();
  const candidateInputRecords = [];
  let totalObservations = 0;
  let primaryObservations = 0;
  const outsidePolicy = [];
  for (const entry of candidateManifest.entries) {
    const boundArtifact = readBound(root, entry.path);
    candidateInputRecords.push(boundArtifact.record);
    const artifact = boundArtifact.value;
    const observations = artifact.observations ?? [];
    totalObservations += observations.length;
    if (primaryPaths.includes(entry.path)) {
      primaryObservations += observations.length;
      for (const observation of observations) rawByKey.set(`${entry.path}\u001f${observation.observation_id ?? ""}`, observation);
    } else {
      for (const observation of observations) outsidePolicy.push({
        observation_id: observation.observation_id ?? observation.observation_key ?? null,
        input_path: entry.path,
        mpn: observation.identity?.mpn_observed ?? observation.product?.mpn ?? observation.mpn_observed ?? null,
        mpn_expected: observation.mpn_expected ?? null,
        observed_at: observation.observed_at ?? artifact.collected_at ?? null,
        disposition: "excluded_outside_approved_primary_retail_policy",
        reasons: ["source_family_outside_approved_primary_retail_policy"],
      });
    }
  }

  const knownPlaceholder = new Set(dailyPolicy.value.quality.excluded_exact_item_price_minor);
  const excluded = evaluation.evaluations.excluded.map((item) => {
    const raw = rawByKey.get(`${item.input_path}\u001f${item.observation_id ?? ""}`);
    const reasons = [...item.reasons];
    if (knownPlaceholder.has(observationAmount(raw ?? {})) && !reasons.includes("known_retailer_placeholder_amount")) reasons.push("known_retailer_placeholder_amount");
    return { ...item, reasons: reasons.sort(compare) };
  });
  const policyAccepted = [];
  for (const item of evaluation.evaluations.accepted) {
    if (knownPlaceholder.has(item.public_offer.item_price_minor)) {
      excluded.push({ observation_id: item.source_observation_id, input_path: item.input_path, public_observation_id: item.public_offer.public_observation_id, mpn: item.public_offer.mpn, observed_at: item.public_offer.observed_at, disposition: "excluded_known_placeholder", reasons: ["known_retailer_placeholder_amount"] });
    } else policyAccepted.push(item);
  }
  excluded.push(...outsidePolicy);
  excluded.sort((a, b) => compare(a.observed_at ?? "", b.observed_at ?? "") || compare(a.mpn ?? "", b.mpn ?? "") || compare(a.input_path, b.input_path) || compare(a.observation_id ?? "", b.observation_id ?? ""));

  const promotionCandidates = policyAccepted.filter((item) => !activeIds.has(item.public_offer.public_observation_id)).map((item) => ({
    candidate_id: `promotion-${item.public_offer.public_observation_id}`,
    source_observation_id: item.source_observation_id,
    input_path: item.input_path,
    disposition: "candidate_for_human_promotion_review",
    meets_existing_factual_offer_predicates: true,
    known_placeholder_quarantine_passed: true,
    approved: false,
    publication_action_allowed: false,
    public_offer_candidate: item.public_offer,
  }));
  promotionCandidates.sort((a, b) => compare(a.public_offer_candidate.observed_at, b.public_offer_candidate.observed_at) || compare(a.candidate_id, b.candidate_id));
  const acceptedIds = new Set(policyAccepted.map((item) => item.public_offer.public_observation_id));
  const activeReleaseConflicts = activePayload.value.observations.filter((item) => !acceptedIds.has(item.public_observation_id)).map((item) => item.public_observation_id).sort(compare);
  const reasonCounts = {};
  for (const item of excluded) for (const reason of item.reasons) reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  const exclusionReasonCounts = Object.fromEntries(Object.entries(reasonCounts).sort(([a], [b]) => compare(a, b)));
  const timestamps = [...policyAccepted.map((item) => item.public_offer.observed_at), ...excluded.map((item) => item.observed_at).filter(Boolean)].sort(compare);
  const asOf = timestamps.at(-1);
  if (!asOf) throw new Error("promotion evaluation has no retained timestamp");
  if (evaluation.evaluations.accepted.length + evaluation.evaluations.excluded.length !== primaryObservations) throw new Error("primary-retail evaluation does not classify every retained observation");
  if (promotionCandidates.some((item) => activeIds.has(item.public_offer_candidate.public_observation_id))) throw new Error("active observation leaked into promotion candidates");

  const inputMap = new Map(evaluation.manifest.inputs.map((item) => [item.path, item]));
  for (const record of candidateInputRecords) inputMap.set(record.path, record);
  for (const bound of [candidateManifestBound, activeRelease, activePayload, dailyPolicy]) inputMap.set(bound.record.path, bound.record);
  const inputs = [...inputMap.values()].sort((a, b) => compare(a.path, b.path));
  const generator = bindFile(root, GENERATOR_PATH);
  const buildScript = bindFile(root, BUILD_SCRIPT_PATH);
  const dependencies = DEPENDENCY_PATHS.map((relativePath) => bindFile(root, relativePath));
  return {
    schema_version: 1,
    report_id: `sf-private-factual-offer-promotion-candidates-through-${asOf.replaceAll(/[-:]/gu, "")}-v1`,
    status: "private_non_approving_candidate",
    publication_eligible: false,
    as_of: asOf,
    purpose: "Apply existing executable exact-MPN factual-offer and known-placeholder rules to all retained candidate observations, then present only not-yet-active passing records for human promotion review.",
    policy_basis: [
      { path: "config/factual-offer-publication-policy.v1.json", sha256: inputMap.get("config/factual-offer-publication-policy.v1.json").sha256 },
      { path: DAILY_POLICY_PATH, sha256: dailyPolicy.record.sha256, reused_rule_only: "known retailer placeholder amount equals exactly 9999999 minor units" },
      { path: ACTIVE_RELEASE_PATH, sha256: activeRelease.record.sha256, role: "defines already-active observations; confers no promotion authority" },
    ],
    generator: { ...generator, version: 1 },
    build_script: buildScript,
    dependencies,
    inputs,
    coverage: {
      candidate_files: candidateManifest.entries.length,
      primary_retail_contract_files: primaryPaths.length,
      retained_observations: totalObservations,
      evaluated_by_primary_retail_contract: primaryObservations,
      excluded_outside_primary_retail_contract: outsidePolicy.length,
      passing_existing_rules: policyAccepted.length,
      already_active: policyAccepted.length - promotionCandidates.length,
      promotion_candidates: promotionCandidates.length,
      excluded_observations: excluded.length,
      active_release_conflicts: activeReleaseConflicts.length,
    },
    exclusion_reason_counts: exclusionReasonCounts,
    promotion_candidates: promotionCandidates,
    active_release_conflicts: activeReleaseConflicts,
    excluded_observations: excluded,
    authority: {
      candidate_generation: true,
      promotion_approval: false,
      publication: false,
      source_family_selection_or_approval: false,
      methodology: false,
      basket: false,
      threshold_selection: false,
      reference_or_deflator: false,
      public_claim: false,
      production_action: false,
      deployment: false,
    },
  };
}

export function factualOfferPromotionCandidateBytes(value) {
  return canonicalBytes(value);
}
