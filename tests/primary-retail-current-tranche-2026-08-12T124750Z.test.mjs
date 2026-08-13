import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { derivePrivateCandidateQuotedItemRelativeDiagnostic } from "../lib/private-candidate-quoted-item-relative-diagnostic.mjs";
import { renderPrivateCandidateRetailReport } from "../lib/primary-retail-report.mjs";

const root = new URL("../", import.meta.url);
const candidateDir = new URL("../data/observations/candidate/", import.meta.url);
const artifactPath = "data/observations/candidate/uk-primary-retail-2026-08-12T124750Z.prospective.v1.json";
const manifestPath = "research/evidence/primary-retail-2026-08-12T124750Z/manifest.json";
const auditPath = "research/audits/uk-primary-retail-run-integration-audit-2026-08-12T124750Z.v1.json";
const readBytes = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const lockedGovernance = {
  production_import_allowed: false,
  production_activation_allowed: false,
  index_eligibility: false,
  methodology_approval: false,
  publication_allowed: false,
};

async function prospectiveTranches() {
  const entries = [];
  for (const name of await readdir(candidateDir)) {
    if (!name.endsWith(".json")) continue;
    const path = `data/observations/candidate/${name}`;
    const bytes = await readBytes(path);
    const tranche = JSON.parse(bytes);
    if (tranche.schema_version === 1 && tranche.scope === "candidate_only" && tranche.channel === "PRIMARY_RETAIL") {
      entries.push({ path, bytes, tranche });
    }
  }
  return entries.sort((a, b) => a.tranche.created_at.localeCompare(b.tranche.created_at));
}

function collisions(entries) {
  const groups = new Map();
  for (const { tranche } of entries) for (const observation of tranche.observations) {
    const key = `${observation.seller.legal_name}\u0000${observation.identity.mpn_observed}\u0000${observation.observed_at.slice(0, 10)}`;
    groups.set(key, [...(groups.get(key) ?? []), observation]);
  }
  return [...groups.entries()].filter(([, rows]) => rows.length > 1).map(([key, rows]) => {
    const [seller_legal_name, mpn, utc_date] = key.split("\u0000");
    return {
      seller_legal_name,
      mpn,
      utc_date,
      observation_ids: rows.map((row) => row.observation_id).sort(),
      item_price_amount_minor: rows.map((row) => row.item_price.amount_minor).sort((a, b) => a - b),
    };
  }).sort((a, b) => `${a.seller_legal_name}\u0000${a.mpn}`.localeCompare(`${b.seller_legal_name}\u0000${b.mpn}`));
}

test("2026-08-12 capture binds unchanged live facts, evidence, locks, and tranche-local reporting", async () => {
  const artifact = await readJson(artifactPath);
  const manifest = await readJson(manifestPath);
  assert.equal(artifact.tranche_id, "sf-gb-primary-retail-2026-08-12T124750Z-v1");
  assert.deepEqual(artifact.governance, lockedGovernance);
  assert.deepEqual(artifact.observations.map((observation) => ({
    mpn: observation.identity.mpn_observed,
    price: observation.item_price.amount_minor,
    status: observation.source.supplied_url_status,
    reasons: observation.qualification.reasons,
  })), [
    { mpn: "F5-6000J3636F16GX2-FX5", price: 46999, status: "http_200", reasons: ["delivery_destination_not_fixed"] },
    { mpn: "KF560C30BBEK2-32", price: 60690, status: "http_200", reasons: ["availability_semantics_ambiguous", "delivery_destination_not_fixed"] },
    { mpn: "KF564C32RSK2-32", price: 61566, status: "http_200", reasons: ["availability_semantics_ambiguous", "delivery_destination_not_fixed"] },
  ]);
  assert.equal(sha256(await readBytes(artifactPath)), manifest.observation_artifact.sha256);
  assert.deepEqual(manifest.governance, lockedGovernance);
  for (const entry of manifest.evidence) {
    assert.equal(sha256(await readBytes(entry.path)), entry.sha256);
    const extract = await readJson(entry.path);
    assert.equal(extract.response_sha256, entry.response_sha256);
    assert.equal(extract.response_bytes, entry.response_bytes);
    assert.equal(extract.response_bytes_retained, false);
  }
  const report = renderPrivateCandidateRetailReport(artifact);
  assert.match(report, /Report coverage: \*\*TRANCHE-LOCAL ONLY\*\* .*no global date coverage is claimed/u);
  assert.match(report, /Derived movements: \*\*NONE\*\*/u);
});

test("2026-08-12 audit discovers all prospective tranches by parsed schema and keeps global collisions blocked", async () => {
  const entries = await prospectiveTranches();
  const audit = await readJson(auditPath);
  // This is a run audit: a point-in-time record of what existed when the
  // 2026-08-12T124750Z run happened. It is therefore checked against its own
  // scope, not against the live filesystem, which keeps growing. Checking it
  // against every tranche present today would fail for reasons that have
  // nothing to do with the run it audited. Coverage of the current set is
  // asserted separately, against the global integration audit.
  const audited = audit.audited_tranches.map((entry) => entry.path);
  assert.equal(audited.length, 4);
  assert.equal(audit.selection.historical_backfill_explicitly_excluded, true);
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));
  for (const entry of audit.audited_tranches) {
    const current = byPath.get(entry.path);
    assert.ok(current, `audited tranche is missing from the repository: ${entry.path}`);
    assert.equal(sha256(current.bytes), entry.sha256, `audited tranche changed after the fact: ${entry.path}`);
  }
  assert.deepEqual(collisions(entries.filter((entry) => audited.includes(entry.path))), audit.collisions);
  assert.equal(audit.integration.date_level_diagnostic_integration_allowed, false);
  assert.equal(audit.integration.reason_code, "BLOCKED_DUPLICATE_SELLER_MPN_UTC_DATE");
  assert.deepEqual(audit.governance, lockedGovernance);
  assert.equal(audit.report_boundary.candidate_report_scope, "tranche_local");
  assert.equal(audit.report_boundary.global_date_coverage_claimed, false);
  assert.deepEqual(audit.price_comparison.changes.map(({ mpn, delta_amount_minor }) => ({ mpn, delta_amount_minor })), [
    { mpn: "F5-6000J3636F16GX2-FX5", delta_amount_minor: 0 },
    { mpn: "KF560C30BBEK2-32", delta_amount_minor: 0 },
    { mpn: "KF564C32RSK2-32", delta_amount_minor: 0 },
  ]);
  assert.throws(
    () =>
      derivePrivateCandidateQuotedItemRelativeDiagnostic(
        entries.filter((entry) => audited.includes(entry.path)).map(({ tranche }) => tranche),
      ),
    /duplicate observation/u,
  );
});
