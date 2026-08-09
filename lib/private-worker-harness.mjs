import { createHash, timingSafeEqual } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

export const HARNESS_CLASSIFICATION = "candidate_private_unapproved";
export const REQUIRED_ENABLE_MODE = "synthetic-private-test";

const CONFIG_KEYS = ["schema_version", "status", "enabled", "override_token", "max_global_concurrency", "controlled_actions_permanently_forbidden", "profiles"];
const PROFILE_KEYS = ["id", "purpose", "task_kinds", "allowed_tools", "allowed_requested_actions", "allowed_input_roots", "allowed_output_roots", "timeout_ms", "retry_cap", "concurrency_cap", "byte_cap"];
const JOB_KEYS = ["id", "profile_id", "task_kind", "tool", "input_refs", "input_hashes", "output_path", "requested_actions", "payload"];
const FIXTURE_KEYS = ["schema_version", "classification", "contains_credentials", "jobs"];
const SAFE_ID = /^[a-z0-9][a-z0-9._-]{0,79}$/u;
const HASH = /^[a-f0-9]{64}$/u;
const CONTROLLED_ACTIONS = [
  "methodology_selection_change_or_approval",
  "source_selection_or_approval",
  "threshold_reference_deflator_or_basket_selection_or_approval",
  "production_mutation_or_activation",
  "editorial_activation_or_approval",
  "external_publication",
  "spend",
  "live_credentials_or_secrets",
  "migrations_or_public_app_edits",
  "weakening_locks",
];
const FORBIDDEN_ACTION_PATTERNS = [
  /methodolog(?:y|ical).*(?:select|chang|approv|activat)/iu,
  /source.*(?:select|approv|activat)/iu,
  /(?:threshold|reference|deflator|basket).*(?:select|chang|approv|activat)/iu,
  /production.*(?:mutat|activat|writ|deploy)/iu,
  /editorial.*(?:activat|approv|publish)/iu,
  /(?:external[_ -]?)?(?:publish|publication)/iu,
  /\bspend\b|payment|purchase/iu,
  /(?:use|live|load).*(?:credential|secret|api[_ -]?key|access[_ -]?token)/iu,
  /migration|public[_ -]?app|frontend[_ -]?edit/iu,
  /(?:weaken|disable|bypass|unlock).*(?:lock|control|gate)/iu,
  /self[_ -]?approv|integrat(?:e|ion)[_ -]?approv/iu,
];
const SECRET_KEY = /(?:^|[_-])(?:password|passwd|secret|credential|api[_-]?key|token|auth(?:entication|orization)?|cookie|set[_-]?cookie|headers?|private[_-]?key)(?:$|[_-])|(?:password|passwd|secret|credential|apiKey|apiToken|accessToken|refreshToken|sessionToken|idToken|authToken|bearerToken|csrfToken|clientSecret|urlCredentials|authorization|cookie|setCookie|headers|privateKey)$/iu;
const SECRET_VALUE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/=-]{12,}|\bBasic\s+[A-Za-z0-9+/=]{12,}|\b(?:sk|ghp|gho|ghu|glpat|AKIA)[-_A-Za-z0-9]{12,}|\bxox[a-z]-[A-Za-z0-9-]{10,}|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@)/u;

const PROFILE_CAPABILITIES = {
  "prospective-retail-replay": {
    task_kinds: ["retail_fixture_replay", "retail_capture_audit"],
    allowed_tools: ["fixture-reader", "checksum"],
    allowed_requested_actions: ["replay_private_fixture"],
    allowed_input_roots: ["data/fixtures/primary-retail-observations.gb.v1.json"],
    prospective_fetch_allowed: false,
  },
  "historical-research": {
    task_kinds: ["historical_fixture_replay", "historical_evidence_draft"],
    allowed_tools: ["fixture-reader", "archive-index-reader", "checksum"],
    allowed_requested_actions: ["draft_candidate_evidence"],
    allowed_input_roots: ["data/fixtures/listing-matches.v1.json"],
  },
  "official-statistics-context": {
    task_kinds: ["statistics_fixture_compare", "context_evidence_draft"],
    allowed_tools: ["fixture-reader", "statistics-snapshot-reader", "checksum"],
    allowed_requested_actions: ["compare_candidates_without_selection"],
    allowed_input_roots: ["data/fixtures/candidate-reference-real-series.gb.v1.json"],
  },
  "event-research": {
    task_kinds: ["event_fixture_replay", "event_evidence_draft"],
    allowed_tools: ["fixture-reader", "event-snapshot-reader", "checksum"],
    allowed_requested_actions: ["draft_private_unapproved_event"],
    allowed_input_roots: ["data/fixtures/candidate-event-overlay.gb.v1.json"],
  },
  "adversarial-fixture-verification": {
    task_kinds: ["adversarial_fixture_replay", "control_report"],
    allowed_tools: ["fixture-reader", "checksum"],
    allowed_requested_actions: ["verify_fail_closed_controls"],
    allowed_input_roots: ["data/fixtures/ddr5-32gb-resilience-pilot.v1.json"],
  },
};

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function hasExactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

function exactTokenMatch(supplied, expected) {
  if (typeof supplied !== "string" || typeof expected !== "string" || supplied.length < 16 || expected.length < 16) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function assertAuthority({ enableMode, overrideToken, expectedOverrideToken } = {}) {
  if (enableMode !== REQUIRED_ENABLE_MODE) fail("HARNESS_DISABLED", `explicit enable mode ${REQUIRED_ENABLE_MODE} is required`);
  if (!exactTokenMatch(overrideToken, expectedOverrideToken)) fail("OVERRIDE_REFUSED", "two exact invocation-supplied synthetic confirmations are required");
}

function scanSecrets(value, location = "value") {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) fail("SECRET_REJECTED", `${location} contains secret-shaped material`);
    return;
  }
  if (Array.isArray(value)) return value.forEach((item, index) => scanSecrets(item, `${location}[${index}]`));
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) fail("SECRET_REJECTED", `${location}.${key} is a credential-shaped field`);
      scanSecrets(item, `${location}.${key}`);
    }
  }
}

function assertJsonData(value, location = "payload") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) return value.forEach((item, index) => assertJsonData(item, `${location}[${index}]`));
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, item] of Object.entries(value)) assertJsonData(item, `${location}.${key}`);
    return;
  }
  fail("JOB_INVALID", `${location} must be opaque JSON data`);
}

function assertUniqueStrings(values, location, { allowEmpty = false } = {}) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0) || !values.every((value) => typeof value === "string")) fail("CONFIG_INVALID", `${location} must be a string list`);
  if (new Set(values).size !== values.length) fail("CONFIG_INVALID", `${location} contains duplicates`);
}

function sameSet(actual, expected) {
  return actual.length === expected.length && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

function assertCanonicalRepositoryPath(value, location) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.includes("\0") || path.posix.isAbsolute(value)) fail("CONFIG_INVALID", `${location} must be a canonical repository-relative path`);
  const pieces = value.split("/");
  if (pieces.some((piece) => piece === "" || piece === "." || piece === "..") || path.posix.normalize(value) !== value) fail("CONFIG_INVALID", `${location} is not canonical`);
}

export function validateConfig(config) {
  if (!hasExactKeys(config, CONFIG_KEYS)) fail("CONFIG_SCHEMA_MISMATCH", "config must use the exact schema");
  if (config.schema_version !== "private-worker-profiles.v1" || config.status !== "inactive_candidate_private_unapproved") fail("CONFIG_INVALID", "unknown schema or status");
  if (config.enabled !== false || config.override_token !== null) fail("CONFIG_UNSAFE", "repository config must be disabled and contain no override token");
  if (!Number.isInteger(config.max_global_concurrency) || config.max_global_concurrency < 1 || config.max_global_concurrency > 3) fail("CONFIG_INVALID", "global concurrency must be 1..3");
  assertUniqueStrings(config.controlled_actions_permanently_forbidden, "controlled action lock list");
  if (!sameSet(config.controlled_actions_permanently_forbidden, CONTROLLED_ACTIONS)) fail("CONFIG_INVALID", "controlled action lock list must be exact");
  if (!Array.isArray(config.profiles) || config.profiles.length !== Object.keys(PROFILE_CAPABILITIES).length) fail("CONFIG_INVALID", "exactly five profiles are required");

  const profiles = new Map();
  for (const profile of config.profiles) {
    const expected = PROFILE_CAPABILITIES[profile?.id];
    const keys = profile?.id === "prospective-retail-replay" ? [...PROFILE_KEYS, "prospective_fetch_allowed"] : PROFILE_KEYS;
    if (!hasExactKeys(profile, keys)) fail("CONFIG_SCHEMA_MISMATCH", `profile ${profile?.id ?? "unknown"} must use the exact schema`);
    if (!expected || profiles.has(profile.id) || !SAFE_ID.test(profile.id)) fail("CONFIG_INVALID", `unexpected or duplicate profile ${profile.id}`);
    if (typeof profile.purpose !== "string" || profile.purpose.length < 20) fail("CONFIG_INVALID", `${profile.id}.purpose is invalid`);
    for (const key of ["task_kinds", "allowed_tools", "allowed_requested_actions", "allowed_input_roots", "allowed_output_roots"]) assertUniqueStrings(profile[key], `${profile.id}.${key}`);
    for (const key of ["task_kinds", "allowed_tools", "allowed_requested_actions", "allowed_input_roots"]) {
      if (!sameSet(profile[key], expected[key])) fail("CONFIG_INVALID", `${profile.id}.${key} must match its exact capability set`);
    }
    if (profile.id === "prospective-retail-replay" && profile.prospective_fetch_allowed !== false) fail("CONFIG_UNSAFE", "prospective profile must assert prospective_fetch_allowed:false");
    profile.allowed_input_roots.forEach((root, index) => assertCanonicalRepositoryPath(root, `${profile.id}.allowed_input_roots[${index}]`));
    if (profile.allowed_output_roots.length !== 1 || profile.allowed_output_roots[0] !== `data/private-worker-runs/${profile.id}`) fail("CONFIG_INVALID", `${profile.id} must use only its private run root`);
    for (const key of ["timeout_ms", "retry_cap", "concurrency_cap", "byte_cap"]) {
      if (!Number.isInteger(profile[key]) || profile[key] < (key === "retry_cap" ? 0 : 1)) fail("CONFIG_INVALID", `${profile.id}.${key} is invalid`);
    }
    if (profile.timeout_ms > 30_000 || profile.retry_cap > 2 || profile.concurrency_cap > config.max_global_concurrency || profile.byte_cap > 1_000_000) fail("CONFIG_INVALID", `${profile.id} exceeds immutable bounds`);
    profiles.set(profile.id, profile);
  }
  return profiles;
}

function parseRepositoryRef(ref) {
  if (typeof ref !== "string" || !ref.startsWith("repo://")) fail("INPUT_SCHEME_FORBIDDEN", "only strict repo:// references are permitted");
  const relative = ref.slice("repo://".length);
  if (!relative || relative.includes("\\") || relative.includes("\0") || relative.includes("?") || relative.includes("#") || relative.includes("%") || path.posix.isAbsolute(relative)) fail("INPUT_REF_INVALID", `non-canonical repository ref: ${ref}`);
  const pieces = relative.split("/");
  if (pieces.some((piece) => piece === "" || piece === "." || piece === "..") || path.posix.normalize(relative) !== relative) fail("INPUT_TRAVERSAL", `input traversal or alias refused: ${ref}`);
  return relative;
}

async function assertNoSymlinkComponents(repositoryReal, relative) {
  let cursor = repositoryReal;
  for (const piece of relative.split("/")) {
    cursor = path.join(cursor, piece);
    let info;
    try {
      info = await lstat(cursor);
    } catch (error) {
      if (error?.code === "ENOENT") fail("INPUT_MISSING", `input does not exist: repo://${relative}`);
      throw error;
    }
    if (info.isSymbolicLink()) fail("INPUT_SYMLINK_FORBIDDEN", `symlink input component refused: repo://${relative}`);
  }
}

function isInAllowedRoot(relative, roots) {
  return roots.some((root) => relative === root || relative.startsWith(`${root}/`));
}

async function resolveInput(ref, expectedHash, profile, repositoryRoot) {
  const relative = parseRepositoryRef(ref);
  if (!isInAllowedRoot(relative, profile.allowed_input_roots)) fail("INPUT_SCOPE_MISMATCH", `${ref} is outside profile ${profile.id} input roots`);
  if (!HASH.test(expectedHash ?? "")) fail("INPUT_INVALID", `${ref} requires a lowercase SHA-256`);
  const repositoryReal = await realpath(repositoryRoot);
  await assertNoSymlinkComponents(repositoryReal, relative);
  const absolute = path.resolve(repositoryReal, ...relative.split("/"));
  const resolved = await realpath(absolute).catch((error) => {
    if (error?.code === "ENOENT") fail("INPUT_MISSING", `input does not exist: ${ref}`);
    throw error;
  });
  const canonicalRelative = path.relative(repositoryReal, resolved).split(path.sep).join("/");
  if (canonicalRelative !== relative || canonicalRelative.startsWith("../")) fail("INPUT_ALIAS_FORBIDDEN", `input alias or escape refused: ${ref}`);

  const handle = await open(resolved, "r");
  try {
    const before = await handle.stat();
    if (!before.isFile()) fail("INPUT_NOT_REGULAR", `input is not a regular file: ${ref}`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs) fail("INPUT_CHANGED", `input changed while being read: ${ref}`);
    const resolvedAfter = await realpath(absolute);
    if (resolvedAfter !== resolved) fail("INPUT_CHANGED", `input path changed while being read: ${ref}`);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== expectedHash) fail("INPUT_HASH_MISMATCH", `input hash does not match exact bytes: ${ref}`);
    return { ref: `repo://${canonicalRelative}`, sha256, bytes: bytes.length };
  } finally {
    await handle.close();
  }
}

async function rejectOutputSymlinks(repositoryReal, relativeOutput) {
  let cursor = repositoryReal;
  for (const piece of relativeOutput.split("/")) {
    cursor = path.join(cursor, piece);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) fail("OUTPUT_SYMLINK_ESCAPE", `symlink output component refused: ${cursor}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      break;
    }
  }
}

async function validateOutputPath(job, profile, repositoryRoot) {
  if (typeof job.output_path !== "string" || path.posix.isAbsolute(job.output_path) || job.output_path.includes("\\") || job.output_path.includes("\0")) fail("OUTPUT_SCOPE_MISMATCH", "output must be a canonical repository-relative path");
  const pieces = job.output_path.split("/");
  if (pieces.some((piece) => piece === "" || piece === "." || piece === "..") || path.posix.normalize(job.output_path) !== job.output_path) fail("OUTPUT_TRAVERSAL", "output traversal or alias refused");
  const repositoryReal = await realpath(repositoryRoot);
  const absolute = path.resolve(repositoryReal, ...pieces);
  if (!(absolute.startsWith(`${repositoryReal}${path.sep}`))) fail("OUTPUT_TRAVERSAL", "output escapes repository");
  if (!profile.allowed_output_roots.some((root) => job.output_path.startsWith(`${root}/`))) fail("OUTPUT_SCOPE_MISMATCH", `output is outside profile ${profile.id} roots`);
  await rejectOutputSymlinks(repositoryReal, job.output_path);
  return job.output_path;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function assertNoControlledAction(job) {
  for (const value of [...job.requested_actions, job.task_kind]) {
    if (FORBIDDEN_ACTION_PATTERNS.some((pattern) => pattern.test(value))) fail("CONTROLLED_ACTION_FORBIDDEN", `job ${job.id} requests a permanently forbidden action`);
  }
}

export function validateJobFixture(fixture) {
  if (!hasExactKeys(fixture, FIXTURE_KEYS)) fail("JOBS_SCHEMA_MISMATCH", "job fixture must use the exact schema");
  if (fixture.schema_version !== "private-worker-harness-jobs.v1" || fixture.classification !== "synthetic_candidate_private_unapproved" || fixture.contains_credentials !== false || !Array.isArray(fixture.jobs)) fail("JOBS_INVALID", "job fixture metadata is invalid");
  return fixture.jobs;
}

export async function validateJob(job, { config, repositoryRoot }) {
  if (!hasExactKeys(job, JOB_KEYS)) fail("JOB_SCHEMA_MISMATCH", "job must use the exact manifest-preparation schema");
  if (!SAFE_ID.test(job.id ?? "")) fail("JOB_INVALID", "job id is invalid");
  scanSecrets(job, `job ${job.id}`);
  assertJsonData(job.payload);
  const profiles = validateConfig(config);
  const profile = profiles.get(job.profile_id);
  if (!profile) fail("PROFILE_MISMATCH", `unknown profile ${job.profile_id}`);
  assertUniqueStrings(job.requested_actions, `job ${job.id}.requested_actions`);
  assertNoControlledAction(job);
  if (!profile.task_kinds.includes(job.task_kind)) fail("TASK_MISMATCH", `${job.task_kind} is not permitted by ${profile.id}`);
  if (!profile.allowed_tools.includes(job.tool)) fail("TOOL_MISMATCH", `${job.tool} is not permitted by ${profile.id}`);
  if (!job.requested_actions.every((action) => profile.allowed_requested_actions.includes(action))) fail("ACTION_MISMATCH", `job requests an action outside profile ${profile.id}`);
  if (!Array.isArray(job.input_refs) || job.input_refs.length === 0 || new Set(job.input_refs).size !== job.input_refs.length || !Array.isArray(job.input_hashes) || job.input_refs.length !== job.input_hashes.length) fail("INPUT_INVALID", "unique input references require paired SHA-256 hashes");
  const inputs = [];
  for (let index = 0; index < job.input_refs.length; index += 1) inputs.push(await resolveInput(job.input_refs[index], job.input_hashes[index], profile, repositoryRoot));
  const outputPath = await validateOutputPath(job, profile, repositoryRoot);
  return { profile, outputPath, inputs };
}

export async function prepareManifest(jobs, options) {
  assertAuthority(options);
  if (!Array.isArray(jobs) || jobs.length === 0) fail("JOBS_INVALID", "at least one job is required");
  const seenIds = new Set();
  const seenOutputs = new Set();
  const prepared = [];
  for (const job of jobs) {
    if (seenIds.has(job?.id)) fail("DUPLICATE_JOB", `duplicate job ${job?.id}`);
    seenIds.add(job?.id);
    const validated = await validateJob(job, options);
    if (seenOutputs.has(validated.outputPath)) fail("DUPLICATE_OUTPUT", `duplicate output path ${validated.outputPath}`);
    seenOutputs.add(validated.outputPath);

    const reverification = [];
    for (let index = 0; index < job.input_refs.length; index += 1) reverification.push(await resolveInput(job.input_refs[index], job.input_hashes[index], validated.profile, options.repositoryRoot));
    if (canonical(reverification) !== canonical(validated.inputs)) fail("INPUT_CHANGED", `job ${job.id} inputs changed during manifest preparation`);

    prepared.push({
      id: job.id,
      profile_id: validated.profile.id,
      task_kind: job.task_kind,
      tool: job.tool,
      inputs: reverification,
      output_path: validated.outputPath,
      requested_actions: [...job.requested_actions],
      payload: structuredClone(job.payload),
      limits: {
        timeout_ms: validated.profile.timeout_ms,
        retry_cap: validated.profile.retry_cap,
        concurrency_cap: validated.profile.concurrency_cap,
        byte_cap: validated.profile.byte_cap,
      },
      disposition: HARNESS_CLASSIFICATION,
      worker_may_self_approve: false,
      integration_status: "pending_independent_human_review",
    });
  }
  prepared.sort((a, b) => a.id.localeCompare(b.id));
  const body = {
    schema_version: "private-worker-run-manifest.v1",
    mode: "validation_only_no_dispatch",
    classification: HARNESS_CLASSIFICATION,
    jobs: prepared,
  };
  return { ...body, manifest_sha256: createHash("sha256").update(canonical(body)).digest("hex") };
}
