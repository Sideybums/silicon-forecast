import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { derivePrivateCandidateQuotedItemRelativeDiagnostic } from "../lib/private-candidate-quoted-item-relative-diagnostic.mjs";
import { renderPrivateCandidateRetailReport } from "../lib/primary-retail-report.mjs";

const root = new URL("../", import.meta.url);
const candidateDir = new URL("../data/observations/candidate/", import.meta.url);
const artifactPath = "data/observations/candidate/uk-primary-retail-2026-08-10T165537Z.v1.json";
const manifestPath = "research/evidence/primary-retail-2026-08-10T165537Z/manifest.json";
const auditPath = "research/audits/uk-primary-retail-run-integration-audit-2026-08-10T165537Z.v1.json";
const currentTranchePattern = /^uk-primary-retail-\d{4}-\d{2}-\d{2}T\d{6}Z\.v1\.json$/u;
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

function collisionRows(tranches) {
  const groups = new Map();
  for (const tranche of tranches) for (const observation of tranche.observations) {
    const date = observation.observed_at.slice(0, 10);
    const key = `${observation.seller.legal_name}\u0000${observation.identity.mpn_observed}\u0000${date}`;
    groups.set(key, [...(groups.get(key) ?? []), observation]);
  }
  return [...groups.entries()].filter(([, rows]) => rows.length > 1).map(([key, rows]) => {
    const [seller_legal_name, mpn, utc_date] = key.split("\u0000");
    return { seller_legal_name, mpn, utc_date, observation_ids: rows.map((row) => row.observation_id).sort(), item_price_amount_minor: rows.map((row) => row.item_price.amount_minor).sort((a, b) => a - b) };
  }).sort((a, b) => `${a.seller_legal_name}\u0000${a.mpn}`.localeCompare(`${b.seller_legal_name}\u0000${b.mpn}`));
}

test("2026-08-10 tranche pins exact live facts, minimal evidence, locks, and tranche-local reporting", async () => {
  const artifact = await readJson(artifactPath);
  const manifest = await readJson(manifestPath);
  assert.equal(artifact.tranche_id, "sf-gb-primary-retail-2026-08-10T165537Z-v1");
  assert.deepEqual(artifact.governance, lockedGovernance);
  assert.deepEqual(artifact.observations.map((observation) => ({
    mpn: observation.identity.mpn_observed,
    price: observation.item_price.amount_minor,
    observed_at: observation.observed_at,
    status: observation.source.supplied_url_status,
    reasons: observation.qualification.reasons,
  })), [
    { mpn: "F5-6000J3636F16GX2-FX5", price: 46999, observed_at: "2026-08-10T16:55:31Z", status: "http_200", reasons: ["delivery_destination_not_fixed"] },
    { mpn: "KF560C30BBEK2-32", price: 60690, observed_at: "2026-08-10T16:55:36Z", status: "http_200", reasons: ["availability_semantics_ambiguous", "delivery_destination_not_fixed"] },
    { mpn: "KF564C32RSK2-32", price: 61566, observed_at: "2026-08-10T16:55:37Z", status: "http_200", reasons: ["availability_semantics_ambiguous", "delivery_destination_not_fixed"] },
  ]);
  assert.equal(sha256(await readBytes(artifactPath)), manifest.observation_artifact.sha256);
  for (const entry of manifest.evidence) {
    assert.equal(sha256(await readBytes(entry.path)), entry.sha256);
    const extract = await readJson(entry.path);
    assert.equal(extract.response_sha256, entry.response_sha256);
    assert.equal(extract.response_bytes, entry.response_bytes);
    assert.equal(extract.response_bytes_retained, false);
  }
  const report = renderPrivateCandidateRetailReport(artifact);
  assert.match(report, /Report coverage: \*\*TRANCHE-LOCAL ONLY\*\* — no global date coverage is claimed/u);
  assert.match(report, /Derived movements: \*\*NONE\*\*/u);
});

test("latest audit discovers every prospective tranche by schema and blocks the retained historical same-date collisions", async () => {
  const audit = await readJson(auditPath);
  const names = (await readdir(candidateDir)).filter((name) => currentTranchePattern.test(name)).sort();
  const paths = names.map((name) => `data/observations/candidate/${name}`);
  assert.deepEqual(audit.audited_tranches.map((entry) => entry.path).sort(), paths);
  for (const entry of audit.audited_tranches) assert.equal(sha256(await readBytes(entry.path)), entry.sha256);
  const tranches = await Promise.all(paths.map(readJson));
  assert.deepEqual(collisionRows(tranches), audit.collisions);
  assert.equal(audit.integration.date_level_diagnostic_integration_allowed, false);
  assert.equal(audit.integration.reason_code, "BLOCKED_DUPLICATE_SELLER_MPN_UTC_DATE");
  assert.deepEqual(audit.governance, lockedGovernance);
  assert.deepEqual(audit.price_comparison.changes.map(({ mpn, delta_amount_minor }) => ({ mpn, delta_amount_minor })), [
    { mpn: "F5-6000J3636F16GX2-FX5", delta_amount_minor: 0 },
    { mpn: "KF560C30BBEK2-32", delta_amount_minor: -454 },
    { mpn: "KF564C32RSK2-32", delta_amount_minor: -460 },
  ]);
  assert.throws(() => derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches), /duplicate observation/u);
});