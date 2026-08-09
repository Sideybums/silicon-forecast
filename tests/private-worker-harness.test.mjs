import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dispatchJob, dispatchJobs, prepareManifest } from "../lib/private-worker-harness.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configUrl = new URL("../config/private-worker-profiles.v1.json", import.meta.url);
const fixtureUrl = new URL("../data/fixtures/private-worker-harness-jobs.v1.json", import.meta.url);
const cli = fileURLToPath(new URL("../scripts/run-private-worker-harness.mjs", import.meta.url));
const TOKEN = "fixture-human-token-7f4d9c1a";
const load = async (url) => JSON.parse(await readFile(url, "utf8"));
const copy = structuredClone;
const authority = { enableMode: "synthetic-private-test", overrideToken: TOKEN, expectedOverrideToken: TOKEN };

async function setup() {
  const [config, fixture] = await Promise.all([load(configUrl), load(fixtureUrl)]);
  return { config, jobs: fixture.jobs };
}

function executorFor(job, execute) {
  return { profileId: job.profile_id, tool: job.tool, outputRoot: path.posix.dirname(job.output_path), execute };
}

function cliRun(args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: repositoryRoot, encoding: "utf8" });
}

test("repository defaults are inactive and contain no usable override", async () => {
  const { config, jobs } = await setup();
  assert.equal(config.enabled, false);
  assert.equal(config.override_token, null);
  await assert.rejects(() => prepareManifest(jobs, { config, repositoryRoot }), /HARNESS_DISABLED/u);
  const job = jobs[4];
  await assert.rejects(() => dispatchJob(job, { config, repositoryRoot, executor: executorFor(job, async () => ({ ok: true })) }), /HARNESS_DISABLED/u);
});

test("token alone, enable alone, and a wrong token are each insufficient", async () => {
  const { config, jobs } = await setup();
  await assert.rejects(() => prepareManifest(jobs, { config, repositoryRoot, overrideToken: TOKEN, expectedOverrideToken: TOKEN }), /HARNESS_DISABLED/u);
  await assert.rejects(() => prepareManifest(jobs, { config, repositoryRoot, enableMode: "synthetic-private-test" }), /OVERRIDE_REFUSED/u);
  await assert.rejects(() => prepareManifest(jobs, { config, repositoryRoot, ...authority, overrideToken: `${TOKEN}-wrong` }), /OVERRIDE_REFUSED/u);
});

test("profile, tool, task, and output scope mismatches fail closed", async () => {
  const { config, jobs } = await setup();
  const cases = [
    ["profile_id", "unknown-profile", /PROFILE_MISMATCH/u],
    ["tool", "shell", /TOOL_MISMATCH/u],
    ["task_kind", "production_fetch", /TASK_MISMATCH/u],
    ["requested_actions", ["make_official"], /ACTION_MISMATCH/u],
    ["instructions", "do ordinary work", /JOB_SCHEMA_MISMATCH/u],
    ["output_path", "data/private-worker-runs/event-research/stolen.json", /OUTPUT_SCOPE_MISMATCH/u],
  ];
  for (const [field, value, pattern] of cases) {
    const job = { ...copy(jobs[0]), [field]: value };
    await assert.rejects(() => prepareManifest([job], { config, repositoryRoot, ...authority }), pattern, field);
  }
});

test("output traversal and symlink escapes are rejected", async () => {
  const { config, jobs } = await setup();
  const traversing = { ...copy(jobs[0]), output_path: "data/private-worker-runs/prospective-retail-replay/../../../../outside.json" };
  await assert.rejects(() => prepareManifest([traversing], { config, repositoryRoot, ...authority }), /OUTPUT_(?:TRAVERSAL|SCOPE_MISMATCH)/u);

  const root = await mkdtemp(path.join(tmpdir(), "sf-harness-"));
  await mkdir(path.join(root, "data/private-worker-runs"), { recursive: true });
  await symlink(tmpdir(), path.join(root, "data/private-worker-runs/prospective-retail-replay"));
  await assert.rejects(() => prepareManifest([jobs[0]], { config, repositoryRoot: root, ...authority }), /OUTPUT_SYMLINK_ESCAPE/u);

  const finalRoot = await mkdtemp(path.join(tmpdir(), "sf-harness-final-"));
  const allowed = path.join(finalRoot, "data/private-worker-runs/prospective-retail-replay");
  await mkdir(allowed, { recursive: true });
  await symlink(path.join(tmpdir(), "escaped-output.json"), path.join(allowed, "retail-replay-001.json"));
  await assert.rejects(() => prepareManifest([jobs[0]], { config, repositoryRoot: finalRoot, ...authority }), /OUTPUT_SYMLINK_ESCAPE/u);
});

test("prospective scheduler collision is refused", async () => {
  const { config, jobs } = await setup();
  const collision = { ...copy(jobs[0]), scheduler_owned_pending: true };
  await assert.rejects(() => prepareManifest([collision], { config, repositoryRoot, ...authority }), /SCHEDULER_COLLISION/u);
});

test("every permanently controlled action remains forbidden despite override", async () => {
  const { config, jobs } = await setup();
  const actions = [
    "methodology_approval", "source_selection_approval", "threshold_selection", "reference_approval", "deflator_selection", "basket_approval",
    "production_mutation", "editorial_activation", "external_publication", "spend", "use_live_credentials", "run_migration", "public_app_edit", "disable_governance_lock",
  ];
  for (const action of actions) {
    const job = { ...copy(jobs[4]), id: `attack-${action}`, requested_actions: [action] };
    await assert.rejects(() => prepareManifest([job], { config, repositoryRoot, ...authority }), /CONTROLLED_ACTION_FORBIDDEN/u, action);
  }
});

test("dispatch rejects executor profile, tool, and output-scope mismatch", async () => {
  const { config, jobs } = await setup();
  const job = jobs[4];
  for (const change of [{ profileId: "forged" }, { tool: "fixture-reader" }, { outputRoot: "data/private-worker-runs" }]) {
    const executor = { ...executorFor(job, async () => ({ ok: true })), ...change };
    await assert.rejects(() => dispatchJob(job, { config, repositoryRoot, ...authority, executor }), /EXECUTOR_MISMATCH/u);
  }
});

test("timeout is captured and retries never exceed the profile cap", async () => {
  const { config, jobs } = await setup();
  const bounded = copy(config);
  const profile = bounded.profiles.find((item) => item.id === "adversarial-fixture-verification");
  profile.timeout_ms = 15;
  profile.retry_cap = 1;
  let calls = 0;
  const job = jobs[4];
  const executor = executorFor(job, async () => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 40)); return { late: true }; });
  const result = await dispatchJob(job, { config: bounded, repositoryRoot, ...authority, executor });
  assert.equal(result.status, "failed_bounded");
  assert.equal(result.failure_code, "TIMEOUT");
  assert.equal(result.attempts, 2);
  assert.equal(calls, 2);
});

test("ordinary failures retry only to the configured cap", async () => {
  const { config, jobs } = await setup();
  let calls = 0;
  const job = jobs[4];
  const result = await dispatchJob(job, { config, repositoryRoot, ...authority, executor: executorFor(job, async () => { calls += 1; throw new Error("synthetic failure"); }) });
  assert.equal(result.status, "failed_bounded");
  assert.equal(result.attempts, 3);
  assert.equal(calls, 3);
});

test("global and per-profile concurrency caps are enforced", async () => {
  const { config, jobs } = await setup();
  const base = jobs[4];
  const batch = Array.from({ length: 7 }, (_, index) => ({ ...copy(base), id: `concurrency-${index}`, output_path: `data/private-worker-runs/adversarial-fixture-verification/concurrency-${index}.json` }));
  let active = 0;
  let maximum = 0;
  const executor = executorFor(base, async () => { active += 1; maximum = Math.max(maximum, active); await new Promise((resolve) => setTimeout(resolve, 15)); active -= 1; return { ok: true }; });
  const results = await dispatchJobs(batch, { config, repositoryRoot, ...authority, executor });
  assert.equal(results.length, 7);
  assert.ok(results.every((result) => result.status === "captured_candidate_private_unapproved"));
  assert.equal(maximum, 2);
  assert.ok(maximum <= config.max_global_concurrency);
});

test("oversized structured output is rejected without retaining it", async () => {
  const { config, jobs } = await setup();
  const job = jobs[4];
  const result = await dispatchJob(job, { config, repositoryRoot, ...authority, executor: executorFor(job, async () => ({ text: "x".repeat(5000) })) });
  assert.equal(result.failure_code, "OUTPUT_TOO_LARGE");
  assert.equal(result.result, null);
});

test("secret-shaped job payloads and executor results are rejected and never retained", async () => {
  const { config, jobs } = await setup();
  const badJob = copy(jobs[4]);
  badJob.payload.apiKey = "synthetic-not-even-a-real-key";
  await assert.rejects(() => prepareManifest([badJob], { config, repositoryRoot, ...authority }), /SECRET_REJECTED/u);

  const job = jobs[4];
  const result = await dispatchJob(job, { config, repositoryRoot, ...authority, executor: executorFor(job, async () => ({ note: "Bearer abcdefghijklmnopqrstuvwxyz" })) });
  assert.equal(result.failure_code, "SECRET_REJECTED");
  assert.equal(result.result, null);
  assert.doesNotMatch(JSON.stringify(result), /abcdefghijklmnopqrstuvwxyz/u);
});

test("worker self-report cannot confer approval or integration", async () => {
  const { config, jobs } = await setup();
  const job = jobs[4];
  const result = await dispatchJob(job, { config, repositoryRoot, ...authority, executor: executorFor(job, async () => ({ integration_status: "approved_and_integrated", self_approved: true })) });
  assert.equal(result.integration_status, "pending_independent_human_review");
  assert.equal(result.approval_conferred, false);
  assert.equal(result.worker_self_report_ignored, "approved_and_integrated");
});

test("manifest preparation is deterministic, token-free, private, and unapproved", async () => {
  const { config, jobs } = await setup();
  const first = await prepareManifest(jobs, { config, repositoryRoot, ...authority });
  const second = await prepareManifest(copy(jobs).reverse(), { config, repositoryRoot, ...authority });
  assert.deepEqual(first, second);
  assert.match(first.manifest_sha256, /^[a-f0-9]{64}$/u);
  assert.ok(first.jobs.every((job) => job.integration_status === "pending_independent_human_review" && job.worker_may_self_approve === false));
  assert.doesNotMatch(JSON.stringify(first), new RegExp(TOKEN, "u"));
});

test("CLI exits nonzero by default and only prepares a manifest with explicit synthetic invocation override", () => {
  const disabled = cliRun([]);
  assert.equal(disabled.status, 2);
  assert.match(disabled.stderr, /HARNESS_DISABLED/u);
  assert.equal(disabled.stdout, "");

  const enabledArgs = ["--enable-private-test", "--operator-token", TOKEN, "--confirm-operator-token", TOKEN, "--job-id", "adversarial-replay-001"];
  const first = cliRun(enabledArgs);
  const second = cliRun(enabledArgs);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stderr, "");
  assert.equal(first.stdout, second.stdout);
  const manifest = JSON.parse(first.stdout);
  assert.equal(manifest.mode, "validation_only_no_dispatch");
  assert.equal(manifest.jobs.length, 1);
  assert.doesNotMatch(first.stdout, new RegExp(TOKEN, "u"));
});
