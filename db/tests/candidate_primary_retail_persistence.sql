\set ON_ERROR_STOP on

INSERT INTO silicon_forecast.retailer_group (id, stable_key, legal_name)
VALUES ('71000000-0000-0000-0000-000000000001', 'fixture-retail-group', 'Fixture Retail Group');

INSERT INTO silicon_forecast.retailer (
  id, retailer_group_id, region_id, stable_key, legal_name, website_domain,
  status, marketplace_allowed, tax_semantics, is_active
) VALUES
  ('72000000-0000-0000-0000-000000000001',
   '71000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'fixture-primary-retailer', 'Fixture Primary Retailer', 'retailer.invalid',
   'candidate', false, 'unknown', false),
  ('72000000-0000-0000-0000-000000000002',
   '71000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'fixture-other-retailer', 'Fixture Other Retailer', 'other-retailer.invalid',
   'candidate', false, 'unknown', false);

INSERT INTO silicon_forecast.source_policy_revision (
  id, source_id, revision_no, access_route, rights_state, technical_access_state,
  production_approved, private_derived_use, public_display_use, historical_retention,
  restriction_summary, evidence_reference, evidence_sha256
) VALUES (
  '73000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 1, 'fixture-only',
  'unknown', 'sample_only', false, false, false, 'unknown',
  'Fixture-only candidate evidence; no production or display authority.',
  'db/tests/candidate_primary_retail_persistence.sql', repeat('a', 64)
);

INSERT INTO silicon_forecast.candidate_primary_retail_observation (
  id, observation_key, region_id, canonical_product_id, canonical_product_revision_id,
  retailer_id, source_id, source_policy_revision_id, observed_at, retrieved_at,
  channel, mpn_expected, mpn_observed, match_basis, identity_evidence,
  seller_of_record, seller_relationship, seller_evidence,
  item_price_minor, currency_code, vat_state, vat_evidence,
  availability, availability_evidence, delivery_state, delivery_amount_minor,
  delivery_destination_basis, delivery_evidence, landed_price_state,
  landed_price_minor, landed_price_evidence, qualification_status,
  qualification_reason_codes, source_url, evidence_reference, evidence_sha256
) VALUES
  ('74000000-0000-0000-0000-000000000001', 'fixture-retail-observation-day-one',
   '10000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000001',
   '72000000-0000-0000-0000-000000000001',
   '70000000-0000-0000-0000-000000000001',
   '73000000-0000-0000-0000-000000000001',
   '2026-08-01T10:00:00Z', '2026-08-01T10:00:05Z',
   'PRIMARY_RETAIL', 'FIX-32', 'FIX-32', 'exact_mpn', 'fixture#identity-1',
   'Fixture Primary Retailer', 'retailer_owned', 'fixture#seller-1',
   9999, 'GBP', 'included', 'fixture#vat-1',
   'in_stock', 'fixture#availability-1', 'free_delivery_explicit', 0,
   'fixture UK destination', 'fixture#delivery-1', 'eligible', 9999,
   'fixture#landed-1', 'eligible', ARRAY[]::text[],
   'https://retailer.invalid/fixture-1', 'fixture://observation-1', repeat('1', 64)),
  ('74000000-0000-0000-0000-000000000002', 'fixture-retail-observation-day-two',
   '10000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000001',
   '72000000-0000-0000-0000-000000000001',
   '70000000-0000-0000-0000-000000000001',
   '73000000-0000-0000-0000-000000000001',
   '2026-08-08T10:00:00Z', '2026-08-08T10:00:05Z',
   'PRIMARY_RETAIL', 'FIX-32', 'FIX-32', 'exact_mpn', 'fixture#identity-2',
   'Fixture Primary Retailer', 'retailer_owned', 'fixture#seller-2',
   9498, 'GBP', 'included', 'fixture#vat-2',
   'in_stock', 'fixture#availability-2', 'free_delivery_explicit', 0,
   'fixture UK destination', 'fixture#delivery-2', 'eligible', 9498,
   'fixture#landed-2', 'eligible', ARRAY[]::text[],
   'https://retailer.invalid/fixture-2', 'fixture://observation-2', repeat('2', 64)),
  ('74000000-0000-0000-0000-000000000003', 'fixture-retail-observation-abstained',
   '10000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000001',
   '72000000-0000-0000-0000-000000000001',
   '70000000-0000-0000-0000-000000000001',
   '73000000-0000-0000-0000-000000000001',
   '2026-08-15T10:00:00Z', '2026-08-15T10:00:05Z',
   'PRIMARY_RETAIL', 'FIX-32', 'FIX-32', 'exact_mpn', 'fixture#identity-3',
   'Unknown seller', 'unresolved', 'fixture#seller-3',
   9399, 'GBP', 'included', 'fixture#vat-3',
   'in_stock', 'fixture#availability-3', 'free_delivery_explicit', 0,
   'fixture UK destination', 'fixture#delivery-3', 'eligible', 9399,
   'fixture#landed-3', 'abstain', ARRAY['retailer_owned_seller_unresolved'],
   'https://retailer.invalid/fixture-3', 'fixture://observation-3', repeat('3', 64));

DO $$
DECLARE observation_count integer;
BEGIN
  SELECT count(*) INTO observation_count
  FROM silicon_forecast.candidate_primary_retail_observation
  WHERE NOT production_import_allowed
    AND NOT production_activation_allowed
    AND NOT methodology_approval_allowed
    AND NOT index_inclusion_allowed
    AND NOT publication_allowed;
  IF observation_count <> 3 THEN
    RAISE EXCEPTION 'expected three appended candidate observations, found %', observation_count;
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE silicon_forecast.candidate_primary_retail_observation
    SET seller_of_record = 'Silently changed seller'
    WHERE id = '74000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'observation mutation unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;
  BEGIN
    DELETE FROM silicon_forecast.candidate_primary_retail_observation
    WHERE id = '74000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'observation deletion unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO silicon_forecast.candidate_primary_retail_observation (
      observation_key, region_id, canonical_product_id, canonical_product_revision_id,
      retailer_id, source_id, source_policy_revision_id, observed_at, retrieved_at,
      channel, mpn_expected, mpn_observed, match_basis, identity_evidence,
      seller_of_record, seller_relationship, seller_evidence, item_price_minor,
      currency_code, vat_state, vat_evidence, availability, availability_evidence,
      delivery_state, delivery_amount_minor, delivery_destination_basis, delivery_evidence,
      landed_price_state, landed_price_minor, landed_price_evidence,
      qualification_status, qualification_reason_codes, source_url,
      evidence_reference, evidence_sha256
    ) SELECT
      'invalid-landed-price', region_id, canonical_product_id, canonical_product_revision_id,
      retailer_id, source_id, source_policy_revision_id, observed_at, retrieved_at,
      channel, mpn_expected, mpn_observed, match_basis, identity_evidence,
      seller_of_record, seller_relationship, seller_evidence, item_price_minor,
      currency_code, vat_state, vat_evidence, availability, availability_evidence,
      delivery_state, delivery_amount_minor, delivery_destination_basis, delivery_evidence,
      landed_price_state, landed_price_minor + 1, landed_price_evidence,
      qualification_status, qualification_reason_codes, source_url,
      evidence_reference, evidence_sha256
    FROM silicon_forecast.candidate_primary_retail_observation
    WHERE id = '74000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'invalid landed price unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO silicon_forecast.candidate_primary_retail_observation (
      observation_key, region_id, canonical_product_id, canonical_product_revision_id,
      retailer_id, source_id, source_policy_revision_id, observed_at, retrieved_at,
      channel, mpn_expected, mpn_observed, match_basis, identity_evidence,
      seller_of_record, seller_relationship, seller_evidence, item_price_minor,
      currency_code, vat_state, vat_evidence, availability, availability_evidence,
      delivery_state, delivery_amount_minor, delivery_destination_basis, delivery_evidence,
      landed_price_state, landed_price_minor, landed_price_evidence,
      qualification_status, qualification_reason_codes, source_url,
      evidence_reference, evidence_sha256
    ) SELECT
      'invalid-non-retail-channel', region_id, canonical_product_id, canonical_product_revision_id,
      retailer_id, source_id, source_policy_revision_id, observed_at, retrieved_at,
      'MARKETPLACE', mpn_expected, mpn_observed, match_basis, identity_evidence,
      seller_of_record, seller_relationship, seller_evidence, item_price_minor,
      currency_code, vat_state, vat_evidence, availability, availability_evidence,
      delivery_state, delivery_amount_minor, delivery_destination_basis, delivery_evidence,
      landed_price_state, landed_price_minor, landed_price_evidence,
      qualification_status, qualification_reason_codes, source_url,
      evidence_reference, evidence_sha256
    FROM silicon_forecast.candidate_primary_retail_observation
    WHERE id = '74000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'non-retail observation unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO silicon_forecast.candidate_primary_retail_observation (
      observation_key, authority_scope, production_import_allowed,
      index_inclusion_allowed, publication_allowed,
      region_id, canonical_product_id, canonical_product_revision_id,
      retailer_id, source_id, source_policy_revision_id, observed_at, retrieved_at,
      channel, mpn_expected, mpn_observed, match_basis, identity_evidence,
      seller_of_record, seller_relationship, seller_evidence, item_price_minor,
      currency_code, vat_state, vat_evidence, availability, availability_evidence,
      delivery_state, delivery_amount_minor, delivery_destination_basis, delivery_evidence,
      landed_price_state, landed_price_minor, landed_price_evidence,
      qualification_status, qualification_reason_codes, source_url,
      evidence_reference, evidence_sha256
    ) SELECT
      'invalid-governance-unlock', authority_scope, true, false, false,
      region_id, canonical_product_id, canonical_product_revision_id,
      retailer_id, source_id, source_policy_revision_id, observed_at, retrieved_at,
      channel, mpn_expected, mpn_observed, match_basis, identity_evidence,
      seller_of_record, seller_relationship, seller_evidence, item_price_minor,
      currency_code, vat_state, vat_evidence, availability, availability_evidence,
      delivery_state, delivery_amount_minor, delivery_destination_basis, delivery_evidence,
      landed_price_state, landed_price_minor, landed_price_evidence,
      qualification_status, qualification_reason_codes, source_url,
      evidence_reference, evidence_sha256
    FROM silicon_forecast.candidate_primary_retail_observation
    WHERE id = '74000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'governance unlock unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

SET ROLE silicon_forecast_candidate_movement_writer;
INSERT INTO silicon_forecast.candidate_retailer_product_movement (
  id, movement_key, calculation_version, region_id, canonical_product_id, retailer_id,
  from_observation_id, to_observation_id, from_date, to_date,
  from_landed_price_minor, to_landed_price_minor, change_minor,
  change_basis_points, direction
) VALUES (
  '75000000-0000-0000-0000-000000000001', 'fixture-retail-movement-one',
  'candidate-primary-retail-movement-v1',
  '10000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '72000000-0000-0000-0000-000000000001',
  '74000000-0000-0000-0000-000000000001',
  '74000000-0000-0000-0000-000000000002',
  '2026-08-01', '2026-08-08', 9999, 9498, -501, -501, 'down'
);
RESET ROLE;

DO $$
BEGIN
  BEGIN
    INSERT INTO silicon_forecast.candidate_retailer_product_movement (
      movement_key, calculation_version, region_id, canonical_product_id, retailer_id,
      from_observation_id, to_observation_id, from_date, to_date,
      from_landed_price_minor, to_landed_price_minor, change_minor,
      change_basis_points, direction
    ) VALUES (
      'invalid-movement-abstained-input', 'candidate-primary-retail-movement-v1',
      '10000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      '74000000-0000-0000-0000-000000000001',
      '74000000-0000-0000-0000-000000000003',
      '2026-08-01', '2026-08-15', 9999, 9399, -600, -600, 'down'
    );
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'movement with abstained input unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO silicon_forecast.candidate_retailer_product_movement (
      movement_key, calculation_version, region_id, canonical_product_id, retailer_id,
      from_observation_id, to_observation_id, from_date, to_date,
      from_landed_price_minor, to_landed_price_minor, change_minor,
      change_basis_points, direction
    ) VALUES (
      'invalid-movement-retailer-lineage', 'candidate-primary-retail-movement-v1',
      '10000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000002',
      '74000000-0000-0000-0000-000000000001',
      '74000000-0000-0000-0000-000000000002',
      '2026-08-01', '2026-08-08', 9999, 9498, -501, -501, 'down'
    );
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'movement with false retailer lineage unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO silicon_forecast.candidate_retailer_product_movement (
      movement_key, calculation_version, region_id, canonical_product_id, retailer_id,
      from_observation_id, to_observation_id, from_date, to_date,
      from_landed_price_minor, to_landed_price_minor, change_minor,
      change_basis_points, direction, publication_allowed
    ) VALUES (
      'invalid-movement-governance-unlock', 'candidate-primary-retail-movement-v1',
      '10000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      '74000000-0000-0000-0000-000000000001',
      '74000000-0000-0000-0000-000000000002',
      '2026-08-01', '2026-08-08', 9999, 9498, -501, -501, 'down', true
    );
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'movement publication unlock unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE silicon_forecast.candidate_retailer_product_movement
    SET direction = 'flat'
    WHERE id = '75000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'movement mutation unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;
  BEGIN
    DELETE FROM silicon_forecast.candidate_retailer_product_movement
    WHERE id = '75000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'movement deletion unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;
END;
$$;

SET ROLE silicon_forecast_candidate_observation_writer;
INSERT INTO silicon_forecast.candidate_primary_retail_observation (
  observation_key, region_id, canonical_product_id, canonical_product_revision_id,
  retailer_id, source_id, source_policy_revision_id, observed_at, retrieved_at,
  channel, mpn_expected, mpn_observed, match_basis, identity_evidence,
  seller_of_record, seller_relationship, seller_evidence, item_price_minor,
  currency_code, vat_state, vat_evidence, availability, availability_evidence,
  delivery_state, delivery_amount_minor, delivery_destination_basis, delivery_evidence,
  landed_price_state, landed_price_minor, landed_price_evidence,
  qualification_status, qualification_reason_codes, source_url,
  evidence_reference, evidence_sha256
) SELECT
  'fixture-writer-appended-observation', region_id, canonical_product_id,
  canonical_product_revision_id, retailer_id, source_id, source_policy_revision_id,
  '2026-08-22T10:00:00Z', '2026-08-22T10:00:05Z', channel,
  mpn_expected, mpn_observed, match_basis, identity_evidence,
  seller_of_record, seller_relationship, seller_evidence, item_price_minor,
  currency_code, vat_state, vat_evidence, availability, availability_evidence,
  delivery_state, delivery_amount_minor, delivery_destination_basis, delivery_evidence,
  landed_price_state, landed_price_minor, landed_price_evidence,
  qualification_status, qualification_reason_codes, source_url,
  evidence_reference, evidence_sha256
FROM silicon_forecast.candidate_primary_retail_observation
WHERE id = '74000000-0000-0000-0000-000000000003';
DO $$
BEGIN
  BEGIN
    UPDATE silicon_forecast.candidate_primary_retail_observation
    SET seller_of_record = 'Writer must not mutate'
    WHERE id = '74000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION USING ERRCODE = 'P9999', MESSAGE = 'observation writer gained update privilege';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

DO $$
DECLARE movement_count integer;
BEGIN
  SELECT count(*) INTO movement_count
  FROM silicon_forecast.candidate_retailer_product_movement movement
  JOIN silicon_forecast.candidate_primary_retail_observation from_observation
    ON from_observation.id = movement.from_observation_id
  JOIN silicon_forecast.candidate_primary_retail_observation to_observation
    ON to_observation.id = movement.to_observation_id
  WHERE movement.id = '75000000-0000-0000-0000-000000000001'
    AND from_observation.observation_key = 'fixture-retail-observation-day-one'
    AND to_observation.observation_key = 'fixture-retail-observation-day-two'
    AND NOT movement.production_import_allowed
    AND NOT movement.production_activation_allowed
    AND NOT movement.methodology_approval_allowed
    AND NOT movement.index_inclusion_allowed
    AND NOT movement.publication_allowed;
  IF movement_count <> 1 THEN
    RAISE EXCEPTION 'successful movement did not preserve exact locked input lineage';
  END IF;
END;
$$;

SELECT 'candidate primary-retail persistence database tests passed' AS result;
