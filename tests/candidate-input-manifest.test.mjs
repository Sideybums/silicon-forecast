import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { appendExcludedProspectiveCandidate, loadCandidateInputManifest } from "../lib/candidate-input-manifest.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("the private candidate manifest classifies every candidate observation exactly once", () => {
  const root = new URL("../", import.meta.url);
  const manifest = loadCandidateInputManifest(root);
  assert.equal(manifest.entries.length, 18);
  assert.equal(manifest.publication_eligible, false);
  assert.ok(manifest.entries.every((entry) => entry.reason.length > 20));
});

test("an unclassified candidate file or byte drift fails closed", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sf-input-manifest-"));
  try {
    const candidateDir = path.join(dir, "data/observations/candidate");
    const manifestDir = path.join(dir, "data/derived/private-candidate");
    mkdirSync(candidateDir, { recursive: true });
    mkdirSync(manifestDir, { recursive: true });
    const bytes = Buffer.from('{"schema_version":1,"status":"candidate_private_immutable","scope":"candidate_only","channel":"PRIMARY_RETAIL","observations":[]}\n');
    writeFileSync(path.join(candidateDir, "one.json"), bytes);
    const manifest = {
      schema_version: 1,
      artifact_status: "private_candidate",
      publication_eligible: false,
      entries: [{
        path: "data/observations/candidate/one.json",
        sha256: sha256(bytes),
        schema_version: 1,
        channel: "PRIMARY_RETAIL",
        capture_kind: "prospective_capture",
        decision: "included_private_candidate",
        reason: "Synthetic classified input for a fail-closed unit test.",
      }],
      governance: { source_approved: false, methodology_approved: false, basket_approved: false, historical_reference_approved: false, publication_approved: false },
    };
    writeFileSync(path.join(manifestDir, "ram-input-manifest.v1.json"), `${JSON.stringify(manifest)}\n`);
    const root = pathToFileURL(`${dir}/`);
    assert.doesNotThrow(() => loadCandidateInputManifest(root));
    const wrongKind = structuredClone(manifest);
    wrongKind.entries[0].capture_kind = "archive_capture";
    writeFileSync(path.join(manifestDir, "ram-input-manifest.v1.json"), `${JSON.stringify(wrongKind)}\n`);
    assert.throws(() => loadCandidateInputManifest(root), /capture kind mismatch/u);
    const wrongChannel = structuredClone(manifest);
    wrongChannel.entries[0].channel = "BOGUS";
    writeFileSync(path.join(manifestDir, "ram-input-manifest.v1.json"), `${JSON.stringify(wrongChannel)}\n`);
    assert.throws(() => loadCandidateInputManifest(root), /channel mismatch/u);
    writeFileSync(path.join(manifestDir, "ram-input-manifest.v1.json"), `${JSON.stringify(manifest)}\n`);
    const missingGovernance = { ...manifest };
    delete missingGovernance.governance;
    writeFileSync(path.join(manifestDir, "ram-input-manifest.v1.json"), `${JSON.stringify(missingGovernance)}\n`);
    assert.throws(() => loadCandidateInputManifest(root), /explicit governance locks/u);
    writeFileSync(path.join(manifestDir, "ram-input-manifest.v1.json"), `${JSON.stringify(manifest)}\n`);
    writeFileSync(path.join(candidateDir, "two.json"), bytes);
    assert.throws(() => loadCandidateInputManifest(root), /classify every candidate observation/u);
    rmSync(path.join(candidateDir, "two.json"));
    const canonicalTwo = "data/observations/candidate/uk-primary-retail-20260817T103006Z.v1.json";
    writeFileSync(path.join(candidateDir, "uk-primary-retail-20260817T103006Z.v1.json"), bytes);
    const appended = appendExcludedProspectiveCandidate(root, canonicalTwo);
    assert.equal(appended.decision, "excluded_private_candidate");
    assert.doesNotThrow(() => loadCandidateInputManifest(root));
    writeFileSync(path.join(candidateDir, "one.json"), `${bytes.toString()} `);
    assert.throws(() => loadCandidateInputManifest(root), /hash mismatch/u);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
