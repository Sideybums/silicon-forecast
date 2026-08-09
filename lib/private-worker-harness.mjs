import { createHash, timingSafeEqual } from "node:crypto";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export const HARNESS_CLASSIFICATION = "candidate_private_unapproved";
export const REQUIRED_ENABLE_MODE = "synthetic-private-test";

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
const SECRET_KEY = /(?:^|_)(?:password|passwd|secret|credential|api_?key|access_?token|refresh_?token|private_?key)(?:$|_)|(?:password|passwd|secret|credential|apiKey|accessToken|refreshToken|privateKey)$/iu;
const SECRET_VALUE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/=-]{12,}|\b(?:sk|ghp|glpat|AKIA)[-_A-Za-z0-9]{12,})/u;
const SAFE_ID = /^[a-z0-9][a-z0-9._-]{0,79}$/u;
const HASH = /^[a-f0-9]{64}$/u;
const JOB_KEYS = ["id", "profile_id", "task_kind", "tool", "input_refs", "input_hashes", "output_path", "requested_actions", "scheduler_owned_pending", "payload"];
const REQUIRED_PROFILES = new Set(["prospective-retail-replay", "historical-research", "official-statistics-context", "event-research", "adversarial-fixture-verification"]);
const OFFLINE_TOOLS = new Set(["fixture-reader", "archive-index-reader", "statistics-snapshot-reader", "event-snapshot-reader", "checksum", "synthetic-executor"]);

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

function assertAuthority({ enableMode, overrideToken, expectedOverrideToken }) {
  if (enableMode !== REQUIRED_ENABLE_MODE) fail("HARNESS_DISABLED", `explicit enable mode ${REQUIRED_ENABLE_MODE} is required`);
  if (!exactTokenMatch(overrideToken, expectedOverrideToken)) fail("OVERRIDE_REFUSED", "an exact invocation-supplied operator token and confirmation are required");
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

function assertNoControlledAction(job) {
  const values = [...(job.requested_actions ?? []), job.task_kind ?? "", JSON.stringify(job.payload ?? {})];
  for (const value of values) {
    if (FORBIDDEN_ACTION_PATTERNS.some((pattern) => pattern.test(String(value)))) {
      fail("CONTROLLED_ACTION_FORBIDDEN", `job ${job.id ?? "unknown"} requests a permanently forbidden action`);
    }
  }
  for (const key of ["command", "shell", "argv", "environment", "credentials", "secrets"]) {
    if (Object.hasOwn(job, key)) fail("ARBITRARY_EXECUTION_FORBIDDEN", `job field ${key} is forbidden`);
  }
}

function assertConfig(config) {
  if (!config || config.schema_version !== "private-worker-profiles.v1") fail("CONFIG_INVALID", "unknown profile schema");
  if (config.enabled !== false || config.override_token !== null) fail("CONFIG_UNSAFE", "repository config must be disabled and contain no override token");
  if (!Number.isInteger(config.max_global_concurrency) || config.max_global_concurrency < 1 || config.max_global_concurrency > 3) fail("CONFIG_INVALID", "global concurrency must be 1..3");
  if (!Array.isArray(config.profiles) || config.profiles.length !== 5) fail("CONFIG_INVALID", "exactly five bounded profiles are required");
  const profiles = new Map(config.profiles.map((profile) => {
    if (!SAFE_ID.test(profile.id)) fail("CONFIG_INVALID", "invalid profile id");
    if (!REQUIRED_PROFILES.has(profile.id)) fail("CONFIG_INVALID", `unexpected profile ${profile.id}`);
    if (!Array.isArray(profile.allowed_output_roots) || profile.allowed_output_roots.length !== 1 || profile.allowed_output_roots[0] !== `data/private-worker-runs/${profile.id}`) fail("CONFIG_INVALID", `${profile.id} must use only its additive private worker-run root`);
    if (!Array.isArray(profile.allowed_tools) || !profile.allowed_tools.every((tool) => OFFLINE_TOOLS.has(tool))) fail("CONFIG_INVALID", `${profile.id} contains a non-offline dispatch tool`);
    if (!Array.isArray(profile.allowed_requested_actions) || profile.allowed_requested_actions.length === 0 || !profile.allowed_requested_actions.every((action) => SAFE_ID.test(action))) fail("CONFIG_INVALID", `${profile.id} requires an explicit requested-action allowlist`);
    if ((profile.described_network_tools_not_dispatchable_by_cli ?? []).some((tool) => profile.allowed_tools.includes(tool))) fail("CONFIG_INVALID", `${profile.id} makes a described network tool dispatchable`);
    for (const key of ["timeout_ms", "retry_cap", "concurrency_cap", "byte_cap"]) {
      if (!Number.isInteger(profile[key]) || profile[key] < (key === "retry_cap" ? 0 : 1)) fail("CONFIG_INVALID", `${profile.id}.${key} is invalid`);
    }
    if (profile.concurrency_cap > config.max_global_concurrency || profile.retry_cap > 2 || profile.timeout_ms > 30_000 || profile.byte_cap > 1_000_000) fail("CONFIG_INVALID", `${profile.id} exceeds immutable harness bounds`);
    return [profile.id, profile];
  }));
  if (profiles.size !== REQUIRED_PROFILES.size) fail("CONFIG_INVALID", "required profiles must be unique and complete");
  return profiles;
}

async function rejectSymlinkComponents(repositoryRoot, relativeOutput) {
  const pieces = relativeOutput.split(path.sep);
  let cursor = repositoryRoot;
  for (const piece of pieces) {
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
  if (typeof job.output_path !== "string" || path.isAbsolute(job.output_path) || job.output_path.includes("\0")) fail("OUTPUT_SCOPE_MISMATCH", "output must be a repository-relative path");
  const normalized = path.normalize(job.output_path);
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) fail("OUTPUT_TRAVERSAL", "output traversal refused");
  const repositoryReal = await realpath(repositoryRoot);
  const absolute = path.resolve(repositoryReal, normalized);
  if (!(absolute === repositoryReal || absolute.startsWith(`${repositoryReal}${path.sep}`))) fail("OUTPUT_TRAVERSAL", "output escapes repository");
  const inRoot = profile.allowed_output_roots.some((root) => {
    const allowed = path.resolve(repositoryReal, root);
    return absolute.startsWith(`${allowed}${path.sep}`);
  });
  if (!inRoot) fail("OUTPUT_SCOPE_MISMATCH", `output is outside profile ${profile.id} roots`);
  await rejectSymlinkComponents(repositoryReal, normalized);
  return normalized.split(path.sep).join("/");
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export async function validateJob(job, { config, repositoryRoot }) {
  if (!job || !SAFE_ID.test(job.id ?? "")) fail("JOB_INVALID", "job id is invalid");
  scanSecrets(job, `job ${job.id}`);
  assertNoControlledAction(job);
  if (!hasExactKeys(job, JOB_KEYS)) fail("JOB_SCHEMA_MISMATCH", "job must use the exact bounded schema");
  const profiles = assertConfig(config);
  const profile = profiles.get(job.profile_id);
  if (!profile) fail("PROFILE_MISMATCH", `unknown profile ${job.profile_id}`);
  if (!profile.task_kinds.includes(job.task_kind)) fail("TASK_MISMATCH", `${job.task_kind} is not permitted by ${profile.id}`);
  if (!profile.allowed_tools.includes(job.tool)) fail("TOOL_MISMATCH", `${job.tool} is not permitted by ${profile.id}`);
  if (profile.id === "prospective-retail-replay" && job.scheduler_owned_pending) fail("SCHEDULER_COLLISION", "canonical recurring retail collector is scheduler-owned/pending; harness dispatch is refused");
  if (!Array.isArray(job.input_refs) || !Array.isArray(job.input_hashes) || job.input_refs.length !== job.input_hashes.length || !job.input_hashes.every((hash) => HASH.test(hash))) fail("INPUT_INVALID", "input references require paired SHA-256 hashes");
  if (!Array.isArray(job.requested_actions) || !job.requested_actions.every((action) => typeof action === "string")) fail("JOB_INVALID", "requested_actions must be a string array");
  if (!job.requested_actions.every((action) => profile.allowed_requested_actions.includes(action))) fail("ACTION_MISMATCH", `job requests an action outside profile ${profile.id}`);
  const outputPath = await validateOutputPath(job, profile, repositoryRoot);
  return { profile, outputPath };
}

export async function prepareManifest(jobs, options) {
  assertAuthority(options);
  if (!Array.isArray(jobs) || jobs.length === 0) fail("JOBS_INVALID", "at least one job is required");
  const seen = new Set();
  const prepared = [];
  for (const job of jobs) {
    if (seen.has(job.id)) fail("DUPLICATE_JOB", `duplicate job ${job.id}`);
    seen.add(job.id);
    const { profile, outputPath } = await validateJob(job, options);
    prepared.push({
      id: job.id,
      profile_id: profile.id,
      task_kind: job.task_kind,
      tool: job.tool,
      input_refs: [...job.input_refs],
      input_hashes: [...job.input_hashes],
      output_path: outputPath,
      requested_actions: [...(job.requested_actions ?? [])],
      scheduler_owned_pending: job.scheduler_owned_pending === true,
      payload: structuredClone(job.payload ?? {}),
      limits: { timeout_ms: profile.timeout_ms, retry_cap: profile.retry_cap, concurrency_cap: profile.concurrency_cap, byte_cap: profile.byte_cap },
      disposition: HARNESS_CLASSIFICATION,
      worker_may_self_approve: false,
      integration_status: "pending_independent_human_review",
    });
  }
  prepared.sort((a, b) => a.id.localeCompare(b.id));
  const body = { schema_version: "private-worker-run-manifest.v1", mode: "validation_only_no_dispatch", classification: HARNESS_CLASSIFICATION, jobs: prepared };
  return { ...body, manifest_sha256: createHash("sha256").update(canonical(body)).digest("hex") };
}

function executorMatches(executor, job) {
  return executor && typeof executor.execute === "function" && executor.profileId === job.profile_id && executor.tool === job.tool && executor.outputRoot === path.posix.dirname(job.output_path);
}

async function oneAttempt(executor, job, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => executor.execute(structuredClone(job))),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("executor timeout"), { code: "TIMEOUT" })), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function dispatchJob(job, { config, repositoryRoot, enableMode, overrideToken, expectedOverrideToken, executor }) {
  assertAuthority({ enableMode, overrideToken, expectedOverrideToken });
  const { profile } = await validateJob(job, { config, repositoryRoot });
  if (!executorMatches(executor, job)) fail("EXECUTOR_MISMATCH", "executor profile, tool, and exact output directory declarations must match the job");
  let lastCode = "EXECUTOR_FAILURE";
  for (let attempt = 1; attempt <= profile.retry_cap + 1; attempt += 1) {
    try {
      const value = await oneAttempt(executor, job, profile.timeout_ms);
      scanSecrets(value, "executor result");
      const bytes = Buffer.byteLength(canonical(value));
      if (bytes > profile.byte_cap) fail("OUTPUT_TOO_LARGE", `structured result ${bytes} exceeds ${profile.byte_cap} bytes`);
      const selfReport = value && typeof value === "object" ? value.integration_status : undefined;
      return {
        job_id: job.id,
        status: "captured_candidate_private_unapproved",
        attempts: attempt,
        output_bytes: bytes,
        result: structuredClone(value),
        worker_self_report_ignored: selfReport ?? null,
        integration_status: "pending_independent_human_review",
        approval_conferred: false,
      };
    } catch (error) {
      lastCode = error?.code ?? "EXECUTOR_FAILURE";
      if (["SECRET_REJECTED", "OUTPUT_TOO_LARGE"].includes(lastCode)) return { job_id: job.id, status: "rejected_output", attempts: attempt, failure_code: lastCode, result: null, integration_status: "pending_independent_human_review", approval_conferred: false };
      if (attempt > profile.retry_cap) return { job_id: job.id, status: "failed_bounded", attempts: attempt, failure_code: lastCode, result: null, integration_status: "pending_independent_human_review", approval_conferred: false };
    }
  }
  throw new Error("unreachable");
}

export async function dispatchJobs(jobs, options) {
  assertAuthority(options);
  const profiles = assertConfig(options.config);
  const activeByProfile = new Map();
  let cursor = 0;
  const results = new Array(jobs.length);
  const worker = async () => {
    while (cursor < jobs.length) {
      const index = cursor++;
      const job = jobs[index];
      const profile = profiles.get(job.profile_id);
      while ((activeByProfile.get(job.profile_id) ?? 0) >= (profile?.concurrency_cap ?? 0)) await new Promise((resolve) => setTimeout(resolve, 1));
      activeByProfile.set(job.profile_id, (activeByProfile.get(job.profile_id) ?? 0) + 1);
      try { results[index] = await dispatchJob(job, options); } finally { activeByProfile.set(job.profile_id, activeByProfile.get(job.profile_id) - 1); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.config.max_global_concurrency, jobs.length) }, worker));
  return results;
}
