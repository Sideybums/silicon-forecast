import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import path from "node:path";

export const gitCommand = (repoPath, args) => execFileSync("git", args, { cwd: repoPath, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function reclaimProvablyStaleLock(lockPath) {
  let owner;
  try {
    owner = JSON.parse(readFileSync(path.join(lockPath, "owner.json"), "utf8"));
  } catch {
    return false;
  }
  if (owner.host !== hostname() || !Number.isSafeInteger(owner.pid) || owner.pid <= 0) return false;
  try {
    process.kill(owner.pid, 0);
    return false;
  } catch (error) {
    if (error?.code !== "ESRCH") return false;
  }
  const tombstone = `${lockPath}.stale-${process.pid}-${Date.now()}`;
  try {
    renameSync(lockPath, tombstone);
    rmSync(tombstone, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export function acquireCollectorLock(lockPath, metadata = {}) {
  mkdirSync(path.dirname(lockPath), { recursive: true });
  try {
    mkdirSync(lockPath);
  } catch {
    if (!reclaimProvablyStaleLock(lockPath)) {
      throw new Error(`collector lock already exists: ${lockPath}; inspect and remove it only after confirming no collector is running`);
    }
    mkdirSync(lockPath);
  }
  try {
    writeFileSync(path.join(lockPath, "owner.json"), `${JSON.stringify({ pid: process.pid, host: hostname(), acquired_at: new Date().toISOString(), ...metadata }, null, 2)}\n`);
  } catch (error) {
    rmSync(lockPath, { recursive: true, force: true });
    throw error;
  }
  let released = false;
  return () => {
    if (released) return;
    rmSync(lockPath, { recursive: true, force: true });
    released = true;
  };
}

function assertNoGitOperation(repoPath, git) {
  for (const marker of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply", "sequencer"]) {
    const markerPath = git(repoPath, ["rev-parse", "--git-path", marker]);
    try {
      realpathSync(path.resolve(repoPath, markerPath));
      throw new Error(`git operation is active (${marker})`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function assertClean(repoPath, git) {
  const status = git(repoPath, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) throw new Error("collector checkout is dirty; no retailer request was made");
}

export function synchroniseCollectorCheckout(repoPath, options = {}) {
  const git = options.git ?? gitCommand;
  const branch = options.branch ?? "main";
  const remote = options.remote ?? "origin";
  const expectedCheckout = realpathSync(options.expectedCheckout ?? repoPath);
  if (branch !== "main") throw new Error("collector branch must be main");
  if (realpathSync(repoPath) !== expectedCheckout) throw new Error("collector is not running from the designated checkout");
  const top = realpathSync(git(repoPath, ["rev-parse", "--show-toplevel"]));
  if (top !== expectedCheckout) throw new Error("collector repository root does not match the designated checkout");
  const symbolic = git(repoPath, ["symbolic-ref", "--quiet", "HEAD"]);
  if (symbolic !== `refs/heads/${branch}`) throw new Error(`collector checkout must be on ${branch}`);
  assertNoGitOperation(repoPath, git);
  assertClean(repoPath, git);
  git(repoPath, ["fetch", "--prune", remote, branch]);
  const [ahead, behind] = git(repoPath, ["rev-list", "--left-right", "--count", `HEAD...${remote}/${branch}`]).split(/\s+/u).map(Number);
  if (ahead > 0 && behind > 0) throw new Error("collector checkout has diverged from origin/main");
  if (ahead > 0) throw new Error("collector checkout is locally ahead of origin/main; operator action required");
  if (behind > 0) git(repoPath, ["merge", "--ff-only", `${remote}/${branch}`]);
  assertNoGitOperation(repoPath, git);
  assertClean(repoPath, git);
  const head = git(repoPath, ["rev-parse", "HEAD"]);
  const remoteHead = git(repoPath, ["rev-parse", `${remote}/${branch}`]);
  if (head !== remoteHead) throw new Error("collector checkout is not exactly aligned with origin/main");
  return head;
}

export function pushCollectorCommit(repoPath, options = {}) {
  const git = options.git ?? gitCommand;
  const remote = options.remote ?? "origin";
  git(repoPath, ["push", "--quiet", remote, "HEAD:refs/heads/main"]);
}
