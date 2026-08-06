BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA silicon_forecast;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

CREATE FUNCTION silicon_forecast.reject_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; create an additive record instead', TG_TABLE_NAME
    USING ERRCODE = 'P0001';
END;
$$;

CREATE TABLE silicon_forecast.control_principal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_type text NOT NULL CHECK (principal_type IN ('human', 'service', 'worker')),
  auth_provider text NOT NULL,
  auth_subject text NOT NULL,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  mfa_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (auth_provider, auth_subject),
  CHECK (principal_type <> 'human' OR mfa_required)
);

CREATE TABLE silicon_forecast.approval_decision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type text NOT NULL,
  scope_type text NOT NULL,
  scope_id uuid,
  decision text NOT NULL CHECK (decision IN ('approve', 'reject', 'revoke')),
  rationale text NOT NULL CHECK (length(trim(rationale)) > 0),
  evidence_reference text NOT NULL CHECK (length(trim(evidence_reference)) > 0),
  decided_by uuid NOT NULL REFERENCES silicon_forecast.control_principal(id) ON DELETE RESTRICT,
  decided_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  expires_at timestamptz,
  CHECK (expires_at IS NULL OR expires_at > decided_at)
);

CREATE TABLE silicon_forecast.audit_event (
  sequence_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  actor_id uuid NOT NULL REFERENCES silicon_forecast.control_principal(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  reason text,
  request_id uuid NOT NULL,
  transaction_id bigint NOT NULL DEFAULT txid_current(),
  approval_decision_id uuid REFERENCES silicon_forecast.approval_decision(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE silicon_forecast.governance_lock_event (
  sequence_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  lock_key text NOT NULL CHECK (lock_key IN (
    'external_publish', 'spend', 'production_mutation',
    'methodology_change', 'source_approval', 'production_activation',
    'editorial_activation'
  )),
  scope_type text NOT NULL DEFAULT 'global' CHECK (scope_type = 'global'),
  scope_id uuid,
  state text NOT NULL CHECK (state = 'locked'),
  approval_decision_id uuid REFERENCES silicon_forecast.approval_decision(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  changed_by uuid NOT NULL REFERENCES silicon_forecast.control_principal(id) ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  idempotency_key uuid NOT NULL UNIQUE,
  CHECK (scope_id IS NULL),
  CHECK (approval_decision_id IS NULL)
);

CREATE VIEW silicon_forecast.current_governance_lock AS
SELECT lock_key, scope_type, scope_id, state, approval_decision_id, changed_by, changed_at
FROM (
  SELECT event.*,
         row_number() OVER (
           PARTITION BY lock_key, scope_type, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)
           ORDER BY sequence_id DESC
         ) AS position
  FROM silicon_forecast.governance_lock_event event
) ranked
WHERE position = 1;

CREATE TABLE silicon_forecast.worker_definition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_key text NOT NULL,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  purpose text NOT NULL CHECK (length(trim(purpose)) > 0),
  input_contract jsonb NOT NULL CHECK (jsonb_typeof(input_contract) = 'object'),
  output_contract jsonb NOT NULL CHECK (jsonb_typeof(output_contract) = 'object'),
  allowed_tools jsonb NOT NULL CHECK (jsonb_typeof(allowed_tools) = 'array'),
  autonomy_tier smallint NOT NULL CHECK (autonomy_tier BETWEEN 1 AND 2),
  required_locks jsonb NOT NULL CHECK (jsonb_typeof(required_locks) = 'array'),
  untrusted_input_policy text NOT NULL CHECK (untrusted_input_policy = 'data_only_never_instructions'),
  escalation_policy text NOT NULL,
  cadence text,
  enabled boolean NOT NULL DEFAULT false CHECK (enabled = false),
  created_by uuid NOT NULL REFERENCES silicon_forecast.control_principal(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (worker_key, revision_no)
);

CREATE TABLE silicon_forecast.currency (
  iso_code text PRIMARY KEY CHECK (iso_code ~ '^[A-Z]{3}$'),
  name text NOT NULL,
  symbol text NOT NULL,
  decimal_places smallint NOT NULL CHECK (decimal_places BETWEEN 0 AND 4)
);

CREATE TABLE silicon_forecast.region (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z]{2}$'),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL,
  currency_code text NOT NULL REFERENCES silicon_forecast.currency(iso_code) ON DELETE RESTRICT,
  timezone text NOT NULL,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('candidate', 'approved_private', 'production', 'retired')),
  is_public boolean NOT NULL DEFAULT false,
  is_retail_supported boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (NOT is_public OR lifecycle_state = 'production'),
  CHECK (NOT is_retail_supported OR lifecycle_state IN ('approved_private', 'production'))
);

CREATE TABLE silicon_forecast.retailer_group (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE CHECK (stable_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  legal_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE TABLE silicon_forecast.retailer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_group_id uuid NOT NULL REFERENCES silicon_forecast.retailer_group(id) ON DELETE RESTRICT,
  region_id uuid NOT NULL REFERENCES silicon_forecast.region(id) ON DELETE RESTRICT,
  stable_key text NOT NULL UNIQUE CHECK (stable_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  legal_name text NOT NULL,
  website_domain text,
  status text NOT NULL CHECK (status IN ('candidate', 'approved', 'suspended', 'retired')),
  marketplace_allowed boolean NOT NULL DEFAULT false,
  tax_semantics text NOT NULL DEFAULT 'unknown' CHECK (tax_semantics IN ('unknown', 'inclusive', 'exclusive', 'mixed')),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (NOT is_active OR status = 'approved')
);

CREATE TABLE silicon_forecast.source (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE CHECK (stable_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  legal_name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('affiliate_feed', 'retailer_feed', 'api', 'public_web', 'fixture')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE TABLE silicon_forecast.source_policy_revision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES silicon_forecast.source(id) ON DELETE RESTRICT,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  access_route text NOT NULL,
  rights_state text NOT NULL CHECK (rights_state IN ('unknown', 'policy_permitted', 'verified_permitted', 'verified_restricted')),
  technical_access_state text NOT NULL CHECK (technical_access_state IN ('unavailable', 'pending', 'sample_only', 'available')),
  production_approved boolean NOT NULL DEFAULT false,
  private_derived_use boolean NOT NULL DEFAULT false,
  public_display_use boolean NOT NULL DEFAULT false,
  historical_retention text NOT NULL CHECK (historical_retention IN ('unknown', 'allowed', 'restricted', 'prohibited')),
  restriction_summary text NOT NULL,
  evidence_reference text NOT NULL CHECK (length(trim(evidence_reference)) > 0),
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  reviewed_by uuid REFERENCES silicon_forecast.control_principal(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (source_id, revision_no),
  CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL)),
  CHECK (
    NOT production_approved OR (
      rights_state = 'verified_permitted' AND
      technical_access_state = 'available' AND
      reviewed_by IS NOT NULL AND
      reviewed_at IS NOT NULL
    )
  )
);

CREATE TABLE silicon_forecast.methodology_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_key text NOT NULL,
  semantic_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft_locked', 'approved_inactive', 'active_private', 'retired')),
  region_id uuid NOT NULL REFERENCES silicon_forecast.region(id) ON DELETE RESTRICT,
  configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
  configuration_sha256 text NOT NULL CHECK (configuration_sha256 ~ '^[0-9a-f]{64}$'),
  document_reference text NOT NULL,
  approval_decision_id uuid REFERENCES silicon_forecast.approval_decision(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES silicon_forecast.control_principal(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (methodology_key, semantic_version),
  CHECK (status = 'draft_locked' OR approval_decision_id IS NOT NULL)
);

CREATE UNIQUE INDEX methodology_one_active_private
ON silicon_forecast.methodology_version(methodology_key)
WHERE status = 'active_private';

CREATE TABLE silicon_forecast.manufacturer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE CHECK (stable_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE TABLE silicon_forecast.canonical_product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_key text NOT NULL UNIQUE CHECK (stable_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE TABLE silicon_forecast.canonical_product_revision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_product_id uuid NOT NULL REFERENCES silicon_forecast.canonical_product(id) ON DELETE RESTRICT,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  manufacturer_id uuid NOT NULL REFERENCES silicon_forecast.manufacturer(id) ON DELETE RESTRICT,
  model text NOT NULL,
  mpn_raw text NOT NULL,
  mpn_normalized text NOT NULL CHECK (length(trim(mpn_normalized)) > 0),
  memory_generation text NOT NULL CHECK (memory_generation = 'DDR5'),
  total_capacity_gb smallint NOT NULL CHECK (total_capacity_gb = 32),
  module_count smallint NOT NULL CHECK (module_count = 2),
  capacity_per_module_gb smallint NOT NULL CHECK (capacity_per_module_gb = 16),
  speed_mt_s integer NOT NULL CHECK (speed_mt_s > 0),
  form_factor text NOT NULL CHECK (form_factor = 'UDIMM'),
  ecc boolean NOT NULL CHECK (ecc = false),
  registered boolean NOT NULL CHECK (registered = false),
  buffering text NOT NULL CHECK (buffering = 'unbuffered'),
  review_status text NOT NULL CHECK (review_status IN ('draft', 'reviewed', 'rejected', 'retired')),
  supersedes_revision_id uuid REFERENCES silicon_forecast.canonical_product_revision(id) ON DELETE RESTRICT,
  evidence_reference text NOT NULL CHECK (length(trim(evidence_reference)) > 0),
  reviewed_by uuid REFERENCES silicon_forecast.control_principal(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  created_by uuid NOT NULL REFERENCES silicon_forecast.control_principal(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (canonical_product_id, revision_no),
  CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL)),
  CHECK (review_status <> 'reviewed' OR reviewed_by IS NOT NULL)
);

CREATE TABLE silicon_forecast.canonical_product_identifier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_product_revision_id uuid NOT NULL REFERENCES silicon_forecast.canonical_product_revision(id) ON DELETE RESTRICT,
  manufacturer_id uuid NOT NULL REFERENCES silicon_forecast.manufacturer(id) ON DELETE RESTRICT,
  identifier_type text NOT NULL CHECK (identifier_type IN ('MPN', 'GTIN')),
  raw_value text NOT NULL,
  normalized_value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  evidence_reference text NOT NULL CHECK (length(trim(evidence_reference)) > 0),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (
    (identifier_type = 'MPN' AND length(trim(normalized_value)) > 0) OR
    (identifier_type = 'GTIN' AND normalized_value ~ '^[0-9]{8}([0-9]{4}([0-9]{1,2})?)?$')
  )
);

CREATE UNIQUE INDEX canonical_gtin_global_unique
ON silicon_forecast.canonical_product_identifier(normalized_value)
WHERE identifier_type = 'GTIN';

CREATE UNIQUE INDEX canonical_mpn_manufacturer_unique
ON silicon_forecast.canonical_product_identifier(manufacturer_id, normalized_value)
WHERE identifier_type = 'MPN';

CREATE FUNCTION silicon_forecast.assert_identifier_manufacturer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM silicon_forecast.canonical_product_revision revision
    WHERE revision.id = NEW.canonical_product_revision_id
      AND revision.manufacturer_id = NEW.manufacturer_id
  ) THEN
    RAISE EXCEPTION 'identifier manufacturer must match its canonical product revision'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER canonical_product_identifier_manufacturer_match
BEFORE INSERT ON silicon_forecast.canonical_product_identifier
FOR EACH ROW EXECUTE FUNCTION silicon_forecast.assert_identifier_manufacturer();

DO $$
DECLARE history_table text;
BEGIN
  FOREACH history_table IN ARRAY ARRAY[
    'approval_decision', 'audit_event', 'governance_lock_event',
    'worker_definition', 'source_policy_revision', 'methodology_version',
    'canonical_product_revision', 'canonical_product_identifier'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_append_only BEFORE UPDATE OR DELETE ON silicon_forecast.%I FOR EACH ROW EXECUTE FUNCTION silicon_forecast.reject_history_mutation()',
      history_table, history_table
    );
  END LOOP;
END;
$$;

INSERT INTO silicon_forecast.control_principal (
  id, principal_type, auth_provider, auth_subject, display_name, is_active, mfa_required
) VALUES (
  '00000000-0000-0000-0000-000000000001', 'service', 'migration', 'foundation-seed',
  'Foundation migration', true, false
);

INSERT INTO silicon_forecast.currency (iso_code, name, symbol, decimal_places)
VALUES ('GBP', 'Pound sterling', '£', 2);

INSERT INTO silicon_forecast.region (
  id, code, slug, name, currency_code, timezone, lifecycle_state, is_public, is_retail_supported
) VALUES (
  '10000000-0000-0000-0000-000000000001', 'GB', 'united-kingdom', 'United Kingdom',
  'GBP', 'Europe/London', 'candidate', false, false
);

INSERT INTO silicon_forecast.methodology_version (
  id, methodology_key, semantic_version, status, region_id, configuration,
  configuration_sha256, document_reference, created_by
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  'SF-GB-DDR5-32-UDIMM-OFFER', '0.1.0-draft', 'draft_locked',
  '10000000-0000-0000-0000-000000000001',
  '{"threshold_status":"PROPOSED_LOCKED","threshold_count":20,"production_activation_locked":true,"external_publication_locked":true}'::jsonb,
  encode(digest('{"external_publication_locked":true,"production_activation_locked":true,"threshold_count":20,"threshold_status":"PROPOSED_LOCKED"}', 'sha256'), 'hex'),
  '.planning/phases/01-source-methodology-gate/METHODOLOGY-v0.1.md',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO silicon_forecast.governance_lock_event (
  lock_key, state, reason, changed_by, idempotency_key
)
SELECT lock_key, 'locked', 'Foundation seed: no external or production authority granted',
       '00000000-0000-0000-0000-000000000001'::uuid, idempotency_key
FROM (VALUES
  ('external_publish',    '30000000-0000-0000-0000-000000000001'::uuid),
  ('spend',               '30000000-0000-0000-0000-000000000002'::uuid),
  ('production_mutation', '30000000-0000-0000-0000-000000000003'::uuid),
  ('methodology_change',  '30000000-0000-0000-0000-000000000004'::uuid),
  ('source_approval',     '30000000-0000-0000-0000-000000000005'::uuid),
  ('production_activation','30000000-0000-0000-0000-000000000006'::uuid),
  ('editorial_activation','30000000-0000-0000-0000-000000000007'::uuid)
) seed(lock_key, idempotency_key);

COMMIT;
