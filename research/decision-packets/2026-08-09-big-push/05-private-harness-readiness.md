# Private harness readiness and review burden

State: **INACTIVE VALIDATION-ONLY MANIFEST PREPARATION — NOT DISPATCH-READY**

## What exists

- Five exact private worker profiles.
- Five exact fixture jobs using repository-local `repo://` inputs.
- Exact profile/job schemas, tool/action allowlists, output-root containment and symlink rejection.
- Actual regular-file byte hashing at validation and again during manifest assembly.
- Duplicate job ID and canonical output-path rejection.
- Secret-shaped value scanning as defence in depth.
- Dual synthetic confirmation required to prepare a deterministic private manifest.
- Default CLI exits non-zero.
- No `dispatchJob` or `dispatchJobs` API, no shell/process/network executor, no credential access, no scheduler mutation and no runtime-output write.
- Worker-run roots are ignored and explicitly scanned out of public source/build boundaries.

## Measured parent checks

- Default CLI exit: 2.
- Current five-job validation-only manifest SHA-256: `ee8ed211d2bcc85ee737d05dc1400418620eeaefb9fd1ed8de2c7babad14a81f`.
- Current manifest mode: `validation_only_no_dispatch`; every job remains `pending_independent_human_review`.
- Current focused harness/public-boundary integration: 14 tests within the 64-test Wave 4 focused gate; full repository suite later included the same controls.
- Parent adversary confirmed no dispatch surface and rejected a forged input hash.

## Review burden and blockers

Every future manifest remains manual review. Activation requires a new design and separate approval for an isolated killable executor, trusted scheduler/run state, durable append-only ledger, idempotency reservations, bounded timeout/retry/circuit-breaker behaviour, stop controls, collision-safe output creation and measured run reporting. The current harness deliberately supplies none of those runtime capabilities.

This packet is not a request to activate workers, create cron, run the collector, spend, publish or mutate production.
