import { readFileSync } from "node:fs";

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const decisions = new Set(["match", "no_match", "abstain_ambiguous", "abstain_insufficient", "unsupported"]);
const reasonsByDecision = new Map([
  ["match", new Set(["exact_mpn", "normalized_mpn"])],
  ["no_match", new Set(["no_catalogue_product"])],
  ["abstain_ambiguous", new Set(["manufacturer_mismatch", "specification_conflict", "multiple_candidates", "multi_product_listing"])],
  ["abstain_insufficient", new Set(["near_mpn_only", "missing_identifier", "malformed_identifier"])],
  ["unsupported", new Set(["unsupported_memory_type", "unsupported_form_factor", "unsupported_module_configuration", "unsupported_capacity"])],
]);
const listingFields = new Set([
  "title", "manufacturer_raw", "mpn_raw", "gtin_raw", "condition",
  "total_capacity_gb", "module_count", "memory_generation", "form_factor", "ecc", "registered",
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, keys, context) {
  invariant(value && typeof value === "object" && !Array.isArray(value), `${context} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  invariant(JSON.stringify(actual) === JSON.stringify(expected), `${context} fields must be exactly: ${expected.join(", ")}`);
}

function nonBlank(value, context) {
  invariant(typeof value === "string" && value.trim().length > 0, `${context} must be non-blank`);
  invariant(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value), `${context} contains a forbidden control character`);
}

function normaliseManufacturer(value) {
  nonBlank(value, "manufacturer");
  return value.normalize("NFKC").toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

export function normalizeMpn(value) {
  nonBlank(value, "MPN");
  return value.normalize("NFKC").trim().toUpperCase();
}

export function validateCatalogue(catalogue, { evidenceExists = () => true } = {}) {
  exactKeys(catalogue, ["schema_version", "fixture_set_id", "status", "normalization", "products"], "catalogue");
  invariant(catalogue.schema_version === 1, "unsupported catalogue schema_version");
  nonBlank(catalogue.fixture_set_id, "catalogue.fixture_set_id");
  invariant(catalogue.status === "candidate_pending_human_review", "catalogue must remain pending human review");
  exactKeys(catalogue.normalization, ["mpn"], "catalogue.normalization");
  invariant(catalogue.normalization.mpn === "mpn-v1-uppercase-trim", "unsupported MPN normalization version");
  invariant(Array.isArray(catalogue.products) && catalogue.products.length > 0, "catalogue.products must be non-empty");

  const productKeys = new Set();
  const manufacturerMpns = new Set();
  const manufacturerNameByKey = new Map();
  const manufacturerKeyByName = new Map();
  const manufacturerKeyByAlias = new Map();
  const identifiers = new Set();

  for (const [index, product] of catalogue.products.entries()) {
    const context = `catalogue.products[${index}]`;
    exactKeys(product, ["product_key", "revision_no", "manufacturer", "model", "mpn_raw", "mpn_normalized", "specification", "review", "identifiers"], context);
    invariant(slug.test(product.product_key), `${context}.product_key must be a slug`);
    invariant(!productKeys.has(product.product_key), `${context}.product_key must be unique`);
    productKeys.add(product.product_key);
    invariant(Number.isInteger(product.revision_no) && product.revision_no > 0, `${context}.revision_no must be positive`);

    exactKeys(product.manufacturer, ["key", "name", "aliases"], `${context}.manufacturer`);
    invariant(slug.test(product.manufacturer.key), `${context}.manufacturer.key must be a slug`);
    nonBlank(product.manufacturer.name, `${context}.manufacturer.name`);
    invariant(Array.isArray(product.manufacturer.aliases) && product.manufacturer.aliases.length > 0, `${context}.manufacturer.aliases must be non-empty`);
    const priorName = manufacturerNameByKey.get(product.manufacturer.key);
    invariant(!priorName || priorName === product.manufacturer.name, `${context} redefines manufacturer key with a different name`);
    const priorKey = manufacturerKeyByName.get(product.manufacturer.name);
    invariant(!priorKey || priorKey === product.manufacturer.key, `${context} reuses manufacturer name under a different key`);
    manufacturerNameByKey.set(product.manufacturer.key, product.manufacturer.name);
    manufacturerKeyByName.set(product.manufacturer.name, product.manufacturer.key);
    for (const alias of [product.manufacturer.name, ...product.manufacturer.aliases]) {
      const normalizedAlias = normaliseManufacturer(alias);
      const aliasOwner = manufacturerKeyByAlias.get(normalizedAlias);
      invariant(!aliasOwner || aliasOwner === product.manufacturer.key, `${context} manufacturer alias is ambiguous: ${alias}`);
      manufacturerKeyByAlias.set(normalizedAlias, product.manufacturer.key);
    }

    nonBlank(product.model, `${context}.model`);
    nonBlank(product.mpn_raw, `${context}.mpn_raw`);
    invariant(product.mpn_normalized === normalizeMpn(product.mpn_raw), `${context}.mpn_normalized violates mpn-v1-uppercase-trim`);
    const scopedMpn = `${product.manufacturer.key}:${product.mpn_normalized}`;
    invariant(!manufacturerMpns.has(scopedMpn), `${context} duplicates manufacturer-scoped MPN`);
    manufacturerMpns.add(scopedMpn);

    exactKeys(product.specification, ["memory_generation", "total_capacity_gb", "module_count", "capacity_per_module_gb", "speed_mt_s", "form_factor", "ecc", "registered", "buffering"], `${context}.specification`);
    const spec = product.specification;
    invariant(spec.memory_generation === "DDR5", `${context} must be DDR5`);
    invariant(spec.total_capacity_gb === 32, `${context} must total 32GB`);
    invariant(spec.module_count === 2 && spec.capacity_per_module_gb === 16, `${context} must be 2x16GB`);
    invariant(spec.total_capacity_gb === spec.module_count * spec.capacity_per_module_gb, `${context} capacity arithmetic is inconsistent`);
    invariant(Number.isInteger(spec.speed_mt_s) && spec.speed_mt_s > 0, `${context}.speed_mt_s must be positive`);
    invariant(spec.form_factor === "UDIMM", `${context} must be UDIMM`);
    invariant(spec.ecc === false && spec.registered === false && spec.buffering === "unbuffered", `${context} must be non-ECC, unregistered and unbuffered`);

    exactKeys(product.review, ["status", "evidence_references", "evidence_note"], `${context}.review`);
    invariant(product.review.status === "draft", `${context} must remain draft until human review`);
    invariant(Array.isArray(product.review.evidence_references) && product.review.evidence_references.length > 0, `${context} requires evidence`);
    invariant(new Set(product.review.evidence_references).size === product.review.evidence_references.length, `${context} contains duplicate evidence references`);
    nonBlank(product.review.evidence_note, `${context}.review.evidence_note`);
    for (const reference of product.review.evidence_references) {
      nonBlank(reference, `${context} evidence reference`);
      invariant(!reference.includes(";"), `${context} evidence reference contains a forbidden delimiter`);
      invariant(evidenceExists(reference), `${context} evidence does not exist: ${reference}`);
    }

    invariant(Array.isArray(product.identifiers) && product.identifiers.length > 0, `${context}.identifiers must be non-empty`);
    const primaryMpns = product.identifiers.filter((identifier) => identifier.type === "MPN" && identifier.is_primary);
    invariant(primaryMpns.length === 1, `${context} requires exactly one primary MPN`);
    for (const [identifierIndex, identifier] of product.identifiers.entries()) {
      const identifierContext = `${context}.identifiers[${identifierIndex}]`;
      exactKeys(identifier, ["type", "raw_value", "normalized_value", "is_primary", "evidence_reference"], identifierContext);
      invariant(identifier.type === "MPN", `${identifierContext} only evidence-backed MPNs are allowed in this seed`);
      invariant(typeof identifier.is_primary === "boolean", `${identifierContext}.is_primary must be boolean`);
      invariant(identifier.normalized_value === normalizeMpn(identifier.raw_value), `${identifierContext} normalization mismatch`);
      const identityKey = `${product.manufacturer.key}:${identifier.type}:${identifier.normalized_value}`;
      invariant(!identifiers.has(identityKey), `${identifierContext} duplicates an identifier`);
      identifiers.add(identityKey);
      nonBlank(identifier.evidence_reference, `${identifierContext}.evidence_reference`);
      invariant(evidenceExists(identifier.evidence_reference), `${identifierContext} evidence does not exist`);
    }
    invariant(primaryMpns[0].raw_value === product.mpn_raw && primaryMpns[0].normalized_value === product.mpn_normalized, `${context} primary MPN must match revision identity`);
  }

  return { productCount: catalogue.products.length, productKeys, manufacturerKeyByAlias };
}

export function validateCatalogueReview(review, catalogue, fixtures) {
  exactKeys(
    review,
    ["schema_version", "review_id", "review_type", "catalogue_fixture_set_id", "listing_fixture_set_id", "decision", "reviewed_by", "reviewed_at", "product_keys", "listing_example_ids", "confirmations", "limitations"],
    "catalogue review",
  );
  invariant(review.schema_version === 1, "unsupported catalogue review schema_version");
  nonBlank(review.review_id, "catalogue review.review_id");
  invariant(review.review_type === "human_catalogue_and_label_review", "unexpected catalogue review type");
  invariant(review.catalogue_fixture_set_id === catalogue.fixture_set_id, "catalogue review references the wrong catalogue fixture");
  invariant(review.listing_fixture_set_id === fixtures.fixture_set_id, "catalogue review references the wrong listing fixture");
  invariant(review.decision === "approved_for_fixture_use", "catalogue review decision is not approved");
  exactKeys(review.reviewed_by, ["name", "role"], "catalogue review.reviewed_by");
  nonBlank(review.reviewed_by.name, "catalogue review reviewer name");
  invariant(review.reviewed_by.role === "project_owner", "catalogue review must be attributable to the project owner");
  invariant(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(review.reviewed_at), "catalogue review reviewed_at must be UTC ISO-8601");

  const expectedProductKeys = catalogue.products.map((product) => product.product_key).sort();
  invariant(Array.isArray(review.product_keys), "catalogue review.product_keys must be an array");
  invariant(JSON.stringify([...review.product_keys].sort()) === JSON.stringify(expectedProductKeys), "catalogue review must name every catalogue product exactly once");
  const expectedExampleIds = fixtures.examples.map((example) => example.example_id).sort();
  invariant(Array.isArray(review.listing_example_ids), "catalogue review.listing_example_ids must be an array");
  invariant(JSON.stringify([...review.listing_example_ids].sort()) === JSON.stringify(expectedExampleIds), "catalogue review must name every listing example exactly once");

  const requiredConfirmations = new Set([
    "exact_mpn_and_specification_checked",
    "kingston_on_die_ecc_interpretation_accepted",
    "kingston_renegade_source_typo_handling_accepted",
    "listing_labels_checked",
    "auto_confirmation_remains_locked",
  ]);
  invariant(Array.isArray(review.confirmations), "catalogue review.confirmations must be an array");
  invariant(review.confirmations.length === new Set(review.confirmations).size, "catalogue review confirmations must be unique");
  invariant([...requiredConfirmations].every((confirmation) => review.confirmations.includes(confirmation)), "catalogue review is missing a required confirmation");
  invariant(Array.isArray(review.limitations) && review.limitations.length > 0, "catalogue review limitations must be non-empty");
  for (const limitation of review.limitations) nonBlank(limitation, "catalogue review limitation");
  invariant(review.limitations.includes("does_not_approve_production_activation"), "catalogue review must not imply production approval");
  invariant(review.limitations.includes("does_not_approve_index_methodology_or_baseline"), "catalogue review must not imply methodology approval");
  return true;
}

export function validateEvidenceExtract(extract) {
  exactKeys(extract, ["schema_version", "evidence_type", "product_mpn", "source", "extraction", "facts"], "evidence extract");
  invariant(extract.schema_version === 1, "unsupported evidence extract schema_version");
  invariant(extract.evidence_type === "minimal_factual_product_extract", "unexpected evidence extract type");
  invariant(extract.product_mpn === normalizeMpn(extract.product_mpn), "evidence extract MPN must be normalized");
  exactKeys(extract.extraction, ["recorded_at", "method", "authored_content_retained"], "evidence extract.extraction");
  invariant(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(extract.extraction.recorded_at), "evidence extract recorded_at must be UTC ISO-8601");
  nonBlank(extract.extraction.method, "evidence extract extraction method");
  invariant(extract.extraction.authored_content_retained === false, "evidence extract must not retain authored creative");

  if (extract.source.publisher === "Kingston Technology") {
    exactKeys(extract.source, ["publisher", "url", "retrieved_on", "source_response_bytes", "source_response_sha256"], "Kingston evidence source");
    exactKeys(
      extract.facts,
      extract.facts.source_discrepancy_note
        ? ["heading", "total_capacity_gb", "module_count", "capacity_per_module_gb", "memory_generation", "tested_speed_mt_s", "pin_count", "source_discrepancy_note", "module_classification_note"]
        : ["heading", "total_capacity_gb", "module_count", "capacity_per_module_gb", "memory_generation", "tested_speed_mt_s", "pin_count", "module_classification_note"],
      "Kingston evidence facts",
    );
    invariant(/^https:\/\/www\.kingston\.com\/datasheets\//u.test(extract.source.url), "Kingston evidence URL is invalid");
    invariant(extract.facts.pin_count === 288, "Kingston extract must establish a 288-pin DIMM");
    nonBlank(extract.facts.module_classification_note, "Kingston classification note");
  } else if (extract.source.publisher === "G.SKILL International Enterprise Co., Ltd.") {
    exactKeys(extract.source, ["publisher", "overview_url", "specification_url", "retrieved_on", "overview_response_bytes", "overview_response_sha256", "specification_response_bytes", "specification_response_sha256"], "G.SKILL evidence source");
    exactKeys(extract.facts, ["product_family", "memory_generation", "total_capacity_gb", "module_count", "capacity_per_module_gb", "tested_speed_mt_s", "catalogue_category", "registered_or_unbuffered", "ecc"], "G.SKILL evidence facts");
    invariant(/^https:\/\/www\.gskill\.com\/product\//u.test(extract.source.overview_url), "G.SKILL overview URL is invalid");
    invariant(/^https:\/\/www\.gskill\.com\/specification\//u.test(extract.source.specification_url), "G.SKILL specification URL is invalid");
    invariant(extract.facts.registered_or_unbuffered === "Unbuffered" && extract.facts.ecc === "Non-ECC", "G.SKILL extract must establish unbuffered Non-ECC memory");
  } else {
    throw new Error("evidence extract has an unsupported first-party publisher");
  }

  invariant(/^\d{4}-\d{2}-\d{2}$/u.test(extract.source.retrieved_on), "evidence extract retrieved_on must be an ISO date");
  const byteFields = Object.entries(extract.source).filter(([key]) => key.endsWith("_bytes"));
  const hashFields = Object.entries(extract.source).filter(([key]) => key.endsWith("_sha256"));
  invariant(byteFields.length > 0 && byteFields.every(([, value]) => Number.isInteger(value) && value > 0), "evidence source byte counts must be positive");
  invariant(hashFields.length > 0 && hashFields.every(([, value]) => /^[0-9a-f]{64}$/u.test(value)), "evidence source hashes must be SHA-256");
  invariant(extract.facts.memory_generation === "DDR5", "evidence extract must establish DDR5");
  invariant(extract.facts.total_capacity_gb === 32 && extract.facts.module_count === 2 && extract.facts.capacity_per_module_gb === 16, "evidence extract must establish 32GB as 2x16GB");
  invariant(Number.isInteger(extract.facts.tested_speed_mt_s) && extract.facts.tested_speed_mt_s > 0, "evidence extract speed is invalid");
  return true;
}

export function validateEvidenceManifest(manifest) {
  exactKeys(manifest, ["schema_version", "evidence_set", "status", "handling", "items"], "evidence manifest");
  invariant(manifest.schema_version === 1, "unsupported evidence manifest schema_version");
  invariant(manifest.evidence_set === "catalogue-2026-08-06", "unexpected evidence set");
  invariant(manifest.status === "candidate_fixture_evidence_only", "unexpected evidence status");
  invariant(manifest.handling === "minimal_factual_extracts_no_authored_creative", "evidence handling must exclude authored creative");
  invariant(Array.isArray(manifest.items) && manifest.items.length > 0, "evidence manifest must be non-empty");
  const files = new Set();
  const productMpns = new Set();
  for (const [index, item] of manifest.items.entries()) {
    const context = `evidence manifest.items[${index}]`;
    exactKeys(item, ["file", "evidence_type", "product_mpn", "source_urls", "recorded_at", "authored_content_retained", "bytes", "sha256"], context);
    nonBlank(item.file, `${context}.file`);
    invariant(!item.file.includes("/") && !item.file.includes("\\") && item.file.endsWith(".extract.json"), `${context}.file must be a safe extract basename`);
    invariant(!files.has(item.file), `${context}.file must be unique`);
    files.add(item.file);
    invariant(item.evidence_type === "minimal_factual_product_extract", `${context} has an invalid evidence type`);
    nonBlank(item.product_mpn, `${context}.product_mpn`);
    invariant(!productMpns.has(item.product_mpn), `${context}.product_mpn must be unique`);
    productMpns.add(item.product_mpn);
    invariant(Array.isArray(item.source_urls) && item.source_urls.length > 0, `${context}.source_urls must be non-empty`);
    invariant(new Set(item.source_urls).size === item.source_urls.length, `${context}.source_urls must be unique`);
    for (const sourceUrl of item.source_urls) invariant(/^https:\/\//u.test(sourceUrl), `${context} source URL must use HTTPS`);
    invariant(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(item.recorded_at), `${context}.recorded_at must be UTC ISO-8601`);
    invariant(item.authored_content_retained === false, `${context} must not retain authored creative`);
    invariant(Number.isInteger(item.bytes) && item.bytes > 0, `${context}.bytes must be positive`);
    invariant(/^[0-9a-f]{64}$/u.test(item.sha256), `${context}.sha256 is invalid`);
  }
  return { files };
}

function listingManufacturerKey(listing, manufacturerKeyByAlias) {
  if (!listing.manufacturer_raw) return null;
  return manufacturerKeyByAlias.get(normaliseManufacturer(listing.manufacturer_raw)) ?? null;
}

function editDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function hasScopeContradiction(listing) {
  const supported = {
    total_capacity_gb: 32,
    module_count: 2,
    memory_generation: "DDR5",
    form_factor: "UDIMM",
    ecc: false,
    registered: false,
  };
  return Object.entries(supported).some(([field, value]) => field in listing && listing[field] !== value);
}

export function validateListingFixtures(fixtures, catalogue) {
  const catalogueResult = validateCatalogue(catalogue);
  exactKeys(fixtures, ["schema_version", "fixture_set_id", "catalogue_fixture_set_id", "status", "auto_confirmation_gate", "examples"], "fixtures");
  invariant(fixtures.schema_version === 1, "unsupported listing fixture schema_version");
  invariant(fixtures.catalogue_fixture_set_id === catalogue.fixture_set_id, "listing fixtures reference the wrong catalogue");
  invariant(fixtures.status === "candidate_pending_human_review", "listing fixtures must remain pending human review");
  invariant(fixtures.auto_confirmation_gate === "locked", "auto-confirmation gate must remain locked");
  invariant(Array.isArray(fixtures.examples) && fixtures.examples.length > 0, "fixtures.examples must be non-empty");

  const productsByKey = new Map(catalogue.products.map((product) => [product.product_key, product]));
  const productsByScopedMpn = new Map(catalogue.products.map((product) => [`${product.manufacturer.key}:${product.mpn_normalized}`, product]));
  const productsByMpn = new Map();
  for (const product of catalogue.products) {
    const matches = productsByMpn.get(product.mpn_normalized) ?? [];
    matches.push(product);
    productsByMpn.set(product.mpn_normalized, matches);
  }

  const exampleIds = new Set();
  const decisionsSeen = new Set();
  for (const [index, example] of fixtures.examples.entries()) {
    const context = `fixtures.examples[${index}]`;
    exactKeys(example, ["example_id", "listing", "expected", "qualification"], context);
    invariant(slug.test(example.example_id), `${context}.example_id must be a slug`);
    invariant(!exampleIds.has(example.example_id), `${context}.example_id must be unique`);
    exampleIds.add(example.example_id);
    invariant(example.listing && typeof example.listing === "object" && !Array.isArray(example.listing), `${context}.listing must be an object`);
    for (const key of Object.keys(example.listing)) invariant(listingFields.has(key), `${context}.listing has an unknown field: ${key}`);
    nonBlank(example.listing.title, `${context}.listing.title`);

    exactKeys(example.expected, ["decision", "product_key", "reason_code", "auto_confirmation_allowed"], `${context}.expected`);
    invariant(decisions.has(example.expected.decision), `${context} has an invalid decision`);
    invariant(reasonsByDecision.get(example.expected.decision).has(example.expected.reason_code), `${context} reason code contradicts its decision`);
    invariant(example.expected.auto_confirmation_allowed === false, `${context} cannot enable auto-confirmation while the gate is locked`);
    decisionsSeen.add(example.expected.decision);
    if (example.expected.decision === "match") invariant(productsByKey.has(example.expected.product_key), `${context} match target is not in the catalogue`);
    else invariant(example.expected.product_key === null, `${context} non-match outcome must not carry a product`);

    const manufacturerKey = listingManufacturerKey(example.listing, catalogueResult.manufacturerKeyByAlias);
    const normalizedMpn = example.listing.mpn_raw ? normalizeMpn(example.listing.mpn_raw) : null;
    const scopedProduct = manufacturerKey && normalizedMpn ? productsByScopedMpn.get(`${manufacturerKey}:${normalizedMpn}`) : null;
    const globalMpnProducts = normalizedMpn ? (productsByMpn.get(normalizedMpn) ?? []) : [];
    const reason = example.expected.reason_code;

    if (example.expected.decision === "match") {
      invariant(manufacturerKey, `${context} match requires a known manufacturer alias`);
      invariant(normalizedMpn, `${context} match requires an MPN`);
      invariant(scopedProduct?.product_key === example.expected.product_key, `${context} MPN does not resolve to the expected product`);
      if (reason === "exact_mpn") invariant(example.listing.mpn_raw === normalizedMpn, `${context} exact_mpn is not exact`);
      if (reason === "normalized_mpn") invariant(example.listing.mpn_raw !== normalizedMpn, `${context} normalized_mpn must require normalization`);
      const comparable = ["total_capacity_gb", "module_count", "memory_generation", "form_factor", "ecc", "registered"];
      for (const field of comparable) {
        if (field in example.listing) invariant(example.listing[field] === scopedProduct.specification[field], `${context} match has a ${field} conflict`);
      }
    } else if (reason === "no_catalogue_product") {
      invariant(manufacturerKey && normalizedMpn && !scopedProduct, `${context} no_catalogue_product requires a known manufacturer and absent exact MPN`);
      invariant(!hasScopeContradiction(example.listing), `${context} no_catalogue_product contains an unsupported scope contradiction`);
    } else if (reason === "near_mpn_only") {
      invariant(manufacturerKey && normalizedMpn && !scopedProduct, `${context} near_mpn_only must not resolve exactly`);
      const manufacturerProducts = catalogue.products.filter((product) => product.manufacturer.key === manufacturerKey);
      invariant(manufacturerProducts.some((product) => {
        const distance = editDistance(normalizedMpn, product.mpn_normalized);
        return distance >= 1 && distance <= 2;
      }), `${context} near_mpn_only is not near a catalogue MPN`);
      invariant(!hasScopeContradiction(example.listing), `${context} near_mpn_only contains an unsupported scope contradiction`);
    } else if (reason === "manufacturer_mismatch") {
      invariant(globalMpnProducts.length === 1 && globalMpnProducts[0].manufacturer.key !== manufacturerKey, `${context} does not establish a manufacturer mismatch`);
    } else if (reason === "specification_conflict") {
      invariant(scopedProduct, `${context} specification_conflict requires an exact product identity`);
      const comparable = ["total_capacity_gb", "module_count", "memory_generation", "form_factor", "ecc", "registered"];
      invariant(comparable.some((field) => field in example.listing && example.listing[field] !== scopedProduct.specification[field]), `${context} does not contain a specification conflict`);
    } else if (reason === "multiple_candidates") {
      invariant(!normalizedMpn && !example.listing.gtin_raw && manufacturerKey, `${context} multiple_candidates requires identifier-free known manufacturer input`);
      invariant(catalogue.products.filter((product) => product.manufacturer.key === manufacturerKey).length > 1, `${context} does not have multiple manufacturer candidates`);
    } else if (reason === "missing_identifier") {
      invariant(!example.listing.mpn_raw && !example.listing.gtin_raw, `${context} missing_identifier contains an identifier`);
    } else if (reason === "malformed_identifier") {
      invariant(typeof example.listing.gtin_raw === "string" && !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/u.test(example.listing.gtin_raw), `${context} malformed_identifier is not malformed`);
    } else if (reason === "unsupported_memory_type") {
      invariant(example.listing.memory_generation && example.listing.memory_generation !== "DDR5", `${context} does not establish unsupported memory type`);
    } else if (reason === "unsupported_form_factor") {
      invariant(example.listing.form_factor && example.listing.form_factor !== "UDIMM", `${context} does not establish unsupported form factor`);
    } else if (reason === "unsupported_module_configuration") {
      invariant(Number.isInteger(example.listing.module_count) && example.listing.module_count !== 2, `${context} does not establish unsupported module configuration`);
    } else if (reason === "unsupported_capacity") {
      invariant(Number.isInteger(example.listing.total_capacity_gb) && example.listing.total_capacity_gb !== 32, `${context} does not establish unsupported capacity`);
    } else if (reason === "multi_product_listing") {
      invariant(!normalizedMpn && /\b(?:choose|or)\b/iu.test(example.listing.title), `${context} does not establish a multi-product listing`);
    }

    exactKeys(example.qualification, ["index_eligible", "exclusion_reason"], `${context}.qualification`);
    invariant(typeof example.qualification.index_eligible === "boolean", `${context}.qualification.index_eligible must be boolean`);
    if (example.qualification.index_eligible) {
      invariant(example.expected.decision === "match", `${context} unresolved identity cannot be index eligible`);
      invariant(example.qualification.exclusion_reason === null, `${context} eligible listing cannot have an exclusion reason`);
    } else nonBlank(example.qualification.exclusion_reason, `${context}.qualification.exclusion_reason`);
  }
  for (const decision of decisions) invariant(decisionsSeen.has(decision), `fixture set must cover decision: ${decision}`);
  return { exampleCount: fixtures.examples.length, decisionsSeen };
}

export function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
