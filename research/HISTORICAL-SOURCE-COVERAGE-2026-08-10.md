# DDR5 historical source and coverage matrix — 2026-08-10

Status: `CANDIDATE_RESEARCH_ONLY`

This report does not approve sources, products, baskets, references, interval rules, thresholds, causal claims, production use or publication.

## Completed research waves

| Wave | Period | Result |
|---|---|---|
| H1 archive | 2021 Q4–2022 | No new replayable exact-MPN UK retailer captures after bounded retry; existing 2022 KingstonMemoryShop capture remains valid |
| H1 editorial | 2021 Q4–2022 | Five parent-verified dated anchors: three exact-MPN and two matched-specification only |
| H2 archive | 2023–2024 | No replayable exact-MPN captures from the bounded UK retailer search; visible coverage gap retained |
| H3 archive | 2025–2026-08-08 | Two parent-verified exact-MPN CCL captures retained; one AWD-IT lead rejected because parent-fetched bytes did not expose the claimed MPN/prices |
| Prospective | From 2026-08-09 | Existing canonical daily collector remains sole prospective fetcher |

Two initial broad archive workers timed out. Their outputs were not used. Narrow retries used fixed network budgets and returned clean abstentions rather than snippets.

## Primary-retail exact-MPN historical coverage

| MPN | Product | Verified evidence dates | Sellers | State |
|---|---|---|---|---|
| `KF564C32RSK2-32` | Kingston FURY Renegade 32GB DDR5-6400 CL32 | 2022-08-11, 2025-06-19, 2026-08-09 prospective | KingstonMemoryShop, CCL | Sparse exact-MPN history with multi-year gaps |
| `KF560C30BBEK2-32` | Kingston FURY Beast 32GB DDR5-6000 CL30 | 2025-09-07, 2026-03-09, 2026-08-09 prospective | CCL, KingstonMemoryShop | Sparse exact-MPN history with gaps |
| `F5-6000J3636F16GX2-FX5` | G.SKILL Flare X5 32GB DDR5-6000 CL36 | 2026-01-10, 2026-01-17, 2026-08-09 prospective | AWD-IT | Sparse exact-MPN history with gaps |
| `F5-6000J3636F16GX2-TZ5NR` | G.SKILL Trident Z5 Neo RGB 32GB DDR5-6000 CL36 | none | none | Gap |
| `KF560C36BBEK2-32` | Kingston FURY Beast 32GB DDR5-6000 CL36 | none | none | Gap |
| `CT2K16G56C46U5` | Crucial Classic 32GB DDR5-5600 CL46 | none | none | Gap |
| `CP2K16G56C46U5` | Crucial Pro 32GB DDR5-5600 CL46 | none | none | Gap |
| `CP2K16G60C36U5B` | Crucial Pro OC 32GB DDR5-6000 CL36 | none | none | Gap |
| `CP2K16G64C38U5B` | Crucial Pro OC 32GB DDR5-6400 CL38 | none | none | Gap |
| `FF3D532G6000HC30DC01` | T-FORCE DELTA RGB 32GB DDR5-6000 CL30 | none | none | Gap |
| `FFRD532G6000HC30DC01` | T-FORCE DELTA RGB ROG 32GB DDR5-6000 CL30 | none | none | Gap |
| `CTCED532G6400HC32ADC01` | T-CREATE EXPERT 32GB DDR5-6400 CL32 | none | none | Gap |
| `CMK32GX5M2B6000C36` | Corsair VENGEANCE 32GB DDR5-6000 CL36 | none | none | Gap |
| `AD5U480016G-DT` | ADATA 32GB DDR5-4800 kit | none | none | Gap |
| `AD5U560016G-DT` | ADATA 32GB DDR5-5600 kit | none | none | Gap |
| `VV532G60C30AK` | Patriot Viper Venom AMD 32GB DDR5-6000 CL30 | none | none | Gap |
| `VEB532G6030KW` | Patriot Viper Elite 5 32GB DDR5-6000 CL30 research lead | current page verified separately; no historical retained point | Overclockers UK | Historical gap; catalogue promotion not implied |

## Editorial launch-era anchors

| Publication date | Product | Identity basis | Price statement | Publisher |
|---|---|---|---:|---|
| 2021-11-26 | Corsair Dominator Platinum RGB 32GB DDR5-5200 | exact `CMT32GX5M2B5200C36FE` | £314.99 at Corsair Store, VAT unknown | KitGuru |
| 2021-12-24 local publication date | Kingston FURY Beast 32GB DDR5-5200 | matched specification only | PHP 17,995, tax basis unknown | Gadget Pilipinas |
| 2022-05-08 | G.SKILL Trident Z5 RGB 32GB DDR5-6400 C32 | exact `F5-6400J3239G16GX2-TZ5RK` | US$449.99, sales-tax basis unknown | Tom's Hardware |
| 2022-07-12 | Crucial 32GB DDR5-4800 | matched specification only | US$144.99 Prime Day; typical US$192.93 reported | Tom's Hardware |
| 2022-08-26 | TEAMGROUP T-FORCE DELTA RGB 32GB DDR5-6400 CL40 | exact `FF4D532G6400HC40BDC01` | £449.99 at Overclockers UK, VAT basis unstated | KitGuru |

These are reportable dated statements, not primary retailer observations. The three exact-MPN anchors may support item history after source/method review. The two matched-specification anchors may support context only and must not be relabelled as exact products.

## Honest graph fixture

`data/fixtures/historical-exact-mpn-sparse-graph.v1.json` contains nine GBP VAT-inclusive quoted item-price markers across three exact MPNs.

The fixture mandates:

- point markers only;
- no connecting lines;
- no interpolation, forward fill or backcasting;
- no cross-product or cross-seller aggregation;
- visible seller and source lineage;
- explicit unobserved gaps.

It is a frontend/integrity fixture, not an index or representative market history.

## Known source limitations

- Wayback CDX broad domain searches frequently time out.
- Narrow exact-MPN CDX queries can return empty results even when another URL form was archived.
- Successful CDX discovery does not guarantee replayable page bytes.
- Current retailer pages do not prove historical prices.
- Editorial pages can be modified after publication; publication and modification timestamps are retained separately.
- Dynamic shopping widgets are excluded because they may display current rather than publication-date prices.
- VAT, delivery and promotion semantics are often unstated in editorial prose.
- A retailer archive timestamp is evidence that the displayed state existed at capture time, not the exact date it began.

## Historical acquisition Wave 2 — 2026-08-10

Parent verification added six exact-MPN archived UK storefront observations:

| Product | Storefront | Captures | Price evidence | VAT state |
|---|---|---:|---|---|
| Corsair `CMK32GX5M2B6000C36` | Scan Computers | 2022-07-03, 2023-03-15 | £275.48, £130.00 | unresolved |
| Crucial `CT2K16G48C40U5` | Crucial UK | 2021-11-02, 2022-10-07 | £185.99, £190.79 | explicitly included |
| Crucial `CT2K16G56C46U5` | Crucial UK | 2023-01-28, 2023-08-15 | £148.79, £92.39 | explicitly included |

The sparse graph fixture now contains 15 markers across six exact MPNs. Every point carries an explicit VAT state. The Scan points may be displayed as unresolved quoted prices but cannot be compared with or aggregated into VAT-inclusive points.

A separate second editorial ledger retains five parent-verified exact-MPN statements from 2022–2024. Three URL-only MPN leads remain held pending a separate URL-binding extract. Editorial statements remain outside the storefront graph and all numerical series.

## Historical acquisition Wave 3 — 2026-08-10

A third bounded acquisition retained 47 observations from three archived UK retailer category/subcategory pages in `data/observations/candidate/uk-primary-retail-historical-backfill-2026-08-10T130500Z.v1.json`:

| Storefront | Captured page | Capture date | Observations |
|---|---|---|---:|
| Overclockers UK | Archived DDR5 category page | 2023-12-03 | 29 |
| Ebuyer | Archived DDR5-6000 subcategory page | 2024-11-02 | 16 |
| Novatech | Archived DDR5 PC5-48000 6000MHz category page | 2022-01-25 | 2 |

This is the first wave built from category-page captures rather than single-product-page captures, and it is the largest single tranche retained to date. Six candidate tranches now feed the envelope: two prospective 2026-08-09 tranches and four historical-backfill tranches, together retaining 65 observations. All source-approval, methodology, index-eligibility, production-eligibility and publication-eligibility flags on the new tranche remain false. Minimal factual extracts and source-response checksums are retained under `research/evidence/historical-primary-retail-backfill-2026-08-10-wave3/`.

### Observed-price envelope quarter coverage

`buildEnvelopeFromRepository` (`lib/historical-observed-price-envelope.mjs`) derives a candidate quarter-grain envelope from the six eligible tranches. It spans 20 UTC calendar quarters from 2021-Q4 to 2026-Q3: 12 quarters carry at least one observation and 8 remain explicit gaps (`no_eligible_evidence`), with no interpolation, forward fill, backcast or connecting line across them. Every one of the 65 contributing observations has a resolved VAT state; the envelope reports 0 VAT-unresolved observations.

Wave 3 newly filled three previously gapped quarters: 2022-Q1 (Novatech, 2 observations), 2023-Q4 (Overclockers UK, 29 observations) and 2024-Q4 (Ebuyer, 16 observations). The remaining 8 gap quarters are 2022-Q2, 2023-Q2, 2024-Q1, 2024-Q2, 2024-Q3, 2025-Q1, 2025-Q4 and 2026-Q2.

### Honest limitations introduced by category-page capture

- A category-page capture contributes many products at a single instant, while a product-page capture contributes one product at one instant. Band width for a quarter therefore partly reflects which capture method happened to survive in the Wayback archive for that period, not necessarily market price movement. The 2023-Q4 and 2024-Q4 quarters are dense mainly because a category page was captured then, not because those quarters saw more genuine price activity than neighbouring gap quarters.
- Scan Computers and CCL Online appear to have been crawled by Wayback almost exclusively at product-page level rather than category level across the period examined. Category-page density is therefore uneven across retailers, and any future comparison of retailer coverage must account for this crawl-frequency artifact rather than treating it as a market signal.
- Overclockers UK and Ebuyer both expose machine-readable VAT state in their captured category pages: Overclockers UK via a `price-incl-vat-info` element, and Ebuyer via separate `inc-vat`/`ex-vat` blocks. This is the same category of explicit, parseable VAT signal that Scan Computers exposes via its `data-exvat` attribute, and it is why the wave 3 observations resolve to a definite VAT state rather than requiring the separate VAT-display resolution procedure used for Scan's product pages.

## Next targeted acquisition gaps

1. Find lawful 2023 and 2024 UK evidence for several exact mainstream 32GB DDR5 MPNs, especially Corsair, Crucial and Kingston.
2. Search alternative archived URL slugs discovered from retailer sitemaps or dated editorial links rather than broad CDX wildcards.
3. Investigate reputable historical-price services only after terms, seller identity, VAT and reproducibility are reviewed.
4. Seek additional dated UK reviews and deal coverage with explicit MPNs and prices.
5. Preserve weekly evidence where it exists; accept monthly or quarterly anchors and visible gaps where it does not.
6. Keep event journalism in a separate ledger until a frozen price movement can be compared with dated candidate explanations and counterevidence.
