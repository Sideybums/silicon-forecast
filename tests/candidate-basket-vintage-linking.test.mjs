import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  candidateLinkInputSha256,
  divideRationals,
  linkCandidateVintage,
  multiplyRationals,
  sha256CandidateBinding,
} from "../lib/candidate-basket-vintage-linking.mjs";

const fixtureUrl = new URL(
  "../data/fixtures/candidate-basket-vintage-linking.gb.v1.json",
  import.meta.url,
);
const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));

const clone = (value) => structuredClone(value);
const snapshot = (value) => JSON.stringify(value);

function candidateStrategy(id = "fixture-candidate-ratio-alpha") {
  return {
    strategyId: id,
    contract: {
      scope: "synthetic_test_only",
      operator: "first_deterministically_ordered_overlap_ratio",
      implementation_revision: "fixture-link-strategy-v1",
    },
    calculateLinkFactor({ overlapRecords }) {
      // Deliberately test-injected candidate logic, not library policy: use the
      // first record after the library's deterministic date ordering.
      return divideRationals(
        overlapRecords[0].priorValue,
        overlapRecords[0].candidateValue,
      );
    },
  };
}

function syntheticApproval(input) {
  const unsigned = {
    schemaVersion: 1,
    scope: "synthetic_test_only",
    decision: "approved",
    authority: {
      authorityType: "external_human_test_fixture",
      authorityId: "test-only-human-authority-not-production",
      decidedAt: "2026-08-09T18:00:00Z",
    },
    binding: {
      strategyId: input.strategy.strategyId,
      strategyContractSha256: sha256CandidateBinding(input.strategy.contract),
      inputSha256: candidateLinkInputSha256({
        priorNativeVintage: input.priorNativeVintage,
        candidateNativeVintage: input.candidateNativeVintage,
        overlap: input.overlap,
      }),
    },
  };
  return { ...unsigned, envelopeSha256: sha256CandidateBinding(unsigned) };
}

function request(overrides = {}) {
  const [priorNativeVintage, candidateNativeVintage] = clone(
    fixture.native_vintages,
  );
  const input = {
    priorLinkedRevision: clone(fixture.prior_linked_revision),
    priorNativeVintage,
    candidateNativeVintage,
    overlap: clone(fixture.candidate_overlap),
    strategy: candidateStrategy(),
    approval: null,
    outputRevisionId: "candidate-linked-r2",
  };
  input.approval = syntheticApproval(input);
  return Object.assign(input, overrides);
}

test("fixture declares no default, preferred, selected, or approved strategy", () => {
  assert.deepEqual(fixture.authority, {
    methodology_approved: false,
    production_activation: false,
    publication_authority: false,
    default_strategy_id: null,
    preferred_strategy_id: null,
    selected_strategy_id: null,
    approved_strategy_id: null,
  });
  assert.deepEqual(fixture.link_approval_records, []);
  assert.ok(
    fixture.candidate_strategy_descriptors.every(
      ({ status }) => status === "PROPOSED_LOCKED",
    ),
  );
});

test("missing injected strategy fails closed with the exact state and null value", () => {
  assert.deepEqual(linkCandidateVintage(request({ strategy: null })), {
    state: "UNAVAILABLE_LINK_NOT_APPROVED",
    value: null,
    linkedRevision: null,
  });
});

test("missing approval fails closed even when a strategy is injected", () => {
  assert.deepEqual(linkCandidateVintage(request({ approval: null })), {
    state: "UNAVAILABLE_LINK_NOT_APPROVED",
    value: null,
    linkedRevision: null,
  });
});

test("a method-like identifier cannot confer approval", () => {
  const result = linkCandidateVintage(
    request({
      approval: {
        strategyId: "fixture-candidate-ratio-alpha",
        approvalId: "looks-approved-by-name",
      },
    }),
  );
  assert.deepEqual(result, {
    state: "UNAVAILABLE_LINK_NOT_APPROVED",
    value: null,
    linkedRevision: null,
  });
});

test("an unbound or mismatched approval cannot activate a candidate strategy", () => {
  const input = request();
  input.approval.binding.inputSha256 = "0".repeat(64);
  const unsigned = structuredClone(input.approval);
  delete unsigned.envelopeSha256;
  input.approval.envelopeSha256 = sha256CandidateBinding(unsigned);
  assert.deepEqual(linkCandidateVintage(input), {
    state: "UNAVAILABLE_LINK_NOT_APPROVED",
    value: null,
    linkedRevision: null,
  });
});

test("missing or unusable overlap fails closed without invoking strategy", () => {
  let calls = 0;
  const strategy = {
    ...candidateStrategy(),
    calculateLinkFactor() {
      calls += 1;
      return { numerator: "1", denominator: "1" };
    },
  };
  for (const overlap of [
    null,
    { ...clone(fixture.candidate_overlap), records: [] },
    {
      ...clone(fixture.candidate_overlap),
      records: [
        {
          date: "2026-01-02",
          quality_state: "UNAVAILABLE_NATIVE_QUALITY",
          prior_value: null,
          candidate_value: null,
        },
      ],
    },
  ]) {
    assert.deepEqual(linkCandidateVintage(request({ overlap, strategy })), {
      state: "UNAVAILABLE_LINK_OVERLAP",
      value: null,
      linkedRevision: null,
    });
  }
  assert.equal(calls, 0);
});

test("exact integer/rational arithmetic reduces without binary floating point", () => {
  assert.deepEqual(
    divideRationals(
      { numerator: "301", denominator: "2" },
      { numerator: "401", denominator: "3" },
    ),
    { numerator: "903", denominator: "802" },
  );
  assert.deepEqual(
    multiplyRationals(
      { numerator: "903", denominator: "802" },
      { numerator: "400", denominator: "3" },
    ),
    { numerator: "60200", denominator: "401" },
  );
});

test("linking is independent of native-point and overlap input ordering", () => {
  const normal = linkCandidateVintage(request());
  const reversedRequest = request();
  reversedRequest.priorNativeVintage.points.reverse();
  reversedRequest.candidateNativeVintage.points.reverse();
  reversedRequest.overlap.records.reverse();
  const reversed = linkCandidateVintage(reversedRequest);
  assert.deepEqual(reversed, normal);
});

test("successful candidate linking stores exact factors and preserves gaps", () => {
  const result = linkCandidateVintage(request());
  assert.equal(result.state, "AVAILABLE_CANDIDATE_LINK");
  assert.deepEqual(result.value, null);
  const segment = result.linkedRevision.segments.at(-1);
  assert.deepEqual(segment.linkFactor, {
    numerator: "903",
    denominator: "802",
  });
  assert.deepEqual(segment.points, [
    {
      date: "2026-01-04",
      state: "AVAILABLE",
      value: { numerator: "60200", denominator: "401" },
      lineageIds: ["b-04"],
    },
    {
      date: "2026-01-05",
      state: "UNAVAILABLE_NATIVE_QUALITY",
      value: null,
      lineageIds: ["b-05-gap"],
    },
    {
      date: "2026-01-06",
      state: "AVAILABLE",
      value: { numerator: "121303", denominator: "802" },
      lineageIds: ["b-06"],
    },
  ]);
});

test("linking preserves the complete prefix and source revisions without mutation", () => {
  const input = request();
  const priorBefore = snapshot(input.priorLinkedRevision);
  const nativeBefore = snapshot([
    input.priorNativeVintage,
    input.candidateNativeVintage,
  ]);
  const result = linkCandidateVintage(input);

  assert.equal(snapshot(input.priorLinkedRevision), priorBefore);
  assert.equal(
    snapshot([input.priorNativeVintage, input.candidateNativeVintage]),
    nativeBefore,
  );
  assert.deepEqual(
    result.linkedRevision.segments.slice(
      0,
      input.priorLinkedRevision.segments.length,
    ),
    input.priorLinkedRevision.segments,
  );
  assert.deepEqual(result.linkedRevision.predecessorRevision, {
    seriesId: "candidate-linked-nominal-fixture",
    revisionId: "candidate-linked-r1",
  });
});

test("candidate dates before effective_from are overlap only and never silently spliced", () => {
  const input = request();
  input.candidateNativeVintage.points.push({
    date: "2026-01-03",
    state: "AVAILABLE",
    value: { numerator: "404", denominator: "3" },
    lineage_ids: ["candidate-overlap-only"]
  });
  input.approval = syntheticApproval(input);
  const result = linkCandidateVintage(input);
  assert.deepEqual(
    result.linkedRevision.segments.at(-1).points.map(({ date }) => date),
    ["2026-01-04", "2026-01-05", "2026-01-06"],
  );
  assert.deepEqual(
    result.linkedRevision.segments[0],
    fixture.prior_linked_revision.segments[0],
  );
});

test("changed link input creates a distinct revision and leaves the earlier revision replayable", () => {
  const first = linkCandidateVintage(request());
  const changed = request({ outputRevisionId: "candidate-linked-r3" });
  changed.overlap.records[1].candidate_value = {
    numerator: "405",
    denominator: "3",
  };
  assert.deepEqual(linkCandidateVintage(changed), {
    state: "UNAVAILABLE_LINK_NOT_APPROVED",
    value: null,
    linkedRevision: null,
  });
  changed.approval = syntheticApproval(changed);
  const second = linkCandidateVintage(changed);

  assert.equal(first.linkedRevision.revisionId, "candidate-linked-r2");
  assert.equal(second.linkedRevision.revisionId, "candidate-linked-r3");
  assert.notDeepEqual(
    first.linkedRevision.segments.at(-1).linkFactor,
    second.linkedRevision.segments.at(-1).linkFactor,
  );
  assert.deepEqual(
    first.linkedRevision.segments[0],
    second.linkedRevision.segments[0],
  );
  assert.deepEqual(
    fixture.prior_linked_revision.segments[0],
    first.linkedRevision.segments[0],
  );
});
