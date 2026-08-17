import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

export const CANDIDATE_INPUT_MANIFEST = "data/derived/private-candidate/ram-input-manifest.v1.json";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const codepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const GOVERNANCE_KEYS = ["basket_approved", "historical_reference_approved", "methodology_approved", "publication_approved", "source_approved"];

export function loadCandidateInputManifest(root) {
  const manifest = JSON.parse(readFileSync(new URL(CANDIDATE_INPUT_MANIFEST, root), "utf8"));
  if (manifest.schema_version !== 1 || manifest.artifact_status !== "private_candidate" || manifest.publication_eligible !== false) {
    throw new Error("candidate input manifest must be an explicitly publication-ineligible private candidate");
  }
  const approvals = manifest.governance;
  if (!approvals || typeof approvals !== "object" || Array.isArray(approvals)) {
    throw new Error("candidate input manifest must carry explicit governance locks");
  }
  const governanceKeys = Object.keys(approvals).sort(codepoint);
  if (JSON.stringify(governanceKeys) !== JSON.stringify(GOVERNANCE_KEYS) || GOVERNANCE_KEYS.some((key) => approvals[key] !== false)) {
    throw new Error("candidate input manifest must carry the exact false governance locks");
  }
  if (!Array.isArray(manifest.entries) || !manifest.entries.length) throw new Error("candidate input manifest has no entries");

  const candidateDir = new URL("data/observations/candidate/", root);
  const discovered = readdirSync(candidateDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => `data/observations/candidate/${name}`)
    .sort(codepoint);
  const classified = manifest.entries.map((entry) => entry.path).sort(codepoint);
  if (new Set(classified).size !== classified.length || JSON.stringify(classified) !== JSON.stringify(discovered)) {
    throw new Error("candidate input manifest must classify every candidate observation JSON exactly once");
  }

  for (const entry of manifest.entries) {
    if (!["included_private_candidate", "excluded_private_candidate"].includes(entry.decision)) {
      throw new Error(`invalid candidate input decision for ${entry.path}`);
    }
    if (typeof entry.reason !== "string" || !entry.reason.trim()) throw new Error(`missing classification reason for ${entry.path}`);
    if (!/^[a-f0-9]{64}$/u.test(entry.sha256)) throw new Error(`invalid sha256 for ${entry.path}`);
    const bytes = readFileSync(new URL(entry.path, root));
    if (sha256(bytes) !== entry.sha256) throw new Error(`candidate input hash mismatch for ${entry.path}`);
    if (entry.decision === "included_private_candidate") {
      const tranche = JSON.parse(bytes);
      if (entry.schema_version !== tranche.schema_version) throw new Error(`schema version mismatch for ${entry.path}`);
      const expectedCaptureKind = tranche.scope === "candidate_only_historical_backfill"
        ? "archive_capture"
        : tranche.scope === "candidate_only"
          ? "prospective_capture"
          : null;
      if (!expectedCaptureKind || entry.capture_kind !== expectedCaptureKind) {
        throw new Error(`capture kind mismatch for ${entry.path}`);
      }
      const sourceClasses = (tranche.observations ?? []).map((observation) => observation?.source?.source_class);
      const allArchivedPrimaryRetail = sourceClasses.length > 0 && sourceClasses.every((value) => value === "archived_primary_retail_storefront");
      const allClassifiedArchive = sourceClasses.length > 0 && sourceClasses.every((value) => typeof value === "string" && value.startsWith("archived_"));
      const expectedChannel = tranche.channel ?? (
        allArchivedPrimaryRetail
          ? "PRIMARY_RETAIL"
          : tranche.scope === "candidate_only_historical_backfill" && allClassifiedArchive
            ? "MIXED_ARCHIVE_STOREFRONT"
            : null
      );
      if (!expectedChannel || entry.channel !== expectedChannel) throw new Error(`channel mismatch for ${entry.path}`);
    }
  }
  return manifest;
}

export function includedCandidateInputs(root) {
  return loadCandidateInputManifest(root).entries
    .filter((entry) => entry.decision === "included_private_candidate")
    .map((entry) => ({ file: entry.path.replace("data/observations/candidate/", ""), captureKind: entry.capture_kind }));
}

export function appendExcludedProspectiveCandidate(root, candidatePath) {
  if (!/^data\/observations\/candidate\/uk-primary-retail-[0-9TZ]+\.v1\.json$/u.test(candidatePath)) {
    throw new Error("prospective candidate path is not canonical");
  }
  const manifestUrl = new URL(CANDIDATE_INPUT_MANIFEST, root);
  const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));
  if (manifest.entries.some((entry) => entry.path === candidatePath)) {
    throw new Error(`candidate input is already classified: ${candidatePath}`);
  }
  const bytes = readFileSync(new URL(candidatePath, root));
  const tranche = JSON.parse(bytes);
  if (
    tranche.schema_version !== 1
    || tranche.status !== "candidate_private_immutable"
    || tranche.scope !== "candidate_only"
    || tranche.channel !== "PRIMARY_RETAIL"
  ) {
    throw new Error("prospective candidate cannot be classified automatically");
  }
  manifest.entries.push({
    path: candidatePath,
    sha256: sha256(bytes),
    schema_version: tranche.schema_version,
    channel: tranche.channel,
    capture_kind: "prospective_capture",
    decision: "excluded_private_candidate",
    reason: "Retained candidate evidence not included in this frozen calculation revision pending explicit governance review and revisioning.",
  });
  manifest.entries.sort((a, b) => codepoint(a.path, b.path));
  writeFileSync(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
  return loadCandidateInputManifest(root).entries.find((entry) => entry.path === candidatePath);
}
