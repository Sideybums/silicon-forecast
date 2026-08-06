\set ON_ERROR_STOP on

DO $$
DECLARE lock_count integer;
DECLARE gb_state text;
DECLARE method_state text;
DECLARE method_count integer;
DECLARE candidate_product_count integer;
DECLARE candidate_identifier_count integer;
DECLARE exact_catalogue_row_count integer;
BEGIN
  SELECT count(*) INTO lock_count
  FROM silicon_forecast.current_governance_lock
  WHERE scope_type = 'global' AND state = 'locked';
  IF lock_count <> 7 THEN
    RAISE EXCEPTION 'expected 7 locked global controls, found %', lock_count;
  END IF;

  SELECT lifecycle_state || ':' || is_public || ':' || is_retail_supported
    INTO gb_state
  FROM silicon_forecast.region WHERE code = 'GB';
  IF gb_state IS DISTINCT FROM 'candidate:false:false' THEN
    RAISE EXCEPTION 'GB seed is not candidate-only: %', gb_state;
  END IF;

  SELECT count(*), min(status) INTO method_count, method_state
  FROM silicon_forecast.methodology_version
  WHERE methodology_key = 'SF-GB-DDR5-32-UDIMM-OFFER';
  IF method_count <> 1 OR method_state IS DISTINCT FROM 'draft_locked' THEN
    RAISE EXCEPTION 'methodology seed is not draft_locked: %', method_state;
  END IF;

  SELECT count(*) INTO candidate_product_count
  FROM silicon_forecast.canonical_product_revision
  WHERE review_status = 'draft'
    AND evidence_reference LIKE '%research/evidence/catalogue-2026-08-06/%';
  IF candidate_product_count <> 4 THEN
    RAISE EXCEPTION 'expected 4 candidate catalogue products, found %', candidate_product_count;
  END IF;

  SELECT count(*) INTO candidate_identifier_count
  FROM silicon_forecast.canonical_product_identifier identifier
  JOIN silicon_forecast.canonical_product_revision revision
    ON revision.id = identifier.canonical_product_revision_id
  WHERE revision.evidence_reference LIKE '%research/evidence/catalogue-2026-08-06/%'
    AND identifier.identifier_type = 'MPN'
    AND identifier.is_primary;
  IF candidate_identifier_count <> 4 THEN
    RAISE EXCEPTION 'expected 4 primary candidate MPNs, found %', candidate_identifier_count;
  END IF;

  SELECT count(*) INTO exact_catalogue_row_count
  FROM (VALUES
    ('kingston-fury-beast-kf560c30bbek2-32', 'kingston-technology', 'KF560C30BBEK2-32', 6000),
    ('kingston-fury-renegade-kf564c32rsk2-32', 'kingston-technology', 'KF564C32RSK2-32', 6400),
    ('gskill-flare-x5-f5-6000j3636f16gx2-fx5', 'gskill', 'F5-6000J3636F16GX2-FX5', 6000),
    ('gskill-trident-z5-neo-rgb-f5-6000j3636f16gx2-tz5nr', 'gskill', 'F5-6000J3636F16GX2-TZ5NR', 6000)
  ) expected(product_key, manufacturer_key, mpn, speed_mt_s)
  JOIN silicon_forecast.canonical_product product
    ON product.stable_key = expected.product_key
  JOIN silicon_forecast.canonical_product_revision revision
    ON revision.canonical_product_id = product.id
   AND revision.revision_no = 1
   AND revision.mpn_raw = expected.mpn
   AND revision.mpn_normalized = expected.mpn
   AND revision.speed_mt_s = expected.speed_mt_s
   AND revision.memory_generation = 'DDR5'
   AND revision.total_capacity_gb = 32
   AND revision.module_count = 2
   AND revision.capacity_per_module_gb = 16
   AND revision.form_factor = 'UDIMM'
   AND NOT revision.ecc
   AND NOT revision.registered
   AND revision.buffering = 'unbuffered'
   AND revision.review_status = 'draft'
   AND revision.reviewed_by IS NULL
   AND revision.reviewed_at IS NULL
  JOIN silicon_forecast.manufacturer manufacturer
    ON manufacturer.id = revision.manufacturer_id
   AND manufacturer.stable_key = expected.manufacturer_key
  JOIN silicon_forecast.canonical_product_identifier identifier
    ON identifier.canonical_product_revision_id = revision.id
   AND identifier.manufacturer_id = manufacturer.id
   AND identifier.identifier_type = 'MPN'
   AND identifier.normalized_value = expected.mpn
   AND identifier.is_primary;
  IF exact_catalogue_row_count <> 4 THEN
    RAISE EXCEPTION 'candidate catalogue SQL does not faithfully map all four JSON records: %', exact_catalogue_row_count;
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE silicon_forecast.governance_lock_event
    SET reason = 'attempted mutation'
    WHERE lock_key = 'external_publish';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'append-only lock update unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    NULL;
  END;

  BEGIN
    UPDATE silicon_forecast.methodology_version
    SET status = 'active_private'
    WHERE methodology_key = 'SF-GB-DDR5-32-UDIMM-OFFER';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'append-only methodology update unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE silicon_forecast.region
    SET is_public = true
    WHERE code = 'GB';
    RAISE EXCEPTION 'candidate GB unexpectedly became public';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO silicon_forecast.worker_definition (
      worker_key, revision_no, purpose, input_contract, output_contract,
      allowed_tools, autonomy_tier, required_locks, untrusted_input_policy,
      escalation_policy, enabled, created_by
    ) VALUES (
      'tier-three-worker', 1, 'Must fail', '{}'::jsonb, '{}'::jsonb,
      '[]'::jsonb, 3, '[]'::jsonb, 'data_only_never_instructions',
      'Escalate to human', false, '00000000-0000-0000-0000-000000000001'
    );
    RAISE EXCEPTION 'Tier 3 worker unexpectedly inserted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO silicon_forecast.worker_definition (
      worker_key, revision_no, purpose, input_contract, output_contract,
      allowed_tools, autonomy_tier, required_locks, untrusted_input_policy,
      escalation_policy, enabled, created_by
    ) VALUES (
      'enabled-worker', 1, 'Must fail', '{}'::jsonb, '{}'::jsonb,
      '[]'::jsonb, 2, '[]'::jsonb, 'data_only_never_instructions',
      'Escalate to human', true, '00000000-0000-0000-0000-000000000001'
    );
    RAISE EXCEPTION 'enabled worker unexpectedly inserted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO silicon_forecast.governance_lock_event (
      lock_key, state, reason, changed_by, approval_decision_id, idempotency_key
    ) VALUES (
      'external_publish', 'unlocked', 'Must fail in foundation slice',
      '00000000-0000-0000-0000-000000000001', NULL,
      '31000000-0000-0000-0000-000000000001'
    );
    RAISE EXCEPTION 'unlock event unexpectedly inserted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

INSERT INTO silicon_forecast.manufacturer (id, stable_key, name)
VALUES ('40000000-0000-0000-0000-000000000001', 'fixture-memory-company', 'Fixture Memory Company');

INSERT INTO silicon_forecast.canonical_product (id, stable_key)
VALUES ('50000000-0000-0000-0000-000000000001', 'fixture-ddr5-kit-a');

DO $$
BEGIN
  BEGIN
    INSERT INTO silicon_forecast.canonical_product_revision (
      canonical_product_id, revision_no, manufacturer_id, model, mpn_raw, mpn_normalized,
      memory_generation, total_capacity_gb, module_count, capacity_per_module_gb,
      speed_mt_s, form_factor, ecc, registered, buffering, review_status,
      evidence_reference, created_by
    ) VALUES (
      '50000000-0000-0000-0000-000000000001', 1,
      '40000000-0000-0000-0000-000000000001', 'Fixture DDR5', 'FIX-64', 'FIX-64',
      'DDR5', 64, 2, 32, 6000, 'UDIMM', false, false, 'unbuffered', 'draft',
      'db/tests/foundation.sql#invalid-capacity', '00000000-0000-0000-0000-000000000001'
    );
    RAISE EXCEPTION 'invalid 64GB product unexpectedly inserted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

INSERT INTO silicon_forecast.canonical_product_revision (
  id, canonical_product_id, revision_no, manufacturer_id, model, mpn_raw, mpn_normalized,
  memory_generation, total_capacity_gb, module_count, capacity_per_module_gb,
  speed_mt_s, form_factor, ecc, registered, buffering, review_status,
  evidence_reference, created_by
) VALUES (
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001', 1,
  '40000000-0000-0000-0000-000000000001', 'Fixture DDR5', 'FIX-32', 'FIX-32',
  'DDR5', 32, 2, 16, 6000, 'UDIMM', false, false, 'unbuffered', 'draft',
  'db/tests/foundation.sql#valid-fixture', '00000000-0000-0000-0000-000000000001'
);

INSERT INTO silicon_forecast.canonical_product_identifier (
  canonical_product_revision_id, manufacturer_id, identifier_type, raw_value, normalized_value,
  is_primary, evidence_reference
) VALUES (
  '60000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001', 'MPN', 'FIX-32', 'FIX-32', true,
  'db/tests/foundation.sql#valid-fixture'
);

DO $$
BEGIN
  BEGIN
    UPDATE silicon_forecast.canonical_product_revision
    SET model = 'Silently changed model'
    WHERE id = '60000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'catalogue revision mutation unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    NULL;
  END;

  BEGIN
    DELETE FROM silicon_forecast.canonical_product_revision
    WHERE id = '60000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'catalogue revision delete unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    NULL;
  END;
END;
$$;

INSERT INTO silicon_forecast.source (id, stable_key, legal_name, source_type)
VALUES ('70000000-0000-0000-0000-000000000001', 'fixture-source', 'Fixture Source', 'fixture');

DO $$
BEGIN
  BEGIN
    INSERT INTO silicon_forecast.source_policy_revision (
      source_id, revision_no, access_route, rights_state, technical_access_state,
      production_approved, private_derived_use, public_display_use, historical_retention,
      restriction_summary, evidence_reference, evidence_sha256
    ) VALUES (
      '70000000-0000-0000-0000-000000000001', 1, 'fixture', 'unknown', 'pending',
      true, false, false, 'unknown', 'Unknown by design', 'db/tests/foundation.sql',
      repeat('0', 64)
    );
    RAISE EXCEPTION 'unreviewed source unexpectedly gained production approval';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

SELECT 'foundation database tests passed' AS result;
