# Wave 1 official-statistics and historical-context candidate packet

- Prepared: 2026-08-09
- Worker scope: Tier 1 research / Tier 2 additive report only
- Repository state inspected: `main` at `1de7d00a4d8b9bfedfb3be765014daa496fd532d`
- Decision state: **NONE SELECTED**
- Governance state: **PROPOSED_LOCKED**

## 1. Non-decision and authority boundary

This packet compares candidate evidence. It does **not** select, recommend, approve, rank or activate a deflator, historical reference window, monthly completeness rule, aggregation operator, statistical-release policy, threshold, source, causal claim, basket, production action or public action. All candidates and possible interpretations below remain **PROPOSED_LOCKED**. The operative state is:

- official UK deflator: **NONE SELECTED**;
- release-vintage/revision policy: **NONE SELECTED**;
- historical reference window: **NONE SELECTED**;
- historical-reference label (including “normal” or “affordable”): **NONE SELECTED**;
- causal explanation or event-overlay wording: **NONE SELECTED**;
- source approval and public/production activation: **NONE SELECTED** and locked.

A provider calling a series official does not make it approved for Silicon Forecast. A plausible date range does not make it representative. Temporal proximity does not establish causation. Event/context evidence cannot alter a numeric point, weight, basket, link factor, reference, deflator, gap or checksum.

## 2. Candidate official-statistics comparison — no selection

All ONS time-series pages below were retrieved successfully from normal public access on 2026-08-09 between 17:49:55Z and 17:51:58Z. The pages exposed a release date of 22 July 2026 and next release of 19 August 2026 for the MM23 candidates; YBGB exposed a release date of 30 June 2026 and next release of 13 August 2026. This is discovery evidence, not a pinned statistical vintage.

| Candidate provider / exact series | Concept and coverage | Frequency / adjustment / unit | Statistical status and release behaviour | Release-vintage metadata available at retrieval | Candidate-fit questions and reasons it may be unsuitable |
|---|---|---|---|---|---|
| ONS `L522`, source dataset `MM23`: **CPIH INDEX 00: ALL ITEMS 2015=100** | Broad UK household consumer-price index including owner occupiers’ housing costs and Council Tax. It measures general household inflation, not memory or electronics input costs. | Monthly; published all-items index is not seasonally adjusted; index, 2015=100. Page also carries quarterly/annual presentations derived from monthly observations. | CPIH is an accredited official statistic within ONS consumer-price inflation. CPIH/CPI are normally not revised after first publication except corrections; annual weights and methodological changes affect compilation, and documented corrections remain possible. Monthly release cadence. | Series page/CSV exposes exact CDID, dataset ID, unit, release date, next release and “View previous versions”; a generated CSV can be retained and checksummed. The current-series route does **not by itself** supply a Silicon Forecast immutable vintage ID, observation-level provisional/final flag, supersession graph or capture checksum. Those must be constructed from one coherent release capture if later approved. | Broad household purchasing-power interpretation is possible, but housing-heavy scope may be conceptually remote from a discretionary imported PC part. It can answer “general consumer prices” rather than “technology prices.” **PROPOSED_LOCKED; NONE SELECTED.** |
| ONS `D7BT`, source dataset `MM23`: **CPI INDEX 00: ALL ITEMS 2015=100** | Broad UK consumer-price index excluding the CPIH owner occupiers’ housing-cost and Council Tax additions. | Monthly; not seasonally adjusted; index, 2015=100. | CPI is an accredited official statistic and the UK’s internationally comparable HICP measure. Same normal non-revision/correction caveat and monthly release family as CPIH. | Same page/CSV fields and “View previous versions” facility as L522. Release pages can identify an edition, but a reproducible policy still has to bind exact downloaded bytes, release date, retrieval time and all required observations from one edition. No policy is chosen here. | International comparability and familiarity do not establish fit. CPI remains a consumption basket whose weights and quality methods are not a DRAM-cost measure. Excluding owner-occupier costs may or may not match the intended “real” interpretation. **PROPOSED_LOCKED; NONE SELECTED.** |
| ONS `D7EP`, source dataset `MM23`: **CPI INDEX 09.1.3: Data processing equipment 2015=100** | COICOP technology sub-index for data-processing equipment. It is closer to computers than an all-items index, but is not an exact 32GB DDR5 retail-kit index. | Monthly; not seasonally adjusted; index, 2015=100. | Component series inside the accredited CPI production framework. Like other CPI indices, publication is normally unrevised except corrections, but basket samples, weights, replacements and quality adjustment can change over time. | Current series page exposes CDID, MM23, title/unit, release date, next release and previous-version navigation. It does not expose whether retail RAM is represented, its sample weight, observation-level status or an immutable API vintage manifest. | Potentially “deflates technology with technology,” which may remove part of the movement the product is designed to show. Product quality adjustment and rapid device substitution can dominate. Category composition is broader than RAM and exact DDR5 inclusion is unverified. **PROPOSED_LOCKED; NONE SELECTED.** |
| ONS `L7GU`, source dataset `MM23`: **CPI INDEX 09.1.3.2 Accessories for information processing equipment 2015=100** | Narrow accessories sub-index, superficially closer to memory sold as a computer accessory. Exact treatment of standalone RAM kits was not established by the time-series page. | Monthly; not seasonally adjusted; index, 2015=100 where supplied. | A detailed CPI component series; status inherits the CPI statistical production context, but its own page did not establish sufficient sample/composition continuity for this use. Detailed series may have shorter runs, changing item coverage or suppressed/missing periods. | Page exposed release/next-release and previous-version navigation, but the worker did not establish a complete long-run release-vintage archive or observation-status field. | “Accessories” is not proof of DDR5 coverage. Narrow samples can be volatile and quality/replacement effects can overwhelm. It may be too endogenous: using an adjacent electronics price series can erase sector-specific price movement rather than express economy-wide purchasing power. **PROPOSED_LOCKED; NONE SELECTED.** |
| ONS `CHAW`, source dataset `MM23`: **RPI All Items Index: Jan 1987=100** | Legacy all-items Retail Prices Index, with housing and formula coverage differing from CPI/CPIH. | Monthly; not seasonally adjusted; index, January 1987=100. | RPI is an official statistic but is **not** an accredited National Statistic; UK statistical authorities have documented methodological shortcomings and discourage use as a general inflation measure where alternatives exist. Publication is normally not revised except correction. Planned alignment of RPI methods with CPIH from 2030 creates an additional long-horizon comparability issue. | Exact series page and generated CSV expose release metadata and previous versions, but no Silicon Forecast vintage ID/checksum or observation-level status. | Long history is convenient but convenience cannot overcome known formula/status limitations or the prospective 2030 conceptual break. **PROPOSED_LOCKED; NONE SELECTED.** |
| ONS `YBGB`, source dataset `QNA`: **Gross domestic product at market prices: Implied deflator: SA** | Whole-economy implied GDP deflator: prices of domestically produced final output, not household consumption and not specifically imported retail goods. | Quarterly; seasonally adjusted; index, last full year=100 (moving annual base presentation on the retrieved page). | Official national-accounts series. Recent quarters and historical national accounts are revisable under quarterly/annual Blue Book processes; revisions are materially more routine than CPI/CPIH corrections. The series page alone did not state a separate series-level accreditation designation. | Page exposes CDID, QNA source, release date, next release and previous-version navigation. National-accounts editions can be captured, but revisions and moving reference-year presentation make edition binding essential. No monthly observation exists natively. | Fails the draft’s native monthly-frequency expectation without a separately approved quarterly alignment/interpolation rule, and interpolation is forbidden. It includes exports/government/investment and excludes import-price movement from domestic output measures in ways poorly aligned to UK-imported RAM retail prices. **PROPOSED_LOCKED; NONE SELECTED.** |

### 2.1 Provider and retrieval URLs

| Evidence | URL | Retrieval UTC / result |
|---|---|---|
| ONS L522 canonical series | https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l522/mm23 | 2026-08-09T17:49:55Z; HTTP 200 |
| ONS D7BT canonical series | https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7bt/mm23 | 2026-08-09T17:49:55Z; HTTP 200 |
| ONS D7EP canonical series | https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7ep/mm23 | 2026-08-09T17:51:57Z; HTTP 200 |
| ONS L7GU canonical series | https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l7gu/mm23 | 2026-08-09T17:51:57Z; HTTP 200 |
| ONS CHAW canonical series | https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/chaw/mm23 | 2026-08-09T17:49:55Z; HTTP 200 |
| ONS YBGB canonical series | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ybgb/qna | 2026-08-09T17:49:55Z; HTTP 200 |
| ONS CPIH/CPI/RPI Quality and Methodology Information | https://www.ons.gov.uk/economy/inflationandpriceindices/methodologies/consumerpriceinflationincludesall3indicescpihcpiandrpiqmi | 2026-08-09T17:52:49Z; HTTP 200 |
| ONS consumer-price guide | https://www.ons.gov.uk/economy/inflationandpriceindices/articles/consumerpriceindicesabriefguide/2017 | 2026-08-09T17:49:55Z; HTTP 200 |

Generated CSV route pattern observed and successfully exercised for L522 at 2026-08-09T17:50Z (HTTP 200, 11,867 bytes): `https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/l522/mm23`. A current generator response is not an immutable release-vintage identifier. The first attempted unversioned ONS API routes returned HTTP 404; this is a limitation of the attempted access route, not evidence that ONS lacks APIs or past editions.

### 2.2 Release-vintage policy candidates — descriptions only, none selected

| Candidate policy shape | What would be pinned | Advantages to test | Failure/unsuitability risks |
|---|---|---|---|
| First available release for each observation month | The complete MM23 release edition in which month `m` first appears | Closest to an “as then known” history | Produces a stitched set of releases; could violate the draft rule that one real-series revision use one internally coherent vintage unless an explicit construction policy is approved. Corrections may remain forever absent. |
| One named release edition for the entire calculated span | Exact edition/download bytes, release date, checksum and all observations present in that edition | Coherent and replayable snapshot | Long histories can change when a later edition is selected; an edition may not contain future months; a new edition requires a new real-series revision and impact report. |
| Latest release as a separate view | One latest coherent edition, never mutation of prior calculations | Shows current official history while preserving old outputs | “Latest” is unstable unless materialised under an immutable capture ID; user-facing ambiguity is high. |
| Freeze after a defined lag | One coherent edition only after a waiting interval | Could reduce correction churn | Lag threshold is unapproved; CPI normal non-revision makes the benefit uncertain, while GDP revisions can extend far beyond a short lag. |

**No release policy is recommended or selected.** Regardless of a future choice, the draft requires provider, CDID, title, unit, frequency/adjustment, observation period/value/status, release ID/date, retrieval time, capture checksum, parser version, revision relationship and immutable release-vintage ID. The observed ONS page fields are insufficient on their own.

## 3. Plausible historical-reference windows — no selection

The windows are investigation frames, not proposed baselines. Exact-MPN history, approved-source coverage, basket continuity and a complete linked nominal series do not currently exist across them. Therefore no window can pass the draft evidence gate today.

| Plausible investigation window | Why analysts might examine it | Reasons it may be unsuitable / confounders | Required alternatives or sensitivity checks |
|---|---|---|---|
| Pre-DDR5 period, e.g. 2019–2020 | Offers a pre-pandemic or pre-launch macro benchmark | Exact DDR5 retail products did not exist; DDR4 is a different generation. Backcasting or treating a predecessor as the same product is forbidden. Pandemic demand/supply conditions also begin in 2020. | Keep as external context only; do not splice DDR4 into DDR5. Compare macro indicators separately if relevant. |
| DDR5 introduction, roughly 2021 Q4–2022 H1 | Captures the technology’s first UK retail phase and early-adopter pricing | Launch scarcity, limited platform support, immature yields, sparse SKUs, extreme promotions and product-composition churn make “representative” implausible without strong evidence. Exact UK observations are currently absent. | Examine later maturity windows and product/family coverage; preserve launch as an event regime, not an assumed normal. |
| 2022 H2 | Broader DDR5 adoption may improve comparability; one retained exact-MPN archive point exists on 2022-08-11 | Russia’s full-scale invasion of Ukraine, European energy shock, sterling volatility, inflation, freight effects and continuing launch transition overlap. One point from one seller/MPN cannot define a category reference. | Sensitivity by month/quarter; GBP, energy and freight overlays; exclude or separately identify launch products; require retailer/product breadth. |
| Calendar 2023 | DDR5 platform and product breadth were more mature; may capture post-launch retail competition | Semiconductor memory was in a severe inventory/demand correction and suppliers disclosed production/capital responses. A cyclical trough is not necessarily typical or affordable. UK exact-MPN evidence is presently missing. | Compare 2022 and 2024; test median versus other still-unapproved operators; composition-constant subsets; supplier disclosures versus independent market data. |
| Calendar 2024 | Mature DDR5 availability and a full calendar year; AI/HBM demand became more visible | DRAM-cycle recovery, HBM capacity allocation, Red Sea disruption and continuing wars/trade controls create another exceptional regime. AI/server demand does not mechanically imply consumer DDR5 prices. | Compare halves/quarters; HBM and conventional DRAM evidence; freight routes; exchange-rate and retail inventory lags; contrary PC-demand evidence. |
| Calendar 2025 | Later mature DDR5 market and full year | May embed AI/HBM-driven supply allocation, trade restrictions/tariff expectations, manufacturer transitions and retailer inventory effects. Current packet has no approved complete UK history. | Compare 2023–2025; hold MPN/family mix constant where possible; identify policy announcement versus effective dates and retailer pass-through. |
| 2026 year to date / collection inception around 2026-08-09 | Closest to prospective observations and easiest operationally | Incomplete and selected by convenience; current retained quotes are sparse, delivery-ineligible and in some cases availability-ambiguous. The inception diagnostic is explicitly `not_an_index`. It cannot be labelled normal or affordable. | Never default to inception. Wait for governed evidence; compare prior complete windows if lawful exact history emerges. |
| Multi-year 2022–2025 band | May average over individual shocks | Combines launch, war/energy shock, DRAM trough, AI/HBM recovery and changing products. Missingness/composition can make an average synthetic rather than representative. Aggregation and completeness remain unapproved. | Report each sub-window and composition-constant sensitivity; no interpolation or predecessor substitution. |
| Rolling window tied to each release date | Avoids one permanently fixed calendar benchmark | The reference would drift, impair interpretation and could silently rewrite presentation. Window length and update rules are unapproved thresholds. | Preserve each reference revision and impact report if ever approved; compare fixed-window alternatives. |

Result: **HISTORICAL REFERENCE NONE SELECTED / PROPOSED_LOCKED**. The current evidence supports only a map of regimes and gaps, not a denominator.

## 4. Historical-context evidence matrix

These are hypotheses and counter-hypotheses for future reviewed event records. None is an approved causal claim. Supplier filings are first-party, financially interested evidence and require independent corroboration. Broad macro series cannot prove pass-through to an exact UK MPN.

| Context family | Evidence retained for investigation | Plausible mechanism, explicitly not a finding | Alternatives / counterevidence that must remain visible |
|---|---|---|---|
| AI / HBM demand | Micron FY2024 Form 10-K discusses HBM and data-centre/AI demand in the memory business; FY2023 and FY2024 filings permit comparison across the downturn/recovery. SEC URLs below. | HBM growth could compete for fabrication, packaging, capital or supplier attention with conventional DRAM and influence supply expectations. | HBM uses different products, packaging and customer contracts; node transitions can increase bit output; capacity can expand; consumer DDR5 demand may weaken; retailer prices can be buffered by inventory and contracts. A manufacturer statement is not independent proof of UK retail pass-through. |
| DRAM cycle | Micron FY2023 and FY2024 filings document materially different market conditions, inventories and production/capital responses. | Inventory correction, production cuts and later demand recovery could create lagged wholesale DDR5 movements. | Supplier-specific execution, accounting write-downs and product mix can differ from industry conditions. Retail MPN prices also reflect channel inventory, competition, promotions and lifecycle. Corroborate with other manufacturers and independent market evidence. |
| Sterling exchange rate | Bank of England exchange-rate database provides official daily exchange-rate observations; the retrieved public rates page is cited below. | Since DRAM/components are globally traded, GBP weakness against invoicing currencies could raise UK replacement cost after lags. | Importers hedge; contracts may use USD, EUR or another currency; old stock delays pass-through; margins/promotions can absorb movement. Direction and lag must be tested, never assumed. |
| UK trade / imports | ONS `UK trade` bulletin provides official import/export aggregates and revision notices. | Import conditions, customs changes or goods-trade disruption could affect availability or cost. | Aggregate trade values are dominated by unrelated goods and combine price/volume effects. Country and commodity codes may not isolate retail DIMMs. Trade statistics are revised and cannot establish seller-level causation. |
| Energy | UK government domestic and industrial energy-price statistical collections document the 2022–2023 energy-price shock. | Energy costs can affect semiconductor fabrication, logistics, warehousing and retailer overhead. | Fabrication is mostly outside the UK; supplier power contracts and subsidies differ; domestic UK energy indices are not producer electricity costs in DRAM manufacturing countries. Energy may explain broad inflation without explaining relative RAM movements. |
| Logistics | UK government global-supply-chain vulnerability evidence and UNCTAD reporting identify shipping chokepoints and Red Sea/Panama/Black Sea disruption as investigation contexts. | Longer routes, insurance and freight rates could raise landed costs or delay replenishment. | Memory has high value-to-weight and air-freight options; freight is a small share of retail value; retailers hold inventory; route exposure differs. A disruption date does not prove an exact offer moved because of it. |
| War / geopolitical risk | UK sanctions collection records measures following Russia’s full-scale invasion of Ukraine; government semiconductor strategy describes global concentration and geopolitical supply-chain risks. | War can affect energy, transport, currencies, sanctions, confidence or input supply, with indirect UK retail effects. | Effects can run in opposing directions; weak consumer demand can offset costs; announcement, legal effect and actual channel exposure differ. Never label a RAM movement “caused by war” from timing alone. |
| Trade policy / semiconductor controls | UK National Semiconductor Strategy provides policy context; company filings discuss trade restrictions and geographic risks. | Export controls, tariffs or industrial policy may redirect capacity, demand or inventories. | Many controls target advanced logic/equipment rather than consumer DRAM; exemptions, implementation lags and transshipment complicate impact. Policy may expand supply as well as restrict it. Exact legal scope and effective dates need specialist review. |
| PC-platform/product lifecycle | DDR5 launch and expanding platform support define a composition regime; retained catalogue records show exact MPN/lifecycle importance. | Adoption can broaden demand and lower per-bit costs while creating higher-speed/premium product tiers. | Falling technology cost, quality change and model replacement can coexist with rising average selling prices. No predecessor or successor may silently inherit identity, basket membership or history. |

### 4.1 Context URLs and retrieval log

| Evidence URL | Retrieval UTC / result | Use and limitation |
|---|---|---|
| https://www.sec.gov/Archives/edgar/data/723125/000072312523000054/mu-20230831.htm | 2026-08-09T17:52:52Z; HTTP 200 | Micron FY2023 Form 10-K; first-party supplier disclosure, not independent market proof. |
| https://www.sec.gov/Archives/edgar/data/723125/000072312524000027/mu-20240829.htm | 2026-08-09T17:52:52Z; HTTP 200 | Micron FY2024 Form 10-K; first-party supplier disclosure, not UK retail causation. |
| https://www.bankofengland.co.uk/boeapps/database/Rates.asp?TD=31&TM=Dec&TY=2024&into=GBP&rateview=D | 2026-08-09T17:52:50Z; HTTP 200 | Official exchange-rate database entry point. A future claim must bind exact series code, dates and downloaded observations; none is selected here. |
| https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/bulletins/uktrade/latest | 2026-08-09T17:52:50Z; HTTP 200 | Official aggregate UK trade bulletin; “latest” is mutable and requires edition capture for use. |
| https://www.gov.uk/government/statistical-data-sets/monthly-domestic-energy-price-stastics | 2026-08-09T17:52:51Z; HTTP 200 | Official energy-price indices; title URL contains GOV.UK’s historical `stastics` spelling. Domestic energy is an imperfect production-cost proxy. |
| https://www.gov.uk/government/collections/quarterly-energy-prices | 2026-08-09T17:54Z; discovered via normal GOV.UK search | Broader official energy context, including industrial series; exact table/vintage not captured in this packet. |
| https://www.gov.uk/government/collections/uk-sanctions-following-russias-invasion-of-ukraine | 2026-08-09T17:54Z; discovered via normal GOV.UK search | Official policy chronology/context, not evidence of RAM-price pass-through. |
| https://www.gov.uk/government/publications/national-semiconductor-strategy | 2026-08-09T17:54Z; discovered via normal GOV.UK search | Official UK policy and supply-chain context; no numeric causal use authorised. |
| https://www.gov.uk/government/publications/global-supply-chains-a-foresight-report-on-risk-and-resilience/annex-a-evidence-and-trends-for-supply-chain-vulnerability-and-resilience | 2026-08-09T17:54Z; discovered via normal GOV.UK search | General supply-chain vulnerability context; not DDR5-specific. |
| https://unctad.org/news/red-sea-black-sea-and-panama-canal-unctad-raises-alarm-global-trade-disruptions | 2026-08-09T17:52:51Z; HTTP 403 to this worker | Candidate logistics source only; not relied upon as captured evidence because normal retrieval was blocked. No bypass attempted. |
| https://www.jedec.org/news/pressreleases/jedec-publishes-new-ddr5-standard-advancing-next-generation-high-performance | 2026-08-09T17:52:52Z; HTTP 403 to this worker | Candidate launch/standard source only; not relied upon as captured evidence because normal retrieval was blocked. No bypass attempted. |

## 5. Decision inputs still missing

No candidate can be activated from this packet. A future parent/human decision would still need, at minimum:

1. An approved product question distinguishing general purchasing-power adjustment from sector-relative or production-cost adjustment.
2. Exact ONS release-edition captures and checksums, not mutable `latest` pages alone.
3. Verified series-level status, adjustment, unit and revision policy from the release in scope.
4. Observation-level status handling (including an explicit representation when ONS publishes no provisional/final flag).
5. A release-vintage construction and supersession policy that never mixes releases silently.
6. An approved nominal-month completeness/aggregation rule; there is currently none.
7. Complete, lawful, exact-MPN UK retail coverage sufficient to test historical windows without interpolation, backcasting or successor substitution.
8. Product/retailer/basket-composition sensitivity across every plausible reference regime.
9. Independent corroboration for supplier claims and explicit contrary evidence for every proposed event.
10. Separate attributable human approvals for deflator, release policy, reference period/label and any causal wording; source and publication approvals remain independent.

Until those gates pass, the required states remain `UNAVAILABLE_MONTHLY_METHOD_NOT_APPROVED`, `UNAVAILABLE_HISTORICAL_REFERENCE_NOT_APPROVED` and `UNAVAILABLE_DEFLATOR_NOT_APPROVED`, with `value = null` where applicable.

## 6. Limitations

- This is a candidate map, not a systematic literature review or legal/statistical opinion.
- No statistical bytes were added to observations or fixtures; no index/real values were calculated.
- Current ONS pages are mutable. Their release metadata was observed, but no release package was retained in this report.
- The ONS current time-series pages do not alone satisfy the methodology’s immutable release-vintage manifest.
- The CPI detailed-category pages did not establish whether standalone DDR5 DIMMs enter D7EP or L7GU, their weights, sample continuity or quality-adjustment treatment.
- The Bank of England page was checked as an exchange-rate database entry point, but no exact exchange-rate series or pass-through model was selected.
- Two candidate first-party/context pages returned HTTP 403; no access control was bypassed and their claims are not treated as captured evidence.
- Manufacturer filings are interested-party evidence. No TrendForce or other paywalled/proprietary claims were promoted into evidence.
- The repository’s retained historical UK retail evidence is sparse and cannot establish a category-level regime or reference period.
- Current date windows and release dates reflect retrieval on 2026-08-09 and need independent parent re-fetch before any consequential use.

## 7. Files inspected

Governing and task-specific files read before creating this report:

- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/HANDOVER-2026-08-09.md`
- `.planning/phases/01-source-methodology-gate/METHODOLOGY-v1.0-draft.md`
- `docs/AUTONOMY.md`
- `docs/BRIEF-SOURCES.md`

Repository searches also inspected relevant references in `docs/EDITORIAL-INTELLIGENCE-DESIGN.md`, `docs/reference/PRODUCT-PLAN.md`, `docs/reference/TECHNICAL-SPEC.md` and `research/INDEX-RESILIENCE-PROPOSAL.md`; none was edited.

## 8. Integrity and final lock statement

Canonical embedded report SHA-256: `32c95ff1c15fbcf2c5bd805e83191df04d2e6c70a992e6697cf836dbe9dc62ab`

Verification rule: hash the complete UTF-8 file after replacing the value between backticks on the preceding line with the literal token `<SHA256>`. This canonicalised hash avoids the impossible self-referential requirement of embedding a byte-for-byte whole-file hash inside the bytes being hashed. The whole-file SHA-256 is reported separately in focused validation output.

**FINAL STATE: NONE SELECTED. ALL DEFLATOR, RELEASE-VINTAGE, HISTORICAL-WINDOW, COMPLETENESS, CAUSAL, SOURCE-APPROVAL, PRODUCTION AND PUBLIC CHOICES REMAIN PROPOSED_LOCKED OR LOCKED.**
