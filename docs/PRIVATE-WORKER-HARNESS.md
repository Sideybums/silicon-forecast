# Private worker manifest preparation harness

## Status and hard boundary

This is an inactive, offline, validation-only control harness. It verifies repository-file provenance and prepares deterministic `candidate_private_unapproved` manifests. It does not execute a job, dispatch a worker, invoke an injected function, fetch, use the network, run a shell, write a file, reserve output, schedule work, mutate production, deploy, spend, publish, or grant approval.

The library intentionally exports no `dispatchJob`, `dispatchJobs`, executor interface, or arbitrary `execute` callback. The CLI only prints a manifest to stdout. A timeout around a JavaScript promise—such as `Promise.race`—does not cancel or terminate underlying work and is not an acceptable worker boundary.

Repository configuration is deliberately unusable as authority:

- `enabled` is exactly `false` and `override_token` is exactly `null`;
- no environment variable, fixture value, configuration fallback, or payload enables the harness;
- the invocation must supply the exact enable mode plus two matching copies of a fresh synthetic confirmation string of at least 16 characters;
- the duplicate string is deliberate confirmation, not authentication, and must never be a credential;
- confirmation values are absent from manifests and no invocation writes output files.

## Exact profiles and capabilities

`config/private-worker-profiles.v1.json` has an exact top-level schema, exact inactive status, exact permanently forbidden action lock list, and exactly five profiles. Each profile has an exact schema and exact task/tool/action/input/output capability sets; duplicate list entries and excess limits fail closed.

The profile names are:

1. `prospective-retail-replay`
2. `historical-research`
3. `official-statistics-context`
4. `event-research`
5. `adversarial-fixture-verification`

Task, tool, and requested-action labels classify a future intended operation; this harness performs none of them. Payload is opaque JSON data. It cannot select an operation because the job's exact task/tool/action fields are independently allowlisted and there is no execution API.

The prospective profile is structurally replay/audit-only. Its task and tool sets contain no collection, fetch, HTTP, or network capability, and configuration must assert `prospective_fetch_allowed: false`. It therefore cannot collide with the canonical recurring collector. A future prospective dispatch design must obtain authoritative scheduler and run-ledger state outside untrusted job input; jobs contain no `scheduler_owned_pending` assertion.

## Provenance verification

Every input must use the strict form `repo://<repository-relative-file>`. For this version each profile's `allowed_input_roots` entry deliberately names the only permitted fixture file (a file root may later be narrowed or replaced only through reviewed configuration).

The harness rejects:

- `fixture://`, `file://`, HTTP(S), and every other scheme;
- absolute paths, backslashes, percent-encoded aliases, query/fragment suffixes, empty components, `.`/`..`, repeated separators, traversal, and non-canonical aliases;
- paths outside the profile's explicit input roots;
- missing paths, directories and other non-regular inputs;
- symlinks in any input component and realpath aliases/escapes;
- a supplied hash that does not match the exact bytes read.

For each input it opens the resolved existing regular file, reads exact bytes, checks that file identity/size/time and realpath remain stable, computes SHA-256 and byte length, and compares the supplied lowercase SHA-256. Manifest preparation performs this verification twice and refuses a change between checks. The deterministic manifest records canonical `ref`, computed `sha256`, and `bytes`; it never trusts fixture hash/length metadata as observed provenance.

The checked-in jobs use current repository fixture files and their real hashes. The jobs fixture never references itself.

## Output and public boundaries

Output paths are declarations only. They must be canonical paths below the profile's sole `data/private-worker-runs/<profile>/` root. Absolute paths, traversal, aliases, cross-profile paths, and existing symlink components are rejected. Duplicate job IDs and duplicate canonical output paths are rejected before a manifest is produced. Preparation creates no directory and writes no output.

`data/private-worker-runs/` is ignored. The public-boundary test discovers private worker-run files dynamically when present and checks their private values against public app source and a static build. Its synthetic runtime-file test proves this protection without requiring committed worker output. Reviewed private records remain in the same boundary scan.

Worker output, if a separately governed system ever produces it, remains untrusted and cannot confer integration or approval.

## Secret scanning is only defence in depth

Jobs are recursively scanned for credential-shaped keys and secret-shaped values, including password/secret/key/token/auth/cookie/header fields, private-key and Bearer/Basic forms, URL user-info credentials, JWT-like values, and common provider/Slack-like token forms. Matching input is refused.

This heuristic scanner is defence in depth only. It is neither a credential detector with complete coverage nor an authority boundary. Safety comes from no inherited secrets, no executor, no network, exact capabilities, exact repository inputs, and downstream isolation/review—not from assuming every secret shape can be recognized.

## Permanently forbidden actions

No enable mode or confirmation can permit methodology/source/threshold/reference/deflator/basket selection or approval, production mutation or activation, editorial activation or approval, publication, spend, live credentials, migration/public-app edits, weakening locks, or worker self-approval/integration. Every manifest remains pending independent human review.

## CLI

Disabled invocation (exit 2):

```sh
node scripts/run-private-worker-harness.mjs
```

Explicit synthetic validation (JSON to stdout, no writes):

```sh
TOKEN='choose-a-fresh-synthetic-value-at-least-16-characters'
node scripts/run-private-worker-harness.mjs \
  --enable-private-test \
  --operator-token "$TOKEN" \
  --confirm-operator-token "$TOKEN" \
  --job-id adversarial-replay-001
unset TOKEN
```

The CLI exact-schema validates repository configuration and the job fixture, validates one selected job or all jobs, re-verifies input provenance, sorts jobs by ID, canonicalizes the manifest body, and adds a SHA-256. Command-line values may appear in operating-system process listings, so use only a fresh synthetic value.

## Requirements before any dispatch activation

Dispatch is not an incremental flag or executor addition to this harness. Activation requires a separate governed design and review that includes, at minimum:

- killable isolated processes with real termination and scoped shutdown controls;
- no inherited credentials/secrets and network default-deny;
- explicit filesystem and tool allowlists with worker output treated as untrusted;
- authoritative scheduler and run-ledger state outside jobs, including prospective collector ownership;
- idempotency keys, concurrency-safe state transitions, retries/circuit breakers, and observability;
- atomic output reservation before work starts, collision handling, immutable provenance, and additive review state;
- independent approval gates for every controlled action.

`Promise.race` or a rejected timeout promise is not cancellation and cannot satisfy the killability requirement.

## Verification

```sh
node --test tests/private-worker-harness.test.mjs tests/public-boundary.test.mjs
npx eslint lib/private-worker-harness.mjs scripts/run-private-worker-harness.mjs tests/private-worker-harness.test.mjs tests/public-boundary.test.mjs
node --check lib/private-worker-harness.mjs
node --check scripts/run-private-worker-harness.mjs
node --check tests/private-worker-harness.test.mjs
```

The focused suite covers default disablement, dual confirmation, exact schemas/capabilities/locks/limits, strict schemes and canonical references, changed/missing/symlinked input, exact-byte hashes, task/tool/action/output controls, traversal, duplicate IDs/outputs, secret-shaped material, deterministic re-verification, absence of dispatch exports, and CLI no-write validation behavior.
