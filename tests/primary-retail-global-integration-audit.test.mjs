import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { derivePrivateCandidateQuotedItemRelativeDiagnostic } from "../lib/private-candidate-quoted-item-relative-diagnostic.mjs";

const root = new URL("../", import.meta.url);
const candidateDir = new URL("../data/observations/candidate/", import.meta.url);
const auditPath = "research/audits/uk-primary-retail-run-integration-audit-2026-08-10T004629+0100.v1.json";
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
  for (const tranche of tranches) {
    for (const observation of tranche.observations) {
      const date = observation.observed_at.slice(0, 10);
      const key = `${observation.seller.legal_name}\u0000${observation.identity.mpn_observed}\u0000${date}`;
      const rows = groups.get(key) ?? [];
      rows.push(observation);
      groups.set(key, rows);
    }
  }
  return [...groups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => {
      const [seller_legal_name, mpn, utc_date] = key.split("\u0000");
      return {
        seller_legal_name,
        mpn,
        utc_date,
        observation_ids: rows.map((row) => row.observation_id).sort(),
        item_price_amount_minor: rows.map((row) => row.item_price.amount_minor).sort((a, b) => a - b),
      };
    })
    .sort((a, b) => `${a.seller_legal_name}\u0000${a.mpn}`.localeCompare(`${b.seller_legal_name}\u0000${b.mpn}`));
}

test("manual canonical collector output is retained but explicitly blocked from same-date diagnostic integration", async () => {
  const audit = await readJson(auditPath);
  const names = (await readdir(candidateDir)).filter((name) => currentTranchePattern.test(name)).sort();
  const paths = names.map((name) => `data/observations/candidate/${name}`);
  assert.deepEqual(audit.audited_tranches.map((entry) => entry.path).sort(), paths);
  assert.equal(audit.status, "candidate_private_global_integration_blocked");
  assert.deepEqual(audit.governance, lockedGovernance);
  assert.deepEqual(audit.integration, {
    raw_candidate_evidence_retained: true,
    date_level_diagnostic_integration_allowed: false,
    approved_same_date_selection_rule: false,
    approved_intraday_aggregation_rule: false,
    reason_code: "BLOCKED_DUPLICATE_SELLER_MPN_UTC_DATE",
  });

  for (const entry of audit.audited_tranches) {
    assert.equal(sha256(await readBytes(entry.path)), entry.sha256);
  }
  const tranches = await Promise.all(paths.map(readJson));
  assert.deepEqual(collisionRows(tranches), audit.collisions.map((collision) => ({
    ...collision,
    observation_ids: [...collision.observation_ids].sort(),
    item_price_amount_minor: [...collision.item_price_amount_minor].sort((a, b) => a - b),
  })).sort((a, b) => `${a.seller_legal_name}\u0000${a.mpn}`.localeCompare(`${b.seller_legal_name}\u0000${b.mpn}`)));
  assert.deepEqual(audit.price_comparison, { comparable_lines: 3, changed_lines: 0, unchanged_lines: 3 });

  assert.throws(
    () => derivePrivateCandidateQuotedItemRelativeDiagnostic(tranches),
    /duplicate observation for seller legal entity .* on 2026-08-09 requires an approved same-line\/same-date selection rule/u,
  );
});
