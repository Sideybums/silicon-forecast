#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { prepareManifest, REQUIRED_ENABLE_MODE, validateJobFixture } from "../lib/private-worker-harness.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(repositoryRoot, "config/private-worker-profiles.v1.json");
const jobsPath = path.join(repositoryRoot, "data/fixtures/private-worker-harness-jobs.v1.json");

function argumentsFrom(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) throw new Error(`unknown positional argument: ${argument}`);
    if (argument === "--enable-private-test") { values.set("enable", REQUIRED_ENABLE_MODE); continue; }
    if (!["--operator-token", "--confirm-operator-token", "--job-id"].includes(argument)) throw new Error(`unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
    values.set(argument.slice(2), value);
    index += 1;
  }
  return values;
}

try {
  const args = argumentsFrom(process.argv.slice(2));
  const [config, fixture] = await Promise.all([
    readFile(configPath, "utf8").then(JSON.parse),
    readFile(jobsPath, "utf8").then(JSON.parse),
  ]);
  const jobs = validateJobFixture(fixture);
  const selected = args.has("job-id") ? jobs.filter((job) => job.id === args.get("job-id")) : jobs;
  if (args.has("job-id") && selected.length !== 1) throw new Error(`unknown synthetic fixture job: ${args.get("job-id")}`);
  const manifest = await prepareManifest(selected, {
    config,
    repositoryRoot,
    enableMode: args.get("enable"),
    overrideToken: args.get("operator-token"),
    expectedOverrideToken: args.get("confirm-operator-token"),
  });
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`private worker harness refused: ${error.message}\n`);
  process.exitCode = 2;
}
