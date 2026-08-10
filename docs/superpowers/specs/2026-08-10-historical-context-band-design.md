# Historical context band and retrospective explanation layer — design

Status: `CANDIDATE_DESIGN_ONLY`

Date: 2026-08-10

Author: Jarvis (parent orchestrator), approved section-by-section by David.

## Purpose

Two connected problems.

First, the exact-MPN sparse graph is rigorous and nearly unreadable as market context. Two full research waves produced 15 points across six MPNs spanning five years. A reader cannot answer "what did a 32GB DDR5 kit cost in 2023?" from it. The product needs a defensible backdrop showing the range prices actually occupied, without inventing an index.

Second, the data already contains large frozen movements — a 2023 collapse and a 2026 surge — with no retained evidence explaining them. The eventual product promise is that a significant move arrives with dated reportable sources that may help explain it. That capability should be proven retrospectively, against movements that have already happened, before it is ever pointed at live data.

This design approves no source, methodology threshold, basket, reference period, deflator, aggregation rule, causal claim, production action or publication.

## Non-goals

- No central-tendency estimator. No median, mean or weighted average.
- No live or prospective fetching. The canonical collector `7e98d1467473` remains the sole prospective fetcher.
- No public display. Everything here is private candidate evidence.
- No event approval, overlay creation or editorial activation. This stays at Gate 0 of `docs/EDITORIAL-INTELLIGENCE-DESIGN.md`.
- No DDR4, no other component categories, no other regions.

## Layer architecture

Three layers render on one chart. Each is separately falsifiable and none may contaminate another.

1. **Exact-MPN product lines.** `data/fixtures/historical-exact-mpn-sparse-graph.v1.json`, unchanged by this work. Point markers, no connecting lines. The rigorous spine.
2. **Observed-price envelope.** New. Per-period low and high across all eligible evidence.
3. **Evidence scatter.** Every contributing observation drawn as a faint background point, so a wide band built from three observations cannot pass for a well-sampled one.

## Why an envelope and not a band with a middle

A min/max of actually-observed points is a fact about the evidence set. It licenses the statement "the cheapest 32GB DDR5 kit we observed at a UK retailer in Q1 2023 was £92.39 and the dearest £148.79, across 7 observations and 4 products." That is true, checkable, and requires no approved methodology.

A median asserts a typical market price. That is an estimator, and it requires an approved aggregation rule, a minimum-observation threshold and a completeness rule — all currently `PROPOSED_LOCKED`. Building it now would produce machinery that renders `UNAVAILABLE_AGGREGATION_NOT_APPROVED` and nothing else.

The envelope is therefore shippable under current locks precisely because it estimates nothing. If an aggregation rule is later approved, a central line drops into the same fixture without restructuring.

## Data flow

Immutable candidate observation files remain the single source of truth. The envelope is derived, never hand-authored.

```
data/observations/candidate/*.json   (immutable: existing + new)
        |
        +-- eligibility filter
        +-- period bucketing (UTC calendar quarter)
        +-- envelope derivation  -> low / high / counts
        +-- scatter set          -> all eligible points, class-tagged
                |
                v
data/fixtures/historical-observed-price-envelope.v1.json   (golden output)
                |
                v
            renderer
```

A test re-derives the fixture from the observation files and asserts byte equality against the checked-in golden. No one, including the orchestrator, can hand-edit a number into the band without failing the suite.

## Period grain

UTC calendar quarter.

Monthly grain would be empty across most of 2021–2024 and would present sparse evidence as a broken chart rather than an honest one. Quarters with no eligible evidence render as explicit gaps — not zero, not a stretched neighbour, not a carried-forward value.

## Eligibility

A point may contribute to the envelope when all of the following hold:

- it is an observed storefront offer captured from an archived UK retailer page;
- the exact MPN is visible in the captured bytes;
- the product is a 32GB (2x16) DDR5 desktop memory kit;
- the price is a quoted item price in GBP;
- the capture is reproducible on independent parent re-fetch.

Catalogue membership is not required. Any qualifying 32GB DDR5 kit contributes to the envelope; the 16 catalogue MPNs additionally keep their own separate product lines.

Excluded entirely: editorial price statements, search snippets, MSRP, family-level prices, dynamic shopping widgets, marketplace offers without seller binding, and any capture whose MPN is not visible in retrieved bytes.

## Per-period record

```
period_id, start, end,
low  { amount_minor, observation_id, mpn, seller },
high { amount_minor, observation_id, mpn, seller },
observation_count, distinct_mpn_count, distinct_seller_count,
vat_resolved_count, vat_unresolved_count,
contributing_observation_ids[],
state: "observed" | "no_eligible_evidence"
```

Every band edge names the exact observation that produced it, so any point on the chart traces to an archive capture in one hop.

## No thresholds

There is deliberately no minimum observation count. A minimum would be a methodology threshold, and those are locked.

Instead every period always renders `observation_count`, `distinct_mpn_count` and `distinct_seller_count`. A single-observation quarter produces `low == high`: a degenerate envelope that is honestly one dot, with a count saying so.

## Comparability decisions — approved by David, 2026-08-10

Two rules in the existing fixture contract are relaxed for the context layer. David approved both on the basis that the object of interest is the market price level, not any individual retailer's conduct.

### Cross-seller comparison

Permitted as a fallback, not a default.

Every movement record carries `comparison_basis: "within_seller" | "cross_seller"`. Acquisition workers are instructed to find the same MPN at the same retailer at two separated dates first. A cross-seller pairing is emitted only where no within-seller pair exists. The renderer discloses the basis on any cross-seller movement.

Known cost: a cross-seller movement conflates seller price-level differences with change over time. The number remains a real comparison of two real observed prices, but its cause is mixed, and the disclosure exists so a reader is not misled about that.

### VAT-unresolved points

Permitted in the envelope rather than excluded.

Each period records `vat_resolved_count` and `vat_unresolved_count`. Any period containing unresolved points renders a visible note in the form "VAT status unverified for N of M observations."

This supersedes the exclusion rule for the context layer only. The per-product exact-MPN lines retain their existing contract.

### Recorded VAT determination method

Price endings do not indicate VAT status and must not be used to infer it.

UK consumer-facing prices must include VAT under the Price Marking Order 2004, so inc-VAT is the default for consumer retailers regardless of ending. Endings such as `.99` and `.95` are marketing price points that appear in both inc- and ex-VAT displays. Trade-oriented sellers — Scan Computers notably — have historically offered an ex/inc-VAT display toggle.

The discriminating signal is therefore the seller's audience and the display mode present in the captured bytes. Where the archived page shows an explicit VAT statement or a toggle state, it is recorded. Where it does not, VAT remains unresolved and is disclosed as such.

Scan's two retained captures, £275.48 and £130.00, are noted as reading unlike consumer marketing price points. This is recorded as an observation prompting display-mode review, not as a determination.

### Governance record

Because this relaxes rules the fixture contract currently enforces, it is recorded additively in `data/reviews/historical-context-comparability-review-2026-08-10.json`, matching the pattern of the diversification and resilience decisions. Original contract text is not rewritten; the decision sits alongside it with rationale and known costs.

## Acquisition wave

Three bounded read-only workers. None may write project files, fetch live or current retailer offers, compete with the canonical collector, or infer a price from a snippet, an MSRP, a discount percentage, a graph shape or a neighbouring product. Workers return reproducible evidence candidates only. Worker prose is never evidence.

The parent independently re-fetches and hashes every decisive lead, confirms the exact MPN and price are visible in retrieved bytes, and rejects anything unreproducible.

**Worker A — UK retailer archive sweep, 2021 Q4 to 2023.** Any 32GB (2x16) DDR5 desktop kit across sellers proven to archive well — Scan, CCL, KingstonMemoryShop, Crucial UK, Overclockers UK, AWD-IT — plus Box, Novatech and Ebuyer.

**Worker B — same sweep, 2024 to 2026-08-08.** The 2024 gap is the worst in the current matrix, and this window contains the surge.

**Worker C — archived category and listing pages, plus URL-binding extraction for the three held KitGuru leads.** One archived DDR5 category page may yield many MPN-and-price pairs at a single timestamp, where a product-page sweep yields one. This is the primary density unlock.

Listing pages frequently show product names without MPNs. Where the exact MPN is not visible in the captured bytes, the point is held, not guessed.

Each returned candidate must carry: archive URL, archive capture timestamp, retrieval timestamp, exact MPN, seller, item price, currency, any visible VAT statement or display-mode indicator, availability semantics where visible, and a minimal factual quotation.

## Retrospective explanation ledger

New file: `research/evidence/historical-movement-explanations-2026-08-10/ledger.v1.json`, structured to the record separation in `docs/EDITORIAL-INTELLIGENCE-DESIGN.md`.

Two record types, kept apart.

**Movement records** are derived from observation data, never asserted. Each names two exact observation IDs, the computed delta, the comparison basis, the VAT state at both ends, and no cause.

**Candidate explanations** each carry a dated reportable source, minimal quotation, response byte count and SHA-256, proposed mechanism, `causal_language_level` capped at `contributory_hypothesis`, and a mandatory counterevidence search record. "None identified" is a permitted result. "None exists" is not.

An explanation never touches a number. Adding, editing or removing one leaves every envelope and sparse-graph checksum byte-identical.

### Movements available in current data

Within-seller, both ends VAT-inclusive:

| Line | From | To | Move |
|---|---|---|---|
| Crucial UK `CT2K16G48C40U5` | £185.99 (2021-11-02) | £190.79 (2022-10-07) | +2.6% |
| Crucial UK `CT2K16G56C46U5` | £148.79 (2023-01-28) | £92.39 (2023-08-15) | -37.9% |
| KingstonMemoryShop `KF564C32RSK2-32` | £487.99 (2022-08-11) | £620.26 (2026-08-09) | +27.1% |
| AWD-IT `F5-6000J3636F16GX2-FX5` | £399.99 (2026-01-17) | £469.99 (2026-08-09) | +17.5% |
| KingstonMemoryShop `KF560C30BBEK2-32` | £547.28 (2026-03-09) | £611.44 (2026-08-09) | +11.7% |

Within-seller, both ends VAT-unresolved, permitted under the approved relaxation with disclosure:

| Line | From | To | Move |
|---|---|---|---|
| Scan `CMK32GX5M2B6000C36` | £275.48 (2022-07-03) | £130.00 (2023-03-15) | -52.8% |

Cross-seller, permitted under the approved relaxation with disclosure:

| Line | From | To | Move |
|---|---|---|---|
| `KF564C32RSK2-32` CCL to KingstonMemoryShop | £113.99 (2025-06-19) | £620.26 (2026-08-09) | +444.1% |

Both target stories are therefore already evidenced: the 2023 decline and the 2026 surge.

Initial research direction indicates AI-datacentre demand and global supply shortage as the leading candidate explanations for the 2026 surge. That is a hypothesis to be evidenced and challenged, not a conclusion to be confirmed. Counterevidence search is mandatory for each.

## Fail-closed rules

- No exact MPN visible in captured bytes: held, never guessed.
- Archive capture unreproducible on parent re-fetch: rejected.
- No central tendency; median remains `UNAVAILABLE_AGGREGATION_NOT_APPROVED`.
- No interpolation, forward fill, backcast or connecting lines between periods.
- Archive capture timestamps are never represented as retailer price-change times.
- Editorial anchors never enter the envelope; they remain in their separate ledger.
- Causal language capped at `contributory_hypothesis`; no explanation is approved, published, or permitted to alter a number.
- Unknown provenance, rights status, seller identity or capture reproducibility fails closed.

## Testing

- Envelope re-derives from observation files and matches the golden byte-for-byte.
- Hand-edited band value fails.
- Forged or dangling observation ID fails.
- A period claiming an observation absent from its contributing set fails.
- A VAT-unresolved point present without a disclosure flag fails.
- A cross-seller movement without `comparison_basis` fails.
- A period with no eligible evidence renders an explicit gap, never zero or a neighbour's value.
- Adding, editing or removing any explanation leaves envelope and sparse-graph checksums byte-identical.
- An explanation carrying a numeric override, weight or gap-fill field is rejected.
- Standing bar: full Node suite, ESLint, TypeScript, static build, governed JSON parse, disposable PostgreSQL verification, `git diff --check`, secret scan on changed files.

## Sequencing against the canonical collector

All work here is archive-based and read-only against Wayback and dated editorial sources. It cannot compete with the prospective collector.

The collector remains the sole prospective fetcher. Its next scheduled run is 2026-08-10T13:45+01:00. No work in this design fetches a live or current retailer offer at any point, before or after that run.

## Open items

- Whether the collector job `7e98d1467473` is genuinely still scheduled could not be confirmed from this session; `CronList` reports only jobs created in the current session. Verify independently before relying on the 13:45 run.
- `.planning/HANDOFF.json` records `verification.wave_2_commit: "a58ea71"`, which is a dangling commit left by an amend. The reachable Wave 2 commit is `dfcca73`. Correct as bookkeeping.
- Scan Computers display-mode review, to determine whether the two unresolved captures were ex-VAT trade displays.
