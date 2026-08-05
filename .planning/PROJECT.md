# Silicon Forecast

## What This Is

Silicon Forecast is an evidence-backed PC-component price-intelligence platform. It connects upstream semiconductor-market events to regional retail prices, explains observed lag and uncertainty, and preserves an accountable record of forecasts and corrections.

The first product is deliberately narrow: a private, reproducible regional index for 32GB DDR5 desktop-memory kits using lawful, stable retail sources. AI employee agents build and operate bounded workflows; deterministic software owns public facts and consequential external actions remain human-governed.

## Core Value

Produce one lawful, accurate and reproducible regional component-price index whose every value can be traced to immutable source observations.

## Business Context

- **Customer**: Initially PC builders and enthusiasts; later system builders, procurement teams, journalists and market professionals.
- **Revenue model**: To be validated; possible affiliate income, memberships, professional data subscriptions, chart licensing and API access are hypotheses rather than commitments.
- **Success metric**: A supported index operates reliably with complete lineage, calibrated match precision and a low, measured exception-review burden.
- **Strategy notes**: Original product and technical briefs are registered in `docs/BRIEF-SOURCES.md`.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Confirm lawful collection, storage, derivation and display rights for enough sources to support one region.
- [ ] Define and version the first regional methodology, including tax, delivery, basket, baseline, coverage and outlier rules.
- [ ] Maintain a reviewed canonical catalogue for 32GB DDR5 desktop-memory kits.
- [ ] Preserve immutable raw observations and complete provenance for every derived value.
- [ ] Match listings conservatively, with exact identifiers first and an auditable exception queue.
- [ ] Calculate deterministic daily product prices and one reproducible regional index.
- [ ] Expose source freshness, coverage, calculation version, quality state and corrections in a private dashboard.
- [ ] Run bounded AI workers through explicit task contracts, audit logs, locks and measurable evaluation gates.
- [ ] Demonstrate reliable scheduled operation and tested recovery before public launch.

### Out of Scope

- Multi-region launch — add regions only after the first meets reliability and workload gates.
- GPUs, CPUs, motherboards and complete-build pricing — materially different catalogue and market behaviour.
- Used/refurbished-market indices — condition grading makes comparability substantially harder.
- Public API and commercial data resale — require proven demand and explicit redistribution rights.
- Automated AI-written publication or unapproved forecasts — incompatible with initial trust and accountability requirements.
- Live public price/index publication remains deferred; a clearly labelled static pre-launch publisher-review site is permitted as an enabling artefact.
- User accounts, premium memberships and alerts — deferred until the core index proves useful.
- Microservices — unnecessary operational complexity for the MVP.
- Zero-human corporate operation — legal, security, methodology and publication accountability remain human-governed.

## Context

Two supplied briefing documents define a broad four-region product and a detailed technical backlog. Review found a credible differentiator in Retail Price Lag, transparent forecast scoring and regional transmission analysis, but also unresolved assumptions around data rights, source stability, matching accuracy, regional comparability and willingness to pay.

The technical reference architecture is a TypeScript/Next.js modular monolith backed by PostgreSQL, object storage, scheduled jobs and monitoring. The implementation may refine exact libraries during phase planning, but must retain the modular-monolith and deterministic-data principles.

## Constraints

- **Evidence**: No source may support a production index until its collection, storage, derivation, display and commercial-use permissions are recorded.
- **Data integrity**: Raw observations are immutable; corrections and recalculations are additive, versioned and auditable.
- **Autonomy**: External publishing, spend, production mutation and methodology changes default to locked.
- **AI safety**: LLMs may rank, draft and recommend, but may not directly calculate or silently alter public facts.
- **Scope**: One region and one 32GB DDR5 index must work end-to-end before category or geographic expansion.
- **Operations**: Jobs must be idempotent, observable, replayable and fail closed on unknown quality or provenance.
- **Security**: Least privilege, managed secrets, role-based administration, MFA and an administrative audit trail are required before production use.
- **Quality**: Auto-confirmed product matching must eventually demonstrate at least 99.5% precision on representative labelled data; abstention is preferable to false confidence.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use a modular monolith for the MVP | Lowest operational complexity while preserving internal boundaries | — Pending |
| Begin with one region and 32GB DDR5 kits | Proves the full data chain before multiplying unknowns | Accepted; UK selected for diligence only, with no production region yet approved |
| Select the first region by lawful source quality, not assumption | Source viability is the existential dependency | Applied; UK is the first contracting target, while Phase 1 remains no-go pending rights |
| Make deterministic software own prices, indices and scoring | Public facts must be replayable and testable | — Pending |
| Use agents for bounded work with hard external-action locks | Maximises leverage without outsourcing accountability | — Pending |
| Keep forecasts human-approved initially | Causal interpretation and public recommendations carry disproportionate trust risk | — Pending |
| Publish a static pre-launch publisher-review site | Affiliate-network diligence needs a legitimate public promotional space before live feeds exist | Approved for project, synthetic demonstration and policy content only |

## Evolution

This document evolves at phase transitions and milestone boundaries.

After each phase transition:
1. Move shipped and proven requirements to Validated.
2. Move disproven requirements to Out of Scope with a reason.
3. Add newly discovered requirements explicitly.
4. Record material decisions and outcomes.
5. Recheck that the description and core value have not drifted.

---
*Last updated: 2026-08-05 after project initialisation*
