import { execFileSync, spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const image = process.env.SF_POSTGRES_IMAGE ?? "postgres:16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777";
const name = `silicon-forecast-postgres-test-${process.pid}`;
const migrationDir = resolve(projectRoot, "db/migrations");
const migrations = readdirSync(migrationDir)
  .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/u.test(file))
  .sort()
  .map((file) => ({ file, sql: readFileSync(resolve(migrationDir, file), "utf8") }));
const candidateCatalogueSeed = execFileSync(
  process.execPath,
  [resolve(projectRoot, "scripts/render-catalogue-seed-sql.mjs")],
  { encoding: "utf8", cwd: projectRoot },
);
const reviewedCatalogueSeed = execFileSync(
  process.execPath,
  [resolve(projectRoot, "scripts/render-catalogue-review-sql.mjs")],
  { encoding: "utf8", cwd: projectRoot },
);
const collectorFixtureSql = execFileSync(
  process.execPath,
  [resolve(projectRoot, "scripts/render-collector-fixture-sql.mjs")],
  { encoding: "utf8", cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
);
const syntheticCollectorFixtureSql = execFileSync(
  process.execPath,
  [resolve(projectRoot, "scripts/render-synthetic-collector-fixture-sql.mjs")],
  { encoding: "utf8", cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
);
const testDir = resolve(projectRoot, "db/tests");
const databaseTests = readdirSync(testDir)
  .filter((file) => /^[a-z0-9_]+\.sql$/u.test(file))
  .sort((left, right) => {
    if (left === "foundation.sql") return -1;
    if (right === "foundation.sql") return 1;
    return left.localeCompare(right);
  })
  .map((file) => ({ file, sql: readFileSync(resolve(testDir, file), "utf8") }));
let containerId = null;

function docker(args, options = {}) {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...options });
}

function runSql(sql, label) {
  const result = spawnSync(
    "docker",
    ["exec", "-i", name, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "silicon_forecast"],
    { input: sql, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`${label} failed\n${result.stdout}\n${result.stderr}`);
  }
  console.log(`${label} passed.`);
}

function runSqlAsync(sql) {
  return new Promise((resolveRun) => {
    const child = spawn("docker", ["exec", "-i", name, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "silicon_forecast"]);
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => resolveRun({ status, stdout, stderr }));
    child.stdin.end(sql);
  });
}

function cleanup() {
  if (!containerId) return;
  const inspected = spawnSync("docker", ["inspect", "--format", "{{.Id}}", containerId], { encoding: "utf8" });
  if (inspected.status === 0 && inspected.stdout.trim() === containerId) {
    spawnSync("docker", ["rm", "--force", containerId], { encoding: "utf8" });
  }
  containerId = null;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    cleanup();
    process.exit(128 + (signal === "SIGINT" ? 2 : 15));
  });
}

try {
  containerId = docker([
    "run", "--detach", "--rm", "--name", name,
    "--env", "POSTGRES_PASSWORD=fixture-only-password",
    "--env", "POSTGRES_DB=silicon_forecast",
    image,
  ]).trim();
  console.log(`Started disposable PostgreSQL container ${containerId.slice(0, 12)} (${image})`);

  // The official image briefly exposes its bootstrap server before restarting
  // PostgreSQL for normal operation. A single pg_isready success can therefore
  // race the restart and make the first migration fail. Require three stable,
  // real SQL connections instead of treating that transient socket as ready.
  let consecutiveReadyChecks = 0;
  for (let attempt = 0; attempt < 60 && consecutiveReadyChecks < 3; attempt += 1) {
    const result = spawnSync(
      "docker",
      ["exec", name, "psql", "-X", "-U", "postgres", "-d", "silicon_forecast", "-c", "SELECT 1"],
      { encoding: "utf8" },
    );
    consecutiveReadyChecks = result.status === 0 ? consecutiveReadyChecks + 1 : 0;
    if (consecutiveReadyChecks < 3) await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  if (consecutiveReadyChecks < 3) throw new Error("PostgreSQL did not become stably ready within 30 seconds");

  for (const migration of migrations) {
    runSql(migration.sql, `migration ${migration.file}`);
  }
  runSql(candidateCatalogueSeed, "candidate catalogue seed");
  runSql(reviewedCatalogueSeed, "reviewed catalogue seed");
  runSql(syntheticCollectorFixtureSql, "lossless exact-attempt synthetic fixture standalone import");
  runSql(collectorFixtureSql, "lossless legacy collector fixture");
  runSql(collectorFixtureSql, "lossless legacy collector exact replay");
  const [bundleLock] = collectorFixtureSql.match(/SELECT pg_advisory_xact_lock\([^;]+;/u) ?? [];
  if (!bundleLock) throw new Error("legacy fixture SQL omitted its advisory transaction lock");
  const slowReplay = collectorFixtureSql.replace(bundleLock, `${bundleLock}\nSELECT pg_sleep(0.5);`);
  const changedCollision = `BEGIN;
${bundleLock}
INSERT INTO silicon_forecast.collector_raw_artifact(bundle_id,collector_commit,collector_tree,canonical_path,git_blob,content_byte_length,content_sha256,artifact_kind,raw_bytes,parsed_json,extractor_replayable)
SELECT bundle_id,collector_commit,collector_tree,canonical_path,git_blob,content_byte_length,content_sha256,artifact_kind || '_changed',raw_bytes,parsed_json,extractor_replayable
FROM silicon_forecast.collector_raw_artifact
WHERE bundle_id=(SELECT bundle_id FROM silicon_forecast.collector_collection_run WHERE collection_run_id='sf-collection-run-20260825T103008Z')
ORDER BY canonical_path
LIMIT 1
ON CONFLICT (collector_commit,canonical_path) DO NOTHING;
COMMIT;`;
  const [replayResult, collisionResult] = await Promise.all([runSqlAsync(slowReplay), runSqlAsync(changedCollision)]);
  if (replayResult.status !== 0) throw new Error(`concurrent identical replay failed\n${replayResult.stdout}\n${replayResult.stderr}`);
  if (collisionResult.status === 0 || !/IMMUTABLE_REPLAY_COLLISION/u.test(collisionResult.stderr)) {
    throw new Error(`concurrent changed-content collision did not fail closed\n${collisionResult.stdout}\n${collisionResult.stderr}`);
  }
  console.log("Concurrent identical replay and changed-content collision verification passed.");
  runSql(`
DO $$ BEGIN
  IF (SELECT count(*) FROM silicon_forecast.candidate_primary_retail_observation) <> 0
     OR (SELECT count(*) FROM silicon_forecast.candidate_retailer_product_movement) <> 0 THEN
    RAISE EXCEPTION 'collector fixtures mutated migration 0003 candidate tables';
  END IF;
END $$;
`, "collector migration 0003 isolation check");
  for (const databaseTest of databaseTests) {
    runSql(databaseTest.sql, `database test ${databaseTest.file}`);
  }
  console.log("Disposable PostgreSQL verification completed successfully.");
} finally {
  cleanup();
}
