# United States: lawful structured price-data options for a 32 GB DDR5 retail-price index

**Research date:** 5 August 2026
**Scope:** private commercial collection and calculation initially; possible later public/commercial display. No account creation, payment, scraping, contract acceptance or external mutation was performed.
**Important:** this is a source-and-contract assessment, not legal advice. A public page, API endpoint or `robots.txt` is not treated as permission.

## Status method

Rights dimensions are: **AC** automated collection; **RR** retention of raw/evidence observations; **DH** retention/calculation of historical derived indices/statistics; **PD** private internal display; **PC** public/commercial display; **RD** redistribution of raw/source data.

* **VP — verified permission:** an applicable first-party text expressly permits the use.
* **VR — verified restriction:** an applicable first-party text expressly prevents or materially conflicts with the use.
* **CR — contract required:** technically/commercially available, but the necessary licence is bespoke, account-gated or not publicly reviewable. This is not permission.
* **U — unknown:** the reviewed first-party text does not answer the question.

A derived index is not assumed to be outside restrictions on “aggregate”, “analyse”, “derivative works”, “Content” or a competitive product. Nor is a vendor’s claim that collection is lawful treated as a warranty from the underlying retailer.

## Executive conclusion

There is **no account-free, clearly licensed US multi-retailer feed** in the reviewed set that presently clears all intended uses. Amazon Creators API and Best Buy’s API are poor fits because their published terms directly conflict with aggregation/price analysis and long-term evidence retention. Walmart Marketplace and Ingram Micro APIs are operational seller/reseller tools, not independent consumer-retail panels. DataForSEO and Bright Data provide broad structured collection, but their public contracts do not establish retailer authorisation and leave important storage, derived-output and publication rights unresolved or internal-only. The most credible route is therefore a **bespoke licensed data agreement with Wayvia (formerly PriceSpider), Bright Data, or another enterprise price-intelligence vendor**, conditioned on explicit written rights and data semantics. Go/no-go remains **NO-GO** until those clauses are obtained and reviewed.

## Comparison matrix

| Stable source / route | Independence and US coverage | Access path and requirement | Data/identifier and price semantics | Operational stability | Rights: AC / RR / DH / PD / PC / RD |
|---|---|---|---|---|---|
| **Amazon Associates Creators API** (PA-API 5 replacement) | One marketplace; multiple sellers do not make it an independent multi-retailer panel. US Amazon locale. | Associates account, tag, API credentials and potentially separate feed approval. The published licence says credentials and “separate approval, as needed, for sub-services or data feeds” are required [A1]. | ASIN is retainable; no verified GTIN/MPN guarantee. Price/availability display needs timestamp/disclaimer when refreshed less than hourly [A1]. Tax and delivery are not established as a comparable landed price. | PA-API 5 is deprecated and replaced by Creators API [A2]; Amazon may change/deprecate feeds [A1]. | **VR / VR / VR / VR / VR / VR** for this index use. Aggregation/analysis requires express prior written approval; non-image content may only be cached for 24 hours; use must principally advertise Amazon and drive Amazon sales; redistribution is barred [A1]. Bespoke written approval could change the result, but none was obtained. |
| **Best Buy Developer Products API** | One US retailer; highly relevant electronics assortment but no source breadth. | Developer registration and key required [B1]. | Near-real-time current/historical product catalogue; fields include `salePrice`, UPC, online/in-store availability, shipping and fulfilment flags [B2]. No verified sales-tax or actual delivered-price field. | Published operational policy: 50,000 calls/day and 5 calls/second; service may be changed/terminated and content links expire [B1][B2]. | **VR / VR / VR / U / VR / VR.** Cache is limited to 72 hours; Content cannot be reproduced/distributed/used to create derivative works; use for analysing Best Buy pricing for a third party is expressly barred. Display must attribute Best Buy [B1]. Private display is **U**, not VP, because the licence is framed around customer applications/websites and product sales rather than internal indexing. |
| **eBay Buy Browse API** | One marketplace with many sellers; seller offers are correlated through one marketplace and may mix new/used/open-box stock. US marketplace is a plausible locale. | Proposed path: eBay Developers account, OAuth application and Browse API. | Potentially useful seller/condition/shipping fields; identifier and tax semantics were not verified in accessible first-party material during this review. | Current first-party Browse and API Licence pages returned HTTP 403 to this research environment on 5 August 2026; no cached/search-snippet text was used as evidence [E1][E2]. | **U / U / U / U / U / U.** No use is cleared. Directly obtain the then-current API Licence Agreement and Buy API additional terms before proceeding. |
| **Walmart Marketplace APIs** | Walmart US marketplace, but access is to the authorised seller’s operational context, not an independent observation panel. | Seller or approved Solution Provider onboarding; Client ID/secret and OAuth token [W1]. | APIs manage the connected business’s items, inventory, orders, pricing and promotions [W1]. That is not evidence of a market-wide consumer offer feed. No verified comparable checkout tax/delivery semantics. | Seller-scoped OAuth and rate limiting; dependence on app approval and seller authorisations [W1]. | **CR / U / U / U / U / U.** Automation is contract/account gated for operational seller uses. The public introduction does not grant price-index collection, retention, derivation, display or redistribution rights [W1]. Do not confuse this with a Walmart affiliate product feed; any Impact/affiliate feed must be separately licensed and reviewed. |
| **Ingram Micro Reseller Product Catalog API** | One distributor, not consumer retail; prices are likely account/channel-specific and therefore not an independent US retail observation. | Reseller account, OAuth 2.0 credentials, app registration and production approval; applicant must state purpose and projected volume [I1][I2]. | Real-time price, availability, stock by SKU and warehouse [I1]. Useful MPN/SKU enrichment may be contract/catalogue dependent; GTIN and tax/delivery-to-consumer semantics were not verified. | Production approval typically stated as about two business days; rate-limit documentation exists, but no numeric production commitment was verified [I1]. | **CR / U / U / U / U / U.** Published developer pages describe automation, not downstream data rights. Obtain the reseller agreement/API schedule. Even if licensed, this route is a B2B input-cost benchmark, not a consumer DDR5 retail index. |
| **DataForSEO Merchant API — Google Shopping Products** | Aggregates domains visible through Google Shopping, giving broad US seller discovery, but observations are dependent on one search intermediary and Google’s ranking/index. | Paid DataForSEO account; JSON POST tasks. Location can be set by name/code/coordinates [D1]. | Returns title, description, rank, price, reviews/rating and related domain [D1]. No verified GTIN/MPN, tax, delivery or stock guarantee in the reviewed endpoint. Search rank is not a sampling frame. | Up to 2,000 API calls/minute and 100 tasks per POST are documented [D1]. Provider may suspend service at its discretion [D2]. | **CR / U / U / U / U / U.** DataForSEO’s terms define API-developed data as “Content”, but do not expressly grant the intended retention/publication rights. They also say SERP data must not compete with or adversely affect source search engines and place responsibility for source terms/legal rights on the client [D2]. A paid account alone is therefore insufficient clearance. |
| **Bright Data eCommerce datasets / Scraper APIs / Retail Insights** | Very broad: 600+ eCommerce datasets and retailer-specific products including Amazon, Walmart, Best Buy and Newegg; nevertheless the data are collected from public sites, not shown to be retailer-authorised [L2][L3]. Retailer observations may still share Bright Data extraction failure modes. | Account/payment; dataset purchase, API or enterprise order. Public MSA applies and dataset-specific additional terms may apply [L1]. | Structured JSON/CSV/Parquet; fields vary. eCommerce page lists timestamp, price/currency and seller; Walmart includes SKU/GTIN. Newegg sample includes timestamp, GTIN and MPN; Best Buy scraper lists price and shipping policy [L2][L3]. Tax and actual delivered-price semantics remain unverified. | Scheduled collection/delivery and monthly dataset refresh are offered [L2][L3]. MSA permits suspension and says updates are supplied “if and when available” [L1]. | **VP / U / CR / VP / CR / VR** under the public MSA, narrowly. The MSA licenses service use for the client’s “internal business operations” and describes automated collector/dataset services [L1], supporting AC and PD. It does not clearly grant indefinite raw retention or public index publication. Data may not be distributed/published/sold to offer a similar or competitive product, and service resale needs prior written authorisation [L1]. A negotiated order must expressly clear DH and PC. |
| **Wayvia / PriceSpider enterprise Retail Intelligence and API Accelerate** | Multi-retailer commerce-intelligence provider; site claims real-time crawling across thousands of websites and nearly 2,000 brands [P1]. Source independence is better than one retailer but still one vendor’s matching/extraction layer. Exact US retailer panel must be contracted. | Sales consultation/demo and bespoke customer contract; API Accelerate page says to contact sales [P2]. No account was opened. | Product, placement, pricing and promotions are advertised [P1]. MPN/GTIN coverage, seller/condition normalisation, tax, shipping, stock and historical evidence fields are not publicly specified. | Enterprise managed service is potentially stable, but refresh SLA, correction process, retailer churn and archive guarantees are contract questions. | **CR / CR / CR / CR / CR / CR.** The public site Terms govern the website and affiliated services but do not publish a customer data licence adequate to verify any intended right [P3]. This is the strongest diligence route, not a currently cleared source. |

## Candidate details and direct vendor questions

### 1. Amazon Creators API

**Why it fails now.** Amazon’s licence is unusually explicit: “You will not, without our express prior written approval, access or use Creators API, PA API or Data Feeds for the purpose of aggregating, analyzing, extracting, or repurposing any Product Advertising Content” [A1]. It also says non-image Product Advertising Content may be stored “for caching purposes for up to 24 hours”, while ASINs alone may be retained indefinitely until licence termination [A1]. These terms conflict with raw evidence retention and index calculation. The principal-purpose requirement — “advertising and marketing an Amazon Site and driving sales” — conflicts with a neutral index [A1].

**Direct questions:** Will Amazon give express written approval for a private commercial DDR5 index? May raw price/availability observations be retained beyond 24 hours solely as audit evidence? May non-reconstructable daily aggregates/indices be stored indefinitely and displayed without per-offer links? Does approval survive termination for historical indices?

### 2. Best Buy Developer API

**Why it fails now.** The API is technically excellent for DDR5, but the Terms permit only temporary caching “not to exceed seventy-two (72) hours” and prohibit reproducing, distributing or creating derivative works from Content [B1]. They also state: “You will not use the Services or the Content on behalf of or for the benefit of any third party ... for the purposes of analyzing ... information regarding Best Buy pricing” [B1]. A public product display would require clear attribution: “You must clearly and conspicuously attribute the source of all Content as received from Best Buy” [B1].

**Direct questions:** Is an internally calculated, non-reconstructable daily price relative a prohibited derivative work? Can Best Buy issue a separate written data licence for evidence retention and aggregate publication? Is an index publisher a “third party” beneficiary for the pricing-analysis prohibition?

### 3. eBay Buy Browse API

**Unresolved.** No rights conclusion was inferred from inaccessible documents. A 403 is not evidence of either permission or restriction.

**Direct questions:** Which current agreement governs Buy Browse production access? Are raw item/offer observations retainable after listing expiry? Are historical aggregates and commercial indices permitted? What attribution/deep-linking is mandatory? May eBay-derived statistics be combined with competing marketplaces? Are price, shipping, tax, condition and seller type separately returned for a specified US postal code? Are GTIN and MPN seller assertions or catalogue-validated?

### 4. Walmart Marketplace / affiliate route

**Why Marketplace is not the feed sought.** Walmart says the APIs provide access “for sellers and approved solution providers” and let them manage “items, inventory, orders, pricing, promotions, reporting, and other operational workflows” [W1]. That is seller operations, not permission to observe Walmart’s full retail shelf.

**Direct questions:** Does Walmart/Impact offer a US affiliate product feed/API containing first-party and marketplace offers? Obtain the actual signed affiliate/API terms. Ask separately about automated refresh, raw retention, historical aggregates, public/commercial indices, attribution/deep links, redistribution, GTIN/MPN, seller/condition, tax, shipping, stock and postal-code localisation.

### 5. Ingram Micro Reseller API

**Use only as a secondary benchmark.** Ingram describes “real-time price and availability information, including available stock for product SKUs and warehouse locations” and a “virtual warehouse” use case [I1]. It does not establish consumer retail prices. Account-specific distributor prices should not enter the primary retail basket without a separate index methodology.

**Direct questions:** May API price observations and daily aggregates be stored indefinitely? May a commercial index be calculated or published? Are prices customer-specific, before tax, before freight, net of rebates or subject to quantity tiers? Which fields carry manufacturer part number, UPC/GTIN and pack quantity? What SLA and correction/history facilities apply?

### 6. DataForSEO

**Rights gap.** Functional breadth is attractive, but the endpoint returns Google Shopping SERP observations rather than retailer-authorised feeds. The Terms say SERP data “shall not be used to compete with or adversely affect the business interests of the search engine providers” and require the client to bear claims involving source terms or legal rights [D2]. That is a warning, not a grant.

**Direct questions:** Provide a written licence covering indefinite raw/evidence retention, permanent derived histories, internal and public commercial display, attribution and redistribution boundaries. Identify the contractual/legal basis for collecting and sublicensing each retailer’s data. Define price, tax, shipping, stock, sponsored-result and duplicate-offer semantics. Supply GTIN/MPN provenance and corrections/SLA.

### 7. Bright Data

**Most practical broad prototype, still not publication-cleared.** Bright Data expressly offers collection/delivery and internal business use, but its MSA says the service licence is “solely for the purpose of Client’s internal business operations” [L1]. It also prohibits distributing/publishing/selling Data “in order to offer a similar or competitive product” [L1]. The contract puts compliance with law, third-party rights and the declared use case on the client [L1]. Public claims of being “fully compliant” [L2] do not replace source permissions or a contractual warranty.

**Direct questions:** Is Silicon Forecast’s private index an allowed internal use? May raw observations and screenshots/response payloads be retained permanently as audit evidence? Does a public DDR5 index compete with Bright Data or any source? Obtain explicit rights to derive, retain and commercially publish non-reconstructable indices; survival after termination; source attribution rules; indemnity/warranty for collection rights; retailer list and churn notice; postal-code/tax/shipping/stock definitions; identifier provenance; refresh SLA and correction restatements.

### 8. Wayvia / PriceSpider

**Best procurement target.** Its public materials are aimed at brand retail intelligence rather than generic affiliate display, making a purpose-built licence plausible. No public licence was found that actually grants Silicon Forecast’s intended rights, so every dimension remains CR.

**Direct questions:** Request a US 32 GB DDR5 pilot data dictionary and retailer coverage list (Amazon first-party/marketplace, Best Buy, Newegg first-party/marketplace, Walmart, B&H, Micro Center and direct manufacturers). Contract for: automated API/SFTP delivery; indefinite raw evidence retention; permanent derived indices; private and public/commercial display; no raw redistribution except auditors; source/retailer attribution; MPN and GTIN with provenance/confidence; seller/condition/kit capacity; timestamp/time zone; advertised versus cart price; coupons/member prices; sales tax; shipping; stock; postal-code assumptions; correction/restatement feed; SLA; source-change notice; audit rights; and survival of historical derived data after termination.

## Tax, delivery, stock and product-match rules required for any selected source

No reviewed route provides a verified, uniform **landed consumer price**. Before production, the contract/data dictionary should separate:

1. base advertised price; automatic discount; coupon/member/after-rebate price;
2. sales tax (normally destination-dependent) and selected US postal-code assumption;
3. mandatory shipping/delivery fee, free-shipping threshold and pickup-only offers;
4. in-stock state, quantity, back-order/pre-order and observation timestamp/time zone;
5. new/used/refurbished/open-box condition and first-party versus marketplace seller;
6. one 32 GB DIMM versus 2 × 16 GB kit, speed/timings, ECC/registered/unbuffered, desktop/SODIMM;
7. canonical manufacturer part number and GTIN/UPC, with source and validation confidence.

Absent those fields, use advertised pre-tax price plus separately modelled delivery only if the methodology prominently says so; do not silently mix landed and unlanded prices.

## Regional assessment (0–5)

| Dimension | Weight | Score | Weighted contribution | Basis |
|---|---:|---:|---:|---|
| Rights | 30% | 2.0 | 0.600 | Several structured routes exist, but none is currently cleared across collection, evidence retention, derivation and possible publication; two retailer APIs expressly conflict. |
| Source breadth | 20% | 4.0 | 0.800 | Enterprise aggregators can cover many major US retailers/marketplaces. |
| Identifiers | 15% | 3.5 | 0.525 | UPC/GTIN/MPN appear in several routes, but coverage/provenance is inconsistent and seller-supplied fields need validation. |
| Tax/delivery comparability | 15% | 2.0 | 0.300 | Uniform destination tax, shipping and stock semantics were not verified. |
| Stability | 10% | 3.0 | 0.300 | Enterprise SLAs are possible, but retailer/API deprecation, approval, throttling, page/schema and source-panel churn remain. |
| DDR5 relevance | 10% | 4.5 | 0.450 | US electronics retailers and marketplaces have strong DDR5 assortment; product-normalisation work is manageable with MPN/GTIN. |
| **Total** | **100%** |  | **2.975 / 5 (reported 3.0 / 5)** | Weighted arithmetic. |

**Score is not go/no-go.** A 3.0/5 reflects commercial data availability, not legal clearance. **Decision: NO-GO for production collection or public/commercial display now.** A tightly limited internal pilot becomes **conditional GO** only after a signed data schedule expressly permits AC, RR, DH and PD, with defined identifiers and price semantics. Public/commercial display remains a separate **NO-GO** until PC, attribution and survival clauses are explicit.

## Evidence register — authoritative first-party sources

All sources retrieved 5 August 2026 unless noted. Exact quotations are short excerpts; ellipses omit non-material surrounding words.

**[A1] Amazon, “Associates Program Policies” (includes Associates Program IP License and Usage Requirements), Amazon.com Associates Central.**
https://affiliate-program.amazon.com/help/operating/policies
Quotes: “You will not ... use Creators API, PA API, Data Feeds, or Product Advertising Content ... [unless the] principal purpose [is] advertising and marketing an Amazon Site and driving sales”; “You will not, without our express prior written approval ... aggregating, analyzing, extracting, or repurposing any Product Advertising Content”; “You may store other Product Advertising Content ... for caching purposes for up to 24 hours”; “you may store individual Amazon Standard Identification Numbers (ASINs) for an indefinite period until the termination of this License”; “You will not sell, resell, redistribute, sublicense, or transfer any Program Content”; and where price/availability is refreshed less than hourly, “include a date/time stamp” plus Amazon’s price/availability disclaimer.

**[A2] Amazon, “PA-API 5 Deprecation Notice”, Amazon.com Associates Central — Creators API Documentation.**
https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation
Quote: “The Amazon Product Advertising API 5.0 (PA-API 5) has been deprecated and is being replaced by the Creators API.”

**[B1] Best Buy, “Best Buy API Terms of Service” (last updated 23 February 2021), Best Buy Developer.**
https://developer.bestbuy.com/legal
Quotes: “you must create a developer account”; licence is “solely in software application(s) you develop ... or on websites ... in connection with offers to sell or sales of our products and services”; “store or cache any Content except on a temporary basis not to exceed seventy-two (72) hours”; “you will not reproduce, modify, sell, distribute, download, transmit, or create derivative works”; “You will not use the Services or the Content ... for the purposes of analyzing ... information regarding Best Buy pricing”; and “You must clearly and conspicuously attribute the source of all Content as received from Best Buy.”

**[B2] Best Buy, “Best Buy Developer API Documentation”, Best Buy Developer API.**
https://bestbuyapis.github.io/api-documentation/
Quotes: Products API provides “pricing, availability, specifications, descriptions, and images for more than one million current and historical products”; “Most product information is updated near real-time, including product pricing”; attribute list includes “upc Universal Product Code (UPC)”; operational policy lists “50,000” calls/day and “5” calls/second for Products and related APIs.

**[E1] eBay, “Browse API Overview”, eBay Developers.**
https://developer.ebay.com/api-docs/buy/browse/overview.html
Retrieval result: HTTP 403 in this environment; no quotation relied upon.

**[E2] eBay, “API License Agreement”, eBay Developers.**
https://developer.ebay.com/join/api-license-agreement
Retrieval result: HTTP 403 in this environment; no quotation relied upon.

**[W1] Walmart, “Introduction to Walmart Marketplace APIs”, Walmart Developer Portal.**
https://developer.walmart.com/us-marketplace/docs/introduction-to-marketplace-apis
Quotes: APIs provide programmatic access “for sellers and approved solution providers”; manage “items, inventory, orders, pricing, promotions, reporting, and other operational workflows”; “Generate a Client ID and Client Secret”; “Walmart Marketplace APIs use OAuth 2.0 for authentication.”

**[I1] Ingram Micro, “API Overview”, Ingram Micro Reseller Portal.**
https://developer.ingrammicro.com/reseller/getting-started/api-overview
Quotes: Product Catalog endpoints provide “real-time price and availability information, including available stock for product SKUs and warehouse locations”; use case includes a “‘virtual warehouse’ experience for end-user websites”; production registration must specify APIs, purpose and projected volume; “approval process typically takes about two (2) business days.”

**[I2] Ingram Micro, “API Authentication”, Ingram Micro Reseller Portal.**
https://developer.ingrammicro.com/reseller/getting-started/authentication
Quotes: “Ingram Micro uses the OAuth 2.0 protocol”; “Ensure that you have created an account, and that you have your API Keys”.

**[D1] DataForSEO, “merchant/google/products/task_post — DataForSEO API v.3”, DataForSEO.**
https://docs.dataforseo.com/v3/merchant/google/products/task_post/
Quotes: results include “product title, description in Google Shopping SERP, product rank, price, reviews and rating as well as the related domain”; results are “specific to the selected location ... and language”; “up to 2000 API calls per minute, with each POST call containing no more than 100 tasks.”

**[D2] DataForSEO, “Terms of Service” (updated 12 June 2026), DataForSEO OU.**
https://dataforseo.com/terms-of-service
Quotes: API-developed data are included in defined “Content”; SERP data “shall not be used to compete with or adversely affect the business interests of the search engine providers”; client indemnity includes use that “violates the terms of service or legal rights of the search engine providers”; “We reserve the right to refuse, cancel or suspend service, at our sole discretion.”

**[L1] Bright Data, “Bright Data Master Service Agreement” (last updated 16 June 2026), Bright Data Ltd.**
https://brightdata.com/license
Quotes: service licence is “solely for the purpose of Client’s internal business operations”; Web Scraper IDE “collects and delivers publicly available data”; Client must not “distribute, transmit, reproduce, publish, license, transfer, or sell any Data in order to offer a similar or competitive product”; “not engage in any reselling of the Service ... without Bright Data’s prior written authorization”; “The Datasets may contain additional terms and conditions”; subscription updates are provided “if and when available.”

**[L2] Bright Data, “Buy eCommerce Datasets — 9B Records Available”, Bright Data.**
https://brightdata.com/products/datasets/ecommerce
Quotes: “600+” datasets; “products, pricing, availability ... and seller details”; formats “JSON/CSV/Parquet”; sample fields include “timestamp ... price, currency”; Walmart dataset includes “Sku ... Gtin”; “Create custom schedules to automate data delivery”; page claims datasets are collected from “publicly available online sources”. The last claim is vendor positioning, not retailer permission.

**[L3] Bright Data, “Newegg Scraper — 5K records/Month for Free” and “Best Buy Scraper — 5K records/Month for Free”, Bright Data.**
https://brightdata.com/products/web-scraper/newegg
https://brightdata.com/products/web-scraper/best-buy
Quotes: Newegg sample contains “timestamp”, “gtin” and “mpn”; service offers “Scrape on demand via API” and “scheduled collection”; Best Buy page offers product “price ... seller name, offers, shipping policy”.

**[P1] Wayvia (formerly PriceSpider), “Brand Monitoring Tools — Digital Shelf Analytics”, Wayvia/PriceSpider.**
https://www.pricespider.com/brandmonitor/
Quotes: “product, placement, pricing, and promotions”; “crawls thousands of websites in Real-Time”; “Nearly 2,000 brands”.

**[P2] Wayvia/PriceSpider, “Learn more about the API Accelerate Suite”, Wayvia/PriceSpider.**
https://www.pricespider.com/api-suite-request/
Quote: “Talk to a member of our sales team for more info.”

**[P3] Wayvia, “Terms & Conditions” (updated 15 July 2025), Wayvia.**
https://www.pricespider.com/terms-conditions/
Quote: “These Terms and Conditions govern your use of this website, the Where to Buy services and Wayvia’s affiliated services”. No express customer permission for index collection, retention, derivation, display or redistribution was located in the publicly retrieved text.

## Procurement gate

Require a signed schedule that answers every direct question above and marks all six rights dimensions expressly. In particular, reject wording that merely permits “access/use of the service” without separately addressing raw evidence retention, permanent derived history, publication, attribution, redistribution, termination survival and underlying-source rights. Obtain counsel review before changing any CR/U dimension to VP.
