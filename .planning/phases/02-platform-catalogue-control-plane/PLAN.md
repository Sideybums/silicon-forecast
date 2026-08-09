# Phase 2 — Platform, Catalogue and Control Plane: Foundation Slice

## Status

Foundation and candidate-catalogue slices implemented while Phase 1 access decisions remain pending. Twelve additional exact-MPN records exist across two candidate fixtures, bringing the monitored-universe control-plane pilot to 16 products and seven manufacturers. An additive selected-product review now gives Corsair and Patriot fixture-only reviewed status, leaving the eight-product expansion and two ADATA records pending; Lexar is a documented normal-access evidence abstention rather than an active completion blocker. The total remains a research pilot rather than a target market universe or proven resilient basket. This work does not activate a production region, source, methodology, worker, database-backed public page or editorial collector.

## Objective

Create the smallest reproducible PostgreSQL foundation needed for later catalogue, ingestion and private-control-plane work, while preserving every current project lock.

## Authority boundary

- `.planning/ROADMAP.md` remains authoritative.
- Phase 1 is still blocked on approved source breadth, feed validation and methodology approval.
- The public static site remains disconnected from this database.
- Only fixture/candidate records may be created.
- News/event work is limited to the dormant design contract in `docs/EDITORIAL-INTELLIGENCE-DESIGN.md`.

## Deliverables in this slice

1. A version-controlled PostgreSQL migration creating:
   - principals and attributable audit records;
   - append-only approval and governance-lock history;
   - candidate region, retailer and source registries;
   - append-only source-policy and methodology revisions;
   - canonical DDR5 product and identifier records;
   - disabled, Tier 1–2 worker definitions.
2. Seed state containing:
   - GB as candidate-only, non-public and unsupported;
   - methodology `SF-GB-DDR5-32-UDIMM-OFFER` v0.1 as `draft_locked`;
   - external publish, spend, production mutation, methodology change, source approval, production activation and editorial activation locks all locked.
3. A disposable PostgreSQL 16 integration test that runs the migration against a fresh database and proves the main fail-closed constraints.
4. A dormant editorial intelligence design contract for later milestone planning.
5. A candidate 32GB DDR5 seed catalogue containing four exact-MPN products, four minimal factual evidence extracts with SHA-256 manifests, 20 labelled matching examples and deterministic SQL rendering into the disposable PostgreSQL test environment.

6. A least-privilege additive review migration and deterministic renderer that apply the approved fixture review as superseding reviewed revisions, one approval/application record and attributable audit events without mutating draft history or weakening locks.
7. A fixture-only resilience pilot that keeps 16 monitored products distinct from reviewed, baseline/reserve and basket states; validates synthetic effective-dated lifecycle transitions; renders deterministic manufacturer, family, speed and missing-target coverage; and binds canonical status to each exact catalogue content SHA-256 plus the exact approval artefact checksum for reviewed state, without claiming empirical lifecycle or methodology approval.
8. A separate four-product Corsair/ADATA/Patriot diversification candidate tranche with independently retained first-party extracts, checksum-pinned evidence, explicit ADATA packaging inference caveats and runtime cross-tranche/provenance validation. An additive checksum-bound selection review approves Corsair and Patriot for fixture use only, holds both ADATA records pending stronger literal kit evidence and records Lexar as a normal-access evidence abstention. All remain ineligible for baseline, reserve or basket use.

## Explicitly excluded

- Production credentials and source adapters.
- Live retailer/news collection.
- Public database-backed prices, events, analysis, forecasts or recommendations.
- Worker scheduling or execution.
- Methodology threshold approval.
- Managed authentication and MFA integration.
- A claim that Phase 2 or any Phase 1 gate is complete.

## Verification

- Fresh PostgreSQL 16 applies the migration successfully.
- Seven seeded governance locks resolve to `locked` (external publish, spend, production mutation, methodology change, source approval, production activation and editorial activation).
- GB cannot become public in candidate state.
- Draft methodology remains inactive and unapproved.
- Append-only records reject update and delete.
- Invalid DDR5 catalogue identities fail database constraints.
- Enabled or Tier 3+ workers fail database constraints.
- A source cannot be marked production-approved without verified rights, available technical access and a named review.
- Existing lint, unit tests and static production build remain green.
- Candidate catalogue source records remain `draft`; the human fixture-use approval is a separate attributable, additive decision and cannot unlock production.
- Every retained catalogue evidence artefact matches its recorded byte count and SHA-256 checksum.
- All labelled matching examples keep auto-confirmation locked and separate identity from index eligibility.
- The additive review record must cover all four product keys and all 20 listing-example IDs exactly.

The disposable database test deliberately applies the migration as the PostgreSQL superuser so it can create `pgcrypto`, the schema and baseline privileges. Production migrator ownership and least-privilege runtime roles are later Phase 2 deliverables; this test does not claim to validate them.

## Later Phase 2 work

- Managed MFA-capable authentication and role enforcement.
- Narrow security-definer mutation functions and runtime database roles.
- Production binding between authenticated human identities and the catalogue-review database role.
- Broader manufacturer coverage where exact first-party evidence can be retained without bypassing access controls; Lexar is the remaining named first-party gap after the Corsair/ADATA/Patriot tranche.
- Empirical effective-dated lifecycle decisions backed by retained first-party or approved-source evidence; the current lifecycle fixture is synthetic control-plane coverage only.
- Reserve readiness and basket-vintage assignments after approved-source history exists; automatic promotion and basket mutation remain locked.
- Additive EOL/successor proposals and fixtures with no automatic basket mutation or successor inheritance.
- Manufacturer/family coverage reporting and candidate-pool diversification beyond the current seven-manufacturer, 16-product pilot.
- Full audit coverage for administrative commands.
- Threat-model exercises for untrusted source content.
