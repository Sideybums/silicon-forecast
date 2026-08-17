import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const codepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function discoverProspectiveTranches(root) {
  const dir = new URL("data/observations/candidate/", root);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const bytes = readFileSync(new URL(name, dir));
      return { path: `data/observations/candidate/${name}`, bytes, tranche: JSON.parse(bytes) };
    })
    .filter(({ tranche }) => tranche.schema_version === 1 && tranche.scope === "candidate_only" && tranche.channel === "PRIMARY_RETAIL")
    .sort((a, b) => codepoint(a.tranche.created_at, b.tranche.created_at) || codepoint(a.path, b.path));
}

const sellerIdentity = (seller) => ({
  key: seller.legal_name ?? seller.display_name,
  basis: seller.legal_name ? "legal_name" : "display_name_legal_entity_unresolved",
});

export function buildGlobalIntegrationAudit(entries, createdAt) {
  const stamp = createdAt.replace(/[-:]/gu, "");
  const groups = new Map();
  for (const { path, tranche } of entries) {
    for (const observation of tranche.observations) {
      const identity = sellerIdentity(observation.seller);
      const mpn = observation.identity?.mpn_observed ?? observation.product?.mpn ?? null;
      if (!identity.key || !mpn) throw new Error(`unreadable seller or MPN in ${path}`);
      const key = [identity.key, mpn, observation.observed_at.slice(0, 10)].join("\0");
      groups.set(key, [...(groups.get(key) ?? []), { path, observation_id: observation.observation_id, basis: identity.basis }]);
    }
  }
  const collisions = [...groups.entries()].filter(([, rows]) => rows.length > 1).map(([key, rows]) => {
    const [seller, mpn, utc_date] = key.split("\0");
    return {
      seller,
      seller_identity_basis: rows[0].basis,
      mpn,
      utc_date,
      observation_count: rows.length,
      observation_ids: rows.map((row) => row.observation_id).sort(codepoint),
      tranches: [...new Set(rows.map((row) => row.path))].sort(codepoint),
    };
  }).sort((a, b) => codepoint(`${a.utc_date}${a.seller}${a.mpn}`, `${b.utc_date}${b.seller}${b.mpn}`));
  const unresolved = entries.flatMap(({ tranche }) => tranche.observations.filter((o) => !o.seller?.legal_name).map((o) => o.seller.display_name));
  return {
    schema_version: 1,
    audit_id: `sf-uk-primary-retail-global-integration-audit-${stamp}-v1`,
    status: "candidate_private_immutable",
    created_at: createdAt,
    scope: "Every prospective PRIMARY_RETAIL candidate tranche in the repository at the time of writing. Historical backfill tranches are excluded because their timestamp semantics differ.",
    selection: { historical_backfill_explicitly_excluded: true, discovered_by: "parsed schema, not filename" },
    audited_tranches: entries.map(({ path, bytes, tranche }) => ({ path, sha256: sha256(bytes), created_at: tranche.created_at, observation_count: tranche.observations.length, collector_version: tranche.collector_version ?? null })),
    collision_rule: "A collision is the same seller and exact MPN observed more than once on the same UTC date. Legal entity is used where established; otherwise the observed display name is retained.",
    collisions,
    seller_identity_unresolved: [...new Set(unresolved)].sort(codepoint),
    integration: {
      date_level_diagnostic_integration_allowed: collisions.length === 0,
      reason_code: collisions.length ? "BLOCKED_DUPLICATE_SELLER_MPN_UTC_DATE" : "NO_COLLISIONS_DETECTED",
      detail: collisions.length ? "At least one seller and exact MPN pair occurs more than once on a UTC date. No intraday rule is approved, so date-level derivation remains blocked." : "No duplicate seller and exact MPN pairs share a UTC date.",
    },
    governance: { production_import_allowed: false, production_activation_allowed: false, index_eligibility: false, methodology_approval: false, publication_allowed: false },
  };
}

export function writeGlobalIntegrationAudit(root, audit) {
  const stamp = audit.created_at.replace(/[-:]/gu, "");
  const relativePath = `research/audits/uk-primary-retail-global-integration-audit-${stamp}.v1.json`;
  mkdirSync(new URL("research/audits/", root), { recursive: true });
  writeFileSync(new URL(relativePath, root), `${JSON.stringify(audit, null, 2)}\n`, { flag: "wx" });
  return relativePath;
}
