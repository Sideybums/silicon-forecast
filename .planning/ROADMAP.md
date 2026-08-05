# Roadmap: Silicon Forecast

## Strategy

Build the evidence chain in dependency order. The roadmap intentionally delays broad UI, editorial automation and geographic expansion until one lawful regional DDR5 index has survived a private shadow run.

A narrow public pre-launch publisher-review site is an approved enabling exception to that sequencing. It may explain the project, show clearly labelled synthetic demonstrations and publish contact/privacy/affiliate information, but it must not imply live prices, approved source coverage, a supported public index or retailer partnerships that do not yet exist.

## Phase 1 — Source and Methodology Gate

**Goal:** Prove that one candidate region can legally and methodologically support the vertical slice.

**Requirements:** SRC-01, SRC-02, SRC-03, SRC-04

**Deliverables:**
- Source-rights register and evidence template.
- Candidate-region comparison based on lawful access, identifier quality, tax/delivery semantics, stability and source breadth.
- Explicit first-region decision.
- Versioned methodology v0.1 covering collection, eligibility, normalisation, coverage, outliers, missing data, baseline and corrections.
- Go/no-go gate. No production scraper is built for a source with unresolved rights.

**Exit criteria:** At least one credible route to the required source breadth exists; unresolved permissions are clearly blocked rather than assumed; methodology decisions are executable rules rather than prose.

## Phase 2 — Platform, Catalogue and Control Plane

**Goal:** Establish the boring foundations on which autonomous operation can safely depend.

**Requirements:** CAT-01, CAT-02, CAT-03, APP-04, AI-01, AI-03, AI-04

**Deliverables:**
- TypeScript/Next.js modular-monolith skeleton and PostgreSQL migrations.
- Environment, secret and migration conventions.
- Canonical product, region, source, retailer, methodology, audit and lock schemas.
- Reviewed 32GB DDR5 seed catalogue and labelled matching fixture set.
- Worker registry and default-on external-action locks.
- CI, baseline tests and threat model for untrusted source content.

**Exit criteria:** A fresh environment can be created reproducibly; seed catalogue validates; locks and audit behaviour have tests; no secret material exists in Git.

## Phase 3 — Immutable Ingestion Vertical Slice

**Goal:** Import one approved source reliably while preserving enough evidence to replay and diagnose every run.

**Requirements:** ING-01, ING-02, ING-03, ING-04, ING-05

**Deliverables:**
- Source adapter contract and one approved implementation.
- Raw/evidence storage with checksums and retention policy.
- Validation, idempotency, locking, replay fixtures and structured run records.
- Staleness/schema-drift detection and deduplicated alerts.

**Exit criteria:** Repeated and concurrent test imports do not duplicate observations; a fixed preserved input replays identically; malformed or changed input fails closed.

## Phase 4 — Conservative Product Matching

**Goal:** Match listings without allowing probabilistic confidence to poison the dataset.

**Requirements:** MAT-01, MAT-02, MAT-03, MAT-04, MAT-05

**Deliverables:**
- Exact identifier and approved-mapping matchers.
- Candidate-ranking interface for probabilistic rules/agents.
- Review queue with evidence, differences and decision history.
- Labelled evaluation harness and confidence calibration report.
- Sample-audit workflow.

**Exit criteria:** Exact matching is deterministic; uncertain cases abstain; precision is measured by confidence band; auto-confirmation remains disabled unless its formal gate passes.

## Phase 5 — Reproducible Index and Private Dashboard

**Goal:** Produce the first traceable 32GB DDR5 regional index and make its quality legible.

**Requirements:** IDX-01, IDX-02, IDX-03, IDX-04, IDX-05, IDX-06, APP-01, APP-02, APP-03

**Deliverables:**
- Qualification and regional total-price rules.
- Daily product derivation and basket/index calculation as versioned pure logic.
- Full input lineage, coverage and quality state.
- Additive correction mechanism and replay tests.
- Private index, source-health, anomaly and review dashboard.

**Exit criteria:** Fixed inputs reproduce bit-for-bit equivalent calculated values; gaps remain gaps; every displayed point resolves to exact source observations and a calculation version.

## Phase 6 — Worker Harness and Operational Autonomy

**Goal:** Let bounded workers run the private pipeline while making every action observable and stoppable.

**Requirements:** AI-02, AI-05, AI-06, OPS-01

**Deliverables:**
- Worker task contracts, run ledger, schedules and scoped stop controls.
- Producer-before-consumer orchestration with idempotency keys.
- Bounded retries, circuit breakers, heartbeats and cost metadata.
- Agent evaluation suites for matching assistance, anomaly triage and research drafting.
- Private command view showing locks, runs, failures and pending human decisions.

**Exit criteria:** Back-to-back and failed runs are safe; unknown workers or autonomy levels fail closed; the pipeline can be paused globally or by source/worker; no external-action lock is bypassed.

## Phase 7 — Reliability Shadow Run and MVP Decision

**Goal:** Demonstrate that the system is trustworthy and supportable before public exposure.

**Requirements:** OPS-02, OPS-03, OPS-04, OPS-05

**Deliverables:**
- Tested backup, restore and full deterministic replay.
- At least 30 consecutive days of private scheduled operation.
- Reliability, source concentration, match precision, anomaly and human-workload report.
- Incident, correction and source-suspension playbooks.
- Security and accessibility verification.
- Explicit build/hold/pivot decision for public beta.

**Exit criteria:** No unresolved severe integrity incident; all values retain lineage; review burden is measured and acceptable; public beta is separately approved rather than assumed.

## Deferred Milestone — Editorial Intelligence and Public Beta

After the private MVP proves the data operation, plan a new milestone for events, forecasts, public pages and commercial experiments. That milestone must include an AI design contract, editorial evaluation set, citation/claim checks and continued human publication approval.

## Phase Order Rationale

Source permission and methodology precede code because they decide whether the data product is viable. Catalogue and immutable ingestion precede matching; matching precedes index calculation; deterministic facts precede agent orchestration; proven private operation precedes publication. Reversing this order creates an attractive interface over evidence we may not own or trust.
