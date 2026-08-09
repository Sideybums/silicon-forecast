import { createHash } from "node:crypto";

const LINK_NOT_APPROVED = "UNAVAILABLE_LINK_NOT_APPROVED";
const LINK_OVERLAP_UNAVAILABLE = "UNAVAILABLE_LINK_OVERLAP";
const SHA256 = /^[a-f0-9]{64}$/u;
const DATE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;

function unavailable(state) {
  return Object.freeze({ state, value: null, linkedRevision: null });
}

function greatestCommonDivisor(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

function parseInteger(value, field) {
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) {
    throw new TypeError(`${field} must be a base-10 integer string`);
  }
  return BigInt(value);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  if (value === null || ["string", "boolean", "number"].includes(typeof value)) {
    if (typeof value === "number" && !Number.isSafeInteger(value)) {
      throw new TypeError("approval binding permits safe integers only");
    }
    return JSON.stringify(value);
  }
  throw new TypeError("approval binding contains an unsupported value");
}

export function sha256CandidateBinding(value) {
  return createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

export function candidateLinkInputSha256({
  priorLinkedRevision,
  priorNativeVintage,
  candidateNativeVintage,
  overlap,
}) {
  const linked = structuredClone(priorLinkedRevision);
  const prior = structuredClone(priorNativeVintage);
  const candidate = structuredClone(candidateNativeVintage);
  const overlapCopy = structuredClone(overlap);
  if (Array.isArray(prior?.points)) {
    prior.points.sort((left, right) => left.date.localeCompare(right.date));
  }
  if (Array.isArray(candidate?.points)) {
    candidate.points.sort((left, right) => left.date.localeCompare(right.date));
  }
  if (Array.isArray(overlapCopy?.records)) {
    overlapCopy.records.sort((left, right) => left.date.localeCompare(right.date));
  }
  if (Array.isArray(linked?.segments)) {
    for (const segment of linked.segments) {
      if (Array.isArray(segment?.points)) {
        segment.points.sort((left, right) => left.date.localeCompare(right.date));
      }
    }
  }
  return sha256CandidateBinding({
    priorLinkedRevision: linked,
    priorNativeVintage: prior,
    candidateNativeVintage: candidate,
    overlap: overlapCopy,
  });
}

function hasExactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000")
  );
}

/**
 * Return a canonical exact rational. Stored arithmetic never uses Number.
 */
export function canonicalRational(value) {
  if (!value || typeof value !== "object") {
    throw new TypeError("rational must be an object");
  }
  let numerator = parseInteger(value.numerator, "numerator");
  let denominator = parseInteger(value.denominator, "denominator");
  if (denominator === 0n) {
    throw new RangeError("rational denominator must be non-zero");
  }
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = greatestCommonDivisor(numerator, denominator);
  return Object.freeze({
    numerator: String(numerator / divisor),
    denominator: String(denominator / divisor),
  });
}

export function multiplyRationals(left, right) {
  const a = canonicalRational(left);
  const b = canonicalRational(right);
  return canonicalRational({
    numerator: String(BigInt(a.numerator) * BigInt(b.numerator)),
    denominator: String(BigInt(a.denominator) * BigInt(b.denominator)),
  });
}

export function divideRationals(left, right) {
  const divisor = canonicalRational(right);
  if (divisor.numerator === "0") {
    throw new RangeError("cannot divide by a zero rational");
  }
  return multiplyRationals(left, {
    numerator: divisor.denominator,
    denominator: divisor.numerator,
  });
}

function isPositiveRational(value) {
  try {
    return BigInt(canonicalRational(value).numerator) > 0n;
  } catch {
    return false;
  }
}

const FIRST_ORDERED_OVERLAP_CONTRACT = Object.freeze({
  scope: "synthetic_test_only",
  operator: "first_deterministically_ordered_overlap_ratio",
  implementation_revision: "fixture-link-strategy-v1",
});

function calculateFirstOrderedOverlapRatio({ overlapRecords }) {
  return divideRationals(
    overlapRecords[0].priorValue,
    overlapRecords[0].candidateValue,
  );
}

const CLOSED_IMPLEMENTATIONS = Object.freeze({
  "fixture-candidate-ratio-alpha": Object.freeze({
    strategyId: "fixture-candidate-ratio-alpha",
    contract: FIRST_ORDERED_OVERLAP_CONTRACT,
    implementationId: "closed-synthetic-first-ordered-overlap-ratio-v1",
    calculateLinkFactor: calculateFirstOrderedOverlapRatio,
  }),
});

function implementationCodeSha256(implementation) {
  return createHash("sha256")
    .update(`${implementation.implementationId}\u0000${implementation.calculateLinkFactor.toString()}`, "utf8")
    .digest("hex");
}

function resolveStrategy(strategy) {
  if (!hasExactKeys(strategy, ["strategyId", "contract"])) return null;
  const implementation = CLOSED_IMPLEMENTATIONS[strategy.strategyId];
  if (!implementation) return null;
  try {
    return canonical(strategy.contract) === canonical(implementation.contract)
      ? implementation
      : null;
  } catch {
    return null;
  }
}

/** Return approval metadata for an exact closed synthetic strategy contract. */
export function candidateClosedImplementationBinding(strategy) {
  const implementation = resolveStrategy(strategy);
  return implementation === null ? null : Object.freeze({
    implementationId: implementation.implementationId,
    implementationCodeSha256: implementationCodeSha256(implementation),
  });
}

function approvalMatches({
  approval,
  strategy,
  implementation,
  priorLinkedRevision,
  priorNativeVintage,
  candidateNativeVintage,
  overlap,
}) {
  if (
    !hasExactKeys(approval, [
      "schemaVersion",
      "scope",
      "decision",
      "authority",
      "binding",
      "envelopeSha256",
    ]) ||
    !hasExactKeys(approval.authority, ["authorityType", "authorityId", "decidedAt"]) ||
    !hasExactKeys(approval.binding, [
      "strategyId",
      "strategyContractSha256",
      "implementationId",
      "implementationCodeSha256",
      "inputSha256",
    ])
  ) {
    return false;
  }
  if (
    approval.schemaVersion !== 1 ||
    approval.scope !== "synthetic_test_only" ||
    approval.decision !== "approved" ||
    approval.authority.authorityType !== "external_human_test_fixture" ||
    typeof approval.authority.authorityId !== "string" ||
    approval.authority.authorityId.length === 0 ||
    typeof approval.authority.decidedAt !== "string" ||
    approval.authority.decidedAt.length === 0 ||
    approval.binding.strategyId !== strategy.strategyId ||
    approval.binding.implementationId !== implementation.implementationId ||
    !SHA256.test(approval.binding.strategyContractSha256) ||
    !SHA256.test(approval.binding.implementationCodeSha256) ||
    !SHA256.test(approval.binding.inputSha256) ||
    !SHA256.test(approval.envelopeSha256)
  ) {
    return false;
  }
  const strategyContractSha256 = sha256CandidateBinding(strategy.contract);
  const inputSha256 = candidateLinkInputSha256({
    priorLinkedRevision,
    priorNativeVintage,
    candidateNativeVintage,
    overlap,
  });
  if (
    approval.binding.strategyContractSha256 !== strategyContractSha256 ||
    approval.binding.implementationCodeSha256 !== implementationCodeSha256(implementation) ||
    approval.binding.inputSha256 !== inputSha256
  ) {
    return false;
  }
  const unsigned = structuredClone(approval);
  delete unsigned.envelopeSha256;
  return approval.envelopeSha256 === sha256CandidateBinding(unsigned);
}

function normaliseOverlap(overlap) {
  if (
    !overlap ||
    typeof overlap.overlap_manifest_id !== "string" ||
    !Array.isArray(overlap.records) ||
    overlap.records.length === 0
  ) {
    return null;
  }

  const seenDates = new Set();
  const records = [];
  for (const record of overlap.records) {
    if (
      !record ||
      !DATE.test(record.date) ||
      record.quality_state !== "AVAILABLE" ||
      !isPositiveRational(record.prior_value) ||
      !isPositiveRational(record.candidate_value) ||
      seenDates.has(record.date)
    ) {
      return null;
    }
    seenDates.add(record.date);
    records.push({
      date: record.date,
      qualityState: record.quality_state,
      priorValue: canonicalRational(record.prior_value),
      candidateValue: canonicalRational(record.candidate_value),
    });
  }
  records.sort((left, right) => left.date.localeCompare(right.date));
  return records;
}

function normaliseCandidatePoints(candidateNativeVintage, linkFactor) {
  if (
    !candidateNativeVintage ||
    typeof candidateNativeVintage.vintage_id !== "string" ||
    candidateNativeVintage.vintage_id.length === 0 ||
    typeof candidateNativeVintage.revision_id !== "string" ||
    candidateNativeVintage.revision_id.length === 0 ||
    typeof candidateNativeVintage.immutable_manifest_hash !== "string" ||
    candidateNativeVintage.immutable_manifest_hash.length === 0 ||
    !DATE.test(candidateNativeVintage.effective_from) ||
    !Array.isArray(candidateNativeVintage.points)
  ) {
    throw new TypeError("candidate native vintage is malformed");
  }

  const seenDates = new Set();
  const points = [];
  const ordered = [...candidateNativeVintage.points];
  if (ordered.some((point) => !point || typeof point.date !== "string")) {
    throw new TypeError("native point dates must be unique strings");
  }
  ordered.sort((left, right) => left.date.localeCompare(right.date));
  for (const point of ordered) {
    if (!DATE.test(point.date) || seenDates.has(point.date)) {
      throw new TypeError("native point dates must be unique strings");
    }
    seenDates.add(point.date);
    if (point.date < candidateNativeVintage.effective_from) {
      continue;
    }
    if (!Array.isArray(point.lineage_ids)) {
      throw new TypeError("native point lineage_ids must be an array");
    }
    if (point.state === "AVAILABLE") {
      if (!isPositiveRational(point.value)) {
        throw new TypeError("available native points require a positive rational");
      }
      points.push({
        date: point.date,
        state: point.state,
        value: multiplyRationals(linkFactor, point.value),
        lineageIds: [...point.lineage_ids],
      });
    } else {
      if (point.value !== null) {
        throw new TypeError("unavailable native points must have value null");
      }
      points.push({
        date: point.date,
        state: point.state,
        value: null,
        lineageIds: [...point.lineage_ids],
      });
    }
  }
  return points;
}

function validatePriorLinkedPrefix(priorLinkedRevision, candidateEffectiveFrom) {
  if (
    !priorLinkedRevision ||
    typeof priorLinkedRevision.series_id !== "string" ||
    priorLinkedRevision.series_id.length === 0 ||
    typeof priorLinkedRevision.revision_id !== "string" ||
    priorLinkedRevision.revision_id.length === 0 ||
    !Array.isArray(priorLinkedRevision.segments) ||
    !DATE.test(candidateEffectiveFrom)
  ) {
    throw new TypeError("prior linked revision or candidate boundary is malformed");
  }
  const seenDates = new Set();
  for (const [segmentIndex, segment] of priorLinkedRevision.segments.entries()) {
    if (!segment || typeof segment !== "object" || !Array.isArray(segment.points) || segment.points.length === 0) {
      throw new TypeError(`prior linked segment ${segmentIndex} is malformed`);
    }
    const vintageId = segment.vintage_id ?? segment.vintageId;
    const nativeRevisionId = segment.native_revision_id ?? segment.nativeRevisionId;
    const nativeManifestHash = segment.native_manifest_hash ?? segment.nativeManifestHash;
    const factor = segment.link_factor ?? segment.linkFactor;
    if (
      typeof vintageId !== "string" || vintageId.length === 0 ||
      typeof nativeRevisionId !== "string" || nativeRevisionId.length === 0 ||
      typeof nativeManifestHash !== "string" || nativeManifestHash.length === 0 ||
      !isPositiveRational(factor)
    ) {
      throw new TypeError(`prior linked segment ${segmentIndex} is malformed`);
    }
    for (const [pointIndex, point] of segment.points.entries()) {
      const lineageIds = point?.lineage_ids ?? point?.lineageIds;
      if (
        !point || !DATE.test(point.date) || seenDates.has(point.date) ||
        point.date >= candidateEffectiveFrom || !Array.isArray(lineageIds) ||
        typeof point.state !== "string" || point.state.length === 0 ||
        (point.state === "AVAILABLE" ? !isPositiveRational(point.value) : point.value !== null)
      ) {
        throw new TypeError(`prior linked point ${segmentIndex}:${pointIndex} is malformed, duplicated, or not strictly before candidate effective_from`);
      }
      seenDates.add(point.date);
    }
  }
}

/**
 * Evaluate one closed-registry synthetic candidate linking strategy.
 *
 * The internal registry has no default, preference, production implementation,
 * threshold, approval inference, or production/public authority. A
 * separately supplied approval must bind every named candidate input. Existing
 * linked segments are copied as an immutable prefix; the candidate is always a
 * new segment and pre-effective overlap points are never spliced into history.
 */
export function linkCandidateVintage({
  priorLinkedRevision,
  priorNativeVintage,
  candidateNativeVintage,
  overlap,
  strategy,
  approval,
  outputRevisionId,
} = {}) {
  const implementation = resolveStrategy(strategy);
  if (!implementation) {
    return unavailable(LINK_NOT_APPROVED);
  }
  const overlapRecords = normaliseOverlap(overlap);
  if (!overlapRecords) {
    return unavailable(LINK_OVERLAP_UNAVAILABLE);
  }
  if (
    !approvalMatches({
      approval,
      strategy,
      implementation,
      priorLinkedRevision,
      priorNativeVintage,
      candidateNativeVintage,
      overlap,
    })
  ) {
    return unavailable(LINK_NOT_APPROVED);
  }
  validatePriorLinkedPrefix(priorLinkedRevision, candidateNativeVintage?.effective_from);
  if (
    typeof outputRevisionId !== "string" ||
    outputRevisionId.length === 0 ||
    outputRevisionId === priorLinkedRevision.revision_id
  ) {
    throw new TypeError("distinct input and output linked revisions are required");
  }

  const strategyInput = Object.freeze({
    overlapManifestId: overlap.overlap_manifest_id,
    overlapRecords: Object.freeze(overlapRecords),
    priorVintage: Object.freeze({
      vintageId: priorNativeVintage.vintage_id,
      revisionId: priorNativeVintage.revision_id,
      manifestHash: priorNativeVintage.immutable_manifest_hash,
    }),
    candidateVintage: Object.freeze({
      vintageId: candidateNativeVintage.vintage_id,
      revisionId: candidateNativeVintage.revision_id,
      manifestHash: candidateNativeVintage.immutable_manifest_hash,
    }),
  });
  const proposedFactor = implementation.calculateLinkFactor(strategyInput);
  if (!isPositiveRational(proposedFactor)) {
    throw new TypeError("candidate strategy must return a positive rational");
  }
  const linkFactor = canonicalRational(proposedFactor);
  const points = normaliseCandidatePoints(candidateNativeVintage, linkFactor);

  const prefix = structuredClone(priorLinkedRevision.segments);
  for (const segment of prefix) {
    segment.points.sort((left, right) => left.date.localeCompare(right.date));
  }
  const linkedRevision = {
    seriesId: priorLinkedRevision.series_id,
    revisionId: outputRevisionId,
    predecessorRevision: {
      seriesId: priorLinkedRevision.series_id,
      revisionId: priorLinkedRevision.revision_id,
    },
    segments: [
      ...prefix,
      {
        vintageId: candidateNativeVintage.vintage_id,
        nativeRevisionId: candidateNativeVintage.revision_id,
        nativeManifestHash: candidateNativeVintage.immutable_manifest_hash,
        effectiveFrom: candidateNativeVintage.effective_from,
        overlapManifestId: overlap.overlap_manifest_id,
        strategyId: strategy.strategyId,
        approvalEnvelopeSha256: approval.envelopeSha256,
        linkFactor,
        points,
      },
    ],
  };

  return {
    state: "AVAILABLE_CANDIDATE_LINK",
    value: null,
    linkedRevision,
  };
}
