BEGIN;

CREATE ROLE silicon_forecast_catalogue_reviewer NOLOGIN;

-- Historical identity referenced by the approved review artefact. This is not a login binding.
INSERT INTO silicon_forecast.control_principal (
  id, principal_type, auth_provider, auth_subject, display_name, is_active, mfa_required
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'human', 'review-artifact', 'project-owner:david-sidebottom',
  'David Sidebottom', false, true
);

CREATE TABLE silicon_forecast.catalogue_fixture_set_manifest (
  catalogue_fixture_set_id text PRIMARY KEY,
  catalogue_reference text NOT NULL CHECK (catalogue_reference ~ '^data/catalogue/[a-zA-Z0-9._-]+[.]json$'),
  catalogue_sha256 text NOT NULL CHECK (catalogue_sha256 ~ '^[0-9a-f]{64}$'),
  listing_fixture_set_id text NOT NULL UNIQUE,
  listing_reference text NOT NULL CHECK (listing_reference ~ '^data/fixtures/[a-zA-Z0-9._-]+[.]json$'),
  listing_sha256 text NOT NULL CHECK (listing_sha256 ~ '^[0-9a-f]{64}$'),
  created_by uuid NOT NULL REFERENCES silicon_forecast.control_principal(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE TRIGGER catalogue_fixture_set_manifest_append_only
BEFORE UPDATE OR DELETE ON silicon_forecast.catalogue_fixture_set_manifest
FOR EACH ROW EXECUTE FUNCTION silicon_forecast.reject_history_mutation();

CREATE TABLE silicon_forecast.catalogue_fixture_review_application (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_key text NOT NULL UNIQUE CHECK (length(trim(review_key)) > 0),
  catalogue_fixture_set_id text NOT NULL CHECK (length(trim(catalogue_fixture_set_id)) > 0),
  catalogue_sha256 text NOT NULL CHECK (catalogue_sha256 ~ '^[0-9a-f]{64}$'),
  listing_fixture_set_id text NOT NULL CHECK (length(trim(listing_fixture_set_id)) > 0),
  listing_sha256 text NOT NULL CHECK (listing_sha256 ~ '^[0-9a-f]{64}$'),
  evidence_reference text NOT NULL CHECK (
    evidence_reference ~ '^data/reviews/[a-zA-Z0-9_-]+[.]json$'
    AND evidence_reference !~ '(^|/)[.][.]?(/|$)'
  ),
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  product_keys jsonb NOT NULL CHECK (jsonb_typeof(product_keys) = 'array'),
  listing_example_ids jsonb NOT NULL CHECK (jsonb_typeof(listing_example_ids) = 'array'),
  confirmations jsonb NOT NULL CHECK (jsonb_typeof(confirmations) = 'array'),
  limitations jsonb NOT NULL CHECK (jsonb_typeof(limitations) = 'array'),
  reviewed_by uuid NOT NULL REFERENCES silicon_forecast.control_principal(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL,
  approval_decision_id uuid NOT NULL UNIQUE REFERENCES silicon_forecast.approval_decision(id) ON DELETE RESTRICT,
  applied_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE TRIGGER catalogue_fixture_review_application_append_only
BEFORE UPDATE OR DELETE ON silicon_forecast.catalogue_fixture_review_application
FOR EACH ROW EXECUTE FUNCTION silicon_forecast.reject_history_mutation();

ALTER TABLE silicon_forecast.canonical_product_revision
  ADD COLUMN authority_scope text NOT NULL DEFAULT 'candidate_only'
    CHECK (authority_scope IN ('candidate_only', 'fixture_only')),
  ADD COLUMN fixture_review_application_id uuid
    REFERENCES silicon_forecast.catalogue_fixture_review_application(id) ON DELETE RESTRICT,
  ADD CONSTRAINT canonical_product_revision_authority_scope CHECK (
    (review_status = 'draft' AND authority_scope = 'candidate_only' AND fixture_review_application_id IS NULL)
    OR
    (review_status = 'reviewed' AND authority_scope = 'fixture_only' AND fixture_review_application_id IS NOT NULL)
    OR
    (review_status IN ('rejected', 'retired'))
  );

-- Identifier values may repeat across revisions of one product lineage, but never across products.
-- The ownership registry retains database-enforced uniqueness and serialises concurrent claims.
CREATE TABLE silicon_forecast.canonical_identifier_ownership (
  identifier_type text NOT NULL CHECK (identifier_type IN ('MPN', 'GTIN')),
  manufacturer_scope_id uuid NOT NULL,
  normalized_value text NOT NULL,
  canonical_product_id uuid NOT NULL REFERENCES silicon_forecast.canonical_product(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (identifier_type, manufacturer_scope_id, normalized_value)
);

INSERT INTO silicon_forecast.canonical_identifier_ownership (
  identifier_type, manufacturer_scope_id, normalized_value, canonical_product_id
)
SELECT identifier.identifier_type,
       CASE
         WHEN identifier.identifier_type = 'GTIN'
           THEN '00000000-0000-0000-0000-000000000000'::uuid
         ELSE identifier.manufacturer_id
       END,
       identifier.normalized_value,
       revision.canonical_product_id
FROM silicon_forecast.canonical_product_identifier identifier
JOIN silicon_forecast.canonical_product_revision revision
  ON revision.id = identifier.canonical_product_revision_id;

DROP INDEX silicon_forecast.canonical_gtin_global_unique;
DROP INDEX silicon_forecast.canonical_mpn_manufacturer_unique;

CREATE UNIQUE INDEX canonical_identifier_revision_unique
ON silicon_forecast.canonical_product_identifier(
  canonical_product_revision_id, identifier_type, normalized_value
);

CREATE FUNCTION silicon_forecast.claim_identifier_lineage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, silicon_forecast
AS $$
DECLARE
  target_product_id uuid;
  target_scope_id uuid;
  owner_product_id uuid;
BEGIN
  SELECT revision.canonical_product_id
    INTO target_product_id
  FROM silicon_forecast.canonical_product_revision revision
  WHERE revision.id = NEW.canonical_product_revision_id;

  target_scope_id := CASE
    WHEN NEW.identifier_type = 'GTIN'
      THEN '00000000-0000-0000-0000-000000000000'::uuid
    ELSE NEW.manufacturer_id
  END;

  INSERT INTO silicon_forecast.canonical_identifier_ownership (
    identifier_type, manufacturer_scope_id, normalized_value, canonical_product_id
  ) VALUES (
    NEW.identifier_type, target_scope_id, NEW.normalized_value, target_product_id
  )
  ON CONFLICT (identifier_type, manufacturer_scope_id, normalized_value) DO NOTHING;

  SELECT ownership.canonical_product_id
    INTO owner_product_id
  FROM silicon_forecast.canonical_identifier_ownership ownership
  WHERE ownership.identifier_type = NEW.identifier_type
    AND ownership.manufacturer_scope_id = target_scope_id
    AND ownership.normalized_value = NEW.normalized_value;

  IF owner_product_id IS DISTINCT FROM target_product_id THEN
    RAISE EXCEPTION 'identifier already belongs to a different canonical product lineage'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER canonical_product_identifier_lineage_unique
BEFORE INSERT ON silicon_forecast.canonical_product_identifier
FOR EACH ROW EXECUTE FUNCTION silicon_forecast.claim_identifier_lineage();

CREATE FUNCTION silicon_forecast.apply_approved_ddr5_seed_fixture_review(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, silicon_forecast
AS $$
DECLARE
  fixed_review_key constant text := 'sf-ddr5-32gb-seed-human-review-2026-08-06';
  fixed_catalogue_fixture_set constant text := 'sf-ddr5-32gb-seed-2026-08-06';
  fixed_catalogue_sha256 constant text := '98572936896e59c83f90ba796f6c6c3a917e1a304530163744dabb63f572d568';
  fixed_listing_fixture_set constant text := 'sf-ddr5-listing-labels-2026-08-06';
  fixed_listing_sha256 constant text := '554627a43ab56578da9d39ba698fef6f66753ed57befa8638a35a287b84a7001';
  fixed_evidence_reference constant text := 'data/reviews/ddr5-32gb-seed-review-2026-08-06.json';
  fixed_evidence_sha256 constant text := '86fef1c0bd47279ece52be6dbbb03502138ea42dd5586a94c06a84beb6c7f801';
  fixed_reviewer constant uuid := '00000000-0000-0000-0000-000000000002';
  fixed_reviewed_at constant timestamptz := '2026-08-06T09:21:11Z';
  fixed_product_keys constant text[] := ARRAY[
    'kingston-fury-beast-kf560c30bbek2-32',
    'kingston-fury-renegade-kf564c32rsk2-32',
    'gskill-flare-x5-f5-6000j3636f16gx2-fx5',
    'gskill-trident-z5-neo-rgb-f5-6000j3636f16gx2-tz5nr'
  ];
  fixed_listing_example_ids constant text[] := ARRAY[
    'exact-kingston-beast', 'normalised-case-and-space',
    'exact-kingston-renegade', 'exact-gskill-flare', 'exact-gskill-trident',
    'exact-identity-refurbished-ineligible', 'one-character-mpn-difference',
    'punctuation-stripping-forbidden', 'generic-title-multiple-candidates',
    'exact-mpn-capacity-conflict', 'manufacturer-conflict', 'unknown-exact-mpn',
    'unsupported-ddr4', 'unsupported-sodimm', 'unsupported-one-by-thirty-two',
    'unsupported-sixty-four-gb-kit', 'unsupported-ecc-rdimm',
    'multi-product-listing', 'title-only-single-apparent-candidate',
    'malformed-gtin-does-not-rescue-title'
  ];
  fixed_confirmations constant text[] := ARRAY[
    'exact_mpn_and_specification_checked',
    'kingston_on_die_ecc_interpretation_accepted',
    'kingston_renegade_source_typo_handling_accepted',
    'listing_labels_checked',
    'auto_confirmation_remains_locked'
  ];
  fixed_limitations constant text[] := ARRAY[
    'approved_for_fixture_use_only',
    'does_not_approve_production_activation',
    'does_not_approve_index_methodology_or_baseline',
    'does_not_approve_source_access_or_publication',
    'does_not_enable_automatic_product_matching'
  ];
  approval_id uuid := gen_random_uuid();
  review_application_id uuid := gen_random_uuid();
  source_revision record;
  new_revision_id uuid;
  target_count integer;
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'request id is required' USING ERRCODE = '23502';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM silicon_forecast.control_principal
    WHERE id = fixed_reviewer
      AND principal_type = 'human'
      AND auth_provider = 'review-artifact'
      AND auth_subject = 'project-owner:david-sidebottom'
  ) THEN
    RAISE EXCEPTION 'the approved review artefact has no attributable historical principal'
      USING ERRCODE = '23514';
  END IF;
  IF (SELECT count(*) FROM silicon_forecast.current_governance_lock WHERE state = 'locked') <> 7 THEN
    RAISE EXCEPTION 'all governance locks must remain engaged for fixture review'
      USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM silicon_forecast.catalogue_fixture_set_manifest
    WHERE catalogue_fixture_set_id = fixed_catalogue_fixture_set
      AND catalogue_sha256 = fixed_catalogue_sha256
      AND listing_fixture_set_id = fixed_listing_fixture_set
      AND listing_sha256 = fixed_listing_sha256
  ) THEN
    RAISE EXCEPTION 'approved review fixture checksums do not match the seeded manifest'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO target_count
  FROM silicon_forecast.canonical_product product
  JOIN silicon_forecast.canonical_product_revision revision
    ON revision.canonical_product_id = product.id
  WHERE product.stable_key = ANY(fixed_product_keys)
    AND revision.revision_no = 1
    AND revision.review_status = 'draft'
    AND revision.authority_scope = 'candidate_only'
    AND revision.evidence_reference LIKE '%research/evidence/catalogue-2026-08-06/%'
    AND NOT EXISTS (
      SELECT 1
      FROM silicon_forecast.canonical_product_revision later
      WHERE later.canonical_product_id = revision.canonical_product_id
        AND later.revision_no > revision.revision_no
    );

  IF target_count <> cardinality(fixed_product_keys) THEN
    RAISE EXCEPTION 'approved review does not resolve to the exact four immutable candidate drafts'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO silicon_forecast.approval_decision (
    id, decision_type, scope_type, decision, rationale,
    evidence_reference, decided_by, decided_at
  ) VALUES (
    approval_id, 'catalogue_fixture_review', 'catalogue_fixture_set', 'approve',
    'Approved for fixture and matching-evaluation use only; no production, source, methodology, automatic-match or publication authority granted.',
    fixed_evidence_reference || '#sha256=' || fixed_evidence_sha256,
    fixed_reviewer, fixed_reviewed_at
  );

  INSERT INTO silicon_forecast.catalogue_fixture_review_application (
    id, review_key, catalogue_fixture_set_id, catalogue_sha256,
    listing_fixture_set_id, listing_sha256,
    evidence_reference, evidence_sha256, product_keys, listing_example_ids,
    confirmations, limitations, reviewed_by, reviewed_at, approval_decision_id
  ) VALUES (
    review_application_id, fixed_review_key, fixed_catalogue_fixture_set, fixed_catalogue_sha256,
    fixed_listing_fixture_set, fixed_listing_sha256,
    fixed_evidence_reference, fixed_evidence_sha256,
    to_jsonb(fixed_product_keys), to_jsonb(fixed_listing_example_ids),
    to_jsonb(fixed_confirmations), to_jsonb(fixed_limitations), fixed_reviewer,
    fixed_reviewed_at, approval_id
  );

  FOR source_revision IN
    SELECT product.id AS target_product_id,
           product.stable_key AS target_product_key,
           revision.*
    FROM silicon_forecast.canonical_product product
    JOIN silicon_forecast.canonical_product_revision revision
      ON revision.canonical_product_id = product.id
    WHERE product.stable_key = ANY(fixed_product_keys)
      AND revision.revision_no = 1
      AND revision.review_status = 'draft'
      AND revision.authority_scope = 'candidate_only'
    ORDER BY product.stable_key
  LOOP
    new_revision_id := gen_random_uuid();

    INSERT INTO silicon_forecast.canonical_product_revision (
      id, canonical_product_id, revision_no, manufacturer_id, model, mpn_raw, mpn_normalized,
      memory_generation, total_capacity_gb, module_count, capacity_per_module_gb, speed_mt_s,
      form_factor, ecc, registered, buffering, review_status, supersedes_revision_id,
      evidence_reference, reviewed_by, reviewed_at, created_by,
      authority_scope, fixture_review_application_id
    ) VALUES (
      new_revision_id, source_revision.target_product_id, source_revision.revision_no + 1,
      source_revision.manufacturer_id, source_revision.model, source_revision.mpn_raw,
      source_revision.mpn_normalized, source_revision.memory_generation,
      source_revision.total_capacity_gb, source_revision.module_count,
      source_revision.capacity_per_module_gb, source_revision.speed_mt_s,
      source_revision.form_factor, source_revision.ecc, source_revision.registered,
      source_revision.buffering, 'reviewed', source_revision.id,
      jsonb_build_object(
        'catalogue_evidence', source_revision.evidence_reference::jsonb,
        'fixture_review', fixed_evidence_reference,
        'fixture_review_sha256', fixed_evidence_sha256
      )::text,
      fixed_reviewer, fixed_reviewed_at, fixed_reviewer,
      'fixture_only', review_application_id
    );

    INSERT INTO silicon_forecast.canonical_product_identifier (
      id, canonical_product_revision_id, manufacturer_id, identifier_type,
      raw_value, normalized_value, is_primary, evidence_reference
    )
    SELECT gen_random_uuid(), new_revision_id, identifier.manufacturer_id,
           identifier.identifier_type, identifier.raw_value, identifier.normalized_value,
           identifier.is_primary, identifier.evidence_reference
    FROM silicon_forecast.canonical_product_identifier identifier
    WHERE identifier.canonical_product_revision_id = source_revision.id
    ORDER BY identifier.identifier_type, identifier.normalized_value;

    INSERT INTO silicon_forecast.audit_event (
      actor_id, action, entity_type, entity_id, after_state, reason,
      request_id, approval_decision_id, metadata
    ) VALUES (
      fixed_reviewer, 'catalogue_fixture_review_applied', 'canonical_product_revision',
      new_revision_id,
      jsonb_build_object(
        'product_key', source_revision.target_product_key,
        'review_status', 'reviewed',
        'authority_scope', 'fixture_only',
        'fixture_review_application_id', review_application_id,
        'supersedes_revision_id', source_revision.id
      ),
      'Applied an additive fixture-only revision from the checksum-pinned approved review artefact.',
      p_request_id, approval_id,
      jsonb_build_object('review_key', fixed_review_key, 'review_application_id', review_application_id)
    );
  END LOOP;

  RETURN approval_id;
END;
$$;

REVOKE ALL ON silicon_forecast.catalogue_fixture_review_application FROM PUBLIC;
REVOKE ALL ON silicon_forecast.catalogue_fixture_set_manifest FROM PUBLIC;
REVOKE ALL ON silicon_forecast.canonical_identifier_ownership FROM PUBLIC;
REVOKE ALL ON FUNCTION silicon_forecast.apply_approved_ddr5_seed_fixture_review(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA silicon_forecast TO silicon_forecast_catalogue_reviewer;
GRANT EXECUTE ON FUNCTION silicon_forecast.apply_approved_ddr5_seed_fixture_review(uuid)
  TO silicon_forecast_catalogue_reviewer;

COMMIT;
