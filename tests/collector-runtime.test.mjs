import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { acquireCollectorLock, synchroniseCollectorCheckout } from "../lib/collector-runtime.mjs";

const run = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "sf-collector-runtime-"));
  const remote = path.join(dir, "remote.git");
  const repo = path.join(dir, "collector");
  mkdirSync(repo);
  run(dir, ["init", "--bare", "--initial-branch=main", remote]);
  run(repo, ["init", "--initial-branch=main"]);
  run(repo, ["config", "user.name", "Collector Test"]);
  run(repo, ["config", "user.email", "collector-test@example.invalid"]);
  writeFileSync(path.join(repo, "tracked.txt"), "one\n");
  run(repo, ["add", "tracked.txt"]);
  run(repo, ["commit", "-m", "initial"]);
  run(repo, ["remote", "add", "origin", remote]);
  run(repo, ["push", "-u", "origin", "main"]);
  return { dir, repo, remote, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("a clean dedicated main checkout aligned with origin may proceed", () => {
  const f = fixture();
  try { assert.equal(synchroniseCollectorCheckout(f.repo), run(f.repo, ["rev-parse", "HEAD"])); }
  finally { f.cleanup(); }
});

test("a behind-only checkout is fast-forwarded", () => {
  const f = fixture();
  try {
    const writer = path.join(f.dir, "writer");
    run(f.dir, ["clone", f.remote, writer]);
    run(writer, ["config", "user.name", "Remote Test"]);
    run(writer, ["config", "user.email", "remote-test@example.invalid"]);
    writeFileSync(path.join(writer, "remote.txt"), "new\n");
    run(writer, ["add", "remote.txt"]); run(writer, ["commit", "-m", "remote"]); run(writer, ["push", "origin", "main"]);
    const head = synchroniseCollectorCheckout(f.repo);
    assert.equal(head, run(writer, ["rev-parse", "HEAD"]));
  } finally { f.cleanup(); }
});

test("dirty, wrong-branch and locally-ahead states fail closed", () => {
  for (const state of ["dirty", "wrong-branch", "ahead"]) {
    const f = fixture();
    try {
      if (state === "dirty") writeFileSync(path.join(f.repo, "tracked.txt"), "changed\n");
      if (state === "wrong-branch") { run(f.repo, ["switch", "-c", "feature"]); }
      if (state === "ahead") { writeFileSync(path.join(f.repo, "local.txt"), "local\n"); run(f.repo, ["add", "local.txt"]); run(f.repo, ["commit", "-m", "local"]); }
      assert.throws(() => synchroniseCollectorCheckout(f.repo), /dirty|must be on main|locally ahead/u, state);
    } finally { f.cleanup(); }
  }
});

test("the collector lock excludes overlap and is releasable", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sf-collector-lock-"));
  const lock = path.join(dir, "collector.lock");
  try {
    const release = acquireCollectorLock(lock, { checkout: dir });
    assert.throws(() => acquireCollectorLock(lock), /already exists/u);
    release();
    const releaseAgain = acquireCollectorLock(lock);
    releaseAgain();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("only a provably dead local owner is reclaimed as stale", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sf-collector-stale-lock-"));
  const lock = path.join(dir, "collector.lock");
  try {
    mkdirSync(lock);
    writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: 2147483647, host: hostname() }));
    const release = acquireCollectorLock(lock);
    release();

    mkdirSync(lock);
    writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: 2147483647, host: "another-host" }));
    assert.throws(() => acquireCollectorLock(lock), /already exists/u);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
