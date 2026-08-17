# Bounded Research and News Worker Slice

**Status:** Next governed implementation slice
**Roadmap:** Phase 6 — Worker Harness and Operational Autonomy
**Scope:** DDR5 market context only; private drafts; no live editorial publication
**Last updated:** 2026-08-17

## Objective

Build the lowest useful layer of the research/news system: workers may discover candidate material, preserve inert evidence, extract atomic claims, look for duplicate lineage and counterevidence, and assemble review-pending event drafts. They must not decide what caused a price movement, alter numerical data, approve a source, or publish anything.

The existing `lib/candidate-event-overlay.mjs` contract and `data/fixtures/candidate-event-overlay.gb.v1.json` remain the authority for evidence, claims, revisions, contradictions, causal-language bounds, reviews and immutable numeric references. This slice operationalises that proven contract rather than inventing a second editorial model.

## Worker pipeline

1. **Discovery worker**
   - Accepts a bounded DDR5 topic and time window.
   - Returns candidate URLs and discovery metadata only.
   - Does not approve, rank or register a source for continuing use.

2. **Quarantine worker**
   - Converts explicitly selected candidate pages into inert text captures.
   - Records retrieval time, MIME type, byte count, SHA-256, canonical URL and prompt-injection indicators.
   - Executes no source-supplied active content or instruction.

3. **Claim worker**
   - Emits atomic claims with exact byte extracts and pinpoint locators.
   - Distinguishes source assertions from directly observed facts.
   - Cannot produce numerical-series fields or causal conclusions.

4. **Lineage and counterevidence worker**
   - Identifies syndication/duplicate lineages.
   - Must search for qualifying and contradictory material before a draft can advance.
   - Absence of identified counterevidence is recorded as a search result, never as proof none exists.

5. **Draft assembler**
   - Creates an additive, hash-bound event revision in `evidence_review` or `changes_requested` state.
   - Records uncertainty, alternatives and a maximum causal-language level of `temporal_association`.
   - Produces no public projection and cannot create a reviewed state.

6. **Human review queue**
   - Presents exact captures, claims, lineages, contradictions, uncertainties and draft wording.
   - Creator and reviewer must differ.
   - Review may retain a draft privately or request changes; publication and causal approval remain unavailable in this slice.

## Mandatory controls

- All source content is untrusted data.
- Numeric series are checksum-bound read-only references; research operations must leave every numeric byte and checksum unchanged.
- Source, methodology, basket, threshold, reference, deflator, public-claim and production approvals remain outside worker authority.
- No worker may spend money, authenticate to a publisher, bypass robots/terms controls, mutate production state or schedule itself.
- Bounded inputs: DDR5 only, explicit time window, maximum candidate count and maximum retained bytes.
- Bounded execution: idempotency key, timeout, retry ceiling, circuit breaker and global/per-worker stop controls.
- Append-only run ledger records worker/version, input hashes, output hashes, timestamps, status, error class and cost metadata.
- Failed, partial or contradictory work remains visible and cannot be silently promoted.
- External publication remains structurally unavailable.

## Implementation waves

### Wave R0 — Contracts and synthetic evaluation

- Define exact task, run-ledger and output schemas.
- Add deterministic fixtures for success, duplicate syndication, contradictory evidence, unresolved date, prompt injection, malformed capture, timeout and retry exhaustion.
- Prove unknown workers, unknown autonomy levels and schema drift fail closed.
- Prove all outputs validate through the existing event-overlay model and leave numeric checksums unchanged.

### Wave R1 — Candidate discovery adapter

- Add one network-capable discovery adapter behind a default-off capability lock.
- Candidate source families and URLs remain unapproved until separately selected by David; the implementation must not bake in a preferred publisher.
- Store discovery results as candidate records, not captures or editorial facts.
- Exercise only against controlled fixtures until explicit approval is given for a bounded live discovery run.

### Wave R2 — Inert capture and claim extraction

- Build the quarantine and atomic-claim workers against preserved fixture pages.
- Add prompt-injection, byte-integrity, duplicate-lineage and exact-extract tests.
- Keep outputs private and review-pending.

### Wave R3 — Counterevidence and draft assembly

- Require a recorded counterevidence search and alternative explanations.
- Assemble additive event revisions with causal-language bounds.
- Add a private review packet/command view; no public UI connection.

### Wave R4 — Shadow operation

- Run bounded private jobs with the ledger, pause controls and failure reporting enabled.
- Measure false claims, unsupported dates, duplicate-lineage errors, contradiction omissions, human correction load and per-run cost.
- Do not activate public overlays during the shadow period.

## Exit criteria

- The same bounded input reproduces equivalent hash-bound outputs.
- Back-to-back and failed jobs are safe, observable and stoppable.
- Every draft claim resolves to exact captured bytes and a canonical candidate source item.
- Duplicate syndication cannot masquerade as corroboration.
- Counterevidence and uncertainty cannot be silently omitted.
- Workers cannot review themselves or confer publication, causal, source or methodology approval.
- Research mutations leave all numerical-series bytes and checksums unchanged.
- No public route, production database or scheduled external action is enabled by completing this slice.
