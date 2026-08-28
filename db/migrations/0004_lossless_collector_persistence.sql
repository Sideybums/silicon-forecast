BEGIN;

CREATE ROLE silicon_forecast_collector_fixture_importer NOLOGIN;

CREATE TABLE silicon_forecast.collector_mapping_contract (
  contract_version text PRIMARY KEY,
  manifest_sha256 text NOT NULL UNIQUE CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  manifest_byte_length bigint NOT NULL CHECK (manifest_byte_length > 0),
  manifest_bytes bytea NOT NULL,
  manifest_json jsonb NOT NULL CHECK (jsonb_typeof(manifest_json) = 'object'),
  registered_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (contract_version, manifest_sha256),
  CHECK (octet_length(manifest_bytes) = manifest_byte_length),
  CHECK (encode(digest(manifest_bytes, 'sha256'), 'hex') = manifest_sha256)
);

CREATE TABLE silicon_forecast.collector_import_bundle (
  bundle_id text PRIMARY KEY CHECK (bundle_id ~ '^[0-9a-f]{64}$'),
  collector_commit text NOT NULL CHECK (collector_commit ~ '^[0-9a-f]{40}$'),
  collector_tree text NOT NULL CHECK (collector_tree ~ '^[0-9a-f]{40}$'),
  manifest_sha256 text NOT NULL UNIQUE CHECK (manifest_sha256 = bundle_id),
  manifest_byte_length bigint NOT NULL CHECK (manifest_byte_length > 0),
  manifest_bytes bytea NOT NULL,
  manifest_json jsonb NOT NULL CHECK (jsonb_typeof(manifest_json) = 'object'),
  imported_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  projection_replayable boolean NOT NULL DEFAULT true CHECK (projection_replayable),
  source_approved boolean NOT NULL DEFAULT false CHECK (NOT source_approved),
  methodology_approved boolean NOT NULL DEFAULT false CHECK (NOT methodology_approved),
  index_eligible boolean NOT NULL DEFAULT false CHECK (NOT index_eligible),
  production_eligible boolean NOT NULL DEFAULT false CHECK (NOT production_eligible),
  publication_eligible boolean NOT NULL DEFAULT false CHECK (NOT publication_eligible),
  public_claim_approved boolean NOT NULL DEFAULT false CHECK (NOT public_claim_approved),
  CHECK (octet_length(manifest_bytes) = manifest_byte_length),
  CHECK (encode(digest(manifest_bytes, 'sha256'), 'hex') = manifest_sha256)
);

-- Acquisition is immutable and mapping-independent. Mapping replays are additive.
CREATE TABLE silicon_forecast.collector_projection_batch (
  projection_batch_id text PRIMARY KEY CHECK (projection_batch_id ~ '^[0-9a-f]{64}$'),
  bundle_id text NOT NULL REFERENCES silicon_forecast.collector_import_bundle(bundle_id) ON DELETE RESTRICT,
  mapping_contract_version text NOT NULL,
  mapping_contract_sha256 text NOT NULL CHECK (mapping_contract_sha256 ~ '^[0-9a-f]{64}$'),
  projection_digest text NOT NULL CHECK (projection_digest = projection_batch_id),
  projection_manifest jsonb NOT NULL CHECK (jsonb_typeof(projection_manifest) = 'object'),
  projected_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  source_approved boolean NOT NULL DEFAULT false CHECK (NOT source_approved),
  methodology_approved boolean NOT NULL DEFAULT false CHECK (NOT methodology_approved),
  index_eligible boolean NOT NULL DEFAULT false CHECK (NOT index_eligible),
  production_eligible boolean NOT NULL DEFAULT false CHECK (NOT production_eligible),
  publication_eligible boolean NOT NULL DEFAULT false CHECK (NOT publication_eligible),
  public_claim_approved boolean NOT NULL DEFAULT false CHECK (NOT public_claim_approved),
  UNIQUE (bundle_id, mapping_contract_version),
  UNIQUE (projection_batch_id, bundle_id),
  FOREIGN KEY (mapping_contract_version, mapping_contract_sha256)
    REFERENCES silicon_forecast.collector_mapping_contract(contract_version, manifest_sha256)
);

CREATE TABLE silicon_forecast.collector_raw_artifact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id text NOT NULL REFERENCES silicon_forecast.collector_import_bundle(bundle_id) ON DELETE RESTRICT,
  collector_commit text NOT NULL CHECK (collector_commit ~ '^[0-9a-f]{40}$'),
  collector_tree text NOT NULL CHECK (collector_tree ~ '^[0-9a-f]{40}$'),
  canonical_path text NOT NULL CHECK (canonical_path !~ '(^/|(^|/)\.\.(/|$)|\\)' AND length(canonical_path) > 0),
  git_blob text NOT NULL CHECK (git_blob ~ '^[0-9a-f]{40}$'),
  content_byte_length bigint NOT NULL CHECK (content_byte_length >= 0),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  artifact_kind text NOT NULL CHECK (artifact_kind IN ('run_ledger','target_registry','candidate_input_manifest','observation_tranche','evidence_ledger','global_integration_audit','target_attempt_set')),
  raw_bytes bytea NOT NULL,
  parsed_json jsonb NOT NULL CHECK (jsonb_typeof(parsed_json) = 'object'),
  extractor_replayable boolean NOT NULL DEFAULT false CHECK (NOT extractor_replayable),
  UNIQUE (collector_commit, canonical_path),
  UNIQUE (bundle_id, canonical_path),
  UNIQUE (id, bundle_id),
  CHECK (octet_length(raw_bytes) = content_byte_length),
  CHECK (encode(digest(raw_bytes, 'sha256'), 'hex') = content_sha256)
);

CREATE TABLE silicon_forecast.collector_collection_run (
  collection_run_id text PRIMARY KEY,
  bundle_id text NOT NULL REFERENCES silicon_forecast.collector_import_bundle(bundle_id) ON DELETE RESTRICT,
  run_artifact_id uuid NOT NULL,
  collector_version text,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  outcome text NOT NULL,
  attempt_schema_version integer,
  selected_target_keys jsonb,
  targets_attempted integer NOT NULL CHECK (targets_attempted >= 0),
  observations_retained integer NOT NULL CHECK (observations_retained >= 0),
  abstentions integer NOT NULL CHECK (abstentions >= 0),
  raw_abstention_reasons jsonb NOT NULL CHECK (jsonb_typeof(raw_abstention_reasons) = 'object'),
  target_registry_path text NOT NULL,
  target_registry_sha256 text NOT NULL CHECK (target_registry_sha256 ~ '^[0-9a-f]{64}$'),
  raw_run jsonb NOT NULL CHECK (jsonb_typeof(raw_run) = 'object'),
  UNIQUE (collection_run_id, bundle_id),
  FOREIGN KEY (run_artifact_id, bundle_id) REFERENCES silicon_forecast.collector_raw_artifact(id, bundle_id),
  CHECK (completed_at >= started_at),
  CHECK (targets_attempted = observations_retained + abstentions),
  CHECK (selected_target_keys IS NULL OR jsonb_typeof(selected_target_keys) = 'array')
);

CREATE TABLE silicon_forecast.collector_observation_tranche (
  tranche_id text PRIMARY KEY,
  collection_run_id text NOT NULL,
  bundle_id text NOT NULL,
  artifact_id uuid NOT NULL,
  schema_version integer NOT NULL CHECK (schema_version > 0),
  region_raw text NOT NULL,
  channel_raw text NOT NULL,
  status_raw text NOT NULL,
  created_at timestamptz NOT NULL,
  observation_count integer NOT NULL CHECK (observation_count >= 0),
  evidence_ledger_path text NOT NULL,
  raw_tranche jsonb NOT NULL CHECK (jsonb_typeof(raw_tranche) = 'object'),
  UNIQUE (tranche_id, collection_run_id, bundle_id),
  FOREIGN KEY (collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_collection_run(collection_run_id, bundle_id),
  FOREIGN KEY (artifact_id, bundle_id) REFERENCES silicon_forecast.collector_raw_artifact(id, bundle_id)
);

CREATE TABLE silicon_forecast.collector_target_attempt (
  attempt_id text PRIMARY KEY,
  collection_run_id text NOT NULL,
  bundle_id text NOT NULL,
  ordinal integer CHECK (ordinal IS NULL OR ordinal > 0),
  target_key text,
  expected_mpn_raw text NOT NULL,
  seller_display_name_raw text NOT NULL,
  seller_legal_name_supplied_raw text,
  source_key_raw text NOT NULL,
  requested_url_raw text NOT NULL,
  attempt_started_at timestamptz,
  attempt_completed_at timestamptz,
  outcome_raw text NOT NULL CHECK (outcome_raw IN ('observation_retained','http_failure','robots_disallowed','fetch_failure','parser_abstention','identity_abstention','qualification_abstention')),
  raw_reasons jsonb NOT NULL CHECK (jsonb_typeof(raw_reasons) = 'array'),
  http_status integer,
  final_url_raw text,
  response_bytes bigint,
  response_sha256 text CHECK (response_sha256 IS NULL OR response_sha256 ~ '^[0-9a-f]{64}$'),
  response_bytes_retained boolean NOT NULL DEFAULT false CHECK (NOT response_bytes_retained),
  retention_note_raw text NOT NULL,
  observation_id_raw text,
  evidence_id_raw text,
  raw_result_sha256 text CHECK (raw_result_sha256 IS NULL OR raw_result_sha256 ~ '^[0-9a-f]{64}$'),
  raw_attempt jsonb NOT NULL CHECK (jsonb_typeof(raw_attempt) = 'object'),
  legacy_detail_state text NOT NULL CHECK (legacy_detail_state IN ('exact_v1','observation_derived_unknown_ordinal','legacy_attempt_detail_unresolved')),
  FOREIGN KEY (collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_collection_run(collection_run_id, bundle_id),
  UNIQUE (attempt_id, collection_run_id, bundle_id),
  CHECK ((ordinal IS NOT NULL) = (legacy_detail_state <> 'observation_derived_unknown_ordinal')),
  CHECK ((response_bytes IS NULL) = (response_sha256 IS NULL)),
  CHECK ((observation_id_raw IS NULL) = (evidence_id_raw IS NULL)),
  CHECK ((outcome_raw = 'observation_retained') = (observation_id_raw IS NOT NULL)),
  CHECK (attempt_started_at IS NULL OR attempt_completed_at >= attempt_started_at)
);
CREATE UNIQUE INDEX collector_target_attempt_run_ordinal_exact ON silicon_forecast.collector_target_attempt(collection_run_id, ordinal) WHERE ordinal IS NOT NULL;
CREATE UNIQUE INDEX collector_target_attempt_run_target_exact ON silicon_forecast.collector_target_attempt(collection_run_id, target_key) WHERE target_key IS NOT NULL AND legacy_detail_state = 'exact_v1';

CREATE TABLE silicon_forecast.collector_attempt_gap (
  gap_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_run_id text NOT NULL,
  bundle_id text NOT NULL,
  missing_identity_count integer NOT NULL CHECK (missing_identity_count > 0),
  aggregate_reason_map jsonb NOT NULL CHECK (jsonb_typeof(aggregate_reason_map) = 'object'),
  provenance_note text NOT NULL,
  quarantine_code text NOT NULL CHECK (quarantine_code IN ('legacy_attempt_detail_unavailable','attempt_identity_unavailable_legacy')),
  FOREIGN KEY (collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_collection_run(collection_run_id, bundle_id),
  UNIQUE (collection_run_id, quarantine_code)
);

CREATE TABLE silicon_forecast.collector_evidence_entry (
  evidence_id text PRIMARY KEY,
  collection_run_id text NOT NULL,
  bundle_id text NOT NULL,
  tranche_id text NOT NULL,
  attempt_id text NOT NULL,
  seller_display_name_raw text NOT NULL,
  source_url_raw text NOT NULL,
  final_url_raw text,
  retrieved_at timestamptz NOT NULL,
  http_status integer,
  response_bytes bigint,
  response_sha256 text CHECK (response_sha256 IS NULL OR response_sha256 ~ '^[0-9a-f]{64}$'),
  response_bytes_retained boolean NOT NULL DEFAULT false CHECK (NOT response_bytes_retained),
  retention_note_raw text NOT NULL,
  vat_determination_raw text,
  facts_raw jsonb NOT NULL CHECK (jsonb_typeof(facts_raw) = 'object'),
  raw_evidence jsonb NOT NULL CHECK (jsonb_typeof(raw_evidence) = 'object'),
  UNIQUE (evidence_id, collection_run_id, bundle_id),
  FOREIGN KEY (collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_collection_run(collection_run_id, bundle_id),
  FOREIGN KEY (tranche_id, collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_observation_tranche(tranche_id, collection_run_id, bundle_id),
  FOREIGN KEY (attempt_id, collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_target_attempt(attempt_id, collection_run_id, bundle_id),
  CHECK ((response_bytes IS NULL) = (response_sha256 IS NULL))
);

ALTER TABLE silicon_forecast.canonical_product_revision ADD UNIQUE (id, canonical_product_id);
ALTER TABLE silicon_forecast.source_policy_revision ADD UNIQUE (id, source_id);

CREATE TABLE silicon_forecast.collector_retail_offer_observation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id_raw text NOT NULL,
  collection_run_id text NOT NULL,
  bundle_id text NOT NULL,
  projection_batch_id text NOT NULL,
  tranche_id text NOT NULL,
  attempt_id text NOT NULL,
  evidence_id text NOT NULL,
  mapping_contract_version text NOT NULL,
  mapping_contract_sha256 text NOT NULL,
  expected_mpn_raw text NOT NULL,
  observed_mpn_raw text,
  normalised_mpn text NOT NULL,
  supplied_target_identity text NOT NULL,
  canonical_product_id uuid REFERENCES silicon_forecast.canonical_product(id) ON DELETE RESTRICT,
  canonical_product_revision_id uuid REFERENCES silicon_forecast.canonical_product_revision(id) ON DELETE RESTRICT,
  retailer_id uuid REFERENCES silicon_forecast.retailer(id) ON DELETE RESTRICT,
  source_id uuid REFERENCES silicon_forecast.source(id) ON DELETE RESTRICT,
  source_policy_revision_id uuid REFERENCES silicon_forecast.source_policy_revision(id) ON DELETE RESTRICT,
  seller_raw jsonb NOT NULL,
  availability_raw jsonb NOT NULL,
  availability_normalised text CHECK (availability_normalised IN ('in_stock','unknown','other')),
  delivery_raw jsonb NOT NULL,
  landed_price_raw jsonb NOT NULL,
  qualification_raw jsonb NOT NULL,
  qualification_normalised text NOT NULL CHECK (qualification_normalised IN ('retained_candidate','abstained')),
  item_price_minor bigint NOT NULL CHECK (item_price_minor > 0),
  currency_raw text NOT NULL,
  observed_at timestamptz NOT NULL,
  retrieved_at timestamptz NOT NULL,
  source_url_raw text NOT NULL,
  final_url_raw text,
  response_sha256 text CHECK (response_sha256 IS NULL OR response_sha256 ~ '^[0-9a-f]{64}$'),
  raw_observation_sha256 text NOT NULL CHECK (raw_observation_sha256 ~ '^[0-9a-f]{64}$'),
  raw_observation jsonb NOT NULL CHECK (jsonb_typeof(raw_observation) = 'object'),
  candidate_only boolean NOT NULL DEFAULT true CHECK (candidate_only),
  production_import_allowed boolean NOT NULL DEFAULT false CHECK (NOT production_import_allowed),
  index_eligible boolean NOT NULL DEFAULT false CHECK (NOT index_eligible),
  publication_allowed boolean NOT NULL DEFAULT false CHECK (NOT publication_allowed),
  UNIQUE (observation_id_raw, projection_batch_id),
  FOREIGN KEY (collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_collection_run(collection_run_id, bundle_id),
  FOREIGN KEY (tranche_id, collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_observation_tranche(tranche_id, collection_run_id, bundle_id),
  FOREIGN KEY (attempt_id, collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_target_attempt(attempt_id, collection_run_id, bundle_id),
  FOREIGN KEY (evidence_id, collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_evidence_entry(evidence_id, collection_run_id, bundle_id),
  FOREIGN KEY (mapping_contract_version, mapping_contract_sha256) REFERENCES silicon_forecast.collector_mapping_contract(contract_version, manifest_sha256),
  FOREIGN KEY (projection_batch_id, bundle_id) REFERENCES silicon_forecast.collector_projection_batch(projection_batch_id, bundle_id),
  FOREIGN KEY (canonical_product_revision_id, canonical_product_id) REFERENCES silicon_forecast.canonical_product_revision(id, canonical_product_id),
  FOREIGN KEY (source_policy_revision_id, source_id) REFERENCES silicon_forecast.source_policy_revision(id, source_id),
  CHECK ((canonical_product_id IS NULL) = (canonical_product_revision_id IS NULL)),
  CHECK ((source_id IS NULL) = (source_policy_revision_id IS NULL)),
  CHECK (observed_at <= retrieved_at)
);

CREATE TABLE silicon_forecast.collector_ingestion_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id text NOT NULL REFERENCES silicon_forecast.collector_import_bundle(bundle_id) ON DELETE RESTRICT,
  projection_batch_id text NOT NULL,
  collection_run_id text,
  subject_type text NOT NULL CHECK (subject_type IN ('artifact','run','attempt','observation')),
  subject_identity text NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN ('unsupported_schema','legacy_attempt_detail_unavailable','attempt_identity_unavailable_legacy','unresolved_canonical_product','unresolved_retailer','unresolved_source','unresolved_policy','unmapped_raw_enum','cross_file_mismatch','identity_hash_collision')),
  raw_finding jsonb NOT NULL CHECK (jsonb_typeof(raw_finding) = 'object'),
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (projection_batch_id, subject_type, subject_identity, reason_code),
  FOREIGN KEY (projection_batch_id, bundle_id) REFERENCES silicon_forecast.collector_projection_batch(projection_batch_id, bundle_id),
  FOREIGN KEY (collection_run_id, bundle_id) REFERENCES silicon_forecast.collector_collection_run(collection_run_id, bundle_id)
);

CREATE FUNCTION silicon_forecast.assert_collector_replay(p_table regclass, p_key jsonb, p_expected jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, silicon_forecast AS $$
DECLARE actual jsonb; relation_name text;
BEGIN
  SELECT c.relname INTO relation_name FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=p_table AND n.nspname='silicon_forecast';
  IF relation_name IS NULL OR relation_name !~ '^collector_' THEN RAISE EXCEPTION 'replay assertion table denied' USING ERRCODE='42501'; END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM %s t WHERE NOT EXISTS (SELECT 1 FROM jsonb_each($1) k WHERE to_jsonb(t)->k.key IS DISTINCT FROM k.value) LIMIT 1',p_table) INTO actual USING p_key;
  IF actual IS NULL OR EXISTS (SELECT 1 FROM jsonb_each(p_expected) e WHERE actual->e.key IS DISTINCT FROM e.value) THEN
    RAISE EXCEPTION 'IMMUTABLE_REPLAY_COLLISION:%', relation_name USING ERRCODE='23514';
  END IF;
END; $$;

CREATE FUNCTION silicon_forecast.assert_collector_bundle(p_bundle_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, silicon_forecast AS $$
DECLARE r silicon_forecast.collector_collection_run%ROWTYPE; b silicon_forecast.collector_import_bundle%ROWTYPE; attempt_count integer; retained_count integer; evidence_count integer; gap_count integer; projection record; computed_reasons jsonb;
BEGIN
  SELECT * INTO STRICT b FROM silicon_forecast.collector_import_bundle WHERE bundle_id=p_bundle_id;
  SELECT * INTO STRICT r FROM silicon_forecast.collector_collection_run WHERE bundle_id=p_bundle_id;
  IF b.manifest_json->>'collector_commit' IS DISTINCT FROM b.collector_commit OR b.manifest_json->>'collector_tree' IS DISTINCT FROM b.collector_tree THEN RAISE EXCEPTION 'bundle commit/tree mismatch' USING ERRCODE='23514'; END IF;
  IF jsonb_array_length(b.manifest_json->'artifacts') <> (SELECT count(*) FROM silicon_forecast.collector_raw_artifact WHERE bundle_id=p_bundle_id)
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(b.manifest_json->'artifacts') m WHERE NOT EXISTS (SELECT 1 FROM silicon_forecast.collector_raw_artifact a WHERE a.bundle_id=p_bundle_id AND a.collector_commit=b.collector_commit AND a.collector_tree=b.collector_tree AND a.canonical_path=m->>'path' AND a.artifact_kind=m->>'kind' AND a.git_blob=m->>'git_blob' AND a.content_sha256=m->>'sha256' AND a.content_byte_length=(m->>'byte_length')::bigint))
     OR EXISTS (SELECT 1 FROM silicon_forecast.collector_raw_artifact a WHERE a.bundle_id=p_bundle_id AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(b.manifest_json->'artifacts') m WHERE m->>'path'=a.canonical_path)) THEN RAISE EXCEPTION 'exact manifest membership mismatch' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM silicon_forecast.collector_raw_artifact a WHERE a.id=r.run_artifact_id AND a.bundle_id=p_bundle_id AND ((r.attempt_schema_version=1 AND a.artifact_kind='target_attempt_set' AND a.canonical_path='tests/fixtures/collector-persistence/attempt-set-v1.synthetic.json') OR (r.attempt_schema_version IS NULL AND a.artifact_kind='run_ledger' AND a.canonical_path='data/collection-runs/ledger.v1.json'))) THEN RAISE EXCEPTION 'run artifact kind/path mismatch' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM silicon_forecast.collector_raw_artifact a WHERE a.bundle_id=p_bundle_id AND a.artifact_kind='target_registry' AND a.canonical_path=r.target_registry_path AND a.content_sha256=r.target_registry_sha256) AND r.attempt_schema_version IS NULL THEN RAISE EXCEPTION 'target registry path/hash mismatch' USING ERRCODE='23514'; END IF;
  SELECT count(*),count(*) FILTER(WHERE outcome_raw='observation_retained') INTO attempt_count,retained_count FROM silicon_forecast.collector_target_attempt WHERE bundle_id=p_bundle_id;
  SELECT count(*) INTO evidence_count FROM silicon_forecast.collector_evidence_entry WHERE bundle_id=p_bundle_id;
  SELECT coalesce(sum(missing_identity_count),0) INTO gap_count FROM silicon_forecast.collector_attempt_gap WHERE bundle_id=p_bundle_id;
  IF retained_count<>r.observations_retained OR evidence_count<>retained_count THEN RAISE EXCEPTION 'retained lineage/count mismatch' USING ERRCODE='23514'; END IF;
  IF r.attempt_schema_version=1 THEN
    SELECT coalesce(jsonb_object_agg(reason,n),'{}'::jsonb) INTO computed_reasons FROM (SELECT raw_reasons->>0 reason,count(*) n FROM silicon_forecast.collector_target_attempt WHERE bundle_id=p_bundle_id AND outcome_raw<>'observation_retained' GROUP BY raw_reasons->>0) q;
    IF attempt_count<>r.targets_attempted OR gap_count<>0 OR r.selected_target_keys IS NULL OR jsonb_array_length(r.selected_target_keys)<>attempt_count OR (SELECT min(ordinal) FROM silicon_forecast.collector_target_attempt WHERE bundle_id=p_bundle_id) IS DISTINCT FROM 1 OR (SELECT max(ordinal) FROM silicon_forecast.collector_target_attempt WHERE bundle_id=p_bundle_id) IS DISTINCT FROM attempt_count OR (SELECT count(DISTINCT ordinal) FROM silicon_forecast.collector_target_attempt WHERE bundle_id=p_bundle_id)<>attempt_count OR computed_reasons IS DISTINCT FROM r.raw_abstention_reasons OR EXISTS (SELECT 1 FROM silicon_forecast.collector_target_attempt a WHERE a.bundle_id=p_bundle_id AND (a.legacy_detail_state<>'exact_v1' OR a.ordinal IS NULL OR a.target_key IS DISTINCT FROM r.selected_target_keys->>(a.ordinal-1))) THEN RAISE EXCEPTION 'exact attempt/order/reason reconciliation failed' USING ERRCODE='23514'; END IF;
  ELSE
    IF attempt_count+gap_count<>r.targets_attempted OR EXISTS (SELECT 1 FROM silicon_forecast.collector_attempt_gap g WHERE g.bundle_id=p_bundle_id AND g.aggregate_reason_map IS DISTINCT FROM r.raw_abstention_reasons) THEN RAISE EXCEPTION 'legacy attempt/gap/reason reconciliation failed' USING ERRCODE='23514'; END IF;
  END IF;
  FOR projection IN SELECT projection_batch_id FROM silicon_forecast.collector_projection_batch WHERE bundle_id=p_bundle_id LOOP
    IF (SELECT count(*) FROM silicon_forecast.collector_retail_offer_observation WHERE projection_batch_id=projection.projection_batch_id)<>retained_count THEN RAISE EXCEPTION 'projection observation count mismatch' USING ERRCODE='23514'; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM silicon_forecast.collector_retail_offer_observation o JOIN silicon_forecast.collector_target_attempt a ON (a.attempt_id,a.collection_run_id,a.bundle_id)=(o.attempt_id,o.collection_run_id,o.bundle_id) JOIN silicon_forecast.collector_evidence_entry e ON (e.evidence_id,e.collection_run_id,e.bundle_id)=(o.evidence_id,o.collection_run_id,o.bundle_id) WHERE o.bundle_id=p_bundle_id AND (a.observation_id_raw IS DISTINCT FROM o.observation_id_raw OR a.evidence_id_raw IS DISTINCT FROM o.evidence_id OR e.response_sha256 IS DISTINCT FROM o.response_sha256 OR e.facts_raw->>'mpn' IS DISTINCT FROM o.observed_mpn_raw)) THEN RAISE EXCEPTION 'factual lineage mismatch' USING ERRCODE='23514'; END IF;
END; $$;

CREATE VIEW silicon_forecast.collector_latest_candidate_offer_by_mpn_supplied_target AS
WITH coverage AS (
  SELECT normalised_mpn, count(DISTINCT supplied_target_identity) AS distinct_supplied_target_identity_count
  FROM silicon_forecast.collector_retail_offer_observation
  GROUP BY normalised_mpn
), ranked AS (
  SELECT o.*,
    row_number() OVER (
      PARTITION BY normalised_mpn, supplied_target_identity
      ORDER BY observed_at DESC, retrieved_at DESC,
        convert_to(observation_id_raw,'UTF8') DESC,
        convert_to(mapping_contract_version,'UTF8') DESC,
        convert_to(raw_observation_sha256,'UTF8') DESC
    ) AS candidate_rank
  FROM silicon_forecast.collector_retail_offer_observation o
)
SELECT ranked.*, coverage.distinct_supplied_target_identity_count
FROM ranked
JOIN coverage USING (normalised_mpn)
WHERE candidate_rank = 1;
CREATE VIEW silicon_forecast.collector_latest_released_offer_locked AS SELECT * FROM silicon_forecast.collector_latest_candidate_offer_by_mpn_supplied_target WHERE false;
CREATE VIEW silicon_forecast.collector_product_retailer_coverage AS
WITH attempt_coverage AS (
  SELECT upper(trim(a.expected_mpn_raw)) AS normalised_mpn,
    count(DISTINCT a.target_key) FILTER (WHERE a.target_key IS NOT NULL) AS intended_target_identities,
    count(DISTINCT a.attempt_id) AS attempts,
    max(a.attempt_completed_at) AS latest_attempted_at,
    count(*) FILTER (WHERE a.legacy_detail_state <> 'exact_v1') AS legacy_observation_derived_attempt_count,
    count(*) FILTER (WHERE a.legacy_detail_state = 'exact_v1' AND a.outcome_raw <> 'observation_retained') AS exact_failed_attempt_count,
    (array_agg(a.raw_reasons ORDER BY a.attempt_completed_at DESC NULLS LAST, a.ordinal DESC)
      FILTER (WHERE a.outcome_raw <> 'observation_retained'))[1] AS latest_raw_failure_reasons
  FROM silicon_forecast.collector_target_attempt a
  GROUP BY upper(trim(a.expected_mpn_raw))
), observation_coverage AS (
  SELECT o.normalised_mpn,
    count(DISTINCT o.supplied_target_identity) AS distinct_supplied_target_identity_count,
    count(DISTINCT o.retailer_id) FILTER (WHERE o.retailer_id IS NOT NULL) AS resolved_canonical_retailer_identity_count,
    count(DISTINCT o.observation_id_raw) AS retained_observations,
    max(o.observed_at) AS latest_observed_at,
    count(DISTINCT o.observation_id_raw) FILTER (WHERE o.retailer_id IS NULL OR o.source_id IS NULL) AS unresolved_identity_count
  FROM silicon_forecast.collector_retail_offer_observation o
  GROUP BY o.normalised_mpn
)
SELECT a.normalised_mpn,
  a.intended_target_identities,
  a.attempts,
  coalesce(o.distinct_supplied_target_identity_count,0)::bigint AS distinct_supplied_target_identity_count,
  coalesce(o.resolved_canonical_retailer_identity_count,0)::bigint AS resolved_canonical_retailer_identity_count,
  coalesce(o.retained_observations,0)::bigint AS retained_observations,
  0::bigint AS released_observations,
  a.latest_attempted_at,
  o.latest_observed_at,
  NULL::timestamptz AS latest_released_at,
  a.legacy_observation_derived_attempt_count,
  a.exact_failed_attempt_count,
  a.latest_raw_failure_reasons,
  coalesce(o.unresolved_identity_count,0)::bigint AS unresolved_identity_count,
  0::bigint AS legacy_unresolved_attempt_count
FROM attempt_coverage a
LEFT JOIN observation_coverage o USING (normalised_mpn)
UNION ALL
SELECT NULL::text AS normalised_mpn,
  0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
  NULL::timestamptz, NULL::timestamptz, NULL::timestamptz,
  0::bigint, 0::bigint,
  jsonb_agg(jsonb_build_object('quarantine_code',g.quarantine_code,'aggregate_reason_map',g.aggregate_reason_map) ORDER BY g.quarantine_code),
  0::bigint,
  sum(g.missing_identity_count)::bigint
FROM silicon_forecast.collector_attempt_gap g
HAVING count(*) > 0;

CREATE FUNCTION silicon_forecast.guard_collector_immutable_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, silicon_forecast
AS $$
DECLARE
  key_json jsonb;
  new_json jsonb := to_jsonb(NEW);
  actual_json jsonb;
  ignored_columns text[] := ARRAY[]::text[];
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'collector_mapping_contract' THEN key_json := jsonb_build_object('contract_version', new_json->'contract_version'); ignored_columns := ARRAY['registered_at'];
    WHEN 'collector_import_bundle' THEN key_json := jsonb_build_object('bundle_id', new_json->'bundle_id'); ignored_columns := ARRAY['imported_at'];
    WHEN 'collector_projection_batch' THEN key_json := jsonb_build_object('bundle_id', new_json->'bundle_id', 'mapping_contract_version', new_json->'mapping_contract_version'); ignored_columns := ARRAY['projected_at'];
    WHEN 'collector_raw_artifact' THEN key_json := jsonb_build_object('collector_commit', new_json->'collector_commit', 'canonical_path', new_json->'canonical_path'); ignored_columns := ARRAY['id'];
    WHEN 'collector_collection_run' THEN key_json := jsonb_build_object('collection_run_id', new_json->'collection_run_id');
    WHEN 'collector_observation_tranche' THEN key_json := jsonb_build_object('tranche_id', new_json->'tranche_id');
    WHEN 'collector_target_attempt' THEN key_json := jsonb_build_object('attempt_id', new_json->'attempt_id');
    WHEN 'collector_attempt_gap' THEN key_json := jsonb_build_object('collection_run_id', new_json->'collection_run_id', 'quarantine_code', new_json->'quarantine_code'); ignored_columns := ARRAY['gap_id'];
    WHEN 'collector_evidence_entry' THEN key_json := jsonb_build_object('evidence_id', new_json->'evidence_id');
    WHEN 'collector_retail_offer_observation' THEN key_json := jsonb_build_object('observation_id_raw', new_json->'observation_id_raw', 'projection_batch_id', new_json->'projection_batch_id'); ignored_columns := ARRAY['id'];
    WHEN 'collector_ingestion_quarantine' THEN key_json := jsonb_build_object('projection_batch_id', new_json->'projection_batch_id', 'subject_type', new_json->'subject_type', 'subject_identity', new_json->'subject_identity', 'reason_code', new_json->'reason_code'); ignored_columns := ARRAY['id','recorded_at'];
    ELSE RAISE EXCEPTION 'immutable insert guard denied for table %', TG_TABLE_NAME USING ERRCODE='42501';
  END CASE;

  EXECUTE format('SELECT to_jsonb(t) FROM silicon_forecast.%I t WHERE NOT EXISTS (SELECT 1 FROM jsonb_each($1) k WHERE to_jsonb(t)->k.key IS DISTINCT FROM k.value) LIMIT 1', TG_TABLE_NAME)
    INTO actual_json USING key_json;
  IF actual_json IS NULL THEN RETURN NEW; END IF;
  IF (actual_json - ignored_columns) IS DISTINCT FROM (new_json - ignored_columns) THEN
    RAISE EXCEPTION 'IMMUTABLE_REPLAY_COLLISION:%', TG_TABLE_NAME USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$$;

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['collector_mapping_contract','collector_import_bundle','collector_projection_batch','collector_raw_artifact','collector_collection_run','collector_observation_tranche','collector_target_attempt','collector_attempt_gap','collector_evidence_entry','collector_retail_offer_observation','collector_ingestion_quarantine'] LOOP EXECUTE format('CREATE TRIGGER %I_immutable_insert BEFORE INSERT ON silicon_forecast.%I FOR EACH ROW EXECUTE FUNCTION silicon_forecast.guard_collector_immutable_insert()',t,t); EXECUTE format('CREATE TRIGGER %I_append_only BEFORE UPDATE OR DELETE ON silicon_forecast.%I FOR EACH ROW EXECUTE FUNCTION silicon_forecast.reject_history_mutation()',t,t); EXECUTE format('REVOKE ALL ON silicon_forecast.%I FROM PUBLIC',t); EXECUTE format('GRANT SELECT, INSERT ON silicon_forecast.%I TO silicon_forecast_collector_fixture_importer',t); END LOOP; END $$;
REVOKE ALL ON FUNCTION silicon_forecast.assert_collector_bundle(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION silicon_forecast.assert_collector_replay(regclass,jsonb,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION silicon_forecast.guard_collector_immutable_insert() FROM PUBLIC;
REVOKE CREATE ON SCHEMA silicon_forecast FROM silicon_forecast_collector_fixture_importer;
GRANT USAGE ON SCHEMA silicon_forecast TO silicon_forecast_collector_fixture_importer;
GRANT EXECUTE ON FUNCTION silicon_forecast.assert_collector_bundle(text), silicon_forecast.assert_collector_replay(regclass,jsonb,jsonb) TO silicon_forecast_collector_fixture_importer;
GRANT SELECT ON silicon_forecast.collector_latest_candidate_offer_by_mpn_supplied_target, silicon_forecast.collector_latest_released_offer_locked, silicon_forecast.collector_product_retailer_coverage TO silicon_forecast_collector_fixture_importer;

COMMIT;
