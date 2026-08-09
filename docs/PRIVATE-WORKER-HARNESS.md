# Private bounded worker harness

## Status and boundary

This is an inactive, offline control harness for deterministic synthetic/private validation. It is not a production autonomy system, collector, scheduler, shell runner, credential broker, deployment path, or publication path. It prepares validation-only manifests and can capture bounded results from a test-injected JavaScript executor. Every manifest and result remains `candidate_private_unapproved` and pending independent human review.

Repository configuration is deliberately unusable as authority:

- `enabled` is always `false`;
- `override_token` is always `null`;
- no environment variable, config value, fixture value, or fallback enables the harness;
- both the exact enable mode and two matching copies of a human-chosen token of at least 16 characters must be supplied in the invocation/API call;
- tokens are never copied into jobs, manifests, results, or output files.

The duplicate invocation token is an intentional-confirmation control, not authentication. This fixture harness has no credential or identity system and grants no production authority.

## Profiles

`config/private-worker-profiles.v1.json` enumerates five bounded lanes:

1. `prospective-retail-replay` — offline fixture replay/audit only. The canonical recurring retail collector is the sole prospective fetcher. This harness cannot dispatch it while it is scheduler-owned, enabled, pending, or running, and this profile contains no prospective-fetch task kind.
2. `historical-research` — historical fixture replay and candidate evidence drafting.
3. `official-statistics-context` — candidate comparison and context drafting without selecting any series, reference, deflator, threshold, or release policy.
4. `event-research` — private event fixture replay/evidence drafts with no editorial approval or numeric coupling.
5. `adversarial-fixture-verification` — offline attacks and control reports.

Profiles may document possible network tools to clarify a future boundary, but those tools are held in `described_network_tools_not_dispatchable_by_cli`; they are not in `allowed_tools`. The CLI never dispatches any executor at all.

Each profile fixes task kinds, offline tools, an exact requested-action allowlist, additive output roots, timeout, retry cap, concurrency cap, and structured-result byte cap. Jobs must use the exact bounded schema; unknown fields are rejected rather than passed through to an executor. Global concurrency is at most three.

## Permanently forbidden actions

No enable flag or override can permit any of the following:

- methodology selection, change, activation, or approval;
- source selection, activation, or approval;
- threshold, historical-reference, deflator, release-policy, basket, or baseline selection/change/approval;
- production mutation, activation, connection, or deployment;
- editorial activation or approval;
- external publication;
- spend, payment, or purchase;
- live credentials, secrets, keys, or tokens;
- migrations or public-app edits;
- weakening, disabling, bypassing, or unlocking controls;
- worker self-approval or self-integration.

Workers can report claims, including claims that they are approved or integrated, but the harness preserves that only as an ignored self-report and always emits `integration_status: pending_independent_human_review` and `approval_conferred: false`.

## Output boundary

Allowed roots are new `data/private-worker-runs/<profile>/` namespaces only. A job cannot target observations, evidence, migrations, public application trees, planning documents, approval records, or another profile. Absolute paths, lexical traversal, cross-profile paths, and existing symlink components are rejected. Validation does not create these output directories or write output files.

Job payloads and structured executor results are scanned for credential-shaped keys and secret-shaped values. Input payloads are rejected. Unsafe executor output is discarded and represented only by `failure_code: SECRET_REJECTED`; no matching value is retained. Shell/command/argv/environment fields are forbidden, and no shell interpolation exists.

## CLI: validation and manifest preparation only

Disabled invocation (exits 2):

```sh
node scripts/run-private-worker-harness.mjs
```

Explicit synthetic test preparation (prints JSON to stdout and writes nothing):

```sh
TOKEN='choose-a-fresh-synthetic-value-at-least-16-characters'
node scripts/run-private-worker-harness.mjs \
  --enable-private-test \
  --operator-token "$TOKEN" \
  --confirm-operator-token "$TOKEN" \
  --job-id adversarial-replay-001
unset TOKEN
```

The CLI reads only the repository profile and synthetic job fixture. It validates one selected job or all fixture jobs, sorts jobs by ID, canonicalises the manifest body, and adds a SHA-256. It has no dispatch option and never invokes network, collector, scheduler, shell, production, deploy, spend, publish, or credential functionality. Command-line values can be visible in operating-system process listings; use only a fresh synthetic test confirmation value, never a credential or reusable secret.

## Library test dispatch

`dispatchJob` and `dispatchJobs` exist for synthetic tests. Callers must explicitly inject an object with:

- an exact `profileId` matching the job;
- an exact `tool` matching the job and profile;
- an exact `outputRoot` matching the job output directory;
- an `execute(job)` function returning JSON-compatible structured data.

The harness validates authority and the complete job before calling it, then applies profile timeout/retry/byte limits. `dispatchJobs` applies both global and per-profile concurrency limits. Executors must be synthetic, side-effect-free, and timeout-cooperative: JavaScript cannot forcibly terminate an arbitrary promise that ignores cancellation. This is one reason no production or network executor is supplied.

## Verification

Focused checks:

```sh
node --test tests/private-worker-harness.test.mjs
npx eslint lib/private-worker-harness.mjs scripts/run-private-worker-harness.mjs tests/private-worker-harness.test.mjs
node --check lib/private-worker-harness.mjs
node --check scripts/run-private-worker-harness.mjs
node --check tests/private-worker-harness.test.mjs
```

The suite proves default disablement, dual-gate failures, wrong-token refusal, scheduler collision, profile/tool/task/output mismatch, traversal and symlink refusal, permanent controlled-action locks, executor mismatch, timeout, retry and concurrency bounds, oversized-output rejection, secret rejection without retention, inability to self-integrate, deterministic replay, and disabled/enabled CLI behavior.
