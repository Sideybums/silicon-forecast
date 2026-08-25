import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const moduleUrl = pathToFileURL(path.resolve("scripts/deploy-approved-public-preview.mjs")).href;

function inspect(root) {
  const source = `import { deploymentArtifact } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(deploymentArtifact()));`;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "--eval", source], { cwd: root, encoding: "utf8" }));
}

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "sf-deploy-artifact-"));
  mkdirSync(path.join(root, "out", "nested"), { recursive: true });
  writeFileSync(path.join(root, "out", "index.html"), "alpha\n");
  writeFileSync(path.join(root, "out", "nested", "page.txt"), "bravo\n");
  chmodSync(path.join(root, "out", "index.html"), 0o644);
  chmodSync(path.join(root, "out", "nested", "page.txt"), 0o644);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("deployment artifact digest binds path, bytes, mode, length and file count", (t) => {
  const root = fixture(t);
  const before = inspect(root);
  assert.equal(before.file_count, 2);
  writeFileSync(path.join(root, "out", "index.html"), "omega\n");
  const changedBytes = inspect(root);
  assert.notEqual(changedBytes.digest, before.digest);
  chmodSync(path.join(root, "out", "index.html"), 0o600);
  const changedMode = inspect(root);
  assert.notEqual(changedMode.digest, changedBytes.digest);
  writeFileSync(path.join(root, "out", "extra.txt"), "extra\n");
  const added = inspect(root);
  assert.equal(added.file_count, 3);
  assert.notEqual(added.digest, changedMode.digest);
});

test("deployment artifact rejects symbolic links", (t) => {
  const root = fixture(t);
  symlinkSync("index.html", path.join(root, "out", "alias.html"));
  const source = `import { deploymentArtifact } from ${JSON.stringify(moduleUrl)}; deploymentArtifact();`;
  assert.throws(() => execFileSync(process.execPath, ["--input-type=module", "--eval", source], { cwd: root, encoding: "utf8", stdio: "pipe" }), /Command failed/u);
});
