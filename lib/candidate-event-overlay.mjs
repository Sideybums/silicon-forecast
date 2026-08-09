import { createHash } from "node:crypto";

const SHA256 = /^[a-f0-9]{64}$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const RELATIONSHIPS = ["supports", "contradicts", "qualifies", "contextualises", "duplicates"];
const ACTIONS = ["add", "edit", "remove", "reorder", "review"];
const OVERLAY_FIELDS = [
  "overlay_id", "revision", "revision_hash", "supersedes_revision_hash", "event_revision_ref",
  "numeric_revision_ref", "display_start", "display_end", "date_precision", "possible_effect_label",
  "causal_language_level", "uncertainty", "evidence_panel_ref", "placement_state", "unavailable_reason",
  "display_order", "creator_id", "review_state",
];
const NUMERIC_REF_FIELDS = ["series_id", "revision", "sha256"];
const FORBIDDEN_OVERLAY_KEYS = new Set([
  "value", "price", "price_override", "weight", "basket", "basket_id", "basket_instruction",
  "quality", "quality_state", "link", "link_factor", "link_instruction", "reference",
  "reference_value", "reference_instruction", "deflator", "deflator_value", "deflator_instruction",
  "earnings", "imputation", "impute", "gap_fill", "fill_gap", "interpolation", "numeric_bytes",
  "series_bytes_utf8", "calculation", "formula", "numeric_function", "numeric_output",
]);
const LOCK_FIELDS = [
  "live_collection_locked", "editorial_activation_locked", "external_publication_locked",
  "numeric_editing_locked", "methodology_change_locked", "causal_approval_locked",
];
const MODEL_INTERNALS = new WeakMap();

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, expected, context) {
  invariant(value && typeof value === "object" && !Array.isArray(value), `${context} must be an object`);
  invariant(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${context} fields must be exactly: ${[...expected].sort().join(", ")}`);
}

function id(value, context) {
  invariant(typeof value === "string" && ID.test(value), `${context} must be a lowercase stable ID`);
}

function sha(value, context) {
  invariant(typeof value === "string" && SHA256.test(value), `${context} must be SHA-256 hex`);
}

function instant(value, context) {
  invariant(typeof value === "string" && INSTANT.test(value) && !Number.isNaN(Date.parse(value)), `${context} must be a whole-second UTC instant`);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonical(value), "utf8").digest("hex");
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function withoutHash(revision) {
  const copy = structuredClone(revision);
  delete copy.revision_hash;
  return copy;
}

function validateNumericReference(reference, knownNumeric, context) {
  exactKeys(reference, NUMERIC_REF_FIELDS, context);
  id(reference.series_id, `${context}.series_id`);
  invariant(Number.isSafeInteger(reference.revision) && reference.revision > 0, `${context}.revision must be a positive integer`);
  sha(reference.sha256, `${context}.sha256`);
  const key = `${reference.series_id}\u0000${reference.revision}`;
  const numeric = knownNumeric.get(key);
  invariant(numeric, `${context} must identify a known immutable numeric revision`);
  invariant(reference.sha256 === numeric.sha256, `${context} checksum disagrees with the numeric revision`);
}

function rejectNumericCoupling(value, context = "overlay payload") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    invariant(!FORBIDDEN_OVERLAY_KEYS.has(key), `${context}.${key} is a forbidden numeric coupling field`);
    rejectNumericCoupling(child, `${context}.${key}`);
  }
}

function validateOverlayRevision(revision, knownEvents, knownNumeric, context) {
  exactKeys(revision, OVERLAY_FIELDS, context);
  rejectNumericCoupling(revision, context);
  id(revision.overlay_id, `${context}.overlay_id`);
  invariant(Number.isSafeInteger(revision.revision) && revision.revision > 0, `${context}.revision must be a positive integer`);
  sha(revision.revision_hash, `${context}.revision_hash`);
  invariant(revision.revision_hash === digest(withoutHash(revision)), `${context}.revision_hash does not bind exact revision content`);
  invariant(revision.supersedes_revision_hash === null || SHA256.test(revision.supersedes_revision_hash), `${context}.supersedes_revision_hash must be null or SHA-256`);
  exactKeys(revision.event_revision_ref, ["event_id", "revision", "revision_hash"], `${context}.event_revision_ref`);
  id(revision.event_revision_ref.event_id, `${context}.event_revision_ref.event_id`);
  invariant(Number.isSafeInteger(revision.event_revision_ref.revision) && revision.event_revision_ref.revision > 0, `${context}.event revision must be positive`);
  sha(revision.event_revision_ref.revision_hash, `${context}.event_revision_ref.revision_hash`);
  const event = knownEvents.get(`${revision.event_revision_ref.event_id}\u0000${revision.event_revision_ref.revision}`);
  invariant(event && event.revision_hash === revision.event_revision_ref.revision_hash, `${context} must reference an exact known event revision`);
  validateNumericReference(revision.numeric_revision_ref, knownNumeric, `${context}.numeric_revision_ref`);
  invariant(revision.display_start === null || (typeof revision.display_start === "string" && DATE.test(revision.display_start)), `${context}.display_start must be null or a date`);
  invariant(revision.display_end === null || (typeof revision.display_end === "string" && DATE.test(revision.display_end)), `${context}.display_end must be null or a date`);
  invariant(revision.display_start === null || revision.display_end === null || revision.display_end >= revision.display_start, `${context} date range is reversed`);
  invariant(["day", "month", "range", "unresolved"].includes(revision.date_precision), `${context}.date_precision is unsupported`);
  invariant(typeof revision.possible_effect_label === "string" && revision.possible_effect_label.length > 0, `${context}.possible_effect_label is required`);
  invariant(["descriptive", "temporal_association", "contributory_hypothesis"].includes(revision.causal_language_level), `${context} cannot approve statistical or causal conclusions`);
  invariant(typeof revision.uncertainty === "string" && revision.uncertainty.length > 0, `${context}.uncertainty is required`);
  id(revision.evidence_panel_ref, `${context}.evidence_panel_ref`);
  invariant(["placed_private", "unavailable", "withdrawn"].includes(revision.placement_state), `${context}.placement_state is unsupported`);
  invariant(revision.unavailable_reason === null || revision.unavailable_reason === "UNAVAILABLE_EVENT_DATE_OR_REVISION", `${context}.unavailable_reason is unsupported`);
  const unavailable = revision.display_start === null || revision.date_precision === "unresolved" || revision.placement_state === "unavailable";
  invariant(unavailable === (revision.unavailable_reason === "UNAVAILABLE_EVENT_DATE_OR_REVISION"), `${context} unresolved placement must fail as UNAVAILABLE_EVENT_DATE_OR_REVISION`);
  invariant(Number.isSafeInteger(revision.display_order) && revision.display_order >= 0, `${context}.display_order must be a non-negative integer`);
  id(revision.creator_id, `${context}.creator_id`);
  invariant(["draft", "review_pending", "reviewed_private", "withdrawn"].includes(revision.review_state), `${context}.review_state is unsupported`);
  invariant(!(revision.review_state === "reviewed_private" && unavailable), `${context} unavailable placement cannot be approved`);
  invariant(revision.placement_state !== "withdrawn" || revision.review_state === "withdrawn", `${context} withdrawn placement must have withdrawn review state`);
}

function validateFixture(fixture) {
  exactKeys(fixture, [
    "schema_version", "fixture_set_id", "status", "scope", "notice", "locks", "source_items", "captures",
    "atomic_claims", "evidence_relationships", "event_revisions", "reviews", "numeric_series_revisions", "overlay_revisions",
  ], "candidate event-overlay fixture");
  invariant(fixture.schema_version === 1, "candidate event-overlay fixture schema_version must be 1");
  id(fixture.fixture_set_id, "fixture_set_id");
  invariant(fixture.status === "candidate_fixture_only", "fixture must remain candidate_fixture_only");
  invariant(fixture.scope === "private_no_live_collection_no_public_output", "fixture scope must remain private and offline");
  invariant(typeof fixture.notice === "string" && fixture.notice.length > 0, "fixture notice is required");
  exactKeys(fixture.locks, LOCK_FIELDS, "fixture locks");
  for (const lock of LOCK_FIELDS) invariant(fixture.locks[lock] === true, `fixture lock ${lock} must remain engaged`);

  const sourceIds = new Set();
  for (const [index, item] of fixture.source_items.entries()) {
    const context = `source_items[${index}]`;
    exactKeys(item, ["source_item_id", "canonical_url", "title", "published_at", "updated_at", "discovered_at", "duplicate_lineage_id", "untrusted_source_text"], context);
    id(item.source_item_id, `${context}.source_item_id`);
    invariant(!sourceIds.has(item.source_item_id), `${context}.source_item_id must be unique`);
    sourceIds.add(item.source_item_id);
    invariant(typeof item.canonical_url === "string" && item.canonical_url.startsWith("https://fixture.invalid/"), `${context} must use the inert fixture.invalid domain`);
    invariant(typeof item.title === "string" && item.title.length > 0, `${context}.title is required`);
    for (const field of ["published_at", "updated_at", "discovered_at"]) if (item[field] !== null) instant(item[field], `${context}.${field}`);
    id(item.duplicate_lineage_id, `${context}.duplicate_lineage_id`);
    invariant(typeof item.untrusted_source_text === "string", `${context}.untrusted_source_text must be inert data`);
  }

  const captureIds = new Set();
  for (const [index, capture] of fixture.captures.entries()) {
    const context = `captures[${index}]`;
    exactKeys(capture, ["capture_id", "source_item_id", "retrieved_at", "status", "mime_type", "byte_count", "sha256", "retained_representation", "prompt_injection_indicators", "active_content_executed"], context);
    id(capture.capture_id, `${context}.capture_id`);
    invariant(sourceIds.has(capture.source_item_id), `${context} references unknown source item`);
    instant(capture.retrieved_at, `${context}.retrieved_at`);
    invariant(capture.status === "quarantined", `${context} must remain quarantined`);
    invariant(capture.mime_type === "text/plain", `${context} must be inert text/plain`);
    invariant(Number.isSafeInteger(capture.byte_count) && capture.byte_count >= 0, `${context}.byte_count is invalid`);
    sha(capture.sha256, `${context}.sha256`);
    invariant(capture.retained_representation === "synthetic_fixture_fact_extract", `${context} retained representation is unsupported`);
    invariant(Array.isArray(capture.prompt_injection_indicators), `${context}.prompt_injection_indicators must be an array`);
    invariant(capture.active_content_executed === false, `${context} must never execute active content`);
    captureIds.add(capture.capture_id);
  }

  const claimIds = new Set();
  const claimsById = new Map();
  for (const [index, claim] of fixture.atomic_claims.entries()) {
    const context = `atomic_claims[${index}]`;
    exactKeys(claim, ["claim_id", "capture_id", "claim_text", "claim_type", "pinpoint_locator", "valid_time", "status", "duplicate_lineage_id"], context);
    id(claim.claim_id, `${context}.claim_id`);
    invariant(captureIds.has(claim.capture_id), `${context} references unknown capture`);
    invariant(typeof claim.claim_text === "string" && claim.claim_text.length > 0, `${context}.claim_text is required`);
    invariant(["source_assertion", "observed_fact"].includes(claim.claim_type), `${context}.claim_type is unsupported`);
    invariant(typeof claim.pinpoint_locator === "string" && claim.pinpoint_locator.length > 0, `${context}.pinpoint_locator is required`);
    invariant(claim.valid_time === null || DATE.test(claim.valid_time), `${context}.valid_time must be null or date`);
    invariant(["verified", "disputed"].includes(claim.status), `${context}.status is unsupported`);
    id(claim.duplicate_lineage_id, `${context}.duplicate_lineage_id`);
    claimIds.add(claim.claim_id);
    claimsById.set(claim.claim_id, claim);
  }

  let hasDuplicate = false;
  let hasContradiction = false;
  for (const [index, relation] of fixture.evidence_relationships.entries()) {
    const context = `evidence_relationships[${index}]`;
    exactKeys(relation, ["relationship_id", "from_claim_id", "to_claim_id", "relationship"], context);
    id(relation.relationship_id, `${context}.relationship_id`);
    invariant(claimIds.has(relation.from_claim_id) && claimIds.has(relation.to_claim_id), `${context} references unknown claim`);
    invariant(RELATIONSHIPS.includes(relation.relationship), `${context}.relationship is unsupported`);
    const fromClaim = claimsById.get(relation.from_claim_id);
    const toClaim = claimsById.get(relation.to_claim_id);
    if (relation.relationship === "duplicates") invariant(fromClaim.duplicate_lineage_id === toClaim.duplicate_lineage_id, `${context} duplicate claims must retain one evidence lineage`);
    if (relation.relationship === "contradicts") invariant(fromClaim.duplicate_lineage_id !== toClaim.duplicate_lineage_id, `${context} contradiction must not masquerade as an independent duplicate`);
    hasDuplicate ||= relation.relationship === "duplicates";
    hasContradiction ||= relation.relationship === "contradicts";
  }
  invariant(hasDuplicate && hasContradiction, "fixture must retain duplicate lineage and contradictory evidence");

  const eventMap = new Map();
  for (const [index, event] of fixture.event_revisions.entries()) {
    const context = `event_revisions[${index}]`;
    exactKeys(event, ["event_id", "revision", "revision_hash", "title", "event_date", "date_precision", "factual_state", "editorial_state", "claim_ids", "contradictory_claim_ids", "uncertainties", "alternative_explanations", "causal_language_level", "author_id"], context);
    id(event.event_id, `${context}.event_id`);
    invariant(Number.isSafeInteger(event.revision) && event.revision > 0, `${context}.revision is invalid`);
    sha(event.revision_hash, `${context}.revision_hash`);
    invariant(event.revision_hash === digest(withoutHash(event)), `${context}.revision_hash does not bind exact event revision content`);
    invariant(typeof event.title === "string" && event.title.length > 0, `${context}.title is required`);
    invariant(event.event_date === null || DATE.test(event.event_date), `${context}.event_date must be null or date`);
    invariant(["day", "month", "unresolved"].includes(event.date_precision), `${context}.date_precision is unsupported`);
    invariant((event.event_date === null) === (event.date_precision === "unresolved"), `${context} unresolved date state is inconsistent`);
    invariant(["contested", "unverified"].includes(event.factual_state), `${context} fixture cannot claim confirmation`);
    invariant(["evidence_review", "changes_requested"].includes(event.editorial_state), `${context} fixture cannot self-approve an event`);
    invariant(Array.isArray(event.claim_ids) && event.claim_ids.every((claimId) => claimIds.has(claimId)), `${context}.claim_ids contains unknown claim`);
    invariant(Array.isArray(event.contradictory_claim_ids) && event.contradictory_claim_ids.every((claimId) => claimIds.has(claimId)), `${context}.contradictory_claim_ids contains unknown claim`);
    invariant(event.factual_state !== "contested" || event.contradictory_claim_ids.length > 0, `${context} contested event must expose contradiction`);
    invariant(Array.isArray(event.uncertainties) && event.uncertainties.length > 0, `${context}.uncertainties must be non-empty`);
    invariant(Array.isArray(event.alternative_explanations) && event.alternative_explanations.length > 0, `${context}.alternative_explanations must be non-empty`);
    invariant(["descriptive", "temporal_association"].includes(event.causal_language_level), `${context} temporal proximity cannot become causal approval`);
    id(event.author_id, `${context}.author_id`);
    eventMap.set(`${event.event_id}\u0000${event.revision}`, event);
  }

  for (const [index, review] of fixture.reviews.entries()) {
    const context = `reviews[${index}]`;
    exactKeys(review, ["review_id", "record_type", "record_id", "revision_hash", "decision", "reviewer_id", "reviewer_type", "reviewed_at", "causal_conclusion_approved", "publication_approved"], context);
    id(review.review_id, `${context}.review_id`);
    invariant(review.record_type === "event_revision", `${context} fixture reviews only event revisions`);
    id(review.record_id, `${context}.record_id`);
    sha(review.revision_hash, `${context}.revision_hash`);
    invariant([...eventMap.values()].some((event) => event.event_id === review.record_id && event.revision_hash === review.revision_hash), `${context} must bind an exact immutable event revision`);
    invariant(review.decision === "changes_requested", `${context} cannot approve an event in this candidate fixture`);
    id(review.reviewer_id, `${context}.reviewer_id`);
    invariant(review.reviewer_type === "human_editor_fixture", `${context} reviewer must be attributable and human fixture-only`);
    instant(review.reviewed_at, `${context}.reviewed_at`);
    invariant(review.causal_conclusion_approved === false && review.publication_approved === false, `${context} cannot approve causation or publication`);
  }

  const numericMap = new Map();
  for (const [index, numeric] of fixture.numeric_series_revisions.entries()) {
    const context = `numeric_series_revisions[${index}]`;
    exactKeys(numeric, ["series_id", "revision", "layer", "series_bytes_utf8", "byte_length", "sha256"], context);
    id(numeric.series_id, `${context}.series_id`);
    invariant(Number.isSafeInteger(numeric.revision) && numeric.revision > 0, `${context}.revision is invalid`);
    invariant(["native_vintage", "linked_nominal", "historical_reference", "constant_price", "affordability"].includes(numeric.layer), `${context}.layer is unsupported`);
    invariant(typeof numeric.series_bytes_utf8 === "string", `${context}.series_bytes_utf8 must be an exact byte string`);
    invariant(Buffer.byteLength(numeric.series_bytes_utf8, "utf8") === numeric.byte_length, `${context}.byte_length disagrees with exact bytes`);
    invariant(digest(numeric.series_bytes_utf8) === numeric.sha256, `${context}.sha256 disagrees with exact bytes`);
    const key = `${numeric.series_id}\u0000${numeric.revision}`;
    invariant(!numericMap.has(key), `${context} identity must be unique`);
    numericMap.set(key, numeric);
  }
  invariant(new Set(fixture.numeric_series_revisions.map((item) => item.layer)).size === 5, "fixture must cover all five numeric layers");

  const overlayLatest = new Map();
  const overlayHashes = new Set();
  for (const [index, overlay] of fixture.overlay_revisions.entries()) {
    validateOverlayRevision(overlay, eventMap, numericMap, `overlay_revisions[${index}]`);
    invariant(!overlayHashes.has(overlay.revision_hash), `overlay_revisions[${index}] hash must be unique`);
    overlayHashes.add(overlay.revision_hash);
    const prior = overlayLatest.get(overlay.overlay_id);
    invariant(!prior || (overlay.revision === prior.revision + 1 && overlay.supersedes_revision_hash === prior.revision_hash), `overlay ${overlay.overlay_id} must be an additive revision chain`);
    invariant(prior || (overlay.revision === 1 && overlay.supersedes_revision_hash === null), `overlay ${overlay.overlay_id} must begin at revision 1`);
    overlayLatest.set(overlay.overlay_id, overlay);
  }
  return { eventMap, numericMap, overlayLatest };
}

export function createCandidateEventOverlayModel(fixture) {
  const { eventMap, numericMap, overlayLatest } = validateFixture(fixture);
  const numericRevisions = deepFreeze(structuredClone(fixture.numeric_series_revisions));
  const model = {
    fixture_id: fixture.fixture_set_id,
    locks: deepFreeze(structuredClone(fixture.locks)),
    source_items: deepFreeze(structuredClone(fixture.source_items)),
    captures: deepFreeze(structuredClone(fixture.captures)),
    atomic_claims: deepFreeze(structuredClone(fixture.atomic_claims)),
    evidence_relationships: deepFreeze(structuredClone(fixture.evidence_relationships)),
    event_revisions: deepFreeze(structuredClone(fixture.event_revisions)),
    event_reviews: deepFreeze(structuredClone(fixture.reviews)),
    numeric_revisions: numericRevisions,
    numeric_snapshot: numericRevisionSnapshot(numericRevisions),
    overlay_revisions: structuredClone(fixture.overlay_revisions),
    presentation_order: [...overlayLatest.values()].filter((item) => item.placement_state !== "withdrawn").sort((a, b) => a.display_order - b.display_order || a.overlay_id.localeCompare(b.overlay_id)).map((item) => item.overlay_id),
  };
  MODEL_INTERNALS.set(model, { eventMap, numericMap });
  return model;
}

export function numericRevisionSnapshot(numericRevisions) {
  invariant(Array.isArray(numericRevisions), "numeric revisions must be an array");
  return numericRevisions.map((item) => ({
    series_id: item.series_id,
    revision: item.revision,
    byte_length: item.byte_length,
    sha256: item.sha256,
    bytes_sha256_recomputed: digest(item.series_bytes_utf8),
  }));
}

export function createOverlayRevision(fields) {
  const revision = structuredClone(fields);
  revision.revision_hash = digest(withoutHash(revision));
  return revision;
}

function latestOverlays(revisions) {
  const map = new Map();
  for (const revision of revisions) map.set(revision.overlay_id, revision);
  return map;
}

function assertOnlyRevisionFieldsChanged(prior, next, allowedFields, action) {
  const left = withoutHash(next);
  const right = withoutHash(prior);
  const allowed = new Set(["revision", "supersedes_revision_hash", ...allowedFields]);
  for (const key of Object.keys(right)) if (!allowed.has(key)) invariant(canonical(left[key]) === canonical(right[key]), `${action} cannot edit ${key}`);
}

function appendRevision(state, candidate, internals) {
  validateOverlayRevision(candidate, internals.eventMap, internals.numericMap, "operation overlay revision");
  const latest = latestOverlays(state.overlay_revisions).get(candidate.overlay_id);
  invariant(latest ? candidate.revision === latest.revision + 1 && candidate.supersedes_revision_hash === latest.revision_hash : candidate.revision === 1 && candidate.supersedes_revision_hash === null, "operation must append the next exact overlay revision");
  state.overlay_revisions.push(structuredClone(candidate));
}

export function applyOverlayOperation(model, operation) {
  invariant(model && typeof model === "object", "overlay model is required");
  const internals = MODEL_INTERNALS.get(model);
  invariant(internals, "overlay model must come from createCandidateEventOverlayModel");
  exactKeys(operation, ["action", "actor_type", "revision"], "overlay operation");
  invariant(ACTIONS.includes(operation.action), "overlay operation action is unsupported");
  invariant(operation.actor_type === "fixture_editor" || operation.actor_type === "human_editor_fixture", "overlay operation actor lacks bounded fixture authority");
  invariant(operation.revision && typeof operation.revision === "object", "overlay operation requires an exact proposed revision");
  invariant(model.locks.numeric_editing_locked && model.locks.external_publication_locked && model.locks.methodology_change_locked && model.locks.causal_approval_locked, "required separation locks must remain engaged");

  const before = numericRevisionSnapshot(model.numeric_revisions);
  const state = {
    ...model,
    overlay_revisions: structuredClone(model.overlay_revisions),
    presentation_order: [...model.presentation_order],
  };
  MODEL_INTERNALS.set(state, internals);
  const latest = latestOverlays(state.overlay_revisions).get(operation.revision.overlay_id);

  if (operation.action === "add") invariant(!latest, "add cannot overwrite an existing overlay");
  else invariant(latest, `${operation.action} requires an existing overlay`);
  if (operation.action === "edit") invariant(operation.revision.review_state === "review_pending", "edited overlay must return to review_pending");
  if (operation.action === "remove") {
    invariant(operation.revision.placement_state === "withdrawn" && operation.revision.review_state === "withdrawn", "remove must append a withdrawn tombstone revision");
    assertOnlyRevisionFieldsChanged(latest, operation.revision, ["placement_state", "review_state", "creator_id"], "remove");
  }
  if (operation.action === "reorder") {
    invariant(operation.revision.display_order !== latest.display_order, "reorder must change only presentation order metadata");
    assertOnlyRevisionFieldsChanged(latest, operation.revision, ["display_order"], "reorder");
  }
  if (operation.action === "review") {
    invariant(operation.actor_type === "human_editor_fixture", "only an attributable human fixture editor may review");
    invariant(operation.revision.review_state === "reviewed_private", "review may approve only private display state");
    invariant(operation.revision.causal_language_level !== "contributory_hypothesis", "review cannot approve a contributory or causal claim while causal approval is locked");
    invariant(latest.review_state === "review_pending", "review requires a pending exact revision");
    assertOnlyRevisionFieldsChanged(latest, operation.revision, ["review_state", "creator_id"], "review");
  }
  appendRevision(state, operation.revision, internals);
  const current = [...latestOverlays(state.overlay_revisions).values()];
  state.presentation_order = current.filter((item) => item.placement_state !== "withdrawn").sort((a, b) => a.display_order - b.display_order || a.overlay_id.localeCompare(b.overlay_id)).map((item) => item.overlay_id);
  const after = numericRevisionSnapshot(state.numeric_revisions);
  invariant(canonical(after) === canonical(before) && canonical(after) === canonical(model.numeric_snapshot), "overlay operation changed numeric bytes or checksums");
  return state;
}

export function numericIdentityFunction(input) {
  invariant(Array.isArray(input), "numeric function accepts only the immutable numeric revision array");
  for (const [index, item] of input.entries()) {
    exactKeys(item, ["series_id", "revision", "layer", "series_bytes_utf8", "byte_length", "sha256"], `numeric input[${index}]`);
    invariant(digest(item.series_bytes_utf8) === item.sha256, `numeric input[${index}] checksum mismatch`);
  }
  return digest(canonical(numericRevisionSnapshot(input)));
}

export { validateFixture as validateCandidateEventOverlayFixture };
