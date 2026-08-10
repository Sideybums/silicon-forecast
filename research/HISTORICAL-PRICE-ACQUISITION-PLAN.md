# Governed DDR5 historical price acquisition plan

Status: `CANDIDATE_RESEARCH_ONLY`

Date: 2026-08-10

## Purpose

Build enough lawful, reproducible UK 32GB DDR5 desktop-kit price evidence from DDR5 launch onward to support an honest stock-market-style history. Daily prospective collection continues from 2026-08-09. Historical research prefers weekly evidence and accepts monthly evidence or explicit gaps where weekly coverage cannot be proved.

This plan does not approve a source, basket, reference period, linking rule, interval aggregation rule, threshold, public claim, production action or publication.

## Product contract

1. Preserve every supported historical observation at its evidenced timestamp.
2. Distinguish retailer price-effective time, archive capture time, article publication time and research retrieval time.
3. Never infer that an archive capture is the exact date a retailer changed its price.
4. Never interpolate, forward-fill, backcast or average sparse evidence without a separately approved rule.
5. Allow a graph to display daily prospective points and sparse historical points at their real dates.
6. Prefer weekly display where the underlying evidence supports it; use monthly fallback or a visible gap otherwise.
7. Keep exact-MPN item histories separate from matched-specification evidence and any future category index.
8. Keep journalism/event evidence mathematically separate. It may explain a measured movement only after the movement is frozen and reviewed.
9. Preserve unavailable states and source/product coverage alongside every rendered period.
10. Keep DDR4 evidence, including David's exact Patriot Viper Steel comparison, contextual and private unless the component-category scope is separately expanded.

## Time coverage targets

| Era | Research question | Desired resolution | Honest fallback |
|---|---|---:|---:|
| 2021 Q4–2022 | What did 32GB DDR5 cost during launch and early adoption? | Monthly; weekly where archives permit | Dated editorial/retailer anchors with gaps |
| 2023 | How far did the oversupply/down-cycle reduce consumer kit prices? | Monthly | Quarterly anchors with visible gaps |
| 2024 | What price range did mature mainstream DDR5-6000 kits occupy? | Weekly | Monthly anchors |
| 2025 | When did the market turn and how broadly? | Weekly | Monthly anchors |
| 2026 before 9 August | How did the current shock transmit into UK retail? | Weekly | Monthly anchors |
| From 9 August 2026 | What happens prospectively? | Daily canonical collection | Explicit unavailable day |

These are acquisition objectives, not completeness thresholds or an approved release gate.

## Candidate exact-MPN targets

Existing reviewed/candidate control-plane products:

- Kingston `KF560C30BBEK2-32`
- Kingston `KF564C32RSK2-32`
- G.SKILL `F5-6000J3636F16GX2-FX5`
- G.SKILL `F5-6000J3636F16GX2-TZ5NR`
- Kingston `KF560C36BBEK2-32`
- Crucial `CT2K16G56C46U5`
- Crucial `CP2K16G56C46U5`
- Crucial `CP2K16G60C36U5B`
- Crucial `CP2K16G64C38U5B`
- TEAMGROUP `FF3D532G6000HC30DC01`
- TEAMGROUP `FFRD532G6000HC30DC01`
- TEAMGROUP `CTCED532G6400HC32ADC01`
- Corsair `CMK32GX5M2B6000C36`
- ADATA `AD5U480016G-DT`
- ADATA `AD5U560016G-DT`
- Patriot `VV532G60C30AK`

Additional research lead prompted by current Overclockers evidence:

- Patriot `VEB532G6030KW` — 32GB DDR5-6000 C30. Research lead only; no catalogue or basket promotion is implied.

Workers may discover other exact 32GB (2x16GB) DDR5 desktop-kit MPNs that materially improve launch-era, manufacturer or retailer coverage. Discovery output remains candidate-only and must not enter the reviewed catalogue automatically.

## Candidate source classes

Candidate only until separately reviewed:

1. Archived first-party UK retailer pages with exact MPN and visible price.
2. Dated retailer-owned articles, deal pages or buying guides with exact MPN and price basis.
3. Reputable dated editorial reviews containing exact MPN, capacity/configuration and observed price.
4. Manufacturer announcements or product pages for identity and launch timing only; manufacturer suggested prices must not be treated as retail transactions.
5. Lawfully accessible price-history services whose terms, seller semantics and price basis can be reviewed.
6. Private receipts as research leads only; never public or representative without permission, redaction and methodology review.

Search snippets, generated summaries, unverified screenshots, family-level prices, marketplace offers without seller binding and archive failures are not observations.

## Historical observation candidate contract

Every candidate observation must record:

- observation ID and tranche ID;
- product identity outcome: exact MPN, ambiguous, matched specification only or abstain;
- product name, capacity, module count, memory generation and speed/timings where supported;
- retailer/source owner and seller legal entity where applicable;
- source URL or stable archive locator;
- source class;
- publication timestamp if applicable;
- archive capture timestamp if applicable;
- retrieval timestamp;
- item price and currency;
- VAT status, delivery basis, availability and promotion semantics as known/unknown fields;
- minimal factual quotation/extract;
- evidence byte count and SHA-256 where bytes are retained or fetched;
- explicit reason codes for every unknown or abstention;
- all production, source-approval, basket, methodology, index and publication flags false.

## Interval representation

The renderer may place an observation at its evidenced date. It must not imply continuous coverage between observations.

Candidate interval views may group evidence labels for inspection, but no weekly/monthly numeric aggregation is selected by this plan. Before activation, an approved rule must define at least:

- period boundaries and timezone;
- minimum observations and source/product breadth;
- multiple same-product/same-retailer points within a period;
- promotions, stockouts, delivery and VAT treatment;
- exact-item versus matched-specification separation;
- incomplete-period and unavailable behaviour;
- basket-vintage and successor handling;
- sensitivity to weekly versus monthly display.

## Bounded research waves

### Wave H1 — launch and early adoption, 2021 Q4–2022

Search exact MPN archives and dated editorial evidence. Prioritise identity and launch price anchors. Record launch premiums explicitly; do not call them shortage prices without evidence.

### Wave H2 — down-cycle and mature market, 2023–2024

Seek monthly/weekly anchors across several products and sources. Capture evidence of the 2023 decline and the consumer price range people encountered in 2024. Do not choose 2024 as the reference period.

### Wave H3 — turn and shock, 2025–2026 pre-inception

Find archived exact-MPN prices before 2026-08-09 and compare the timing of measured movement with separately retained market journalism. Do not fetch live prospective retailer pages while the canonical collector owns that scope.

### Parent integration

The parent must independently re-fetch decisive pages or retained evidence, verify exact identity and hashes, reject snippets and archive failures, deduplicate observations, preserve gaps and run repository-wide tests. Worker prose is never sufficient evidence.

## Initial success condition

This first research push succeeds if it produces:

- a documented source/coverage matrix;
- additional checksum-bound candidate historical observations or explicit evidence abstentions;
- at least one honest plotted history fixture with visible gaps;
- a list of unresolved source/time/product coverage gaps;
- no methodology, source, reference, basket, threshold, causal or publication approval.

It does not need to produce weekly data everywhere. Pretending that it did would be worse than admitting that 2022 has three points and a great deal of silence.
