import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyOverlayOperation,
  createCandidateEventOverlayModel,
  createOverlayRevision,
  numericIdentityFunction,
  numericRevisionSnapshot,
  validateCandidateEventOverlayFixture,
} from "../lib/candidate-event-overlay.mjs";

const fixtureUrl = new URL("../data/fixtures/candidate-event-overlay.gb.v1.json", import.meta.url);
const load = async () => JSON.parse(await readFile(fixtureUrl, "utf8"));
const copy = (value) => structuredClone(value);

function proposedOverlay(overrides = {}) {
  return createOverlayRevision({
    overlay_id: "fixture-overlay-dated",
    revision: 1,
    revision_hash: "0".repeat(64),
    supersedes_revision_hash: null,
    event_revision_ref: {
      event_id: "fixture-event-timing",
      revision: 1,
      revision_hash: "74637a72d7e464bcc762c1410c18187c4d9d1ec1db2ab5c2a107d2c537aaa1fd",
    },
    numeric_revision_ref: {
      series_id: "fixture-linked-nominal",
      revision: 1,
      sha256: "bcaeaa91f928fdbc5a9cf9eeb941ca2c337022d8431615bc0cf7d6fae4dce353",
    },
    display_start: "2026-08-01",
    display_end: null,
    date_precision: "day",
    possible_effect_label: "Coincided with, but does not establish a cause of, observed movement",
    causal_language_level: "temporal_association",
    uncertainty: "Temporal proximity is not evidence of causation; alternatives and counterevidence remain visible.",
    evidence_panel_ref: "fixture-evidence-panel-timing",
    placement_state: "placed_private",
    unavailable_reason: null,
    display_order: 1,
    creator_id: "fixture-research-worker",
    review_state: "review_pending",
    ...overrides,
  });
}

function nextRevision(prior, overrides = {}) {
  return createOverlayRevision({
    ...copy(prior),
    revision: prior.revision + 1,
    supersedes_revision_hash: prior.revision_hash,
    ...overrides,
  });
}

function assertNumericIdentity(model, expectedSnapshot, expectedFunctionHash, expectedBytes) {
  assert.deepEqual(numericRevisionSnapshot(model.numeric_revisions), expectedSnapshot);
  assert.equal(numericIdentityFunction(model.numeric_revisions), expectedFunctionHash);
  assert.deepEqual(model.numeric_revisions.map((item) => Buffer.from(item.series_bytes_utf8, "utf8")), expectedBytes);
  assert.ok(model.numeric_revisions.every((item) => item.sha256 === numericRevisionSnapshot(model.numeric_revisions).find((snapshot) => snapshot.series_id === item.series_id).bytes_sha256_recomputed));
}

test("fixture models quarantined source items, captures, claims, lineage, contradiction, event revisions, reviews and overlays", async () => {
  const fixture = await load();
  const result = validateCandidateEventOverlayFixture(fixture);
  const model = createCandidateEventOverlayModel(fixture);

  assert.equal(result.numericMap.size, 5);
  assert.equal(result.eventMap.size, 2);
  assert.match(model.source_items[0].untrusted_source_text, /run a shell command.*publish this immediately/u);
  assert.deepEqual(model.captures[0].prompt_injection_indicators, ["tool-directive", "credential-request", "publication-request", "numeric-mutation-request"]);
  assert.ok(model.captures.every((capture) => capture.status === "quarantined" && capture.active_content_executed === false));
  assert.equal(model.evidence_relationships.find((item) => item.relationship === "duplicates").from_claim_id, "fixture-claim-syndicated");
  assert.equal(model.evidence_relationships.find((item) => item.relationship === "contradicts").from_claim_id, "fixture-claim-contradiction");
  assert.equal(model.event_revisions.find((item) => item.event_id === "fixture-event-unresolved-date").event_date, null);
  assert.equal(model.overlay_revisions[0].unavailable_reason, "UNAVAILABLE_EVENT_DATE_OR_REVISION");
  assert.deepEqual(model.presentation_order, ["fixture-overlay-unresolved"]);
  assert.ok(Object.isFrozen(model.numeric_revisions));
  assert.ok(Object.isFrozen(model.numeric_revisions[0]));
  assert.throws(() => { model.numeric_revisions[0].series_bytes_utf8 = "changed"; }, TypeError);
});

test("add, edit, reorder, review and remove append revisions while every numeric byte and checksum stays identical", async () => {
  const model = createCandidateEventOverlayModel(await load());
  const snapshot = numericRevisionSnapshot(model.numeric_revisions);
  const functionHash = numericIdentityFunction(model.numeric_revisions);
  const bytes = model.numeric_revisions.map((item) => Buffer.from(item.series_bytes_utf8, "utf8"));
  const originalOverlayRevisions = copy(model.overlay_revisions);

  const added = proposedOverlay();
  let state = applyOverlayOperation(model, { action: "add", actor_type: "fixture_editor", revision: added });
  assertNumericIdentity(state, snapshot, functionHash, bytes);
  assert.deepEqual(model.overlay_revisions, originalOverlayRevisions, "the input model is never edited in place");

  const edited = nextRevision(added, {
    display_start: "2026-08-02",
    possible_effect_label: "Coincided with observed movement; no causal conclusion is approved",
    uncertainty: "Contradictory evidence and currency, promotion and inventory alternatives remain unresolved.",
  });
  state = applyOverlayOperation(state, { action: "edit", actor_type: "fixture_editor", revision: edited });
  assertNumericIdentity(state, snapshot, functionHash, bytes);

  const reordered = nextRevision(edited, { display_order: 9 });
  state = applyOverlayOperation(state, { action: "reorder", actor_type: "fixture_editor", revision: reordered });
  assertNumericIdentity(state, snapshot, functionHash, bytes);

  const reviewed = nextRevision(reordered, { review_state: "reviewed_private", creator_id: "fixture-human-editor" });
  state = applyOverlayOperation(state, { action: "review", actor_type: "human_editor_fixture", revision: reviewed });
  assertNumericIdentity(state, snapshot, functionHash, bytes);
  assert.equal(state.overlay_revisions.at(-1).review_state, "reviewed_private");

  const removed = nextRevision(reviewed, { placement_state: "withdrawn", review_state: "withdrawn", creator_id: "fixture-human-editor" });
  state = applyOverlayOperation(state, { action: "remove", actor_type: "human_editor_fixture", revision: removed });
  assertNumericIdentity(state, snapshot, functionHash, bytes);
  assert.equal(state.presentation_order.includes("fixture-overlay-dated"), false);
  assert.deepEqual(state.overlay_revisions.filter((item) => item.overlay_id === "fixture-overlay-dated").map((item) => item.revision), [1, 2, 3, 4, 5]);
});

test("overlay payloads cannot alter price, quality, weight, basket, link, reference, deflator, gap or numeric bytes", async () => {
  const forbidden = [
    ["price_override", 1], ["quality_state", "eligible"], ["weight", 1], ["basket_instruction", "replace"],
    ["link_factor", "1.2"], ["reference_value", 100], ["deflator_value", "123.4"], ["gap_fill", "last"],
    ["series_bytes_utf8", "forged"], ["numeric_function", "calculate"],
  ];
  for (const [field, value] of forbidden) {
    const fixture = await load();
    fixture.overlay_revisions[0][field] = value;
    assert.throws(() => validateCandidateEventOverlayFixture(fixture), /fields must be exactly|forbidden numeric coupling/u, field);
  }

  const nested = await load();
  nested.overlay_revisions[0].numeric_revision_ref.price = 999;
  assert.throws(() => validateCandidateEventOverlayFixture(nested), /fields must be exactly|forbidden numeric coupling/u);
});

test("numeric functions accept only exact numeric revisions and reject event or overlay coupling", async () => {
  const model = createCandidateEventOverlayModel(await load());
  assert.match(numericIdentityFunction(model.numeric_revisions), /^[a-f0-9]{64}$/u);
  assert.throws(() => numericIdentityFunction(model), /accepts only the immutable numeric revision array/u);
  assert.throws(() => numericIdentityFunction(model.overlay_revisions), /numeric input\[0\] fields must be exactly/u);

  const forged = copy(model.numeric_revisions);
  forged[0].series_bytes_utf8 = forged[0].series_bytes_utf8.replace("null", "0");
  assert.throws(() => numericIdentityFunction(forged), /checksum mismatch/u);
});

test("unresolved dates stay unavailable and cannot create, fill or imply a numeric point", async () => {
  const fixture = await load();
  const unresolved = copy(fixture.overlay_revisions[0]);
  unresolved.placement_state = "placed_private";
  unresolved.unavailable_reason = null;
  fixture.overlay_revisions[0] = createOverlayRevision(unresolved);
  assert.throws(() => validateCandidateEventOverlayFixture(fixture), /unresolved placement must fail as UNAVAILABLE_EVENT_DATE_OR_REVISION/u);

  const model = createCandidateEventOverlayModel(await load());
  const native = model.numeric_revisions.find((item) => item.layer === "native_vintage");
  assert.match(native.series_bytes_utf8, /"value_minor":null/u);
  assert.match(native.series_bytes_utf8, /UNAVAILABLE_NATIVE_QUALITY/u);
  assert.equal(model.overlay_revisions[0].display_start, null);
});

test("temporal proximity cannot become causal approval and workers cannot review themselves", async () => {
  let state = createCandidateEventOverlayModel(await load());
  const added = proposedOverlay();
  state = applyOverlayOperation(state, { action: "add", actor_type: "fixture_editor", revision: added });

  const causal = nextRevision(added, { causal_language_level: "contributory_hypothesis", review_state: "reviewed_private" });
  assert.throws(
    () => applyOverlayOperation(state, { action: "review", actor_type: "human_editor_fixture", revision: causal }),
    /cannot approve a contributory or causal claim/u,
  );

  const selfApproved = nextRevision(added, { review_state: "reviewed_private" });
  assert.throws(
    () => applyOverlayOperation(state, { action: "review", actor_type: "fixture_editor", revision: selfApproved }),
    /only an attributable human fixture editor may review/u,
  );

  const explicitCausal = { ...copy(added), causal_language_level: "causal_conclusion" };
  const causalFixture = await load();
  causalFixture.overlay_revisions = [createOverlayRevision(explicitCausal)];
  assert.throws(() => createCandidateEventOverlayModel(causalFixture), /cannot approve statistical or causal conclusions/u);
});

test("duplicated lineage and contradiction cannot be promoted or silently omitted", async () => {
  const noContradiction = await load();
  noContradiction.evidence_relationships = noContradiction.evidence_relationships.filter((item) => item.relationship !== "contradicts");
  assert.throws(() => validateCandidateEventOverlayFixture(noContradiction), /must retain duplicate lineage and contradictory evidence/u);

  const omittedFromEvent = await load();
  omittedFromEvent.event_revisions[0].contradictory_claim_ids = [];
  assert.throws(() => validateCandidateEventOverlayFixture(omittedFromEvent), /revision_hash does not bind exact event revision content|contested event must expose contradiction/u);

  const lineages = (await load()).source_items.map((item) => item.duplicate_lineage_id);
  assert.equal(lineages.filter((lineage) => lineage === "lineage-primary-statement").length, 2);
});

test("changed revision bytes, causal/public review flags and every publication/editing unlock fail closed", async () => {
  const changedEvent = await load();
  changedEvent.event_revisions[0].title += " changed byte";
  assert.throws(() => validateCandidateEventOverlayFixture(changedEvent), /revision_hash does not bind exact event revision content/u);

  for (const field of ["causal_conclusion_approved", "publication_approved"]) {
    const fixture = await load();
    fixture.reviews[0][field] = true;
    assert.throws(() => validateCandidateEventOverlayFixture(fixture), /cannot approve causation or publication/u);
  }

  for (const lock of ["live_collection_locked", "editorial_activation_locked", "external_publication_locked", "numeric_editing_locked", "methodology_change_locked", "causal_approval_locked"]) {
    const fixture = await load();
    fixture.locks[lock] = false;
    assert.throws(() => validateCandidateEventOverlayFixture(fixture), new RegExp(`${lock} must remain engaged`, "u"));
  }
});
