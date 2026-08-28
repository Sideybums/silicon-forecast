\set ON_ERROR_STOP on

DO $$
DECLARE legacy_bundle text; synthetic_bundle text;
BEGIN
  SELECT bundle_id INTO STRICT legacy_bundle FROM silicon_forecast.collector_collection_run WHERE collection_run_id='sf-collection-run-20260825T103008Z';
  SELECT bundle_id INTO STRICT synthetic_bundle FROM silicon_forecast.collector_collection_run WHERE collection_run_id='sf-collection-run-20260826T103000Z';
  IF (SELECT count(*) FROM silicon_forecast.collector_raw_artifact WHERE bundle_id=legacy_bundle) <> 6 THEN RAISE EXCEPTION 'legacy raw artifact count'; END IF;
  IF (SELECT count(*) FROM silicon_forecast.collector_target_attempt WHERE bundle_id=legacy_bundle) <> 35 THEN RAISE EXCEPTION 'legacy attempts must be 35 real observation-derived rows'; END IF;
  IF (SELECT count(*) FROM silicon_forecast.collector_target_attempt WHERE bundle_id=legacy_bundle AND ordinal IS NOT NULL) <> 0 THEN RAISE EXCEPTION 'legacy ordinals were invented'; END IF;
  IF (SELECT missing_identity_count FROM silicon_forecast.collector_attempt_gap WHERE bundle_id=legacy_bundle) <> 10 THEN RAISE EXCEPTION 'legacy ten-count gap absent'; END IF;
  IF (SELECT count(*) FROM silicon_forecast.collector_evidence_entry WHERE bundle_id=legacy_bundle) <> 35 OR (SELECT count(*) FROM silicon_forecast.collector_retail_offer_observation WHERE bundle_id=legacy_bundle) <> 35 THEN RAISE EXCEPTION 'legacy retained lineage count'; END IF;
  IF (SELECT count(*) FROM silicon_forecast.collector_target_attempt WHERE bundle_id=synthetic_bundle) <> 45 OR (SELECT count(*) FROM silicon_forecast.collector_target_attempt WHERE bundle_id=synthetic_bundle AND outcome_raw='observation_retained') <> 2 OR (SELECT count(*) FROM silicon_forecast.collector_target_attempt WHERE bundle_id=synthetic_bundle AND outcome_raw<>'observation_retained') <> 43 THEN RAISE EXCEPTION 'synthetic exact attempts not persisted'; END IF;
  IF EXISTS (SELECT 1 FROM silicon_forecast.collector_target_attempt a JOIN silicon_forecast.collector_collection_run r USING(collection_run_id) WHERE a.bundle_id=synthetic_bundle AND a.target_key <> r.selected_target_keys->>(a.ordinal-1)) THEN RAISE EXCEPTION 'synthetic target order changed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM silicon_forecast.collector_retail_offer_observation WHERE bundle_id=legacy_bundle AND availability_raw->>'normalised'='other' AND delivery_raw->>'destination_basis' IS NULL AND raw_observation->'evidence'->'extract_sha256'='null'::jsonb AND observation_id_raw LIKE '%:%') THEN RAISE EXCEPTION 'lossless raw vocabulary/null/colon round trip failed'; END IF;
  IF EXISTS (SELECT 1 FROM silicon_forecast.collector_latest_released_offer_locked) THEN RAISE EXCEPTION 'released locked view is not empty'; END IF;
  IF to_regclass('silicon_forecast.collector_mapping_decision') IS NOT NULL OR to_regclass('silicon_forecast.collector_offer_release_binding') IS NOT NULL THEN RAISE EXCEPTION 'forbidden authority table exists'; END IF;
END $$;

DO $$ BEGIN
  BEGIN
    INSERT INTO silicon_forecast.collector_mapping_contract(contract_version,manifest_sha256,manifest_byte_length,manifest_bytes,manifest_json)
    SELECT contract_version, encode(digest(decode('00','hex'),'sha256'),'hex'), 1, decode('00','hex'), '{}'::jsonb FROM silicon_forecast.collector_mapping_contract LIMIT 1;
    RAISE EXCEPTION 'mapping version collision accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

DO $$
DECLARE before_count bigint;
BEGIN
  SELECT count(*) INTO before_count FROM silicon_forecast.collector_mapping_contract;
  INSERT INTO silicon_forecast.collector_mapping_contract(contract_version,manifest_sha256,manifest_byte_length,manifest_bytes,manifest_json)
  SELECT contract_version,manifest_sha256,manifest_byte_length,manifest_bytes,manifest_json FROM silicon_forecast.collector_mapping_contract LIMIT 1;
  IF (SELECT count(*) FROM silicon_forecast.collector_mapping_contract) <> before_count THEN RAISE EXCEPTION 'identical replay duplicated mapping contract'; END IF;
END $$;

DO $$ BEGIN
  BEGIN
    INSERT INTO silicon_forecast.collector_raw_artifact(bundle_id,collector_commit,collector_tree,canonical_path,git_blob,content_byte_length,content_sha256,artifact_kind,raw_bytes,parsed_json)
    SELECT bundle_id,collector_commit,collector_tree,canonical_path,git_blob,content_byte_length,content_sha256,artifact_kind,raw_bytes,parsed_json || '{"collision":true}'::jsonb
    FROM silicon_forecast.collector_raw_artifact LIMIT 1;
    RAISE EXCEPTION 'changed raw artifact replay accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('collector_import_bundle','collector_tree'),
    ('collector_projection_batch','projection_digest'),
    ('collector_collection_run','outcome'),
    ('collector_observation_tranche','status_raw'),
    ('collector_target_attempt','retention_note_raw'),
    ('collector_attempt_gap','provenance_note'),
    ('collector_evidence_entry','retention_note_raw'),
    ('collector_retail_offer_observation','currency_raw'),
    ('collector_ingestion_quarantine','collection_run_id')
  ) AS x(table_name,column_name)
  LOOP
    BEGIN
      EXECUTE format(
        'INSERT INTO silicon_forecast.%1$I SELECT (jsonb_populate_record(NULL::silicon_forecast.%1$I, to_jsonb(t) || jsonb_build_object(%2$L,(to_jsonb(t)->>%2$L) || '':changed''))).* FROM silicon_forecast.%1$I t LIMIT 1',
        item.table_name,item.column_name
      );
      RAISE EXCEPTION 'changed-content replay accepted on %',item.table_name;
    EXCEPTION WHEN check_violation THEN NULL;
    END;
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('silicon_forecast_collector_fixture_importer','silicon_forecast.collector_import_bundle','SELECT,INSERT') THEN RAISE EXCEPTION 'fixture importer lacks collector table privileges'; END IF;
  IF has_table_privilege('silicon_forecast_collector_fixture_importer','silicon_forecast.canonical_product','INSERT,UPDATE,DELETE')
     OR has_table_privilege('silicon_forecast_collector_fixture_importer','silicon_forecast.source_policy_revision','INSERT,UPDATE,DELETE')
     OR has_table_privilege('silicon_forecast_collector_fixture_importer','silicon_forecast.candidate_primary_retail_observation','INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'fixture importer can mutate unrelated authority tables'; END IF;
END $$;

DO $$
DECLARE
  legacy_bundle text;
  v2_bytes bytea := convert_to('{"contract":"fixture-mapping-v2"}' || chr(10),'UTF8');
  v2_sha text;
  v2_projection text := repeat('d',64);
  raw_count_before bigint;
BEGIN
  v2_sha := encode(digest(v2_bytes,'sha256'),'hex');
  SELECT bundle_id INTO STRICT legacy_bundle FROM silicon_forecast.collector_collection_run WHERE collection_run_id='sf-collection-run-20260825T103008Z';
  SELECT count(*) INTO raw_count_before FROM silicon_forecast.collector_raw_artifact WHERE bundle_id=legacy_bundle;
  INSERT INTO silicon_forecast.collector_mapping_contract(contract_version,manifest_sha256,manifest_byte_length,manifest_bytes,manifest_json)
  VALUES ('sf-collector-mapping-v2-fixture',v2_sha,octet_length(v2_bytes),v2_bytes,'{"contract":"fixture-mapping-v2"}'::jsonb);
  INSERT INTO silicon_forecast.collector_projection_batch(projection_batch_id,bundle_id,mapping_contract_version,mapping_contract_sha256,projection_digest,projection_manifest)
  VALUES (v2_projection,legacy_bundle,'sf-collector-mapping-v2-fixture',v2_sha,v2_projection,jsonb_build_object('bundle_id',legacy_bundle,'mapping_contract_version','sf-collector-mapping-v2-fixture','mapping_contract_sha256',v2_sha));
  INSERT INTO silicon_forecast.collector_retail_offer_observation(
    observation_id_raw,collection_run_id,bundle_id,projection_batch_id,tranche_id,attempt_id,evidence_id,
    mapping_contract_version,mapping_contract_sha256,expected_mpn_raw,observed_mpn_raw,normalised_mpn,supplied_target_identity,
    canonical_product_id,canonical_product_revision_id,retailer_id,source_id,source_policy_revision_id,seller_raw,availability_raw,
    availability_normalised,delivery_raw,landed_price_raw,qualification_raw,qualification_normalised,item_price_minor,currency_raw,
    observed_at,retrieved_at,source_url_raw,final_url_raw,response_sha256,raw_observation_sha256,raw_observation,
    candidate_only,production_import_allowed,index_eligible,publication_allowed)
  SELECT observation_id_raw,collection_run_id,bundle_id,v2_projection,tranche_id,attempt_id,evidence_id,
    'sf-collector-mapping-v2-fixture',v2_sha,expected_mpn_raw,observed_mpn_raw,normalised_mpn,supplied_target_identity,
    canonical_product_id,canonical_product_revision_id,retailer_id,source_id,source_policy_revision_id,seller_raw,availability_raw,
    availability_normalised,delivery_raw,landed_price_raw,qualification_raw,qualification_normalised,item_price_minor,currency_raw,
    observed_at,retrieved_at,source_url_raw,final_url_raw,response_sha256,raw_observation_sha256,raw_observation,
    candidate_only,production_import_allowed,index_eligible,publication_allowed
  FROM silicon_forecast.collector_retail_offer_observation
  WHERE bundle_id=legacy_bundle AND mapping_contract_version='sf-collector-mapping-v1';
  PERFORM silicon_forecast.assert_collector_bundle(legacy_bundle);
  IF (SELECT count(*) FROM silicon_forecast.collector_raw_artifact WHERE bundle_id=legacy_bundle) <> raw_count_before THEN RAISE EXCEPTION 'mapping v2 duplicated acquisition evidence'; END IF;
  IF (SELECT count(*) FROM silicon_forecast.collector_projection_batch WHERE bundle_id=legacy_bundle) <> 2 THEN RAISE EXCEPTION 'mapping v2 projection batch absent'; END IF;
  IF (SELECT count(*) FROM silicon_forecast.collector_retail_offer_observation WHERE projection_batch_id=v2_projection) <> 35 THEN RAISE EXCEPTION 'mapping v2 projection incomplete'; END IF;
  IF (SELECT sum(attempts) FROM silicon_forecast.collector_product_retailer_coverage WHERE normalised_mpn IS NOT NULL) <> (SELECT count(*) FROM silicon_forecast.collector_target_attempt) THEN RAISE EXCEPTION 'coverage duplicates acquisition attempts across projections'; END IF;
  IF (SELECT sum(retained_observations) FROM silicon_forecast.collector_product_retailer_coverage WHERE normalised_mpn IS NOT NULL) <> (SELECT count(DISTINCT observation_id_raw) FROM silicon_forecast.collector_retail_offer_observation) THEN RAISE EXCEPTION 'coverage duplicates retained observations across projections'; END IF;
  IF (SELECT legacy_unresolved_attempt_count FROM silicon_forecast.collector_product_retailer_coverage WHERE normalised_mpn IS NULL) <> 10 THEN RAISE EXCEPTION 'coverage legacy gap is not explicit'; END IF;
  IF (SELECT sum(exact_failed_attempt_count) FROM silicon_forecast.collector_product_retailer_coverage WHERE normalised_mpn IS NOT NULL) <> 43 THEN RAISE EXCEPTION 'coverage failed-attempt count incorrect'; END IF;
  IF NOT EXISTS (SELECT 1 FROM silicon_forecast.collector_product_retailer_coverage WHERE latest_raw_failure_reasons IS NOT NULL) THEN RAISE EXCEPTION 'coverage raw failure reasons absent'; END IF;
END $$;

DO $$ BEGIN
  BEGIN
    INSERT INTO silicon_forecast.collector_retail_offer_observation
    SELECT gen_random_uuid(), observation_id_raw || ':authority-test', collection_run_id,bundle_id,projection_batch_id,tranche_id,attempt_id,evidence_id,mapping_contract_version,mapping_contract_sha256,expected_mpn_raw,observed_mpn_raw,normalised_mpn,supplied_target_identity,canonical_product_id,canonical_product_revision_id,retailer_id,source_id,source_policy_revision_id,seller_raw,availability_raw,availability_normalised,delivery_raw,landed_price_raw,qualification_raw,qualification_normalised,item_price_minor,currency_raw,observed_at,retrieved_at,source_url_raw,final_url_raw,response_sha256,raw_observation_sha256,raw_observation,true,true,false,false
    FROM silicon_forecast.collector_retail_offer_observation LIMIT 1;
    RAISE EXCEPTION 'true authority accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('collector_mapping_contract','registered_at'),('collector_import_bundle','imported_at'),('collector_projection_batch','projection_digest'),('collector_raw_artifact','artifact_kind'),('collector_collection_run','outcome'),('collector_observation_tranche','status_raw'),('collector_target_attempt','retention_note_raw'),('collector_attempt_gap','provenance_note'),('collector_evidence_entry','retention_note_raw'),('collector_retail_offer_observation','currency_raw'),('collector_ingestion_quarantine','subject_identity')
  ) AS x(table_name,column_name)
  LOOP
    BEGIN EXECUTE format('UPDATE silicon_forecast.%I SET %I=%I WHERE ctid=(SELECT ctid FROM silicon_forecast.%I LIMIT 1)',item.table_name,item.column_name,item.column_name,item.table_name); RAISE EXCEPTION 'update accepted on %',item.table_name; EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
    BEGIN EXECUTE format('DELETE FROM silicon_forecast.%I WHERE ctid=(SELECT ctid FROM silicon_forecast.%I LIMIT 1)',item.table_name,item.table_name); RAISE EXCEPTION 'delete accepted on %',item.table_name; EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  END LOOP;
END $$;

SELECT silicon_forecast.assert_collector_bundle((SELECT bundle_id FROM silicon_forecast.collector_collection_run WHERE collection_run_id='sf-collection-run-20260825T103008Z'));
SELECT silicon_forecast.assert_collector_bundle((SELECT bundle_id FROM silicon_forecast.collector_collection_run WHERE collection_run_id='sf-collection-run-20260826T103000Z'));
