# Requirements: Silicon Forecast

**Defined:** 2026-08-05
**Core Value:** Produce one lawful, accurate and reproducible regional component-price index whose every value can be traced to immutable source observations.

## v1 Requirements

### Source Use and Methodology

- [ ] **SRC-01**: An operator can see a register of candidate sources, access basis, applicable terms, explicit restrictions, evidence policy and commercial-use status. Silence does not require a bespoke permission request for retention or derivation of factual public observations.
- [ ] **SRC-02**: The first supported region has at least three approved, stable price sources or an explicitly approved reduced-source experimental designation.
- [ ] **SRC-03**: The first regional methodology defines tax, delivery, currency, collection cut-off, product eligibility, basket construction, minimum resilience margin, coverage, outliers, baseline, product retirement/successor handling and missing-data behaviour.
- [ ] **SRC-04**: Methodology and source-use policy changes are versioned, audited and blocked from production without approval.

### Canonical Catalogue

- [ ] **CAT-01**: An operator can create and maintain canonical 32GB DDR5 desktop-kit records with manufacturer, model, MPN, capacity, module count and speed.
- [ ] **CAT-02**: Canonical products and retailer listings have stable identifiers and append-only change history for material identity fields.
- [ ] **CAT-03**: A reviewed seed catalogue, representative labelled listing set and separately identified reserve-candidate pool are available for matching and basket-readiness evaluation. Catalogue approval does not imply basket or baseline approval.
- [ ] **CAT-04**: Canonical products carry effective-dated lifecycle evidence and status. A discontinued, replaced or unavailable MPN remains historically identifiable; a successor is a distinct canonical product and cannot silently inherit basket membership or baseline.

### Ingestion and Provenance

- [ ] **ING-01**: An approved source adapter can fetch or import price data without embedding credentials in the repository.
- [ ] **ING-02**: Every import preserves a policy-compliant factual evidence record with source, retrieval time and checksum. Authored descriptions, photography and advertising creative are excluded from permanent evidence storage unless specifically required and reviewed.
- [ ] **ING-03**: Imports are validated, idempotent, concurrency-safe and safely replayable from fixtures or preserved inputs.
- [ ] **ING-04**: Every import run records counts, duration, status, warnings and failure reason.
- [ ] **ING-05**: Stale, incomplete or structurally changed sources fail closed and generate a deduplicated operational alert.

### Product Matching

- [ ] **MAT-01**: Exact MPN, GTIN and approved retailer mappings are evaluated before probabilistic title/specification matching.
- [ ] **MAT-02**: Probabilistic matching records candidates, confidence, evidence, model/rule version and reviewer outcome.
- [ ] **MAT-03**: Uncertain or conflicting matches abstain and enter an auditable review queue rather than contaminating derived data.
- [ ] **MAT-04**: Auto-confirmation is disabled until representative evaluation demonstrates the configured precision gate, initially at least 99.5%.
- [ ] **MAT-05**: Sampled audits measure match precision by source, confidence band and product subtype.

### Price Derivation and Index

- [ ] **IDX-01**: Raw price observations are immutable and corrections are additive, attributable and publicly explainable when published.
- [ ] **IDX-02**: Deterministic rules derive daily regional product prices from qualifying retailer observations.
- [ ] **IDX-03**: Deterministic rules calculate one 32GB DDR5 regional basket median and baseline-relative index from a human-approved basket vintage that satisfies the approved resilience margin.
- [ ] **IDX-04**: Every derived value records exact input observations, basket membership, rule/calculation version, coverage and quality state.
- [ ] **IDX-05**: Replaying a fixed input set and calculation version produces identical derived values.
- [ ] **IDX-06**: Unknown tax, delivery, currency, provenance or minimum coverage prevents publication rather than inventing a value.
- [ ] **IDX-07**: Baseline approval and production activation fail unless deterministic leave-one-product-out evaluation shows that losing any single basket MPN still satisfies every standard product, retailer/source, coverage and concentration gate.

### Private Product and Administration

- [ ] **APP-01**: An authorised operator can view the regional index, daily history, coverage, source freshness and quality state on a private page.
- [ ] **APP-02**: An authorised operator can review unmatched listings, anomalies, failed imports and proposed corrections.
- [ ] **APP-03**: The private product displays methodology version, source limitations and visible gaps without implying unsupported certainty.
- [ ] **APP-04**: Administrative actions use role-based access, MFA-capable authentication and an append-only audit log.

### Public Research and Market Context

- [x] **PUB-01**: The public frontend exposes the primary-retail tracking scope, qualification rules, release gates and explicit absence of a verified series; only separately approved qualifying retail observations may be displayed.
- [x] **PUB-02**: Every future outbound product link must display its commercial status, and commercial participation cannot determine inclusion or editorial interpretation; no outbound product links are currently public.
- [ ] **EVT-01**: Agents can discover and draft market-event records from registered sources while retaining quotations, provenance, uncertainty, alternative explanations and contradictory evidence.
- [ ] **EVT-02**: An authorised editor can approve event classification, regional impact and causal language before publication.

### Autonomous Workers and Safety

- [ ] **AI-01**: Every worker has a registry entry defining purpose, inputs, outputs, tools, autonomy tier, cadence, locks and escalation behaviour.
- [ ] **AI-02**: Worker runs record identity, input references, model/tool version where applicable, output artefacts, status, cost metadata where available and failure reason.
- [ ] **AI-03**: External publish, spend, production mutation and methodology-change locks default to enabled and cannot be bypassed by worker-generated instructions.
- [ ] **AI-04**: Source content is treated as untrusted data and cannot issue operating instructions to agents or tools.
- [ ] **AI-05**: Agentic matching, research and drafting are evaluated against labelled or reviewed examples before their autonomy tier increases.
- [ ] **AI-06**: The orchestrator uses bounded retries, idempotency keys, circuit breakers and scoped shutdown controls.

### Reliability and Release

- [ ] **OPS-01**: Scheduled ingestion and derivation run with observable heartbeats, freshness checks and actionable alerts.
- [ ] **OPS-02**: Backup, restore, deterministic replay and product-loss/EOL replay scenarios are tested with recorded evidence.
- [ ] **OPS-03**: A private shadow run completes for at least 30 consecutive days without an unresolved severe data-integrity incident.
- [ ] **OPS-04**: Human exception workload, source reliability, product-lifecycle coverage, manufacturer/family concentration, matching precision and anomaly performance are measured before scope expansion.
- [ ] **OPS-05**: Public release remains blocked until source-use restrictions, security, accessibility, lineage, correction and incident-response gates are approved.

## v2 Requirements

### Forecasts

- **FRC-01**: Forecasts preserve publication time, horizon, expected direction/range, confidence, evidence, counterevidence and invalidation conditions.
- **FRC-02**: Forecast outcomes are scored deterministically against locked historical index values and retained whether successful or not.
- **FRC-03**: Forecasts and recommendations cannot be published without explicit approval until a later readiness decision.

### Expansion and Commercialisation

- **EXP-01**: Additional regions can be onboarded through the same source-use, methodology, matching and shadow-run gates.
- **EXP-02**: Additional component categories can define their own canonical specifications and basket methodology without branching the core pipeline.
- **COM-01**: Public pages, affiliate links and commercial features preserve editorial-commercial separation.
- **COM-02**: Licensed downloads or APIs enforce source-specific redistribution rights.

## Out of Scope

| Feature | Reason |
|---------|--------|
| GPUs, CPUs, motherboards and complete builds | Deferred until the DDR5 vertical slice proves the operating model |
| Used/refurbished price indices | Condition and seller quality make direct comparability unsafe for v1 |
| Automated public articles and forecasts | Human approval remains part of the initial trust model |
| Public API and historical-data resale | Require proven demand and explicit redistribution rights |
| Microservices | Unnecessary operational burden for a greenfield MVP |
| Native mobile applications | Responsive web product is sufficient for validation |
| User accounts and premium alerts | Do not build retention machinery before validating the core intelligence |
| Fully autonomous corporate/legal operation | Accountability cannot be delegated to software |

## Definition of Done

The v1 milestone is complete only when all v1 requirements are implemented, tested, committed and verified against realistic non-secret fixtures or approved live sources; the 30-day shadow-run gate is evidenced; and no external-action lock has been weakened without explicit approval.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SRC-01 | Phase 1 | Evidence register complete; source-use policy revised by human decision on 2026-08-06; Awin programme eligibility/access still pending |
| SRC-02 | Phase 1 | Blocked — no approved three-source portfolio or experimental designation |
| SRC-03 | Phase 1 | Executable UK draft complete; thresholds and activation unapproved |
| SRC-04 | Phase 1 | Governance/evidence controls defined; application enforcement pending |
| CAT-01, CAT-02, CAT-03, CAT-04 | Phase 2 | Four-product seed, evidence and 20 labelled fixtures are human-reviewed; eight further exact-MPN candidates remain pending additive review. Empirical basket readiness, lifecycle metadata, reserve candidates and single-product-loss resilience remain pending. Catalogue count is not treated as baseline eligibility. |
| APP-04, AI-01, AI-03, AI-04 | Phase 2 | Pending |
| PUB-01, PUB-02 | Public research-preview exception | Complete — retail-first frontend exposes scope and release gates; no verified series, deferred channels or outbound product links are public |
| EVT-01, EVT-02 | Phase 6 | Public evidence workflow established; first movement note, event discovery, source registry integration and editor approval contract pending |
| ING-01, ING-02, ING-03, ING-04, ING-05 | Phase 3 | Pending |
| MAT-01, MAT-02, MAT-03, MAT-04, MAT-05 | Phase 4 | Pending |
| IDX-01, IDX-02, IDX-03, IDX-04, IDX-05, IDX-06, IDX-07 | Phase 5 | Pending |
| APP-01, APP-02, APP-03 | Phase 5 | Pending |
| AI-02, AI-05, AI-06, OPS-01 | Phase 6 | Pending |
| OPS-02, OPS-03, OPS-04, OPS-05 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases or approved preview exception: 44
- Unmapped: 0

---
*Requirements defined: 2026-08-05*
*Last updated: 2026-08-09 after approving the bounded public price-observation preview and moving evidence-backed market context into v1*
