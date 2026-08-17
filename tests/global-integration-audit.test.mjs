import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { buildGlobalIntegrationAudit, discoverProspectiveTranches } from "../lib/global-integration-audit.mjs";

const repo = new URL("../", import.meta.url);
const candidateDir = new URL("data/observations/candidate/", repo);
const auditDir = new URL("research/audits/", repo);
const auditPaths = readdirSync(auditDir)
  .filter((name) => /^uk-primary-retail-global-integration-audit-.+\.v1\.json$/u.test(name))
  .map((name) => `research/audits/${name}`);
const audits = auditPaths.map((path) => ({ path, value: JSON.parse(readFileSync(new URL(path, repo), "utf8")) }));
audits.sort((a, b) => a.value.created_at.localeCompare(b.value.created_at) || a.path.localeCompare(b.path));
const audit = audits.at(-1).value;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("the latest global audit is the complete canonical builder output", () => {
  assert.deepEqual(audit, buildGlobalIntegrationAudit(discoverProspectiveTranches(repo), audit.created_at));
});

function prospectiveTranches() {
  const entries = [];
  for (const name of readdirSync(candidateDir).sort()) {
    if (!name.endsWith(".json")) continue;
    const bytes = readFileSync(new URL(name, candidateDir));
    const tranche = JSON.parse(bytes);
    if (tranche.schema_version === 1 && tranche.scope === "candidate_only" && tranche.channel === "PRIMARY_RETAIL") {
      entries.push({ path: `data/observations/candidate/${name}`, bytes, tranche });
    }
  }
  return entries.sort((a, b) => a.tranche.created_at.localeCompare(b.tranche.created_at));
}

test("the global audit covers every prospective tranche present, byte for byte", () => {
  // This is the assertion that must track the live repository: a prospective
  // tranche that no audit covers is exactly the blind spot this exists to stop.
  const entries = prospectiveTranches();
  assert.deepEqual(
    audit.audited_tranches.map((e) => e.path),
    entries.map((e) => e.path),
    "a prospective tranche exists that the global audit does not cover",
  );
  for (const [i, e] of audit.audited_tranches.entries()) {
    assert.equal(sha256(entries[i].bytes), e.sha256, `tranche changed after being audited: ${e.path}`);
  }
});

test("historical global audits remain valid snapshots of their declared bytes", () => {
  for (const { value: snapshot } of audits) {
    for (const entry of snapshot.audited_tranches) {
      assert.equal(sha256(readFileSync(new URL(entry.path, repo))), entry.sha256, `historical audit hash drift: ${entry.path}`);
    }
  }
});

test("every prospective observation is readable by the audit's own key", () => {
  // Collector v1 emitted a shape whose MPN and seller the collision detector
  // could not read, so its rows keyed as (null, undefined) and 21 distinct
  // products were reported as one duplicate. Nothing may key as null again.
  for (const { path, tranche } of prospectiveTranches()) {
    for (const o of tranche.observations) {
      const mpn = o.identity?.mpn_observed ?? o.product?.mpn ?? null;
      assert.ok(mpn, `observation has no readable MPN: ${o.observation_id} in ${path}`);
      assert.ok(
        o.seller?.legal_name ?? o.seller?.display_name,
        `observation has no readable seller: ${o.observation_id} in ${path}`,
      );
    }
  }
});

test("distinct retailers with unresolved legal entities are not merged", () => {
  // Falling back to the display name is what stops several null-entity
  // retailers collapsing into a single seller and colliding with each other.
  for (const c of audit.collisions) {
    assert.ok(c.seller, "a collision must name the seller it belongs to");
    assert.notEqual(c.seller, "null");
    assert.ok(["legal_name", "display_name_legal_entity_unresolved"].includes(c.seller_identity_basis));
  }
  const sellersInCollisions = new Set(audit.collisions.map((c) => c.seller));
  assert.ok(!sellersInCollisions.has(undefined));
});

test("same-date duplicates keep date-level integration blocked", () => {
  assert.equal(audit.collisions.length > 0, true, "2026-08-12 has known overlapping runs");
  assert.equal(audit.integration.date_level_diagnostic_integration_allowed, false);
  assert.equal(audit.integration.reason_code, "BLOCKED_DUPLICATE_SELLER_MPN_UTC_DATE");
  // Every reported collision must genuinely be more than one observation.
  for (const c of audit.collisions) {
    assert.ok(c.observation_count > 1, `collision with ${c.observation_count} observations is not a collision`);
    assert.equal(c.observation_ids.length, c.observation_count);
    assert.equal(new Set(c.observation_ids).size, c.observation_ids.length, "collision lists an observation twice");
  }
});

test("the audit approves nothing", () => {
  assert.deepEqual(audit.governance, {
    production_import_allowed: false,
    production_activation_allowed: false,
    index_eligibility: false,
    methodology_approval: false,
    publication_allowed: false,
  });
  assert.equal(audit.selection.historical_backfill_explicitly_excluded, true);
});
