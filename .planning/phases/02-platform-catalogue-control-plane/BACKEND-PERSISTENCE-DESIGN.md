# Backend Persistence Design — Immutable Collector Evidence to PostgreSQL

Status: `ready_for_fixture_implementation_after_independent_review`

Design version: `sf-collector-postgresql-persistence-v1`

## 1. Authority and non-goals

This design does not authorise or perform any production database mutation, source-family selection, source approval, methodology selection, basket construction, baseline selection, historical-reference selection, deflator selection, threshold selection, public deployment, current-price/current-stock claim or frontend activation.

The launchd job `uk.co.siliconforecast.collector` at 11:30 local remains the sole prospective fetcher. PostgreSQL is an asynchronous operational projection of immutable Git evidence; database availability must never become a prerequisite for collection.

The first implementation is fixture-only and uses retained repository artefacts with no live credentials. It may create migrations, pure mapping code, deterministic SQL and disposable PostgreSQL tests. It must not connect to or provision a durable database, alter the collector installation, push a branch, merge to `main`, rebuild public payloads or connect the frontend to SQL.

## 2. Required invariants

1. Immutable Git artefacts remain the acquisition authority.
2. Import starts from exact file bytes at one explicitly trusted collector Git commit, not from caller-supplied parsed objects. The fixture slice allowlists commit `2181685afa98dcc42316c13377f50b932a471431`; a future operational importer requires a protected canonical-history trust policy rather than trusting any caller-selected local object.
3. Every imported file records repository-relative path, byte length, SHA-256 and collector commit.
4. Re-importing the same bound bundle is a no-op. The same run, tranche, ledger, attempt or observation identity with changed bytes fails before side effects.
5. Raw source vocabulary survives unchanged in stored JSON and explicit `raw_*` columns. Normalisation never overwrites raw values.
6. For attempt-schema v1 runs, every selected target creates one attempt row, including HTTP failures, robots abstentions, parser failures, identity failures and usable observations. Historical aggregate-only runs retain their incompleteness explicitly and cannot satisfy exact failed-target coverage.
7. An attempt-schema v1 successful observation cannot exist without its exact run, target attempt, tranche and evidence lineage. A legacy successful observation may use an observation-derived legacy attempt with unknown ordinal; unresolved failed-attempt counts remain run-level gaps rather than invented rows.
8. Unresolved catalogue, retailer or source identity is quarantined; it is not dropped, fuzzily matched or forced through a canonical foreign key.
9. Raw, normalised and reviewed/released states are separate. Importing factual evidence grants no source, methodology, index, production or publication authority.
10. Rows are append-only. Corrections and mapping decisions are additive and attributable.
11. No freshness, retailer-count, source-count or other numeric threshold is embedded in the persistence layer. Views expose measured timestamps and counts only.
12. Migration 0004 does not create or modify static exports. Any later exporter must be separately designed as deterministic and checksum-bound; the current locked released view is empty.
13. The retained Git artefacts support byte-exact projection/import replay. Because retailer response bodies are deliberately not retained, they do not support extractor replay; response hashes are provenance fingerprints, not reconstructible source bytes.

## 3. End-to-end flow

```text
launchd canonical collector (sole prospective fetcher)
  -> immutable Git commit
       collection-run ledger
       target-attempt artefact (all selected targets, including failures)
       observation tranche (successful factual observations)
       evidence ledger (minimal retained facts)
       global integration audit and candidate-input classification
  -> fixture-only post-commit importer
       verify commit/path/bytes/hash/schema/cross-file counts
       one PostgreSQL transaction
  -> raw/run tables
  -> append-only normalised candidate observations + quarantine
  -> read-only measured-state views
```

There is no collector-to-database network write and no browser-to-database dependency in this slice.

## 4. Collector evidence contract

### 4.1 Future runs: target-attempt artefact

The collector must add one immutable file per run:

`data/collection-attempts/uk-primary-retail-<UTC stamp>.v1.json`

It is written and staged by the existing canonical collector in the same Git commit as the run ledger, tranche/evidence files, candidate-input manifest and global audit. This is an extension of the sole collector, not a second fetcher or scheduler.

Top-level fields:

- `schema_version`: `1`
- `attempt_set_id`
- `run_id`
- `collector_version`
- `target_registry_path`, `target_registry_sha256`, `target_selection_contract_version`
- `started_at`, `completed_at`
- `attempt_count`
- `attempts`
- all governance authorities exactly false

Each attempt records:

- `attempt_id`: deterministic from run ID plus ordinal
- `ordinal`: one-based order within the selected window
- exact `target_key`, expected MPN, seller display/legal name as supplied, source key and requested URL
- `attempt_started_at`, `attempt_completed_at`
- `outcome`: closed acquisition vocabulary such as `observation_retained`, `http_failure`, `robots_disallowed`, `fetch_failure`, `parser_abstention`, `identity_abstention` or `qualification_abstention`
- ordered raw reason codes, with no inferred replacement
- HTTP status and final URL when observed
- response byte count and SHA-256 when response bytes were read; both null when no response body was obtained
- `response_bytes_retained` and retention note
- matching observation/evidence IDs when present
- a lossless, command-free raw result object containing only collector-produced factual/diagnostic fields

The run ledger must reference the attempt artefact path and SHA-256. Counts must satisfy:

- selected target keys = attempt target keys in the same order;
- `targets_attempted = attempt_count`;
- retained-attempt count = tranche observation count = evidence entry count;
- non-retained-attempt count = run abstention count;
- the run's aggregate reason counts equal the first raw reason code from each non-retained attempt.

A mismatch aborts before Git staging. Existing tranches, run rows and evidence ledgers are never rewritten.

### 4.2 Existing runs without an attempt artefact

Historical absence is preserved honestly.

Where a run contains `target_selection.selected_target_keys`, the importer creates one attempt row for every selected key. Successful rows can be linked exactly from seller display name plus normalised MPN. The remaining selected keys become `legacy_attempt_detail_unresolved` attempts. They retain the requested target identity and run-level aggregate reason map, but no individual reason is assigned because the old collector did not preserve that relationship.

The retained 25 August run does **not** contain `target_selection`, despite the collector source at its resulting commit containing the newer field. Its supportable representation is therefore 35 observation-derived successful legacy attempts with unknown ordinal plus one additive `collector_attempt_gap` row stating that ten attempted target identities and their individual reason assignments are unavailable. The aggregate reason map remains on the run/gap record. It is not expanded into ten invented target rows and cannot prove exact historical failed-target coverage.

If selected target keys and successful observation identities are both absent, the run is retained as a raw import with an `attempt_identity_unavailable_legacy` quarantine finding and a run-level attempt gap only.

No old run or immutable evidence file is modified to make the past look tidier than it was.

### 4.3 Exact attempt-schema v1 contract

`schemas/collector-target-attempt-set.v1.schema.json` is normative, uses JSON Schema draft-07 (the repository's pinned AJV 6 executable dialect) and sets `additionalProperties: false` at every closed envelope object level. The collector extension and importer share this file; neither carries a second hand-written interpretation.

The closed outcome vocabulary is exactly `observation_retained`, `http_failure`, `robots_disallowed`, `fetch_failure`, `parser_abstention`, `identity_abstention` and `qualification_abstention`. “Such as” is not part of the contract.

`raw_reasons` is an ordered array, not a closed enum. It is empty exactly for `observation_retained`; every non-retained outcome requires at least one non-empty string. This is deliberate: the canonical collector imports retailer-specific extractors whose factual abstention vocabulary is broader and may evolve. The schema preserves every code verbatim; an unknown code is data, never a command or implicit approval. Only the first reason drives the derived outcome and aggregate run reason count. `shape_reasons_waived` remains inside the untouched raw result and does not erase reasons from that object.

Outcome derivation is deterministic from the settled `collectTarget()` result: `usable === true` and empty reasons means `observation_retained`; first reason `ROBOTS_DISALLOWED` means `robots_disallowed`; `HTTP_nnn` means `http_failure`; `FETCH_FAILED` means `fetch_failure`; `NO_EXTRACTOR_FOR_SELLER` means `parser_abstention`; any first reason beginning `MPN_` means `identity_abstention`; every other non-empty first reason means `qualification_abstention`. A non-usable result with no reason fails bundle validation; no fallback `UNKNOWN` is valid in v1.

The top-level object has exact keys `schema_version`, `attempt_set_id`, `run_id`, `collector_version`, `target_registry_path`, `target_registry_sha256`, `target_selection_contract_version`, `started_at`, `completed_at`, `attempt_count`, `attempts`, `status` and `governance`. `attempt_set_id` is `sf-collection-attempt-set-<stamp>-v1` for run ID `sf-collection-run-<stamp>`. `status` is exactly `candidate_private_immutable`. `governance` has exact boolean keys `source_approved`, `methodology_approved`, `index_eligible`, `production_eligible`, `publication_eligible`, `public_claim_approved`, all constrained false.

Every attempt object has exact envelope keys `attempt_id`, `ordinal`, `target_key`, `expected_mpn`, `seller_display_name`, `seller_legal_name_supplied`, `source_key`, `requested_url`, `attempt_started_at`, `attempt_completed_at`, `outcome`, `raw_reasons`, `http_status`, `final_url`, `response_bytes`, `response_sha256`, `response_bytes_retained`, `retention_note`, `observation_id`, `evidence_id`, `raw_result_sha256`, `raw_result`. `attempt_id` is `<run_id>:attempt:<ordinal padded to four decimal digits>`. `seller_legal_name_supplied` preserves the target registry's exact non-empty string when present and is null only when the registry value is absent/null; no established, normalised or inferred name is substituted. Every other identity field is non-empty. The ordinal is one-based and the attempts array is in exact ordinal order.

Times are UTC and `attempt_started_at <= attempt_completed_at`. The start is captured immediately before calling `collectTarget`; completion is captured immediately after its promise settles. `http_status` is non-null only if a response object was obtained. Response byte count and SHA-256 are both non-null only after the body was fully read; otherwise both are null. `final_url` is nullable and retained exactly when exposed. `response_bytes_retained` is always false in v1 and the retention note is mandatory. Observation and evidence IDs are both non-null only for `observation_retained` and both null otherwise.

`raw_result` is a required JSON object retained byte-for-byte from a canonical serializer of the complete settled collector result, with arbitrary nested factual keys allowed and no evaluation. `raw_result_sha256` binds those canonical bytes. The envelope is closed; the raw factual payload is intentionally open and inert so fields such as `description`, `structured_price_agrees`, `mpn_basis`, `product_id`, `ex_vat_minor`, `ex_vat_consistent` and `was_price_minor` are not amputated. Envelope projection fields must equal their corresponding raw-result values when present. Conditional JSON Schema rules enforce all envelope nullability and outcome relationships without constraining away raw facts.

## 5. PostgreSQL model

Migration `0004_lossless_collector_persistence.sql` adds only fixture/candidate structures.

### 5.1 Import and raw/run layer

#### `collector_import_bundle`

One successfully committed transactional import.

Key fields: content-derived acquisition-bundle ID (canonical manifest SHA-256), collector commit SHA, collector tree ID, imported timestamp, exact bundle-manifest JSON and manifest SHA-256. Import time is metadata and never part of identity or deterministic selection. Mapping identity belongs to an additive `collector_projection_batch`, not the acquisition bundle, so the same immutable bytes can be projected under a later content-bound mapping without duplicating or redefining acquisition evidence. All authority booleans are constrained false.

#### `collector_mapping_contract`

An append-only registry binds each mapping-contract version to exact canonical manifest bytes and SHA-256. The v1 manifest has exact top-level key order `schema_version`, `contract_version`, `artifacts`, with values `1`, `sf-collector-mapping-v1`, and a closed array. Its exact members are `lib/collector-persistence/mapping-contract-v1.mjs`, `schemas/collector-persistence/run-ledger.v1.schema.json`, `schemas/collector-persistence/observation-tranche.v1.schema.json`, `schemas/collector-persistence/evidence-ledger.v1.schema.json`, `schemas/collector-persistence/imported-run.v1.schema.json` and `schemas/collector-target-attempt-set.v1.schema.json`. Each member object has exact key order `path`, `byte_length`, `sha256`; members sort by unsigned lexicographic UTF-8 path bytes. Canonical bytes use section 6.1's serializer.

The primary key is version and a unique constraint covers the manifest digest; replay of a version with any different manifest bytes fails before observation insertion. Bundle and observation rows carry both version and digest through composite foreign keys. Mapping behaviour can therefore change only under a new version and digest, not by reusing the label `v1`.

#### `collector_raw_artifact`

One row per exact input file. Stores Git path, Git blob ID, content byte length, SHA-256, media/schema kind, raw `bytea`, parsed `jsonb`, collector commit/tree and import bundle. Identity is `(collector_commit, canonical_path, content_sha256)`; the same commit/path with any changed length/hash/bytes fails closed. Identical bytes at another path or commit remain a separately bound artefact rather than silently aliasing authority.

#### `collector_collection_run`

Stores run ID, collector version, timestamps, outcome, selected-window state, run counts, raw abstention map, target-registry binding, Git commit and raw run JSON. It references the exact run-ledger artefact.

#### `collector_observation_tranche`

Stores tranche ID/path/hash, schema version, region/channel/status, timestamps, observation count, evidence-ledger binding, raw tranche JSON and collection run.

#### `collector_target_attempt`

One row per exact selected target. Stores run, ordinal, target key, expected MPN, supplied retailer/source/URL, timestamps, raw outcome and reasons, HTTP/final-URL/response fingerprint fields, retention state, raw attempt JSON, linked observation/evidence identity where present and a legacy-detail state.

For attempt-schema v1, uniqueness is enforced on `(collection_run_id, ordinal)`, `(collection_run_id, target_key)` and `attempt_id`. Legacy observation-derived attempts have null ordinal and an explicit legacy state. A deferred bundle assertion reconciles each attempt-schema v1 run's counts and selected target order and is invoked once per imported bundle even when a child set is empty.

#### `collector_attempt_gap`

One additive row for a known attempted count whose exact target identities or per-target outcomes were not retained. It stores run ID, missing identity count, aggregate reason map, provenance note and quarantine code. It is a statement of missing evidence, not a collection attempt and never appears as a retailer target.

#### `collector_evidence_entry`

Stores evidence ID, run/tranche/attempt links, source/final URL, retrieval time, HTTP status, response fingerprint, retention state/note, VAT determination, minimal factual extract and raw evidence JSON. Response SHA-256 is distinct from the evidence-ledger and tranche hashes.

### 5.2 Append-only normalised layer

#### `collector_retail_offer_observation`

One row per retained collector observation **per mapping-contract version**. It references run, attempt (or explicit legacy lineage), tranche and evidence entry. It stores:

- raw observation ID and a database UUID;
- expected and observed MPN;
- nullable canonical product/revision IDs;
- nullable retailer/source/policy IDs;
- raw seller, availability, delivery, landed-price and qualification JSON/vocabulary;
- conservative normalised states where the mapping contract has an exact case;
- item price as integer minor units and currency;
- observed/retrieved timestamps and URLs;
- all provenance hashes;
- mapping-contract version; the deterministic identity is raw acquisition identity plus mapping-contract version;
- `candidate_only`, `production_import_allowed = false`, `index_eligible = false`, `publication_allowed = false` constraints.

Canonical foreign keys are nullable by design. A missing exact catalogue identity is quarantine, not data loss.

#### `collector_ingestion_quarantine`

Append-only reason-coded findings for raw artefacts, attempts or observations. Initial codes include unsupported schema, legacy attempt detail unavailable, unresolved canonical product, unresolved retailer/source/policy, unmapped raw enum, cross-file mismatch and identity/hash collision. A quarantine row does not delete the raw record or invent a normalised value.

#### `collector_mapping_decision`

Reserved for a later authorised slice and **not created by migration 0004**. It cannot approve source use, methodology, production, index inclusion or publication. Before a future migration creates it, that design must prohibit self/cyclic/cross-subject supersession, forks and multiple active heads, and must bind reason, actor/reviewer and exact review-artifact path/hash. No current view uses latest-import-wins correction semantics.

### 5.3 Reviewed projection boundary

#### `collector_offer_release_binding`

This table is **not created by migration 0004**. Release authority is outside the fixture slice and its exact approval scope/status contract is deliberately not invented here. Migration 0004 instead creates a schema-compatible locked released view as `SELECT ... FROM collector_latest_candidate_offer_by_mpn_supplied_target WHERE false`; it therefore remains structurally testable and provably empty without pretending an approval path exists. A later separately authorised migration must define the binding table, approval-decision FK, exact approval artefact path/hash, observation-set digest, export class and all canonical retailer/source/policy/catalogue status prerequisites before replacing the locked view. The importer role has no ability to replace that view or create a binding.

## 6. Mapping contract v1

Pure mapping code validates exact keys and returns `{raw, normalised, quarantine}` without database access.

- MPN normalisation is Unicode NFKC, trim and uppercase only. Punctuation is preserved.
- Target identity is exact seller display name plus U+001F plus normalised MPN, matching collector rotation v1.
- Retailer aliases are not guessed. Exact configured identities may map; unknown display/legal names remain raw and quarantined.
- `availability.normalised` values currently map as:
  - `in_stock` -> `in_stock`
  - `unknown` -> `unknown`
  - `other` -> `other`
  The raw schema/display fields are always retained. `other` is not silently treated as out of stock.
- Null delivery destination, extract SHA-256 and landed price are valid raw facts. They remain null and cannot qualify a landed price.
- Collector qualification vocabulary is stored verbatim. Candidate normalisation may classify it only as `retained_candidate` or `abstained`; it never becomes methodology or release eligibility.
- Colon-bearing collector observation IDs remain text identities. PostgreSQL UUIDs are separate surrogate keys.
- Exact canonical linkage occurs only when an approved/reviewed catalogue revision exposes the same manufacturer-scoped MPN and retained/reviewed manufacturer identity under the established catalogue contract. MPN text alone is insufficient. Otherwise linkage is null plus quarantine.

Changed mapping behaviour requires a new mapping-contract version and additive replay; it does not update old normalised rows.

Migration 0004 and its importer never write `candidate_primary_retail_observation`, `candidate_retailer_product_movement` or any view/table introduced by migration 0003. Those structures remain untouched as an earlier fixture model and are covered by isolation tests; deprecation or removal requires a separate decision.

### 6.1 Canonical generated bundle manifest

The importer synthesises an acquisition manifest; it does not claim that the legacy collector retained one. The manifest is not a member of itself. Its exact top-level key order is `schema_version`, `bundle_contract`, `run_id`, `collector_commit`, `collector_tree`, `artifacts`. Values for the first two fields are integer `1` and `sf-collector-import-bundle-v1`. Mapping version and digest are deliberately absent from acquisition identity and are instead bound by the separately content-derived `collector_projection_batch` manifest.

Each artefact object has exact key order `path`, `kind`, `git_blob`, `byte_length`, `sha256`. `kind` is mapped exactly as follows: run ledger -> `run_ledger`; target registry -> `target_registry`; candidate input manifest -> `candidate_input_manifest`; run tranche -> `observation_tranche`; evidence ledger -> `evidence_ledger`; global audit -> `global_integration_audit`; attempt artefact -> `target_attempt_set`. No other kind is valid. Artefacts are sorted by unsigned lexicographic comparison of their UTF-8 path bytes.

The canonical JSON serializer recursively sorts ordinary-object keys by unsigned lexicographic UTF-8 bytes unless a contract above prescribes an exact key order; arrays preserve order. It uses JSON scalar semantics, rejects `undefined`, holes, `NaN`, infinities, `BigInt`, accessors/prototypes and `toJSON`, emits no insignificant whitespace internally, then applies two-space indentation, LF line endings and exactly one final LF. Escaping is JSON-standard with no optional slash or printable non-ASCII escaping. These rules also define `raw_result` bytes and mapping-manifest bytes. The bundle ID is lowercase hexadecimal SHA-256 of the complete manifest bytes.

Membership is closed. Every run includes the exact run-ledger blob, `data/catalogue/collection-targets.v1.json`, and the run's global integration audit. Attempt-schema v1 also includes the referenced target-attempt artefact. A run with retained observations additionally includes its tranche, evidence ledger and `data/derived/private-candidate/ram-input-manifest.v1.json`; a zero-observation run includes none of those three and requires null tranche/evidence references. Referenced prior shape-establishment evidence is recorded as lineage by ID but is not silently folded into this acquisition bundle. Unknown extra caller paths are rejected.

For the allowlisted 25 August fixture, membership is exactly six paths: the run ledger, target registry, candidate-input manifest, referenced tranche, referenced evidence ledger and referenced global audit. A golden manifest and its digest are committed as a test fixture after they are generated once by the specified serializer and independently recomputed by the tests.

Fixture repository trust is exact rather than remote-name based: the only accepted commit is `2181685afa98dcc42316c13377f50b932a471431`, its expected tree is `5fd4b6f544bac994976c9c2f8303046296791026`, and every member's blob ID/hash/length must match the generated manifest. `origin/main` ancestry and remote URL are reported only as corroborating diagnostics; neither is a trust root. This rule is explicitly insufficient for an operational multi-commit importer.

## 7. Deterministic fixture importer

The implementation is a repository-local Node module and CLI that:

1. accepts a run ID and exact allowlisted fixture collector commit;
2. reads file bytes from that Git commit, not from arbitrary working-tree JSON;
3. verifies the exact fixture commit/tree allowlist, per-member blob identities, canonical repository-contained regular paths and canonical-main ancestry only as corroboration; an arbitrary caller-selected commit is rejected;
4. recomputes byte length and SHA-256 before JSON parsing;
5. validates closed top-level and nested schemas;
6. reconciles run, target selection, attempt artefact, tranche, evidence and observation identities/counts;
7. maps every selected target and retained observation;
8. emits deterministic SQL for one transaction, with byte content encoded safely;
9. uses `ON CONFLICT DO NOTHING` only where every enumerated bound identity/hash/content field already matches; otherwise an explicit collision check raises;
10. explicitly raises on same identity with different bytes or facts;
11. is exercised only against disposable PostgreSQL 16 in this slice.

The deterministic SQL generator has no database connection, default durable connection string or production mode. It emits SQL or a reviewed local fixture artefact; it does not execute `psql`, fetch retailer pages or mutate a persistent database. Only the separate disposable-database test harness may report replay no-ops and row counts after actually executing and querying the generated SQL.

Importer test cases:

- real retained 25 August run: 35 observation-derived successful legacy attempts, 35 observations/evidence entries and one run-level gap proving that ten target identities/per-target reasons are unavailable;
- synthetic attempt-schema v1 bundle: 45 exact attempts, successful and failed target identities, ordered target reconciliation and exact reason aggregation;
- exact replay is a no-op with unchanged row counts;
- mapping-contract `v1` replay with changed manifest bytes fails; `v2` is additive;
- canonical six-member legacy bundle manifest matches a committed golden digest;
- identical concurrent replay is a no-op and concurrent changed-content identity reuse fails closed;
- changed tranche/evidence/run bytes under stable identity fail before insert;
- changed response hash under stable observation fails;
- missing/extra selected targets, observations or evidence fail;
- unresolved MPNs persist raw observation plus quarantine;
- raw `availability = other`, null extract hash and null delivery destination survive round-trip;
- colon-bearing observation IDs survive unchanged;
- mixed-run tranche/attempt/evidence references and empty child sets fail deferred database lineage checks;
- mapping-contract v2 replay is additive and deterministic;
- no authority flag can be true;
- update/delete fail on every history table;
- invocation from outside the repository produces byte-identical SQL;
- non-ASCII text ordering matches PostgreSQL/Node golden fixtures.

## 8. Read views; static exports deferred

Views expose measurements, not approved thresholds.

### `collector_latest_candidate_offer_by_mpn_supplied_target`

Latest retained candidate observation per exact normalised MPN and **supplied target identity**, ordered by observed time, retrieval time, observation ID, mapping-contract version and content SHA-256. Text tie-breakers use unsigned lexicographic UTF-8 byte ordering: PostgreSQL orders `convert_to(value, 'UTF8')`; Node uses `Buffer.compare(Buffer.from(value, 'utf8'))`. It is private and contains candidate rows regardless of catalogue linkage. Its measures are named `distinct_supplied_target_identity_count`, never canonical retailer count.

### `collector_latest_released_offer_locked`

Schema-compatible with the candidate view but defined with a constant-false predicate. It is empty in this slice because no binding table, writer or seed exists.

### `collector_product_retailer_coverage`

Per exact MPN exposes acquisition measures once regardless of the number of additive mapping projections: intended target identities, exact attempts, distinct supplied target identities, separately resolved canonical retailer identities, retained observations, released observations, latest attempted/observed/released timestamps, legacy observation-derived attempts, exact failed attempts, latest raw failure reasons and unresolved identity counts. Because the retained legacy ten-attempt deficit has no recoverable MPN, the view emits it only in an explicit `normalised_mpn IS NULL` aggregate-gap row; it never allocates those attempts to invented products. It does not claim a never-attempted registry count because this migration does not persist an authoritative registry snapshot as a target-planning table.

It does not label rows fresh/stale and contains no minimum-retailer rule.

Migration 0004 creates no export CLI, payload schema, query contract or export manifest and writes nothing into current public payload paths or `app/`. A later exporter requires its own reviewed byte contract and authority boundary; it may read these views but is not implied by this persistence slice.

## 9. Append-only and privilege controls

- Every new history table uses the existing `reject_history_mutation()` trigger for `UPDATE` and `DELETE`.
- Public has no privileges.
- A NOLOGIN fixture importer role receives only `SELECT` and `INSERT` on the new fixture tables; no update/delete, DDL, role, lock or release-binding privileges.
- Release-binding and future production roles are not granted or enabled.
- Migration application remains superuser-only inside the disposable test harness; this is not represented as production least privilege.
- Raw source JSON is treated as data. Importer schemas reject command-shaped configuration and no raw field is evaluated, interpolated into identifiers or executed.

## 10. Transaction, recovery and observability

One bundle imports in one transaction. Cross-file validation occurs before `BEGIN`; composite unique keys and composite foreign keys bind run/tranche, run/attempt and run/evidence identities. A deferred bundle-level function is called unconditionally before commit to enforce one-to-one retained-attempt/observation/evidence relationships, exact IDs/URLs/response hashes/MPNs/counts and empty-child-set rules. Any error rolls back the entire bundle.

Concurrent replay is serialised inside PostgreSQL with `pg_advisory_xact_lock()` using the two signed 32-bit words represented by the first eight bytes of the bundle SHA-256. After the lock, the transaction inserts or reads the bundle and database triggers compare every identity/content field in the same transaction; `ON CONFLICT` is never treated as proof of equality. Run, artefact, attempt, evidence and observation unique constraints independently reject changed-content identity reuse. The disposable test exercises two simultaneous sessions for identical replay and changed-content collision.

A successful disposable-database import records exact counts and hashes. Exact replay through the disposable executor returns the existing content-derived bundle identity and unchanged counts. The SQL generator only proves deterministic generation. A failed import writes no partial SQL state; the responsible component returns non-zero with a reason code and no secrets. Operational scheduling, retries and durable alerting are deferred because no persistent database has been approved.

Database loss is recoverable by reapplying migrations and replaying trusted immutable collector commits in commit order. Git evidence is sufficient to rebuild the persisted projection, but not to rerun extractor logic where retailer response bodies were not retained. The database records `projection_replayable = true` and the accurate extractor-replay state per artefact. A future durable design must separately prove protected commit trust, backup/restore, connection identity, migration history, least privilege, monitoring and bounded retries before production mutation can be approved.

The target-attempt collector extension is a separately tested local change. Before any installation or merge proposal it must write all run outputs to run-local temporary files, validate the complete bundle, fsync/atomically rename where supported, and stage only the closed output set. A partial-write marker or dirty dedicated checkout fails closed for operator review; startup recovery may diagnose but must not delete or fabricate evidence automatically.

## 11. Acceptance gate before any production proposal

The fixture slice is acceptable only when:

- independent critique has been reconciled in this document;
- realistic retained artefacts pass unit and disposable PostgreSQL tests;
- every attempt-schema v1 selected target becomes an exact attempt row; aggregate-only historical deficits remain explicit attempt-gap/quarantine rows and are never claimed as exact target coverage;
- idempotent replay and changed-byte collisions are proven;
- raw vocabulary round-trips without loss;
- all history tables reject update/delete;
- locked released view/export remains empty and no release-binding table or writer exists;
- the current public build and payload bytes are unchanged;
- the launchd job and dedicated checkout remain untouched and sole-fetcher ownership is rechecked;
- production DB mutation, source family, methodology, basket, baseline, reference, deflator, thresholds and deployment remain locked.

Provisioning durable PostgreSQL is a separate human decision packet, not an implied next command.

## 12. Independent critique disposition

Two read-only independent reviews were obtained before implementation. Worker claims were checked against the retained 25 August run, collector source and migrations rather than accepted on trust.

- Historical target identity gap: resolved by 35 observation-derived legacy attempts plus one ten-count gap; no invented failures.
- Extractor replay overclaim: resolved by explicitly limiting replay to the persisted projection where response bodies are absent.
- Fixture Git trust: resolved by exact commit/tree allowlist and per-member blobs; operational trust remains deliberately out of scope.
- Mapping version identity: resolved by the content-bound `collector_mapping_contract` registry and composite lineage.
- Composite lineage and empty child sets: resolved at design level through composite foreign keys plus an unconditional deferred bundle assertion; PostgreSQL tests must prove it.
- Deterministic bytes/order: resolved with one unsigned UTF-8 byte comparator, exact serializer and SHA-256 input definition plus non-ASCII goldens.
- Mapping correction chains: removed from migration 0004; a future design must define cycle/fork/same-subject controls before creating the table.
- Release prerequisites: removed from migration 0004; the current released interface is constant-false, with no table or writer.
- Crash-safe collector writes: retained as a prerequisite to any separately reviewed collector extension, not smuggled into the importer slice.
- Attempt contract: resolved by the normative closed JSON Schema, exhaustive outcomes/reasons and deterministic mapping/null rules in section 4.3.
- Bundle identity: resolved by the closed generated manifest schema, membership, serializer, exact fixture trust and golden digest requirement.
- Concurrent replay: resolved at design level by transaction-scoped advisory serialisation plus post-conflict equality assertions and two-session tests.
- Legacy retailer terminology: resolved by supplied-target naming and separate canonical-retailer measures.
- Migration 0003 overlap: resolved by explicit no-write isolation and tests.
