import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as harness from "../lib/private-worker-harness.mjs";

const { prepareManifest, validateConfig, validateJobFixture } = harness;
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
  return { config, jobs: validateJobFixture(fixture), fixture };
}

function cliRun(args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: repositoryRoot, encoding: "utf8" });
}

async function materializeInput(root, job) {
  const relative = job.input_refs[0].slice("repo://".length);
  const bytes = await readFile(path.join(repositoryRoot, relative));
  await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await writeFile(path.join(root, relative), bytes);
}

test("repository defaults are inactive, fixture schema is exact, and no dispatch API exists", async () => {
  const { config, jobs, fixture } = await setup();
  assert.equal(config.enabled, false);
  assert.equal(config.override_token, null);
  await assert.rejects(() => prepareManifest(jobs, { config, repositoryRoot }), /HARNESS_DISABLED/u);
  assert.equal("dispatchJob" in harness, false);
  assert.equal("dispatchJobs" in harness, false);
  assert.deepEqual(Object.keys(harness).sort(), ["HARNESS_CLASSIFICATION", "REQUIRED_ENABLE_MODE", "prepareManifest", "validateConfig", "validateJob", "validateJobFixture"].sort());
  assert.throws(() => validateJobFixture({ ...fixture, extra: true }), /JOBS_SCHEMA_MISMATCH/u);
});

test("token alone, enable alone, and a wrong token are each insufficient", async () => {
  const { config, jobs } = await setup();
  await assert.rejects(() => prepareManifest(jobs, { config, repositoryRoot, overrideToken: TOKEN, expectedOverrideToken: TOKEN }), /HARNESS_DISABLED/u);
  await assert.rejects(() => prepareManifest(jobs, { config, repositoryRoot, enableMode: "synthetic-private-test" }), /OVERRIDE_REFUSED/u);
  await assert.rejects(() => prepareManifest(jobs, { config, repositoryRoot, ...authority, overrideToken: `${TOKEN}-wrong` }), /OVERRIDE_REFUSED/u);
});

test("config and every profile use exact schemas, capabilities, locks, and bounded limits", async () => {
  const { config } = await setup();
  assert.equal(validateConfig(config).size, 5);
  const cases = [
    [{ ...copy(config), status: "active" }, /CONFIG_INVALID/u],
    [{ ...copy(config), unknown: true }, /CONFIG_SCHEMA_MISMATCH/u],
    [{ ...copy(config), controlled_actions_permanently_forbidden: [...config.controlled_actions_permanently_forbidden, config.controlled_actions_permanently_forbidden[0]] }, /CONFIG_INVALID/u],
  ];
  for (const [candidate, pattern] of cases) assert.throws(() => validateConfig(candidate), pattern);

  for (const mutate of [
    (profile) => { profile.extra = true; },
    (profile) => { profile.allowed_tools.push(profile.allowed_tools[0]); },
    (profile) => { profile.allowed_tools = ["shell"]; },
    (profile) => { profile.task_kinds = ["fetch"]; },
    (profile) => { profile.allowed_requested_actions = ["publish"]; },
    (profile) => { profile.byte_cap = 1_000_001; },
  ]) {
    const candidate = copy(config);
    mutate(candidate.profiles[1]);
    assert.throws(() => validateConfig(candidate), /CONFIG_(?:INVALID|SCHEMA_MISMATCH)/u);
  }
  const prospective = copy(config);
  prospective.profiles[0].prospective_fetch_allowed = true;
  assert.throws(() => validateConfig(prospective), /CONFIG_UNSAFE/u);
  assert.ok(config.profiles[0].task_kinds.every((value) => !/fetch|network/iu.test(value)));
  assert.ok(config.profiles[0].allowed_tools.every((value) => !/fetch|http|network/iu.test(value)));
});

test("profile, tool, task, action, job schema, and output scope mismatches fail closed", async () => {
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

test("only canonical scoped repo refs to exact regular-file bytes are accepted", async () => {
  const { config, jobs } = await setup();
  for (const ref of [
    "fixture://retail/capture-a",
    "file:///tmp/capture-a",
    "https://example.test/capture-a",
  ]) {
    const job = { ...copy(jobs[0]), input_refs: [ref] };
    await assert.rejects(() => prepareManifest([job], { config, repositoryRoot, ...authority }), /INPUT_SCHEME_FORBIDDEN/u);
  }
  for (const ref of [
    "repo://data/fixtures/../fixtures/primary-retail-observations.gb.v1.json",
    "repo://data//fixtures/primary-retail-observations.gb.v1.json",
    "repo://data/fixtures/%70rimary-retail-observations.gb.v1.json",
  ]) {
    const job = { ...copy(jobs[0]), input_refs: [ref] };
    await assert.rejects(() => prepareManifest([job], { config, repositoryRoot, ...authority }), /INPUT_(?:TRAVERSAL|REF_INVALID)/u);
  }
  const wrongRoot = { ...copy(jobs[0]), input_refs: [jobs[1].input_refs[0]], input_hashes: [jobs[1].input_hashes[0]] };
  await assert.rejects(() => prepareManifest([wrongRoot], { config, repositoryRoot, ...authority }), /INPUT_SCOPE_MISMATCH/u);
});

test("changed and missing input files fail closed", async () => {
  const { config, jobs } = await setup();
  const job = copy(jobs[0]);
  const changedRoot = await mkdtemp(path.join(tmpdir(), "sf-harness-changed-"));
  await materializeInput(changedRoot, job);
  await writeFile(path.join(changedRoot, job.input_refs[0].slice(7)), "changed bytes\n");
  await assert.rejects(() => prepareManifest([job], { config, repositoryRoot: changedRoot, ...authority }), /INPUT_HASH_MISMATCH/u);

  const missingRoot = await mkdtemp(path.join(tmpdir(), "sf-harness-missing-"));
  await assert.rejects(() => prepareManifest([job], { config, repositoryRoot: missingRoot, ...authority }), /INPUT_MISSING/u);
});

test("input and output symlinks are rejected", async () => {
  const { config, jobs } = await setup();
  const job = jobs[0];
  const inputRoot = await mkdtemp(path.join(tmpdir(), "sf-harness-input-link-"));
  const relative = job.input_refs[0].slice(7);
  await mkdir(path.dirname(path.join(inputRoot, relative)), { recursive: true });
  await symlink(path.join(repositoryRoot, relative), path.join(inputRoot, relative));
  await assert.rejects(() => prepareManifest([job], { config, repositoryRoot: inputRoot, ...authority }), /INPUT_SYMLINK_FORBIDDEN/u);

  const outputRoot = await mkdtemp(path.join(tmpdir(), "sf-harness-output-link-"));
  await materializeInput(outputRoot, job);
  await mkdir(path.join(outputRoot, "data/private-worker-runs"), { recursive: true });
  await symlink(tmpdir(), path.join(outputRoot, "data/private-worker-runs/prospective-retail-replay"));
  await assert.rejects(() => prepareManifest([job], { config, repositoryRoot: outputRoot, ...authority }), /OUTPUT_SYMLINK_ESCAPE/u);
});

test("duplicate job IDs and canonical output paths are rejected", async () => {
  const { config, jobs } = await setup();
  await assert.rejects(() => prepareManifest([jobs[0], copy(jobs[0])], { config, repositoryRoot, ...authority }), /DUPLICATE_JOB/u);
  const duplicateOutput = { ...copy(jobs[0]), id: "retail-replay-duplicate" };
  await assert.rejects(() => prepareManifest([jobs[0], duplicateOutput], { config, repositoryRoot, ...authority }), /DUPLICATE_OUTPUT/u);
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

test("payload is opaque JSON but broad secret-shaped material is rejected as defence in depth", async () => {
  const { config, jobs } = await setup();
  const opaque = copy(jobs[4]);
  opaque.payload = { command: "not interpreted or executed", arbitrary_nested_data: [1, true, null] };
  const manifest = await prepareManifest([opaque], { config, repositoryRoot, ...authority });
  assert.deepEqual(manifest.jobs[0].payload, opaque.payload);

  for (const payload of [
    { authorization: "not-a-real-value" },
    { cookie: "not-a-real-value" },
    { nested: { headers: {} } },
    { note: "xoxb-12345678901234567890" },
    { note: "eyJabcdefghijk.abcdefghijkl.abcdefghijkl" },
    { note: "https://user:password@example.test/path" },
  ]) {
    const bad = copy(jobs[4]);
    bad.payload = payload;
    await assert.rejects(() => prepareManifest([bad], { config, repositoryRoot, ...authority }), /SECRET_REJECTED/u);
  }
});

test("manifest re-verifies provenance and is deterministic, token-free, private, and unapproved", async () => {
  const { config, jobs } = await setup();
  const first = await prepareManifest(jobs, { config, repositoryRoot, ...authority });
  const second = await prepareManifest(copy(jobs).reverse(), { config, repositoryRoot, ...authority });
  assert.deepEqual(first, second);
  assert.match(first.manifest_sha256, /^[a-f0-9]{64}$/u);
  assert.ok(first.jobs.every((job) => job.integration_status === "pending_independent_human_review" && job.worker_may_self_approve === false));
  assert.ok(first.jobs.every((job) => job.inputs.every((input) => input.ref.startsWith("repo://") && /^[a-f0-9]{64}$/u.test(input.sha256) && Number.isInteger(input.bytes) && input.bytes > 0)));
  assert.doesNotMatch(JSON.stringify(first), new RegExp(TOKEN, "u"));
  assert.equal(JSON.stringify(first).includes("scheduler_owned_pending"), false);
});

test("CLI exits nonzero by default and only prepares a validation-only manifest with dual synthetic confirmation", () => {
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
