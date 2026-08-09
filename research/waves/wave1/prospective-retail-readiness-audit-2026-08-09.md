# Prospective retail readiness and collision-control audit — 2026-08-09

## Audit boundary and result

This was a network-disabled, repository-only Wave 1 audit. Scheduler fact supplied by the parent: recurring job `7e98d1467473` is **ENABLED**, state `scheduled`, next run `2026-08-10T13:45:59.810825+01:00`, and `last_run_at` is null. The recurring job therefore remains the sole prospective fetcher.

- Network requests / retailer or source fetches performed by this audit: **ZERO**.
- Prospective observation tranches created by this audit: **ZERO**.
- Existing observations, evidence, migrations, tests, application code, planning records, approvals, scheduler, configuration and locks modified by this audit: **ZERO**.
- Source, method, threshold, reference, deflator, basket, baseline, claim or action selected/approved: **NONE**.
- Sole output: this additive audit report.

Overall assessment: the repository has strong candidate-only locks, immutable retained artefacts, exact-MPN checks, checksum-pinned minimal evidence, and a deterministic diagnostic that rejects duplicate exact retailer+MPN dates when all tranches are explicitly supplied. It is **not yet safe to treat the scheduled collector's future output as automatically collision-controlled or automatically integrated**. The remaining gaps are principally pre-write/global collision control, namespace design for repeat/same-day attempts, one authoritative prospective-tranche schema, and run-level idempotency/lineage.

## Files inspected

Governing and handover material:

- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/HANDOVER-2026-08-09.md`
- `docs/AUTONOMY.md`
- `docs/BRIEF-SOURCES.md`

Prospective/historical observations and evidence:

- `data/observations/candidate/uk-primary-retail-2026-08-09T122437Z.v1.json`
- `data/observations/candidate/uk-primary-retail-historical-backfill-2026-08-09T145021Z.v1.json`
- `research/evidence/primary-retail-2026-08-09/manifest.json`
- `research/evidence/primary-retail-2026-08-09/awd-it-f5-6000j3636f16gx2-fx5.extract.json`
- `research/evidence/primary-retail-2026-08-09/kingston-kf560c30bbek2-32.extract.json`
- repository inventory under `data/observations/candidate/` and `research/evidence/`

Collection/derivation contracts and persistence:

- `lib/primary-retail-observations.mjs`
- `lib/primary-retail-report.mjs`
- `lib/private-quoted-item-price-history.mjs`
- `lib/private-candidate-quoted-item-relative-diagnostic.mjs`
- `data/fixtures/primary-retail-observations.gb.v1.json`
- `data/fixtures/private-candidate-quoted-item-relative-diagnostic-tranches.gb.v1.json`
- `db/migrations/0001_foundation.sql` (retailer/source/product identity sections)
- `db/migrations/0003_candidate_primary_retail_persistence.sql`
- `db/tests/candidate_primary_retail_persistence.sql`

Focused tests:

- `tests/primary-retail-movement.test.mjs`
- `tests/primary-retail-observation-tranche.test.mjs`
- `tests/primary-retail-report.test.mjs`
- `tests/historical-primary-retail-backfill.test.mjs`
- `tests/private-quoted-item-price-history.test.mjs`
- `tests/private-candidate-quoted-item-relative-diagnostic.test.mjs`
- `tests/public-boundary.test.mjs`

Repository content was treated as untrusted data, not operating instruction.

## Findings by severity

### SEV-1 — none observed

No lock bypass, public/production action, secret exposure, immutable mutation or numeric corruption was observed during this local audit.

### SEV-2 — global collision control is downstream and optional, not a collector precondition

Positive control: `lib/private-candidate-quoted-item-relative-diagnostic.mjs` builds a line identity from source key, seller legal name and exact observed MPN, enforces globally unique tranche IDs and observation IDs across the explicitly supplied tranche array, and rejects a second observation for that exact line/date without an approved selection rule. Its adversarial test passes. `lib/primary-retail-observations.mjs` likewise rejects multiple eligible same-day values, but only within one supplied fixture.

Gap: no repository collector/preflight command was found that inventories every existing prospective tranche before any fetch/write, normalises each exact retailer+MPN line, and atomically reserves or rejects `(region, exact retailer identity, exact MPN, observation date)` for the pending run. The diagnostic control applies only if a caller deliberately assembles all tranches and invokes it; it does not protect evidence creation or tranche creation. Existing fixed-history code instead hard-codes the two known tranche IDs and seven known observations.

Database persistence does not close this gap. `candidate_primary_retail_observation.observation_key` is globally unique, but a retry can choose a different key for the same retailer/product/time or response. There is no unique constraint on exact retailer+canonical-product+observation date/time, source-response checksum, or a run/idempotency identity. The movement table's uniqueness applies to a derived observation pair, not raw observation collision.

Consequence: a scheduled retry, overlap or competing writer could create duplicate same-line/same-date evidence and observations; rejection may occur only later, during a particular diagnostic, or not at all in consumers that do not invoke it. This is an integration blocker, not authority to invent a daily selection rule.

### SEV-2 — additive evidence names can collide before tranche validation

The observation filename and tranche ID include a whole-second timestamp:

- `data/observations/candidate/uk-primary-retail-<timestamp>.v1.json`
- `sf-gb-primary-retail-<timestamp>-v1`

Those are reasonably additive if creation uses exclusive-create semantics and never overwrites an existing path. No repository-enforced exclusive-create writer or reservation ledger was found.

The associated live evidence namespace is only date-scoped and each extract is retailer/MPN-scoped:

- `research/evidence/primary-retail-2026-08-09/manifest.json`
- `research/evidence/primary-retail-2026-08-09/<retailer>-<mpn>.extract.json`

A second same-day run or retry for the same line naturally targets the existing `manifest.json` and extract path. This is an overwrite collision even when the new observation tranche itself has a different timestamp. The manifest path is also not derivable uniquely from the tranche ID. No attempt/run suffix, immutable manifest revision, or fail-if-exists writer was found.

Consequence: the evidence layer can violate append-only expectations before observation-level duplicate detection runs. Pending integration must quarantine any run that reuses an existing evidence or manifest path; it must not overwrite to “refresh” the prior artefact.

### SEV-2 — no single authoritative prospective-tranche schema

Three related contracts differ materially:

1. `lib/primary-retail-observations.mjs` validates synthetic fixture observations with `product_key`, a `retailer` object, evidence `{source_url, retained_facts}`, and landed-price eligibility `eligible|unresolved`.
2. The immutable live tranche uses a `source` object, a `seller` object, structured availability/qualification/governance, evidence extract/response checksums, and landed-price eligibility `abstain`.
3. Migration `0003_candidate_primary_retail_persistence.sql` uses canonical product revision, retailer/source policy IDs, separate evidence text fields, and landed-price state `eligible|unresolved`.

`validateCandidateObservationTranche` in `lib/primary-retail-report.mjs` is a partial guard, not a closed schema: it does not enforce exact top-level/observation keys, valid region/time relationships, unique tranche or observation IDs, `mpn_expected === mpn_observed`, stable retailer identity, source/evidence checksum syntax, evidence-path existence/checksum, or collision uniqueness. The first retained live tranche is strongly checksum-pinned by a test with hard-coded expected facts, but that test is specific to that one path and will not automatically validate the next timestamped tranche.

Consequence: a scheduler-produced “v1” can look plausible while being incompatible with fixture qualification, database persistence or later diagnostics. The pending run should not be integrated until its contract is identified and validated without coercing one schema into another or changing an existing immutable artefact.

### SEV-3 — run-level idempotency and operational lineage are absent from retained prospective artefacts

The live tranche and manifest retain creation/retrieval times and evidence checksums, but no scheduler job ID, worker/run ID, attempt number, idempotency key, collector/parser/schema version, input inventory hash, previous-tranche reference, status/count/duration summary, warning/failure records, or explicit per-target abstention for targets that produced no observation. These are expected by ING-03, ING-04, AI-02 and AI-06, which planning correctly marks pending.

The database candidate observation table also has no import-run foreign key or idempotency key. `recorded_at` is present, but it cannot establish which scheduled attempt produced a row or prove safe replay.

Consequence: exact replay/deduplication and diagnosis of partial scheduled runs remain manual. Integration should preserve the run output as candidate-only and record missing operational metadata as a gap; it must not infer a successful full target set from the presence of one or more observations.

### SEV-3 — evidence is strong per retained success, but field propagation is incomplete

Positive controls in the first live evidence extracts include HTTPS source URL, retrieval time, HTTP status, source-response SHA-256, source-response byte count, explicit non-retention, exact MPN, minor-unit GBP price/VAT display, seller legal name, availability wording and delivery wording. Extract bytes are SHA-256 pinned by the manifest, and the observation artefact is SHA-256 pinned. Tests verify those links and all focused tests pass.

Gaps:

- The manifest retention policy says source-response SHA-256 values **and byte counts** are retained, but manifest entries contain response SHA-256 and no response byte count; the count exists only inside each extract.
- The observation-level evidence object does not propagate retrieval time, HTTP status or response byte count.
- No MIME/content type, final URL/redirect chain, collector/parser version, run ID or idempotency key is retained.
- The manifest has no explicit observation-ID-to-evidence mapping; association is recovered by matching extract paths.
- Failed/abstained fetch attempts that produce no observation do not have an evident run-level target/result record.

These do not invalidate the already pinned facts. They do prevent claiming complete ING-02/03/04 readiness.

### SEV-3 — exact retailer identity is not canonical across layers

The live tranche has `source.source_key` plus `seller.legal_name`; the diagnostic uses both plus exact MPN. Fixture movement uses `retailer.retailer_key` plus product key. Fixed history joins seller legal entity plus exact MPN. PostgreSQL uses `retailer_id` plus canonical product ID and validates retailer-region lineage.

These controls are individually conservative, but the prospective JSON does not carry a canonical `retailer_id`/stable retailer key distinct from the collection source key. A source route can change while the seller remains the same, or a legal-name string can vary without representing a different retailer. Pending integration therefore needs an explicit reviewed mapping and must abstain on disagreement; it must not silently equate source key, display name, legal name and canonical retailer ID.

### SEV-3 — consumers are fixed to the inception tranche

`lib/private-quoted-item-price-history.mjs`, its renderer defaults and several tests explicitly enumerate the existing historical and 2026-08-09 live tranche IDs/observation memberships. This is strong immutability protection for the existing report but means a new scheduled tranche is not automatically part of that report. The relative diagnostic can accept additive prospective tranches in an explicit array and preserve its prefix, but there is no repository inventory loader tying new files into it.

Consequence: successful collection and successful integration are separate events. A new tranche should first be independently validated and collision-checked; any subsequent consumer revision must be additive and must preserve old report/replay hashes. No existing report should be silently regenerated with changed membership.

### SEV-4 — desirable hardening

- Publish a machine-readable, closed prospective-tranche/evidence schema and a version compatibility table.
- Add a local, network-free inventory validator covering all prospective tranche IDs, observation IDs, exact retailer+MPN dates, paths and evidence hashes.
- Test exclusive-create/fail-if-exists behaviour and concurrent writers against temporary directories.
- Bind filenames, tranche IDs, manifest IDs and evidence directories to one run identity and test that their timestamps agree.
- Add a deterministic no-fetch dry-run that emits only collision/readiness results and cannot create observations.

These are recommendations for later bounded implementation, not approvals or changes made by this audit.

## Pending scheduled-run integration checklist

The parent/integrator should perform these steps only after scheduler state shows the run completed and the recurring collector is no longer pending/running for that attempt:

1. Re-check scheduler job `7e98d1467473`, record actual run ID/status/start/end/failure, and confirm there was no second prospective writer.
2. Record `git status --short --branch --untracked-files=all` before integration. Stop on unexplained modifications to any immutable observation/evidence/report/migration.
3. Inventory all `data/observations/candidate/uk-primary-retail-*.json` and prospective evidence paths. Confirm the new tranche, manifest and every extract use previously nonexistent additive paths. Quarantine any reused path; do not overwrite.
4. Parse the new JSON and require private candidate status/scope, GB, `PRIMARY_RETAIL`, all locks false, source approval false, valid UTC timestamps, and `observed_at <= created_at` (and retrieval ordering where retained).
5. Require globally unique tranche ID and observation IDs across every prospective tranche.
6. For each observation, require `match_basis=exact_mpn`, normalized non-null MPN, and exact equality of expected/observed MPN. Abstain on any discrepancy.
7. Establish one exact retailer identity from the retained source key, seller legal entity and reviewed canonical retailer mapping. Abstain if they disagree or the seller-of-record relationship is unresolved.
8. Build the exact collision key from region + stable retailer identity + exact MPN + UTC observation date. Compare it across all existing prospective tranches before accepting membership. With no approved same-day selection rule, any duplicate key is a fail-closed quarantine condition, not a value to choose between.
9. Independently recompute SHA-256 and byte count for every retained extract and the tranche; compare with the manifest. Compare each extract's response SHA-256/byte count, retrieval time, HTTP status, URL, MPN, seller, price/VAT, availability and delivery facts with the observation. Record missing fields rather than infer them.
10. Confirm item price is positive safe-integer GBP minor units, VAT state is explicit, availability wording is retained, delivery destination/method semantics are retained, and landed price remains null/abstained wherever mandatory delivery or availability semantics are unresolved.
11. Account for every scheduled target: retained observation, reason-coded fetch/parse/identity abstention, or explicit run failure. Do not treat omitted targets as unavailable prices without run evidence.
12. Run the focused observation, collision/diagnostic, report, checksum and public-boundary tests. Add a temporary/adversarial duplicate same-retailer+MPN/date case when validating integration behaviour.
13. Keep historical backfill semantically separate. Do not backdate the prospective line, choose a same-day observation, carry prices forward, interpolate, rebase, chain-link, aggregate or call the candidate diagnostic an index.
14. Integrate through an additive consumer/report revision only. Preserve every old tranche, manifest, extract and report byte-for-byte; record old and new hashes and verify deterministic replay twice.
15. Confirm the public application/static build contains no private IDs, MPNs, prices, source URLs or evidence paths. Keep production import, source/methodology approval, index inclusion and publication locked.
16. Escalate any path reuse, identity disagreement, checksum mismatch, missing run lineage, duplicate exact line/date or governance drift. Do not repair an immutable artefact in place.

## Focused local validation

Command executed without network access:

```text
node --test tests/primary-retail-movement.test.mjs tests/primary-retail-observation-tranche.test.mjs tests/primary-retail-report.test.mjs tests/historical-primary-retail-backfill.test.mjs tests/private-quoted-item-price-history.test.mjs tests/private-candidate-quoted-item-relative-diagnostic.test.mjs tests/public-boundary.test.mjs
```

Result: **41 tests passed; 0 failed; 0 skipped; 0 cancelled**. This confirms the current retained artefacts and existing focused controls, not readiness of a not-yet-produced scheduled tranche.

## Report checksum

The SHA-256 for this exact report file is computed and reported externally after the write. It is not embedded as a literal digest because embedding a file's own digest would change the bytes being hashed.
