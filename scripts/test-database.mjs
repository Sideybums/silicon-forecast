import { execFileSync, spawnSync } from "node:child_process";
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
  process.stdout.write(result.stdout);
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
  for (const databaseTest of databaseTests) {
    runSql(databaseTest.sql, `database test ${databaseTest.file}`);
  }
  console.log("Disposable PostgreSQL verification completed successfully.");
} finally {
  cleanup();
}
