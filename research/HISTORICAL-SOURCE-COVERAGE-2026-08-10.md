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

## Next targeted acquisition gaps

1. Find lawful 2023 and 2024 UK evidence for several exact mainstream 32GB DDR5 MPNs, especially Corsair, Crucial and Kingston.
2. Search alternative archived URL slugs discovered from retailer sitemaps or dated editorial links rather than broad CDX wildcards.
3. Investigate reputable historical-price services only after terms, seller identity, VAT and reproducibility are reviewed.
4. Seek additional dated UK reviews and deal coverage with explicit MPNs and prices.
5. Preserve weekly evidence where it exists; accept monthly or quarterly anchors and visible gaps where it does not.
6. Keep event journalism in a separate ledger until a frozen price movement can be compared with dated candidate explanations and counterevidence.
