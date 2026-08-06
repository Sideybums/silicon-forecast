import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const image = process.env.SF_POSTGRES_IMAGE ?? "postgres:16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777";
const name = `silicon-forecast-postgres-test-${process.pid}`;
const migration = readFileSync(resolve(projectRoot, "db/migrations/0001_foundation.sql"), "utf8");
const candidateCatalogueSeed = execFileSync(
  process.execPath,
  [resolve(projectRoot, "scripts/render-catalogue-seed-sql.mjs")],
  { encoding: "utf8", cwd: projectRoot },
);
const tests = readFileSync(resolve(projectRoot, "db/tests/foundation.sql"), "utf8");
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

  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres", "-d", "silicon_forecast"], { encoding: "utf8" });
    if (result.status === 0) {
      ready = true;
      break;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  if (!ready) throw new Error("PostgreSQL did not become ready within 15 seconds");

  runSql(migration, "foundation migration");
  runSql(candidateCatalogueSeed, "candidate catalogue seed");
  runSql(tests, "foundation integration tests");
  console.log("Disposable PostgreSQL verification completed successfully.");
} finally {
  cleanup();
}
