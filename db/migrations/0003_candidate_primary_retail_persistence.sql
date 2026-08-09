BEGIN;

CREATE ROLE silicon_forecast_candidate_observation_writer NOLOGIN;
CREATE ROLE silicon_forecast_candidate_movement_writer NOLOGIN;

CREATE FUNCTION silicon_forecast.candidate_observation_reason_codes(
  p_mpn_expected text,
  p_mpn_observed text,
  p_match_basis text,
  p_seller_relationship text,
  p_vat_state text,
  p_availability text,
  p_delivery_state text,
  p_delivery_amount_minor bigint,
  p_landed_price_state text,
  p_landed_price_amount_minor bigint
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN p_match_basis <> 'exact_mpn'
                   OR p_mpn_observed IS NULL
                   OR p_mpn_observed <> p_mpn_expected
      THEN 'exact_mpn_unresolved' END,
    CASE WHEN p_seller_relationship <> 'retailer_owned'
      THEN 'retailer_owned_seller_unresolved' END,
    CASE WHEN p_vat_state <> 'included'
      THEN 'vat_inclusion_unresolved' END,
    CASE WHEN p_availability = 'unknown'
      THEN 'availability_unresolved'
      WHEN p_availability <> 'in_stock'
      THEN 'not_available_to_purchase' END,
    CASE WHEN p_delivery_state NOT IN ('mandatory_cost_known', 'free_delivery_explicit')
                   OR p_delivery_amount_minor IS NULL
      THEN 'mandatory_delivery_unresolved' END,
    CASE WHEN p_landed_price_state <> 'eligible'
                   OR p_landed_price_amount_minor IS NULL
      THEN 'landed_price_eligibility_unresolved' END
  ], NULL::text);
$$;

CREATE TABLE silicon_forecast.candidate_primary_retail_observation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_key text NOT NULL UNIQUE
    CHECK (observation_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  authority_scope text NOT NULL DEFAULT 'candidate_only'
    CHECK (authority_scope = 'candidate_only'),
  production_import_allowed boolean NOT NULL DEFAULT false
    CHECK (NOT production_import_allowed),
  production_activation_allowed boolean NOT NULL DEFAULT false
    CHECK (NOT production_activation_allowed),
  methodology_approval_allowed boolean NOT NULL DEFAULT false
    CHECK (NOT methodology_approval_allowed),
  index_inclusion_allowed boolean NOT NULL DEFAULT false
    CHECK (NOT index_inclusion_allowed),
  publication_allowed boolean NOT NULL DEFAULT false
    CHECK (NOT publication_allowed),
  region_id uuid NOT NULL REFERENCES silicon_forecast.region(id) ON DELETE RESTRICT,
  canonical_product_id uuid NOT NULL REFERENCES silicon_forecast.canonical_product(id) ON DELETE RESTRICT,
  canonical_product_revision_id uuid NOT NULL REFERENCES silicon_forecast.canonical_product_revision(id) ON DELETE RESTRICT,
  retailer_id uuid NOT NULL REFERENCES silicon_forecast.retailer(id) ON DELETE RESTRICT,
  source_id uuid NOT NULL REFERENCES silicon_forecast.source(id) ON DELETE RESTRICT,
  source_policy_revision_id uuid NOT NULL REFERENCES silicon_forecast.source_policy_revision(id) ON DELETE RESTRICT,
  observed_at timestamptz NOT NULL,
  retrieved_at timestamptz NOT NULL,
  channel text NOT NULL CHECK (channel = 'PRIMARY_RETAIL'),
  mpn_expected text NOT NULL CHECK (length(trim(mpn_expected)) > 0),
  mpn_observed text,
  match_basis text NOT NULL CHECK (match_basis IN ('exact_mpn', 'unresolved')),
  identity_evidence text NOT NULL CHECK (length(trim(identity_evidence)) > 0),
  seller_of_record text NOT NULL CHECK (length(trim(seller_of_record)) > 0),
  seller_relationship text NOT NULL
    CHECK (seller_relationship IN ('retailer_owned', 'third_party', 'unresolved')),
  seller_evidence text NOT NULL CHECK (length(trim(seller_evidence)) > 0),
  item_price_minor bigint NOT NULL CHECK (item_price_minor > 0),
  currency_code text NOT NULL REFERENCES silicon_forecast.currency(iso_code) ON DELETE RESTRICT,
  vat_state text NOT NULL CHECK (vat_state IN ('included', 'excluded', 'unknown')),
  vat_evidence text NOT NULL CHECK (length(trim(vat_evidence)) > 0),
  availability text NOT NULL CHECK (availability IN ('in_stock', 'out_of_stock', 'unknown')),
  availability_evidence text NOT NULL CHECK (length(trim(availability_evidence)) > 0),
  delivery_state text NOT NULL
    CHECK (delivery_state IN ('mandatory_cost_known', 'free_delivery_explicit', 'unknown')),
  delivery_amount_minor bigint CHECK (delivery_amount_minor >= 0),
  delivery_destination_basis text NOT NULL CHECK (length(trim(delivery_destination_basis)) > 0),
  delivery_evidence text NOT NULL CHECK (length(trim(delivery_evidence)) > 0),
  landed_price_state text NOT NULL CHECK (landed_price_state IN ('eligible', 'unresolved')),
  landed_price_minor bigint CHECK (landed_price_minor > 0),
  landed_price_evidence text NOT NULL CHECK (length(trim(landed_price_evidence)) > 0),
  qualification_status text NOT NULL CHECK (qualification_status IN ('eligible', 'abstain')),
  qualification_reason_codes text[] NOT NULL,
  source_url text NOT NULL CHECK (source_url ~ '^https://[^[:space:]]+$'),
  evidence_reference text NOT NULL CHECK (length(trim(evidence_reference)) > 0),
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (observed_at <= retrieved_at),
  CHECK ((mpn_observed IS NULL) OR length(trim(mpn_observed)) > 0),
  CHECK (
    (delivery_state = 'free_delivery_explicit' AND delivery_amount_minor = 0)
    OR (delivery_state = 'mandatory_cost_known' AND delivery_amount_minor IS NOT NULL)
    OR (delivery_state = 'unknown' AND delivery_amount_minor IS NULL)
  ),
  CHECK (
    (landed_price_state = 'eligible' AND landed_price_minor IS NOT NULL)
    OR (landed_price_state = 'unresolved' AND landed_price_minor IS NULL)
  ),
  CHECK (
    landed_price_minor IS NULL
    OR landed_price_minor = item_price_minor + delivery_amount_minor
  ),
  CHECK (
    qualification_reason_codes = silicon_forecast.candidate_observation_reason_codes(
      mpn_expected, mpn_observed, match_basis, seller_relationship, vat_state,
      availability, delivery_state, delivery_amount_minor,
      landed_price_state, landed_price_minor
    )
  ),
  CHECK (
    (qualification_status = 'eligible' AND cardinality(qualification_reason_codes) = 0)
    OR (qualification_status = 'abstain' AND cardinality(qualification_reason_codes) > 0)
  )
);

CREATE FUNCTION silicon_forecast.assert_candidate_observation_lineage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, silicon_forecast
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM silicon_forecast.canonical_product_revision revision
    WHERE revision.id = NEW.canonical_product_revision_id
      AND revision.canonical_product_id = NEW.canonical_product_id
      AND revision.mpn_normalized = NEW.mpn_expected
  ) THEN
    RAISE EXCEPTION 'observation product revision and expected MPN lineage do not agree'
      USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM silicon_forecast.retailer retailer
    WHERE retailer.id = NEW.retailer_id
      AND retailer.region_id = NEW.region_id
  ) THEN
    RAISE EXCEPTION 'observation retailer and region lineage do not agree'
      USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM silicon_forecast.source_policy_revision policy
    WHERE policy.id = NEW.source_policy_revision_id
      AND policy.source_id = NEW.source_id
  ) THEN
    RAISE EXCEPTION 'observation source and policy revision lineage do not agree'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER candidate_primary_retail_observation_lineage
BEFORE INSERT ON silicon_forecast.candidate_primary_retail_observation
FOR EACH ROW EXECUTE FUNCTION silicon_forecast.assert_candidate_observation_lineage();

CREATE TRIGGER candidate_primary_retail_observation_append_only
BEFORE UPDATE OR DELETE ON silicon_forecast.candidate_primary_retail_observation
FOR EACH ROW EXECUTE FUNCTION silicon_forecast.reject_history_mutation();

CREATE TABLE silicon_forecast.candidate_retailer_product_movement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_key text NOT NULL UNIQUE
    CHECK (movement_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  authority_scope text NOT NULL DEFAULT 'candidate_only'
    CHECK (authority_scope = 'candidate_only'),
  production_import_allowed boolean NOT NULL DEFAULT false
    CHECK (NOT production_import_allowed),
  production_activation_allowed boolean NOT NULL DEFAULT false
    CHECK (NOT production_activation_allowed),
  methodology_approval_allowed boolean NOT NULL DEFAULT false
    CHECK (NOT methodology_approval_allowed),
  index_inclusion_allowed boolean NOT NULL DEFAULT false
    CHECK (NOT index_inclusion_allowed),
  publication_allowed boolean NOT NULL DEFAULT false
    CHECK (NOT publication_allowed),
  calculation_version text NOT NULL
    CHECK (calculation_version = 'candidate-primary-retail-movement-v1'),
  region_id uuid NOT NULL REFERENCES silicon_forecast.region(id) ON DELETE RESTRICT,
  canonical_product_id uuid NOT NULL REFERENCES silicon_forecast.canonical_product(id) ON DELETE RESTRICT,
  retailer_id uuid NOT NULL REFERENCES silicon_forecast.retailer(id) ON DELETE RESTRICT,
  from_observation_id uuid NOT NULL REFERENCES silicon_forecast.candidate_primary_retail_observation(id) ON DELETE RESTRICT,
  to_observation_id uuid NOT NULL REFERENCES silicon_forecast.candidate_primary_retail_observation(id) ON DELETE RESTRICT,
  from_date date NOT NULL,
  to_date date NOT NULL,
  from_landed_price_minor bigint NOT NULL CHECK (from_landed_price_minor > 0),
  to_landed_price_minor bigint NOT NULL CHECK (to_landed_price_minor > 0),
  change_minor bigint NOT NULL,
  change_basis_points bigint NOT NULL,
  direction text NOT NULL CHECK (direction IN ('down', 'flat', 'up')),
  derived_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (from_observation_id <> to_observation_id),
  CHECK (from_date < to_date),
  CHECK (change_minor = to_landed_price_minor - from_landed_price_minor),
  CHECK (
    (change_minor < 0 AND direction = 'down')
    OR (change_minor = 0 AND direction = 'flat')
    OR (change_minor > 0 AND direction = 'up')
  ),
  UNIQUE (calculation_version, from_observation_id, to_observation_id)
);

CREATE FUNCTION silicon_forecast.assert_candidate_movement_lineage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, silicon_forecast
AS $$
DECLARE
  from_observation silicon_forecast.candidate_primary_retail_observation%ROWTYPE;
  to_observation silicon_forecast.candidate_primary_retail_observation%ROWTYPE;
  expected_basis_points bigint;
BEGIN
  SELECT * INTO STRICT from_observation
  FROM silicon_forecast.candidate_primary_retail_observation
  WHERE id = NEW.from_observation_id;
  SELECT * INTO STRICT to_observation
  FROM silicon_forecast.candidate_primary_retail_observation
  WHERE id = NEW.to_observation_id;

  IF from_observation.qualification_status <> 'eligible'
     OR to_observation.qualification_status <> 'eligible'
     OR from_observation.region_id <> NEW.region_id
     OR to_observation.region_id <> NEW.region_id
     OR from_observation.canonical_product_id <> NEW.canonical_product_id
     OR to_observation.canonical_product_id <> NEW.canonical_product_id
     OR from_observation.retailer_id <> NEW.retailer_id
     OR to_observation.retailer_id <> NEW.retailer_id
     OR (from_observation.observed_at AT TIME ZONE 'UTC')::date <> NEW.from_date
     OR (to_observation.observed_at AT TIME ZONE 'UTC')::date <> NEW.to_date
     OR from_observation.landed_price_minor <> NEW.from_landed_price_minor
     OR to_observation.landed_price_minor <> NEW.to_landed_price_minor
  THEN
    RAISE EXCEPTION 'movement must retain two eligible observations from the exact retailer-product-region lineage'
      USING ERRCODE = '23514';
  END IF;

  expected_basis_points := round(
    (NEW.change_minor::numeric * 10000) / NEW.from_landed_price_minor
  )::bigint;
  IF NEW.change_basis_points <> expected_basis_points THEN
    RAISE EXCEPTION 'movement basis points do not agree with input observations'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER candidate_retailer_product_movement_lineage
BEFORE INSERT ON silicon_forecast.candidate_retailer_product_movement
FOR EACH ROW EXECUTE FUNCTION silicon_forecast.assert_candidate_movement_lineage();

CREATE TRIGGER candidate_retailer_product_movement_append_only
BEFORE UPDATE OR DELETE ON silicon_forecast.candidate_retailer_product_movement
FOR EACH ROW EXECUTE FUNCTION silicon_forecast.reject_history_mutation();

REVOKE ALL ON FUNCTION silicon_forecast.candidate_observation_reason_codes(
  text, text, text, text, text, text, text, bigint, text, bigint
) FROM PUBLIC;
REVOKE ALL ON FUNCTION silicon_forecast.assert_candidate_observation_lineage() FROM PUBLIC;
REVOKE ALL ON FUNCTION silicon_forecast.assert_candidate_movement_lineage() FROM PUBLIC;
REVOKE ALL ON silicon_forecast.candidate_primary_retail_observation FROM PUBLIC;
REVOKE ALL ON silicon_forecast.candidate_retailer_product_movement FROM PUBLIC;

GRANT USAGE ON SCHEMA silicon_forecast TO
  silicon_forecast_candidate_observation_writer,
  silicon_forecast_candidate_movement_writer;
GRANT EXECUTE ON FUNCTION silicon_forecast.candidate_observation_reason_codes(
  text, text, text, text, text, text, text, bigint, text, bigint
) TO silicon_forecast_candidate_observation_writer;
GRANT SELECT, INSERT ON silicon_forecast.candidate_primary_retail_observation
  TO silicon_forecast_candidate_observation_writer;
GRANT SELECT ON silicon_forecast.candidate_primary_retail_observation
  TO silicon_forecast_candidate_movement_writer;
GRANT SELECT, INSERT ON silicon_forecast.candidate_retailer_product_movement
  TO silicon_forecast_candidate_movement_writer;

COMMIT;
