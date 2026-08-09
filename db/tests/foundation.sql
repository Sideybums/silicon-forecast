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
  WHERE revision.review_status = 'draft'
    AND revision.evidence_reference LIKE '%research/evidence/catalogue-2026-08-06/%'
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

INSERT INTO silicon_forecast.canonical_product (id, stable_key)
VALUES ('50000000-0000-0000-0000-000000000002', 'fixture-ddr5-kit-b');

INSERT INTO silicon_forecast.canonical_product_revision (
  id, canonical_product_id, revision_no, manufacturer_id, model, mpn_raw, mpn_normalized,
  memory_generation, total_capacity_gb, module_count, capacity_per_module_gb,
  speed_mt_s, form_factor, ecc, registered, buffering, review_status,
  evidence_reference, created_by
) VALUES (
  '60000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000002', 1,
  '40000000-0000-0000-0000-000000000001', 'Conflicting Fixture DDR5', 'FIX-32', 'FIX-32',
  'DDR5', 32, 2, 16, 6000, 'UDIMM', false, false, 'unbuffered', 'draft',
  'db/tests/foundation.sql#identifier-lineage-conflict', '00000000-0000-0000-0000-000000000001'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO silicon_forecast.canonical_product_identifier (
      canonical_product_revision_id, manufacturer_id, identifier_type, raw_value,
      normalized_value, is_primary, evidence_reference
    ) VALUES (
      '60000000-0000-0000-0000-000000000002',
      '40000000-0000-0000-0000-000000000001', 'MPN', 'FIX-32', 'FIX-32', true,
      'db/tests/foundation.sql#identifier-lineage-conflict'
    );
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'identifier ownership collision unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO silicon_forecast.canonical_product_revision (
      canonical_product_id, revision_no, manufacturer_id, model, mpn_raw, mpn_normalized,
      memory_generation, total_capacity_gb, module_count, capacity_per_module_gb,
      speed_mt_s, form_factor, ecc, registered, buffering, review_status,
      supersedes_revision_id, evidence_reference, reviewed_by, reviewed_at, created_by
    ) VALUES (
      '50000000-0000-0000-0000-000000000002', 2,
      '40000000-0000-0000-0000-000000000001', 'Unauthorised Reviewed Fixture', 'FIX-33', 'FIX-33',
      'DDR5', 32, 2, 16, 6000, 'UDIMM', false, false, 'unbuffered', 'reviewed',
      '60000000-0000-0000-0000-000000000002', 'db/tests/foundation.sql#unauthorised-review',
      '00000000-0000-0000-0000-000000000002', statement_timestamp(),
      '00000000-0000-0000-0000-000000000002'
    );
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'unscoped reviewed revision unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

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

DO $$
DECLARE reviewed_count integer;
DECLARE reviewed_identifier_count integer;
DECLARE review_application_count integer;
DECLARE review_audit_count integer;
DECLARE lock_count integer;
BEGIN
  SELECT count(*) INTO reviewed_count
  FROM silicon_forecast.canonical_product_revision reviewed
  JOIN silicon_forecast.canonical_product_revision draft
    ON draft.id = reviewed.supersedes_revision_id
  WHERE reviewed.review_status = 'reviewed'
    AND reviewed.authority_scope = 'fixture_only'
    AND reviewed.fixture_review_application_id IS NOT NULL
    AND reviewed.revision_no = draft.revision_no + 1
    AND draft.review_status = 'draft'
    AND reviewed.reviewed_by = '00000000-0000-0000-0000-000000000002'
    AND reviewed.reviewed_at = '2026-08-06T09:21:11Z'::timestamptz
    AND reviewed.evidence_reference::jsonb ->> 'fixture_review'
      = 'data/reviews/ddr5-32gb-seed-review-2026-08-06.json';
  IF reviewed_count <> 4 THEN
    RAISE EXCEPTION 'expected four additive reviewed revisions, found %', reviewed_count;
  END IF;

  SELECT count(*) INTO reviewed_identifier_count
  FROM silicon_forecast.canonical_product_identifier identifier
  JOIN silicon_forecast.canonical_product_revision revision
    ON revision.id = identifier.canonical_product_revision_id
  WHERE revision.review_status = 'reviewed'
    AND identifier.identifier_type = 'MPN'
    AND identifier.is_primary;
  IF reviewed_identifier_count <> 4 THEN
    RAISE EXCEPTION 'expected four reviewed primary MPNs, found %', reviewed_identifier_count;
  END IF;

  SELECT count(*) INTO review_application_count
  FROM silicon_forecast.catalogue_fixture_review_application application
  JOIN silicon_forecast.approval_decision decision
    ON decision.id = application.approval_decision_id
  WHERE application.review_key = 'sf-ddr5-32gb-seed-human-review-2026-08-06'
    AND application.catalogue_fixture_set_id = 'sf-ddr5-32gb-seed-2026-08-06'
    AND application.catalogue_sha256 = '98572936896e59c83f90ba796f6c6c3a917e1a304530163744dabb63f572d568'
    AND application.listing_fixture_set_id = 'sf-ddr5-listing-labels-2026-08-06'
    AND application.listing_sha256 = '554627a43ab56578da9d39ba698fef6f66753ed57befa8638a35a287b84a7001'
    AND application.evidence_sha256 = '86fef1c0bd47279ece52be6dbbb03502138ea42dd5586a94c06a84beb6c7f801'
    AND EXISTS (
      SELECT 1
      FROM silicon_forecast.catalogue_fixture_set_manifest manifest
      WHERE manifest.catalogue_fixture_set_id = application.catalogue_fixture_set_id
        AND manifest.catalogue_sha256 = application.catalogue_sha256
        AND manifest.listing_fixture_set_id = application.listing_fixture_set_id
        AND manifest.listing_sha256 = application.listing_sha256
    )
    AND jsonb_array_length(application.product_keys) = 4
    AND jsonb_array_length(application.listing_example_ids) = 20
    AND application.limitations ? 'does_not_approve_production_activation'
    AND application.limitations ? 'does_not_enable_automatic_product_matching'
    AND decision.decision_type = 'catalogue_fixture_review'
    AND decision.decision = 'approve';
  IF review_application_count <> 1 THEN
    RAISE EXCEPTION 'fixture review application or approval record is incomplete';
  END IF;

  SELECT count(*) INTO review_audit_count
  FROM silicon_forecast.audit_event
  WHERE action = 'catalogue_fixture_review_applied'
    AND approval_decision_id = (
      SELECT approval_decision_id
      FROM silicon_forecast.catalogue_fixture_review_application
      WHERE review_key = 'sf-ddr5-32gb-seed-human-review-2026-08-06'
    );
  IF review_audit_count <> 4 THEN
    RAISE EXCEPTION 'expected four attributable catalogue review audit events, found %', review_audit_count;
  END IF;

  SELECT count(*) INTO lock_count
  FROM silicon_forecast.current_governance_lock
  WHERE state = 'locked';
  IF lock_count <> 7 THEN
    RAISE EXCEPTION 'fixture review changed a governance lock';
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE silicon_forecast.catalogue_fixture_review_application
    SET catalogue_fixture_set_id = 'silently-mutated'
    WHERE review_key = 'sf-ddr5-32gb-seed-human-review-2026-08-06';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'fixture review application mutation unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE silicon_forecast.catalogue_fixture_set_manifest
    SET catalogue_sha256 = repeat('0', 64)
    WHERE catalogue_fixture_set_id = 'sf-ddr5-32gb-seed-2026-08-06';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'fixture manifest mutation unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    NULL;
  END;
END;
$$;

SET ROLE silicon_forecast_catalogue_reviewer;
DO $$
BEGIN
  BEGIN
    INSERT INTO silicon_forecast.canonical_product (stable_key)
    VALUES ('reviewer-direct-write-must-fail');
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'reviewer role gained direct catalogue write access';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

SELECT 'foundation database tests passed' AS result;
