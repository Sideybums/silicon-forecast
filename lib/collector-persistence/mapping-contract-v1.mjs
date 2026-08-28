import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

export const CONTRACT_VERSION = "sf-collector-mapping-v1";
export const CONTRACT_ARTIFACT_PATHS = Object.freeze([
  "lib/collector-persistence/mapping-contract-v1.mjs",
  "schemas/collector-persistence/run-ledger.v1.schema.json",
  "schemas/collector-persistence/imported-run.v1.schema.json",
  "schemas/collector-persistence/observation-tranche.v1.schema.json",
  "schemas/collector-persistence/evidence-ledger.v1.schema.json",
  "schemas/collector-target-attempt-set.v1.schema.json",
].sort(compareUtf8));

export function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function assertData(value, seen = new Set()) {
  if (value === null || ["string", "boolean"].includes(typeof value)) return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("canonical JSON rejects non-finite numbers");
    return;
  }
  if (typeof value !== "object") throw new TypeError(`canonical JSON rejects ${typeof value}`);
  if (seen.has(value)) throw new TypeError("canonical JSON rejects cycles");
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) throw new TypeError("canonical JSON rejects array holes");
      assertData(value[index], seen);
    }
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("canonical JSON rejects exotic prototypes");
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || descriptor.get || descriptor.set) throw new TypeError("canonical JSON rejects accessors");
      assertData(value[key], seen);
    }
  }
  seen.delete(value);
}

function ordered(value, prescribedOrder, depth = 0) {
  if (Array.isArray(value)) return value.map((item) => ordered(item, null, depth + 1));
  if (value === null || typeof value !== "object") return value;
  const keys = depth === 0 && prescribedOrder
    ? prescribedOrder
    : Object.keys(value).sort(compareUtf8);
  if (keys.length !== Object.keys(value).length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new TypeError("prescribed canonical key set does not match object");
  }
  return Object.fromEntries(keys.map((key) => [key, ordered(value[key], null, depth + 1)]));
}

export function canonicalJsonBytes(value, prescribedTopLevelOrder = null) {
  assertData(value);
  return Buffer.from(`${JSON.stringify(ordered(value, prescribedTopLevelOrder), null, 2)}\n`, "utf8");
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const schemaRoot = fileURLToPath(new URL("../../schemas/", import.meta.url));
const ajv = new Ajv({ allErrors: true, jsonPointers: true, unknownFormats: "ignore" });
const validators = new Map();
export function validateCommittedSchema(relativePath, value) {
  let validate = validators.get(relativePath);
  if (!validate) {
    validate = ajv.compile(JSON.parse(readFileSync(resolve(schemaRoot, relativePath), "utf8")));
    validators.set(relativePath, validate);
  }
  if (!validate(value)) throw new Error(`JSON_SCHEMA_INVALID:${relativePath}:${ajv.errorsText(validate.errors,{separator:"; "})}`);
  return value;
}

export function normaliseMpn(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("MPN must be a non-empty string");
  return value.normalize("NFKC").trim().toUpperCase();
}

export function suppliedTargetIdentity(sellerDisplayName, mpn) {
  if (typeof sellerDisplayName !== "string" || sellerDisplayName.length === 0) throw new TypeError("seller display name is required");
  return `${sellerDisplayName}\u001f${normaliseMpn(mpn)}`;
}

export function mapObservation(observation) {
  if (!observation || typeof observation !== "object" || Array.isArray(observation)) throw new TypeError("observation must be an object");
  const required = ["observation_id", "observed_at", "source", "identity", "seller", "item_price", "availability", "delivery", "landed_price", "qualification", "evidence", "governance"];
  for (const key of required) if (!Object.hasOwn(observation, key)) throw new TypeError(`observation missing ${key}`);
  const authorityValues = Object.values(observation.governance);
  if (authorityValues.some((value) => value !== false)) throw new Error("AUTHORITY_FLAG_TRUE");
  const normalisedMpn = normaliseMpn(observation.identity.mpn_expected);
  const availability = ["in_stock", "unknown", "other"].includes(observation.availability.normalised)
    ? observation.availability.normalised : null;
  const quarantine = ["unresolved_canonical_product", "unresolved_retailer", "unresolved_source", "unresolved_policy"];
  if (availability === null) quarantine.push("unmapped_raw_enum");
  return {
    raw: structuredClone(observation),
    normalised: {
      normalisedMpn,
      suppliedTargetIdentity: suppliedTargetIdentity(observation.seller.display_name, normalisedMpn),
      availability,
      qualification: observation.qualification.status.startsWith("candidate_retained") ? "retained_candidate" : "abstained",
    },
    quarantine,
  };
}

export function deriveAttemptOutcome(rawResult) {
  if (rawResult?.usable === true && Array.isArray(rawResult.reasons) && rawResult.reasons.length === 0) return "observation_retained";
  const first = rawResult?.reasons?.[0];
  if (typeof first !== "string" || first.length === 0) throw new Error("ATTEMPT_NON_USABLE_REASON_REQUIRED");
  if (first === "ROBOTS_DISALLOWED") return "robots_disallowed";
  if (/^HTTP_[0-9]{3}$/u.test(first)) return "http_failure";
  if (first === "FETCH_FAILED") return "fetch_failure";
  if (first === "NO_EXTRACTOR_FOR_SELLER") return "parser_abstention";
  if (first.startsWith("MPN_")) return "identity_abstention";
  return "qualification_abstention";
}

export function validateAttemptSet(set) {
  validateCommittedSchema("collector-target-attempt-set.v1.schema.json", set);
  const topKeys = ["schema_version","attempt_set_id","run_id","collector_version","target_registry_path","target_registry_sha256","target_selection_contract_version","started_at","completed_at","attempt_count","attempts","status","governance"];
  const attemptKeys = ["attempt_id","ordinal","target_key","expected_mpn","seller_display_name","seller_legal_name_supplied","source_key","requested_url","attempt_started_at","attempt_completed_at","outcome","raw_reasons","http_status","final_url","response_bytes","response_sha256","response_bytes_retained","retention_note","observation_id","evidence_id","raw_result_sha256","raw_result"];
  const governanceKeys = ["source_approved","methodology_approved","index_eligible","production_eligible","publication_eligible","public_claim_approved"];
  const exactKeys = (object, expected, label) => {
    const actual = Object.keys(object ?? {}).sort(compareUtf8);
    const wanted = [...expected].sort(compareUtf8);
    if (actual.length !== wanted.length || actual.some((key,index) => key !== wanted[index])) throw new Error(`${label}_KEYS_NOT_EXACT`);
  };
  exactKeys(set, topKeys, "ATTEMPT_SET"); exactKeys(set.governance, governanceKeys, "ATTEMPT_GOVERNANCE");
  if (set.schema_version !== 1 || set.status !== "candidate_private_immutable" || Object.values(set.governance).some((value) => value !== false)) throw new Error("ATTEMPT_SET_ENVELOPE_INVALID");
  const stamp = set.run_id.match(/^sf-collection-run-([0-9]{8}T[0-9]{6}Z)$/u)?.[1];
  if (!stamp || set.attempt_set_id !== `sf-collection-attempt-set-${stamp}-v1` || set.attempt_count !== set.attempts.length) throw new Error("ATTEMPT_SET_ID_OR_COUNT_INVALID");
  if (new Date(set.started_at).toISOString() > new Date(set.completed_at).toISOString()) throw new Error("ATTEMPT_SET_TIME_INVALID");
  const targets = new Set();
  for (let index=0; index<set.attempts.length; index+=1) {
    const attempt=set.attempts[index]; exactKeys(attempt, attemptKeys, "ATTEMPT"); const ordinal=index+1;
    if (attempt.ordinal!==ordinal || attempt.attempt_id!==`${set.run_id}:attempt:${String(ordinal).padStart(4,"0")}` || targets.has(attempt.target_key)) throw new Error("ATTEMPT_ID_ORDER_OR_TARGET_INVALID");
    targets.add(attempt.target_key);
    if (new Date(attempt.attempt_started_at).toISOString() > new Date(attempt.attempt_completed_at).toISOString()) throw new Error("ATTEMPT_TIME_INVALID");
    if (attempt.response_bytes_retained !== false || (attempt.response_bytes===null)!==(attempt.response_sha256===null)) throw new Error("ATTEMPT_RESPONSE_BINDING_INVALID");
    if (sha256(canonicalJsonBytes(attempt.raw_result)) !== attempt.raw_result_sha256) throw new Error("ATTEMPT_RAW_RESULT_HASH_INVALID");
    if (deriveAttemptOutcome(attempt.raw_result)!==attempt.outcome || JSON.stringify(attempt.raw_reasons)!==JSON.stringify(attempt.raw_result.reasons)) throw new Error("ATTEMPT_OUTCOME_OR_REASON_INVALID");
    const retained=attempt.outcome==="observation_retained";
    if (retained !== (attempt.observation_id!==null && attempt.evidence_id!==null) || (!retained && (attempt.observation_id!==null || attempt.evidence_id!==null))) throw new Error("ATTEMPT_OBSERVATION_LINK_INVALID");
  }
  return set;
}

function assertExactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  const actual = Object.keys(value);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new Error(code);
}

export function prescribedManifestBytes(manifest, kind) {
  assertData(manifest);
  if (kind === "mapping") {
    assertExactKeys(manifest, ["schema_version", "contract_version", "artifacts"], "MAPPING_MANIFEST_ENVELOPE_INVALID");
    if (!Array.isArray(manifest.artifacts)) throw new Error("MAPPING_MANIFEST_ARTIFACTS_INVALID");
    for (const item of manifest.artifacts) assertExactKeys(item, ["path", "byte_length", "sha256"], "MAPPING_MANIFEST_ARTIFACT_ENVELOPE_INVALID");
    const exact = {
      schema_version: manifest.schema_version,
      contract_version: manifest.contract_version,
      artifacts: manifest.artifacts.map((item) => ({ path: item.path, byte_length: item.byte_length, sha256: item.sha256 })),
    };
    return Buffer.from(`${JSON.stringify(exact, null, 2)}\n`, "utf8");
  }
  if (kind === "bundle") {
    assertExactKeys(manifest, ["schema_version", "bundle_contract", "run_id", "collector_commit", "collector_tree", "artifacts"], "BUNDLE_MANIFEST_ENVELOPE_INVALID");
    if (!Array.isArray(manifest.artifacts)) throw new Error("BUNDLE_MANIFEST_ARTIFACTS_INVALID");
    for (const item of manifest.artifacts) assertExactKeys(item, ["path", "kind", "git_blob", "byte_length", "sha256"], "BUNDLE_MANIFEST_ARTIFACT_ENVELOPE_INVALID");
    const exact = {
      schema_version: manifest.schema_version,
      bundle_contract: manifest.bundle_contract,
      run_id: manifest.run_id,
      collector_commit: manifest.collector_commit,
      collector_tree: manifest.collector_tree,
      artifacts: manifest.artifacts.map((item) => ({ path: item.path, kind: item.kind, git_blob: item.git_blob, byte_length: item.byte_length, sha256: item.sha256 })),
    };
    return Buffer.from(`${JSON.stringify(exact, null, 2)}\n`, "utf8");
  }
  throw new TypeError("unknown prescribed manifest kind");
}

export function mappingContractManifest(projectRoot = fileURLToPath(new URL("../../", import.meta.url))) {
  const artifacts = CONTRACT_ARTIFACT_PATHS.map((path) => {
    const bytes = readFileSync(resolve(projectRoot, path));
    return { path, byte_length: bytes.length, sha256: sha256(bytes) };
  });
  const manifest = { schema_version: 1, contract_version: CONTRACT_VERSION, artifacts };
  const bytes = prescribedManifestBytes(manifest, "mapping");
  return { manifest, bytes, digest: sha256(bytes) };
}
