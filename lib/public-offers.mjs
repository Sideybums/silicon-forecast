import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export const PUBLIC_OFFERS_SCHEMA_VERSION = 1;
const POLICY_PATH = "config/factual-offer-publication-policy.v1.json";
const ACTIVE_RELEASE_PATH = "config/factual-offer-active-release.v1.json";
const PROMOTION_APPROVAL_PATH = "config/factual-offer-promotion-approval-2026-08-25.v1.json";
const OBSERVATION_DIR = "data/observations/candidate";
const GENERATOR_PATH = "lib/public-offers.mjs";
const BUILD_SCRIPT_PATH = "scripts/build-public-offers.mjs";
const CATALOGUE_PATHS = ["data/catalogue/ddr5-32gb-seed.v1.json", "data/catalogue/ddr5-32gb-diversification.v1.json"];
const REVIEW_PATHS = ["data/reviews/ddr5-32gb-seed-review-2026-08-06.json", "data/reviews/ddr5-32gb-diversification-review-2026-08-09.json"];
const LABELS = {
  observation: "Dated observation; not a live-price claim",
  price: "VAT included where explicitly established; delivery excluded",
  scope: "Not an index, recommendation, market average or complete-market comparison",
};
const PUBLIC_FIELDS = ["public_observation_id", "observed_at", "observation_kind", "mpn", "retailer_id", "retailer_name", "item_price_minor", "currency", "vat_state", "availability", "delivery_state", "source_url"];
const REQUIRED_PREDICATES = ["exact_mpn_matches_an_approved_product", "captured_product_is_32gb_two_module_desktop_ddr5", "source_is_uk_primary_retail", "seller_is_the_retailer", "item_price_is_positive_integer_minor_units", "currency_is_gbp", "vat_is_explicitly_included", "availability_is_explicitly_in_stock_or_available_to_order", "observation_time_is_valid_utc", "source_or_archive_url_is_https", "no_explicit_applicable_publication_restriction", "output_replays_byte_for_byte"];
const HARD_PROHIBITIONS = ["aggregate_or_index_claim", "basket_baseline_reference_or_deflator_approval", "representativeness_or_complete_market_claim", "current_price_or_current_stock_claim_without_a_separate_freshness_contract", "recommendation_best_deal_or_ranking_claim", "automatic_research_or_causal_claim_publication", "source_family_or_index_inclusion_approval", "copied_authored_description_image_logo_or_creative", "unknown_public_field", "unbound_or_mutated_input"];
const TRUE_AUTHORITY=["factual_observations", "routine_future_observations_after_validation", "retailer_links", "raw_exact_mpn_history"];
const FALSE_AUTHORITY=["aggregate_index", "methodology", "basket", "baseline", "historical_reference", "deflator", "research_publication", "production_deployment"];
const PRODUCT_FIELDS = ["mpn", "manufacturer", "model", "memory_type", "capacity_gb", "module_count", "speed_mt_s", "form_factor"];
const RETAILER_FIELDS = ["retailer_id", "display_name"];
const TOP_FIELDS = ["schema_version", "dataset_id", "market", "currency", "latest_observed_at", "price_basis", "labels", "products", "retailers", "observations"];
const STRICT_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const RETAILER_CONTRACT = [
  { retailer_id: "awd-it", display_name: "AWD-IT", accepted_input_names: ["AWD-IT"], https_hosts: ["www.awd-it.co.uk"] },
  { retailer_id: "ccl", display_name: "CCL", accepted_input_names: ["CCL Computers", "CCL Online"], https_hosts: ["www.cclonline.com"] },
  { retailer_id: "kingston-memory-shop", display_name: "KingstonMemoryShop", accepted_input_names: ["KingstonMemoryShop"], https_hosts: ["www.kingstonmemoryshop.co.uk"] },
  { retailer_id: "overclockers-uk", display_name: "Overclockers UK", accepted_input_names: ["Overclockers UK"], https_hosts: ["www.overclockers.co.uk"] },
  { retailer_id: "scan-computers", display_name: "Scan Computers", accepted_input_names: ["Scan Computers"], https_hosts: ["www.scan.co.uk"] },
];

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const canonicalBytes = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const publicId = (value) => `offer-${sha256(value).slice(0, 24)}`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const exactKeys = (value, expected) => value && typeof value === "object" && !Array.isArray(value) && same(Object.keys(value), expected);

function parseJson(root, relativePath) {
  const bytes = readFileSync(path.join(root, relativePath));
  return { value: JSON.parse(bytes), bytes };
}

function validStrictUtc(value) {
  if (typeof value !== "string" || !STRICT_UTC.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.toISOString() === value.replace("Z", ".000Z");
}

function validatePolicy(policy) {
  if (policy.schema_version !== 1 || policy.status !== "approved" || policy.decision !== "approve_observation_first_publication") throw new Error("factual-offer policy is not approved");
  if (policy.claim_class !== "dated_factual_primary_retail_offer_observation" || policy.dataset_id !== "ram" || policy.region !== "GB" || policy.currency !== "GBP") throw new Error("factual-offer policy scope drift");
  if (!same(policy.public_fields, PUBLIC_FIELDS) || !same(policy.required_labels, Object.values(LABELS)) || !same(policy.required_predicates, REQUIRED_PREDICATES) || !same(policy.hard_prohibitions, HARD_PROHIBITIONS)) throw new Error("factual-offer policy contract drift");
  if (TRUE_AUTHORITY.some((key) => policy.authority?.[key] !== true) || FALSE_AUTHORITY.some((key) => policy.authority?.[key] !== false) || !same(Object.keys(policy.authority ?? {}), [...TRUE_AUTHORITY, ...FALSE_AUTHORITY])) throw new Error("factual-offer policy exceeds or lacks its authority");
  const supersession = policy.candidate_lock_supersession;
  if (supersession?.enabled !== true || supersession.scope !== "dated_factual_primary_retail_offer_observation_only" || !same(supersession.blanket_false_flags, ["publication_allowed", "source_approved_for_production", "source_approval_allowed"]) || supersession.record_specific_ambiguity_restriction_or_rejection_remains_binding !== true || supersession.does_not_approve_sources_indexes_methodology_baskets_or_deployment !== true) throw new Error("candidate lock supersession is not narrowly encoded");
  const reuse = policy.catalogue_identity_reuse;
  if (reuse?.enabled !== true || reuse.scope !== "exact_mpn_and_catalogue_specification_for_factual_offer_validation_only" || !same(reuse.review_ids, ["sf-ddr5-32gb-seed-human-review-2026-08-06", "sf-ddr5-32gb-diversification-human-review-2026-08-09"]) || reuse.does_not_enable_automatic_matching !== true || reuse.does_not_approve_sources_indexes_methodology_baskets_or_deployment !== true) throw new Error("catalogue identity reuse is not narrowly encoded");
  const actualRetailers = (policy.retailer_identity_contract ?? []).map((item) => ({ retailer_id: item.retailer_id, display_name: item.display_name, accepted_input_names: item.accepted_input_names, https_hosts: item.https_hosts }));
  if (!same(actualRetailers, RETAILER_CONTRACT)) throw new Error("retailer identity contract drift");
}

function loadPromotionApproval(root, lock, inputs) {
  const binding = lock.promotion_approval;
  if (!exactKeys(binding ?? {}, ["path", "sha256"]) || binding.path !== PROMOTION_APPROVAL_PATH || !/^[0-9a-f]{64}$/u.test(binding.sha256)) throw new Error("active factual-offer promotion approval binding is invalid");
  const parsed = parseJson(root, binding.path);
  if (sha256(parsed.bytes) !== binding.sha256) throw new Error("active factual-offer promotion approval hash mismatch");
  inputs.set(binding.path, parsed.bytes);
  const approval = parsed.value;
  if (approval.schema_version !== 1 || approval.status !== "approved" || approval.decision !== "approve_exact_factual_offer_promotion" || approval.approved_by?.name !== "David Sidebottom" || approval.approved_by?.role !== "project_owner" || !validStrictUtc(approval.approved_at)) throw new Error("exact factual-offer promotion approval identity is invalid");
  const expectedScope = { exact_candidate_promotion: true, retailer_comparison_publication: true, future_unbounded_input_admission: false, new_product_approval: false, source_family_approval: false, aggregate_index: false, methodology: false, basket: false, threshold_selection: false, baseline: false, historical_reference: false, deflator: false, research_or_causal_publication: false, recommendations: false, production_database_mutation: false, paid_affiliate_tracking: false };
  if (!same(approval.scope, expectedScope)) throw new Error("exact factual-offer promotion approval exceeds its scope");
  const publicIds = approval.approved_public_observation_ids;
  const sourceIds = approval.approved_source_observation_ids;
  const priorIds = approval.prior_active_public_observation_ids;
  const candidates = approval.approved_candidates;
  if (!Array.isArray(publicIds) || publicIds.length !== 21 || !same(publicIds, [...new Set(publicIds)].sort(compare)) || publicIds.some((id) => !/^offer-[0-9a-f]{24}$/u.test(id))) throw new Error("approved public observation IDs are invalid");
  if (!Array.isArray(sourceIds) || sourceIds.length !== 21 || !same(sourceIds, [...new Set(sourceIds)].sort(compare)) || sourceIds.some((id) => typeof id !== "string" || !id)) throw new Error("approved source observation IDs are invalid");
  if (!Array.isArray(priorIds) || priorIds.length !== 44 || !same(priorIds, [...new Set(priorIds)].sort(compare)) || priorIds.some((id) => !/^offer-[0-9a-f]{24}$/u.test(id))) throw new Error("prior active public observation IDs are invalid");
  if (!Array.isArray(candidates) || candidates.length !== 21) throw new Error("approved factual-offer candidate packet is invalid");
  for (const candidate of candidates) {
    if (candidate.disposition !== "candidate_for_human_promotion_review" || candidate.meets_existing_factual_offer_predicates !== true || candidate.known_placeholder_quarantine_passed !== true || candidate.approved !== false || candidate.publication_action_allowed !== false || typeof candidate.source_observation_id !== "string" || typeof candidate.input_path !== "string" || !candidate.public_offer_candidate) throw new Error("approved factual-offer candidate packet exceeds its reviewed disposition");
  }
  const candidatePublicIds = candidates.map((item) => item.public_offer_candidate.public_observation_id).sort(compare);
  const candidateSourceIds = candidates.map((item) => item.source_observation_id).sort(compare);
  if (!same(candidatePublicIds, publicIds) || !same(candidateSourceIds, sourceIds)) throw new Error("approved candidate packet does not match its exact ID bindings");
  if (approval.basis?.candidate_count !== 21 || !/^[0-9a-f]{64}$/u.test(approval.basis?.candidate_report_sha256_at_approval ?? "") || !/^[0-9a-f]{40}$/u.test(approval.basis?.candidate_report_git_commit ?? "") || !/^[0-9a-f]{40}$/u.test(approval.basis?.prior_active_git_commit ?? "") || !/^[0-9a-f]{64}$/u.test(approval.basis?.prior_active_manifest_sha256 ?? "") || approval.basis?.prior_active_record_count !== 44 || !/^[0-9a-f]{64}$/u.test(approval.basis?.prior_active_payload_sha256 ?? "")) throw new Error("promotion approval basis is invalid");
  if (approval.expected_result?.record_count !== lock.locked_payload?.record_count || approval.expected_result?.latest_observed_at !== lock.locked_payload?.latest_observed_at || approval.expected_result?.sha256 !== lock.locked_payload?.sha256) throw new Error("promotion approval expected result does not match the active lock");
  if (!Array.isArray(approval.approved_inputs) || !approval.approved_inputs.length || !same(approval.approved_inputs.map((item) => item.path), approval.approved_inputs.map((item) => item.path).sort(compare))) throw new Error("promotion approval inputs are invalid");
  const candidateInputPaths = [...new Set(candidates.map((item) => item.input_path))].sort(compare);
  if (!same(candidateInputPaths, approval.approved_inputs.map((item) => item.path))) throw new Error("approved candidate packet does not match its exact input bindings");
  const lockedInputs = new Map((lock.observation_inputs ?? []).map((item) => [item.path, item.sha256]));
  for (const item of approval.approved_inputs) {
    if (!exactKeys(item, ["path", "sha256"]) || !/^[0-9a-f]{64}$/u.test(item.sha256) || lockedInputs.get(item.path) !== item.sha256) throw new Error("promotion approval input is not exactly admitted by the active lock");
  }
  return { publicIds, sourceIds, priorIds, candidates };
}

function loadActiveRelease(root, inputs) {
  const parsed = parseJson(root, ACTIVE_RELEASE_PATH);
  inputs.set(ACTIVE_RELEASE_PATH, parsed.bytes);
  const lock = parsed.value;
  if (lock.schema_version !== 1 || lock.status !== "active_existing_release_boundary" || lock.claim_class !== "dated_factual_primary_retail_offer_observation" || lock.dataset_id !== "ram" || lock.region !== "GB") throw new Error("active factual-offer release boundary is invalid");
  const expectedAuthority = { preserve_existing_release: true, admit_new_observation_inputs: false, approve_products: false, approve_sources: false, approve_methodology: false, approve_publication_expansion: false, approve_deployment: false };
  if (!same(lock.authority, expectedAuthority)) throw new Error("active factual-offer release boundary exceeds its authority");
  const prior = lock.prior_release;
  if (!exactKeys(prior ?? {}, ["git_commit", "manifest", "payload"]) || !/^[0-9a-f]{40}$/u.test(prior.git_commit) || !exactKeys(prior.manifest ?? {}, ["path", "sha256_at_commit"]) || prior.manifest.path !== "data/derived/private-candidate/public-offers-manifest.v1.json" || !/^[0-9a-f]{64}$/u.test(prior.manifest.sha256_at_commit) || !exactKeys(prior.payload ?? {}, ["path", "sha256_at_commit", "record_count", "latest_observed_at"]) || prior.payload.path !== "data/public-offers/offers-ram.v1.json" || !/^[0-9a-f]{64}$/u.test(prior.payload.sha256_at_commit) || prior.payload.record_count !== 44 || typeof prior.payload.latest_observed_at !== "string") throw new Error("prior factual-offer release provenance is invalid");
  if (!exactKeys(lock.locked_payload ?? {}, ["path", "sha256", "record_count", "latest_observed_at"]) || lock.locked_payload.path !== "data/public-offers/offers-ram.v1.json" || !/^[0-9a-f]{64}$/u.test(lock.locked_payload.sha256) || !Number.isInteger(lock.locked_payload.record_count) || lock.locked_payload.record_count < 1 || typeof lock.locked_payload.latest_observed_at !== "string") throw new Error("active factual-offer locked payload is invalid");
  if (!Array.isArray(lock.observation_inputs) || !lock.observation_inputs.length) throw new Error("active factual-offer release has no observation inputs");
  const seen = new Set();
  const paths = [];
  for (const item of lock.observation_inputs) {
    if (!exactKeys(item, ["path", "sha256"]) || typeof item.path !== "string" || !item.path.startsWith(`${OBSERVATION_DIR}/uk-primary-retail`) || !item.path.endsWith(".json") || !/^[0-9a-f]{64}$/.test(item.sha256) || seen.has(item.path)) throw new Error("active factual-offer observation input is invalid or duplicated");
    const bytes = readFileSync(path.join(root, item.path));
    if (sha256(bytes) !== item.sha256) throw new Error(`active factual-offer observation input hash mismatch: ${item.path}`);
    seen.add(item.path);
    paths.push(item.path);
  }
  if (!same(paths, [...paths].sort(compare))) throw new Error("active factual-offer observation inputs are not sorted");
  const promotionApproval = loadPromotionApproval(root, lock, inputs);
  const approvalValue = parseJson(root, lock.promotion_approval.path).value;
  if (prior.git_commit !== approvalValue.basis.prior_active_git_commit || prior.manifest.sha256_at_commit !== approvalValue.basis.prior_active_manifest_sha256 || prior.payload.sha256_at_commit !== approvalValue.basis.prior_active_payload_sha256 || prior.payload.record_count !== approvalValue.basis.prior_active_record_count) throw new Error("prior factual-offer release provenance does not match the promotion approval");
  return { lock, paths, promotionApproval };
}

function retailerMaps(contract = RETAILER_CONTRACT) {
  const byInput = new Map();
  const byId = new Map();
  for (const item of contract) {
    byId.set(item.retailer_id, item);
    for (const name of item.accepted_input_names) byInput.set(name, item);
  }
  return { byInput, byId };
}

function availabilityFor(observation) {
  const availability = observation.availability ?? {};
  if (availability.eligibility_semantics === "ambiguous") return null;
  if (availability.eligibility_semantics && availability.eligibility_semantics !== "explicit") return null;
  const state = availability.normalised ?? availability.state ?? "unknown";
  const raw = String(availability.raw_text ?? availability.display ?? "").trim().toLowerCase();
  if (/out of stock|sold out|unavailable|not available/.test(raw)) return null;
  if (state === "in_stock") return "in_stock";
  if (state === "available_to_order") return "available_to_order";
  if (state === "stated_at_capture" && /(in stock|hurry, only [1-9]\d* left)/.test(raw)) return "in_stock";
  if (state === "stated_at_capture" && /available to order/.test(raw)) return "available_to_order";
  return null;
}

function observationFacts(observation) {
  const identity = observation.identity ?? {};
  const product = observation.product ?? {};
  const price = observation.item_price ?? observation.price ?? {};
  return {
    mpn: identity.mpn_observed ?? product.mpn ?? null,
    amount: price.amount_minor ?? price.item_price_minor ?? null,
    currency: price.currency ?? null,
    vatState: price.vat_state ?? (price.vat_included === true ? "included" : price.vat_included === false ? "excluded" : "unknown"),
    availability: availabilityFor(observation),
    observedAt: observation.observed_at ?? null,
    retailerDisplayName: observation.seller?.display_name ?? null,
  };
}

function catalogueAndReviews(root, policy, inputs) {
  const reviews = new Map();
  for (const relativePath of REVIEW_PATHS) {
    const parsed = parseJson(root, relativePath);
    inputs.set(relativePath, parsed.bytes);
    reviews.set(parsed.value.review_id, parsed.value);
  }
  const catalogueByMpn = new Map();
  for (const relativePath of CATALOGUE_PATHS) {
    const parsed = parseJson(root, relativePath);
    inputs.set(relativePath, parsed.bytes);
    for (const product of parsed.value.products ?? []) {
      if (catalogueByMpn.has(product.mpn_normalized)) throw new Error(`duplicate catalogue MPN: ${product.mpn_normalized}`);
      catalogueByMpn.set(product.mpn_normalized, product);
    }
  }
  const products = [];
  const approvedMpns = new Set();
  for (const approved of policy.approved_products ?? []) {
    if (approvedMpns.has(approved.mpn)) throw new Error(`duplicate policy-approved MPN: ${approved.mpn}`);
    approvedMpns.add(approved.mpn);
    const product = catalogueByMpn.get(approved.mpn);
    const review = reviews.get(approved.catalogue_review_id);
    if (!product || !review) throw new Error(`approved product catalogue/review mapping missing: ${approved.mpn}`);
    const approvedKeys = review.product_keys ?? review.approved_product_keys ?? [];
    if (!approvedKeys.includes(product.product_key)) throw new Error(`approved review/product mapping missing: ${approved.mpn}`);
    const spec = product.specification;
    if (spec.memory_generation !== "DDR5" || spec.total_capacity_gb !== 32 || spec.module_count !== 2 || spec.form_factor !== "UDIMM") throw new Error(`approved catalogue scope mismatch: ${approved.mpn}`);
    products.push({ mpn: product.mpn_normalized, manufacturer: product.manufacturer.name, model: product.model, memory_type: spec.memory_generation, capacity_gb: spec.total_capacity_gb, module_count: spec.module_count, speed_mt_s: spec.speed_mt_s, form_factor: spec.form_factor });
  }
  products.sort((a, b) => compare(a.mpn, b.mpn));
  if (!products.length) throw new Error("approved product catalogue is empty");
  return products;
}

function loadLedger(root, tranche, inputs) {
  if (!tranche.evidence_ledger) return [];
  const parsed = parseJson(root, tranche.evidence_ledger);
  inputs.set(tranche.evidence_ledger, parsed.bytes);
  if (!Array.isArray(parsed.value.entries)) throw new Error(`invalid evidence ledger: ${tranche.evidence_ledger}`);
  return parsed.value.entries;
}

function safeHttps(urlText) {
  try {
    const url = new URL(urlText);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

function validateSourceUrl(urlText, retailer, archived, observedAt) {
  const outer = safeHttps(urlText);
  if (!outer) return false;
  if (!archived) return retailer.https_hosts.includes(outer.hostname);
  if (outer.hostname !== "web.archive.org") return false;
  const match = outer.pathname.match(/^\/web\/(\d{14})id_\/(https:\/\/.*)$/);
  if (!match) return false;
  const inner = safeHttps(match[2]);
  if (!inner || !retailer.https_hosts.includes(inner.hostname)) return false;
  return match[1] === observedAt?.replace(/[-:TZ]/g, "");
}

function evidenceFor(observation, ledger, archived) {
  const source = observation.source ?? {};
  if (archived) return ledger.filter((entry) => entry.evidence_id === source.evidence_id);
  const sourceUrl = source.source_url ?? observation.evidence?.source_url;
  return ledger.filter((entry) => (entry.source_url === sourceUrl || entry.final_url === sourceUrl) && entry.retrieved_at === observation.observed_at && entry.seller_display_name === observation.seller?.display_name);
}

function evidenceMatches(entry, observation, facts, archived) {
  const product = observation.product ?? {};
  const evidenceFacts = entry?.facts ?? {};
  if (entry?.http_status !== 200 || !/^[0-9a-f]{64}$/.test(entry?.response_sha256 ?? "") || !Number.isInteger(entry?.response_bytes) || entry.response_bytes <= 0) return false;
  if (observation.evidence?.response_sha256 && observation.evidence.response_sha256 !== entry.response_sha256) return false;
  if (observation.evidence?.response_bytes && observation.evidence.response_bytes !== entry.response_bytes) return false;
  if (evidenceFacts.mpn !== facts.mpn || evidenceFacts.capacity_gb !== 32 || evidenceFacts.module_count !== 2 || evidenceFacts.item_price_minor !== facts.amount || evidenceFacts.currency !== facts.currency || evidenceFacts.vat_included !== (facts.vatState === "included")) return false;
  if (product.capacity_gb !== 32 || product.module_count !== 2 || product.memory_type !== "DDR5") return false;
  if (archived) return (!observation.source?.archive_url || entry.archive_url === observation.source.archive_url) && entry.archive_captured_at === facts.observedAt;
  const sourceUrl = observation.source?.source_url ?? observation.evidence?.source_url;
  return entry.retrieved_at === facts.observedAt && (entry.source_url === sourceUrl || entry.final_url === sourceUrl);
}

function recordRestrictionReasons(observation) {
  const reasons = [];
  if (observation.availability?.eligibility_semantics === "ambiguous") reasons.push("record_specific_ambiguity_restriction_or_rejection");
  const text = JSON.stringify([observation.restriction, observation.publication_restriction, observation.rejection, observation.review_decision, observation.qualification?.status, observation.qualification?.reasons, observation.eligibility?.reason_codes]).toLowerCase();
  if (/ambigu|restrict|reject|identity_mismatch|mpn_mismatch/.test(text)) reasons.push("record_specific_ambiguity_restriction_or_rejection");
  for (const object of [observation.governance, observation.source, observation.authority].filter(Boolean)) {
    for (const [key, value] of Object.entries(object)) {
      if (value === true && /(approval|approved|allowed|eligibility|activation)/.test(key)) reasons.push("record_authority_drift");
    }
  }
  return reasons;
}

function validateObservation(observation, tranche, facts, retailer, productsByMpn, ledger, archived) {
  const reasons = [];
  if (!productsByMpn.has(facts.mpn)) reasons.push("product_not_policy_approved");
  if (archived) {
    if (observation.product?.mpn !== facts.mpn || observation.eligibility?.identity_exact !== true) reasons.push("archived_identity_not_exact");
  } else if (observation.identity?.match_basis !== "exact_mpn" || observation.identity?.mpn_expected !== facts.mpn || observation.identity?.mpn_observed !== facts.mpn) reasons.push("direct_identity_not_exact_mpn");
  if (!validStrictUtc(facts.observedAt) || !validStrictUtc(tranche.created_at) || facts.observedAt > tranche.created_at) reasons.push("invalid_or_future_observed_at");
  if (!Number.isInteger(facts.amount) || facts.amount <= 0) reasons.push("invalid_item_price");
  if (facts.currency !== "GBP") reasons.push("currency_not_gbp");
  if (facts.vatState !== "included") reasons.push("vat_not_explicitly_included");
  if (!facts.availability) reasons.push("availability_not_explicitly_orderable");
  if (!retailer) reasons.push("retailer_not_recognised");
  if (observation.seller?.relationship && observation.seller.relationship !== "retailer_owned") reasons.push("seller_not_retailer_owned");
  if (!observation.seller?.relationship && observation.source?.source_class !== "archived_primary_retail_storefront") reasons.push("primary_retail_relationship_not_established");
  const evidence = evidenceFor(observation, ledger, archived);
  if (evidence.length !== 1) reasons.push(evidence.length ? "ambiguous_evidence_ledger_entry" : "missing_evidence_ledger_entry");
  else if (!evidenceMatches(evidence[0], observation, facts, archived)) reasons.push("evidence_facts_mismatch");
  const sourceUrl = archived ? (observation.source?.archive_url ?? evidence[0]?.archive_url) : observation.source?.source_url ?? observation.evidence?.source_url;
  if (retailer && !validateSourceUrl(sourceUrl, retailer, archived, facts.observedAt)) reasons.push("source_url_contract_mismatch");
  reasons.push(...recordRestrictionReasons(observation));
  return { reasons: [...new Set(reasons)], sourceUrl };
}

const observationComparator = (a, b) => compare(a.observed_at, b.observed_at) || compare(a.mpn, b.mpn) || compare(a.retailer_id, b.retailer_id) || a.item_price_minor - b.item_price_minor || compare(a.source_url, b.source_url);
const factualDuplicate = (a, b) => PUBLIC_FIELDS.slice(1).every((field) => a[field] === b[field]);

export function buildPublicOffers(rootUrl = new URL("../", import.meta.url), { privateCandidateObservationPaths = null } = {}) {
  const root = path.resolve(rootUrl.pathname);
  const inputs = new Map();
  const policyParsed = parseJson(root, POLICY_PATH);
  inputs.set(POLICY_PATH, policyParsed.bytes);
  const policy = policyParsed.value;
  validatePolicy(policy);
  let observationPaths;
  let activeRelease = null;
  const privateCandidateEvaluation = privateCandidateObservationPaths !== null;
  if (privateCandidateEvaluation) {
    if (!Array.isArray(privateCandidateObservationPaths) || !privateCandidateObservationPaths.length) throw new Error("private candidate evaluation requires observation paths");
    observationPaths = [...privateCandidateObservationPaths];
    if (!same(observationPaths, [...new Set(observationPaths)].sort(compare))) throw new Error("private candidate observation paths must be unique and sorted");
    if (observationPaths.some((item) => typeof item !== "string" || !item.startsWith(`${OBSERVATION_DIR}/uk-primary-retail`) || !item.endsWith(".json"))) throw new Error("private candidate observation path is outside the primary-retail contract");
  } else {
    activeRelease = loadActiveRelease(root, inputs);
    observationPaths = activeRelease.paths;
  }
  const retailers = retailerMaps(policy.retailer_identity_contract);
  const products = catalogueAndReviews(root, policy, inputs);
  const productsByMpn = new Map(products.map((product) => [product.mpn, product]));
  const candidates = [];
  const exceptions = [];
  for (const relativePath of observationPaths) {
    const parsed = parseJson(root, relativePath);
    inputs.set(relativePath, parsed.bytes);
    const tranche = parsed.value;
    const ledger = loadLedger(root, tranche, inputs);
    for (const observation of tranche.observations ?? []) {
      const facts = observationFacts(observation);
      if (!privateCandidateEvaluation && !productsByMpn.has(facts.mpn)) continue;
      const retailer = retailers.byInput.get(facts.retailerDisplayName);
      const archived = observation.source?.source_class === "archived_primary_retail_storefront" || Boolean(observation.source?.archive_url);
      const { reasons, sourceUrl } = validateObservation(observation, tranche, facts, retailer, productsByMpn, ledger, archived);
      if (reasons.length) {
        exceptions.push({ observation_id: observation.observation_id ?? null, input_path: relativePath, mpn: facts.mpn, observed_at: facts.observedAt, disposition: "excluded_pending_review", reasons });
        continue;
      }
      const identityBytes = [facts.mpn, retailer.retailer_id, facts.observedAt, facts.amount, facts.currency, sourceUrl].join("\u001f");
      candidates.push({ sourceObservationId: observation.observation_id, inputPath: relativePath, public: { public_observation_id: publicId(identityBytes), observed_at: facts.observedAt, observation_kind: archived ? "archived_retail_observation" : "direct_retail_observation", mpn: facts.mpn, retailer_id: retailer.retailer_id, retailer_name: retailer.display_name, item_price_minor: facts.amount, currency: facts.currency, vat_state: "included", availability: facts.availability, delivery_state: "excluded_not_verified", source_url: sourceUrl } });
    }
  }
  candidates.sort((a, b) => observationComparator(a.public, b.public) || compare(a.sourceObservationId ?? "", b.sourceObservationId ?? "") || compare(a.inputPath, b.inputPath));
  const observations = [];
  const accepted = [];
  for (let index = 0; index < candidates.length;) {
    const first = candidates[index];
    const key = [first.public.mpn, first.public.retailer_id, first.public.observed_at].join("\u001f");
    const group = [];
    while (index < candidates.length && [candidates[index].public.mpn, candidates[index].public.retailer_id, candidates[index].public.observed_at].join("\u001f") === key) group.push(candidates[index++]);
    const allExact = group.every((item) => factualDuplicate(first.public, item.public));
    if (allExact) {
      observations.push(first.public);
      accepted.push({ source_observation_id: first.sourceObservationId ?? null, input_path: first.inputPath, public_offer: first.public });
    }
    for (const item of allExact ? group.slice(1) : group) exceptions.push({ observation_id: item.sourceObservationId ?? null, input_path: item.inputPath, public_observation_id: item.public.public_observation_id, mpn: item.public.mpn, observed_at: item.public.observed_at, disposition: allExact ? "excluded_exact_duplicate" : "excluded_conflicting_duplicate", reasons: [allExact ? "duplicate_fact" : "conflicting_same_retailer_timestamp"] });
  }
  if (!observations.length) throw new Error("factual-offer projection is empty");
  exceptions.sort((a, b) => compare(a.observed_at ?? "", b.observed_at ?? "") || compare(a.mpn ?? "", b.mpn ?? "") || compare(a.observation_id ?? a.public_observation_id ?? "", b.observation_id ?? b.public_observation_id ?? ""));
  const latestObservedAt = observations.at(-1).observed_at;
  const publishedMpns = new Set(observations.map((item) => item.mpn));
  const publicProducts = products.filter((product) => publishedMpns.has(product.mpn));
  const publicRetailers = [...new Map(observations.map((item) => [item.retailer_id, { retailer_id: item.retailer_id, display_name: item.retailer_name }])).values()].sort((a, b) => compare(a.retailer_id, b.retailer_id));
  const payload = { schema_version: 1, dataset_id: "ram", market: "GB", currency: "GBP", latest_observed_at: latestObservedAt, price_basis: "vat_inclusive_item_price_delivery_excluded", labels: LABELS, products: publicProducts, retailers: publicRetailers, observations };
  assertPublicOffers(payload);
  const payloadBytes = canonicalBytes(payload);
  if (activeRelease) {
    const locked = activeRelease.lock.locked_payload;
    if (sha256(payloadBytes) !== locked.sha256 || observations.length !== locked.record_count || latestObservedAt !== locked.latest_observed_at) throw new Error("active factual-offer payload drifted from its checksum-bound release lock");
    const publicIds = new Set(observations.map((item) => item.public_observation_id));
    const expectedIds = new Set([...activeRelease.promotionApproval.priorIds, ...activeRelease.promotionApproval.publicIds]);
    if (publicIds.size !== expectedIds.size || [...publicIds].some((id) => !expectedIds.has(id))) throw new Error("active factual-offer payload is not the exact prior release plus approved promotion");
    const acceptedByPublicId = new Map(accepted.map((item) => [item.public_offer.public_observation_id, item]));
    for (const candidate of activeRelease.promotionApproval.candidates) {
      const acceptedItem = acceptedByPublicId.get(candidate.public_offer_candidate.public_observation_id);
      if (!acceptedItem || acceptedItem.source_observation_id !== candidate.source_observation_id || acceptedItem.input_path !== candidate.input_path || !same(acceptedItem.public_offer, candidate.public_offer_candidate)) throw new Error("approved factual-offer candidate packet does not exactly match the active payload");
    }
  }
  const inputRecords = [...inputs.entries()].map(([inputPath, bytes]) => ({ path: inputPath, sha256: sha256(bytes), byte_length: bytes.length })).sort((a, b) => compare(a.path, b.path));
  const generatorBytes = readFileSync(path.join(root, GENERATOR_PATH));
  const buildScriptBytes = readFileSync(path.join(root, BUILD_SCRIPT_PATH));
  const manifest = { schema_version: 1, release_id: `sf-factual-ram-offers-through-${latestObservedAt.replaceAll(/[-:]/g, "")}-v1`, claim_class: policy.claim_class, policy: { path: POLICY_PATH, sha256: sha256(policyParsed.bytes) }, generator: { path: GENERATOR_PATH, version: 1, sha256: sha256(generatorBytes), byte_length: generatorBytes.length }, build_script: { path: BUILD_SCRIPT_PATH, sha256: sha256(buildScriptBytes), byte_length: buildScriptBytes.length }, inputs: inputRecords, payload: { path: "data/public-offers/offers-ram.v1.json", sha256: sha256(payloadBytes), byte_length: Buffer.byteLength(payloadBytes), record_count: observations.length }, authority: policy.authority };
  const reviewQueue = { schema_version: 1, queue_id: "sf-public-offer-exceptions-v1", policy_id: policy.policy_id, private_review_queue: true, routine_observations_published: observations.length, exception_count: exceptions.length, items: exceptions };
  return { payload, manifest, reviewQueue, evaluations: { accepted, excluded: exceptions }, bytes: canonicalBytes };
}

export function assertPublicOffers(payload) {
  if (!exactKeys(payload, TOP_FIELDS)) throw new Error("public-offer payload has unknown or reordered top-level fields");
  if (payload.schema_version !== 1 || payload.dataset_id !== "ram" || payload.market !== "GB" || payload.currency !== "GBP") throw new Error("public-offer identity is invalid");
  if (payload.price_basis !== "vat_inclusive_item_price_delivery_excluded" || !exactKeys(payload.labels, Object.keys(LABELS)) || !same(payload.labels, LABELS)) throw new Error("public-offer labels or price basis are invalid");
  if (!Array.isArray(payload.products) || !payload.products.length || !Array.isArray(payload.retailers) || !payload.retailers.length || !Array.isArray(payload.observations) || !payload.observations.length) throw new Error("public-offer arrays must be non-empty");
  const productMpns = new Set();
  for (const item of payload.products) {
    if (!exactKeys(item, PRODUCT_FIELDS) || typeof item.mpn !== "string" || productMpns.has(item.mpn) || item.memory_type !== "DDR5" || item.capacity_gb !== 32 || item.module_count !== 2 || item.form_factor !== "UDIMM") throw new Error("public product shape, identity, or scope is invalid");
    productMpns.add(item.mpn);
  }
  if (!same(payload.products, [...payload.products].sort((a, b) => compare(a.mpn, b.mpn)))) throw new Error("public products are not sorted");
  const retailerIds = new Set();
  const retailerNames = new Set();
  const retailerById = new Map();
  for (const item of payload.retailers) {
    const contract = retailerMaps().byId.get(item.retailer_id);
    if (!exactKeys(item, RETAILER_FIELDS) || !contract || contract.display_name !== item.display_name || retailerIds.has(item.retailer_id) || retailerNames.has(item.display_name)) throw new Error("public retailer shape or identity is invalid");
    retailerIds.add(item.retailer_id); retailerNames.add(item.display_name); retailerById.set(item.retailer_id, item);
  }
  if (!same(payload.retailers, [...payload.retailers].sort((a, b) => compare(a.retailer_id, b.retailer_id)))) throw new Error("public retailers are not sorted");
  const ids = new Set();
  const keys = new Set();
  const observedProductMpns = new Set();
  const observedRetailerIds = new Set();
  for (const item of payload.observations) {
    if (!exactKeys(item, PUBLIC_FIELDS)) throw new Error("public observation has unknown or reordered fields");
    const key = [item.mpn, item.retailer_id, item.observed_at].join("\u001f");
    if (!/^offer-[0-9a-f]{24}$/.test(item.public_observation_id) || ids.has(item.public_observation_id) || keys.has(key)) throw new Error("public observation ID or factual key is invalid or duplicated");
    ids.add(item.public_observation_id); keys.add(key);
    observedProductMpns.add(item.mpn); observedRetailerIds.add(item.retailer_id);
    if (!productMpns.has(item.mpn) || !retailerById.has(item.retailer_id) || retailerById.get(item.retailer_id).display_name !== item.retailer_name) throw new Error("public observation referential integrity is invalid");
    if (!validStrictUtc(item.observed_at) || !Number.isInteger(item.item_price_minor) || item.item_price_minor <= 0 || item.currency !== "GBP" || item.vat_state !== "included" || item.delivery_state !== "excluded_not_verified") throw new Error("public observation time or price basis is invalid");
    if (!["in_stock", "available_to_order"].includes(item.availability)) throw new Error("public observation availability is invalid");
    const contract = retailerMaps().byId.get(item.retailer_id);
    const archived = item.observation_kind === "archived_retail_observation";
    if ((!archived && item.observation_kind !== "direct_retail_observation") || !validateSourceUrl(item.source_url, contract, archived, item.observed_at)) throw new Error("public observation URL-kind relationship is invalid");
  }
  if (!same([...observedProductMpns].sort(compare), [...productMpns].sort(compare)) || !same([...observedRetailerIds].sort(compare), [...retailerIds].sort(compare))) throw new Error("public product or retailer has no observation");
  if (!same(payload.observations, [...payload.observations].sort(observationComparator))) throw new Error("public observations are not sorted");
  if (payload.latest_observed_at !== payload.observations.at(-1).observed_at) throw new Error("public latest timestamp is stale");
  return true;
}

export function publicOfferCanonicalBytes(value) {
  return canonicalBytes(value);
}
