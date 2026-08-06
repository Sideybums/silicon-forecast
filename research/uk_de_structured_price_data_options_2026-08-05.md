# Lawful structured price-data options for a 32GB DDR5 retail-price index: United Kingdom and Germany

**Phase:** Silicon Forecast Phase 1
**Retrieval date for every web source below:** 5 August 2026
**Intended use assessed:** automated collection; retention of evidence/raw observations; calculation and retention of historical derived indices; initially private commercial display; possible later public/commercial display.

> **Policy update — 2026-08-06:** This report applied a conservative rule that silence required an affirmative licence grant for factual retention and derivation. David subsequently approved a different operating interpretation: publicly observable factual offer data may be retained and used for historical/index derivation unless an explicit applicable restriction says otherwise. Explicit contractual limits — such as Amazon's or solute/billiger.de's stated restrictions — still govern. VAT, delivery and identifier questions are now treated as methodology/data-quality verification rather than permission requests. Authored descriptions, photography and advertising creative remain excluded from permanent evidence storage by default.

**Method/constraint:** first-party pages and documents were fetched without creating an account, paying, accepting a contract, scraping retail pages or mutating an external service. Public availability was not treated as overriding explicit applicable restrictions. This is a sourcing/source-use screen, not legal advice.

## Status vocabulary

| Code | Meaning |
|---|---|
| **VP** | verified permission in the cited first-party text, within the stated conditions |
| **VR** | verified restriction in the cited first-party text |
| **CR** | account, programme approval, paid plan or negotiated contract is required; the final right depends on that contract |
| **U** | unknown/unresolved: no permission or restriction was verified |

Rights dimensions are reported separately as **Auto / Store / Derive / Private-display / Public-display / Commercial / Redistribute**. “Private-display” means internal use by the commercial operator, not consumer-facing publication.

## Executive conclusion

* **United Kingdom — score 3.00/5; current decision: NO-GO.** The data market is broad (PriceRunner, PriceAPI, Awin, Amazon and eBay), but none of the no-sign-up materials grants the complete chain of rights needed for raw-evidence retention plus a historical derived index. The best diligence path is a negotiated **PriceRunner API** licence or **PriceAPI** amendment explicitly covering derived indices and retention; Awin is useful for retailer diversification only if each DDR5 advertiser approves the use and historical analytics in writing.
* **Germany — score 3.27/5; current decision: NO-GO.** billiger.de/solute is exceptionally broad and structured, but its published portal-partner contract expressly caps caching at 24 hours and requires offers to be reproduced unchanged. PriceAPI provides strong access routes to idealo, Geizhals and billiger.de, but its published terms only clearly support own-purpose saved content and prohibit publication/dissemination. Negotiate a data licence before collection.
* **No-go is a rights conclusion, not a quality conclusion.** A region may score above 3 because breadth and identifiers are good while still failing the indispensable retention/derivation licence gate.

## Authoritative evidence register

Short quotations below are the evidence for the rights statuses in the candidate matrices.

### E1 — Amazon Associates / Product Advertising API (UK policy also covers affiliate-site content)

* **URL:** https://affiliate-program.amazon.co.uk/help/operating/policies
* **Document/publisher:** *Associates Program Policies* (updated 14 April 2026), Amazon.co.uk Associates Central.
* **Access and permitted purpose:** “we hereby grant you a limited, revocable, non-transferable, non-sublicensable, non-exclusive, royalty-free license to: (a) copy and display Program Content solely on your Site”; and “use Program Content solely to send end users and sales to an Amazon Site”.
* **No extraction/third-party benefit:** “This license does not include any downloading, copying or other use of Program Content for the benefit of any third party, or any use of data mining, robots, or similar data gathering and extraction tools.”
* **Storage:** “You may store other Product Advertising Content that does not consist of images for caching purposes for up to 24 hours”; ASINs may be stored “for an indefinite period until the termination of this License”.
* **Redistribution:** “You will not sell, resell, redistribute, sublicense, or transfer any Program Content or any application that uses, incorporates, or displays any Program Content”.
* **Display:** a timestamp is required if refreshed less often than hourly and the specified disclaimer begins: “Product prices and availability are accurate as of the date/time indicated and are subject to change.” Text content also requires: “CERTAIN CONTENT THAT APPEARS … COMES FROM AMAZON. THIS CONTENT IS PROVIDED ‘AS IS’ AND IS SUBJECT TO CHANGE OR REMOVAL AT ANY TIME.”
* **Comparison presentation:** “if you choose to display prices … in any ‘comparison’ format … you must display both the lowest ‘new’ price and, if we provide it to you, the lowest ‘used’ price”.
* **Volatility:** Amazon says it “may change, deprecate, or republish Creators API, PA API or Data Feeds”.

**Interpretation:** PA API is a lawful affiliate-display feed, but the 24-hour content cache and traffic-to-Amazon purpose are incompatible with a retained raw price history unless Amazon gives an additional written licence. A historical statistic calculated from prices is not expressly addressed; do not infer permission.

### E2 — Awin product feeds and publisher contract (UK and Germany)

* **URLs:**
  * https://help.awin.com/developers/docs/product-feed-publisher.md
  * https://www.awin.com/docs.awin.com/Legal/Publisher+Terms/2025/EN-%28UK%29_Awin-Ltd-Publisher-terms_August-2025.pdf
  * https://www.awin.com/docs.awin.com/Legal/Publisher+Terms/2025/EN-%28UK%29_Awin+AG-Publisher-terms_August-2025.pdf
  * https://www.awin.com/gb/publisher-terms (links the current UK and German contracting documents)
* **Documents/publisher:** *Product Feed Publisher Guide Overview* (Awin Ltd, updated 2 April 2026); *Awin Ltd Publisher Standard Terms* and *Awin AG Publisher Standard Terms* (Awin, August 2025).
* **Structured access/automation:** “A data feed is a download which lists all the products that an Advertiser offers”; access includes “Product Feed List Download”; the guide supplies a cron workflow using last-update times and warns that requests at the start of a minute “may drop or queue”.
* **Intended display use:** “Price comparison Publishers are the main users”; feeds permit publishers to “search and filter and display them in a variety of ways”.
* **Programme approval:** clause 4.1: “Advertisers may approve or refuse such requests, and remove Publishers from Advertiser Programmes, at any time”; “may only market … with the Advertiser’s continued approval.”
* **Licence and purpose:** clause 10.1 grants, during programme participation, a “revocable, non-exclusive, non-transferable, royalty-free, worldwide sublicence to publish Advertiser Materials, without modification” only as necessary to market the advertiser under the agreement/programme terms. Clause 10.7: data may be used “only for the purpose of this Agreement. Uses for any other purpose, or disclosure … are prohibited.”
* **Termination:** clause 15.2.1: “all licences will terminate” and the publisher must “remove any Advertiser Materials”.
* **Sub-licensing:** clauses 10.2–10.3 require Awin’s prior written consent for subnetwork/subpublisher use.
* **Change risk:** clause 17.1: “Awin may change the terms … on 14 days’ notice”; clause 4.2 lets advertisers change programme terms on notice.

**E2 data-quality supplement**

* **URL:** https://cdn.document360.io/ec9ead62-8ecc-46ef-aac7-9b0a9081b40b/Images/Documentation/PM-FeedColumnDescriptions%281%29.pdf
* **Document/publisher:** *Product Feed Column Descriptions*, Awin.
* Required online `price`/publisher `search_price` is “Always used”; `currency`, `brand_name`, `model_number`, `mpn`, `delivery_cost`, `delivery_time` and `in_stock` are “Often used”. EAN is “Often used”, but Awin says: “We do not validate the EAN.” `in_stock` is advertiser-supplied and permissively coerced; blank assumes no stock and text other than 0/1 assumes stock.

**Interpretation:** automation and affiliate price-comparison display are verified only after Awin and each advertiser programme accept the publisher. The standard contract does not expressly grant historical raw retention or creation/retention of a market index. Those rights require advertiser/Awin written confirmation. Feed data is merchant-supplied and not an independent observation of checkout price.

### E3 — PriceRunner commercial API (strongest UK licensed-provider lead; possible cross-European route)

* **URLs:**
  * https://www.pricerunner.com/register/api
  * https://www.pricerunner.com/info/terms
* **Documents/publisher:** *PriceRunner API – world class data* and *PriceRunner Terms and Conditions* (PriceRunner/Klarna; site terms last updated 25 January 2023).
* **Breadth/history:** “in the UK alone we manage offers from 6 400 shops on 3,7 million compared products”; API capabilities include “Gain access to several years of price history” and “Price data updated in real-time”.
* **Analytics:** API uses listed include “automatically match prices, create competitor analyses” and “market analysis”.
* **Access:** “Contact us … find out more about PriceRunner APIs” and “Customized solutions”. No public API licence or tariff was found; account/contract is therefore required.
* **Source independence:** site terms say specifications come from “suppliers, manufacturers, merchants, publications, publicists” or public-domain sources and PriceRunner “cannot guarantee the reliability or the accuracy”. PriceRunner calls itself “entirely independent”, but became “a part of Klarna 2022”.
* **Country reach:** the API page footer lists both “The UK” and “Germany” among comparison countries. It does **not** prove that the advertised API package, fields or rights are identical in Germany; confirm contractually.
* **Public-site restriction is not an API licence:** the consumer site terms permit only private/non-commercial use and state: “The framing, mirroring, scraping or data mining of the Site … will not be permitted.” This rules out treating the website as a fallback and makes the commercial API contract indispensable.

**Interpretation:** broadest UK candidate and the only first-party lead explicitly advertising years of history and market analysis. All downstream rights remain **CR**, because the public page is sales material, not the licence. Ask for a data dictionary and written licence for raw evidence, derived indices, private/public display and redistribution.

### E4 — billiger.de / solute Portal Partner API and exports (Germany)

* **URLs:**
  * https://www.solutions.billiger.de/en/partner-program/
  * https://www.solutions.billiger.de/en/tc/general-contract-terms-and-conditions-for-cooperation-partners.php
* **Documents/publisher:** *Our partner program* and *General Contract Terms and Conditions of solute GmbH for Cooperation Partners* (valid 1 November 2020), solute GmbH/billiger.de.
* **Breadth/access:** “over 100 million product data from more than 2,000 stores – standardized and prepared”; prospective publishers must contact solute, and clause 1.2 makes the signed cooperation agreement plus these terms the service basis.
* **Automation:** clause 5.1 grants a term-limited, revocable right “to use the API/exports and to access the product database”.
* **Storage restriction:** clause 3.5: data “may be used solely for caching purposes, and only retained or stored for a maximum period of 24 hours. These data must then be deleted”.
* **Display:** clause 5.1 permits offers obtained by API/export to be displayed on the partner’s agreed own websites. Clause 3.8 requires offers “completely unchanged”, including offer name, store name/logo, offer price, base price and clickout URL; tracking cannot be removed.
* **Redistribution:** clause 3.1: data may be passed to third parties only with “prior written consent”; clause 5.2 prohibits storage/use beyond the contractual purpose and third-party use.
* **Freshness/stability:** clause 3.3 requires immediate reflection of availability/price changes. Clause 4.2 does not guarantee uninterrupted, timely or error-free API/export/report availability. Clause 2.3 reserves API/export modification/deletion/new versions.
* **Derived reporting:** clause 6.3 provides programme performance reports and says the partner can perform “its own statistical evaluations”, but this concerns click/conversion performance, not permission to retain historical offer-price statistics.

**Interpretation:** excellent German breadth and lawful live comparison display, but the published 24-hour deletion obligation is an explicit no-go for raw historical evidence. A bespoke written amendment must supersede clauses 3.5, 3.8 and 5.2 for an index.

### E5 — PriceAPI / metoda (cross-European licensed-access vendor)

* **URLs:**
  * https://www.priceapi.com/legal/terms
  * https://readme.priceapi.com/reference/idealo-1-1
  * https://readme.priceapi.com/reference/pricerunner-1
* **Documents/publisher:** *Terms and Conditions of metoda GmbH for Price API* (version 27 July 2015), metoda GmbH; *Idealo* and *Pricerunner* API references, PriceAPI.
* **Access/automation:** registration concludes the contract; “PriceAPI.com and metoda are only available for business purposes”; services are fee-based. Jobs return CSV, JSON or Excel. The idealo source is “available on request”.
* **Country/source reach:** idealo data supports Germany and the UK and includes “offers, price histories, products, search results, shops, top lists, and variants”; PriceRunner supports the UK and includes “offers, products, search results, and shops”. The API source index also lists Amazon, eBay, billiger, Geizhals and Google Shopping.
* **Identifiers/freshness:** idealo `product_and_offers` accepts `gtin`, and offer data has a default `max_age` of 1,200 minutes (20 hours); PriceRunner also supports GTIN. This is not a guarantee that each returned DDR5 offer contains GTIN/MPN.
* **Retention/private use:** terms, “Rights of Use” clause (2), grant a right “unlimited by time and non-exclusive, to use the contents for his own purposes that the user himself has saved on and/or printed out”.
* **Display/redistribution restriction:** clause (1) otherwise forbids “editing, modifying, translating, exhibiting or presenting, publishing, showing, reproducing or disseminating” provider content, and limits retrieval/display to own purposes during the contract. This makes public display/redistribution restricted absent a bespoke amendment.
* **Derived use:** the contract does not expressly mention derived data, indices, anonymised aggregates or whether model/statistic outputs cease to be provider content. Treat as unresolved rather than relying on “own purposes”.
* **Data age/quality:** terms say live results “may be up to 15 minutes old” and daily results “up to 24 hours old”; liability for flawed price recommendations is excluded and users must conduct a “plausibility check”.
* **Source-independence/provenance caveat:** PriceAPI is an access vendor, not the retailer or comparison source. Its first-party docs expose data from third-party sites; the public terms do not warrant that downstream publication rights from idealo/PriceRunner/marketplaces are included. Obtain a provenance and non-infringement warranty/indemnity before relying on it.

**Interpretation:** potentially suitable for a **private** commercial analytic history, but only after direct confirmation that API results fall within the unlimited saved-content right and that derived indices can be retained. Public/commercial publication requires a contract amendment.

### E6 — eBay Browse API / marketplace data (UK and Germany)

* **URLs:**
  * https://developer.ebay.com/develop/api/buy/browse_api
  * https://developer.ebay.com/api-docs/buy/static/api-browse.html
  * https://developer.ebay.com/join/terms
* **Documents/publisher:** *Browse API* / *Browse API overview* and developer programme terms, eBay Developers Program.
* **Access path:** OAuth-backed Buy Browse API, with marketplace context for eBay UK and eBay Germany; item summaries expose price, seller, condition and shipping-related data, and item aspects can contain identifiers.
* **Evidence limitation:** eBay’s first-party developer pages returned HTTP 403 to this unauthenticated research environment on 5 August 2026. No developer licence text was accepted or treated as evidence. Therefore every downstream rights dimension is **CR/U**, not inferred from API availability.
* **Independence/data-quality caveat:** eBay is one marketplace, not an independent retailer panel. Listings may be used, refurbished, auctions, bundles, imports or marketplace sellers; GTIN/MPN and shipping/stock semantics are seller-supplied and must be filtered/validated. Marketplace VAT and delivery depend on seller, buyer location and item.

**Interpretation:** operationally relevant as a secondary marketplace signal, but not eligible for Phase 1 until eBay provides accessible terms and confirms retained raw history, derived-index use and commercial/private/public display. Do not scrape eBay as a substitute.

## Candidate matrix — United Kingdom

### UK-1 PriceRunner commercial API

* **Stable source/access:** PriceRunner API; direct negotiated modern API (E3).
* **Independence:** multi-shop comparison panel but merchant/public-domain inputs; Klarna ownership (E3).
* **Coverage/account:** UK explicitly: 6,400 shops and 3.7m matched products; contact/contract required (E3).
* **Automation/storage/history/derived:** automated real-time API, several years’ history and market/competitor analysis are advertised; exact retention and derived-output ownership must be contracted (E3).
* **Display/attribution/commercial/redistribution:** no public API licence; all require contract. Consumer-site use is non-commercial only and scraping is prohibited (E3).
* **Identifiers/data quality:** automatic matching/“quality ensured assortment” advertised, but no public GTIN/MPN field guarantee; source accuracy disclaimed (E3).
* **VAT/delivery/stock:** unresolved. Ask whether offer price is VAT-inclusive consumer price, delivery is destination-specific and separately fielded, and stock/lead time is normalised.
* **Rate/stability:** real-time is advertised, but no public SLA/rate limits/version policy.
* **Rights:** **Auto CR / Store CR / Derive CR / Private-display CR / Public-display CR / Commercial CR / Redistribute CR**.
* **Phase status:** **preferred diligence lead; no collection before licence**.

### UK-2 Awin product feeds with UK DDR5 retailers

* **Stable source/access:** Awin downloadable advertiser product feeds and feed-list endpoint (E2).
* **Independence:** network aggregation, but every row is advertiser-supplied and programme-dependent; not independent checkout verification.
* **Coverage/account:** UK network; the current unauthenticated materials do not prove which DDR5 retailers expose feeds. Awin account plus each advertiser’s continued approval required (E2).
* **Automation/storage/history/derived:** cron download is expressly documented. Historical retention and an index are not expressly licensed; removal is required at termination (E2).
* **Display/attribution/commercial/redistribution:** price-comparison affiliate display on approved promotional spaces is within the documented purpose, without modifying advertiser materials; sub-licensing/disclosure is restricted (E2).
* **Identifiers/data quality:** price always present; currency, MPN/model, EAN, delivery and stock often present, but EAN is not validated and stock coercion is weak (E2 supplement).
* **VAT/delivery/stock:** delivery cost/time may be present but VAT inclusion is not defined in the public column guide. Verify per advertiser/feed and test checkout.
* **Rate/stability:** use last-update times; start-of-minute requests may queue/drop; advertisers may remove access/change terms (E2).
* **Rights:** **Auto VP (after CR) / Store U-CR / Derive U-CR / Private-display U-CR / Public-display VP (after CR, affiliate purpose) / Commercial VP (after CR, affiliate purpose) / Redistribute VR**.
* **Phase status:** **supplementary panel only after advertiser-by-advertiser licence answers**.

### UK-3 PriceAPI (PriceRunner/idealo/Amazon/eBay routes)

* **Stable source/access:** paid PriceAPI jobs, CSV/JSON/Excel; PriceRunner UK and idealo UK are documented (E5).
* **Independence:** vendor-mediated access to third-party comparison/marketplace sources; overlap and common upstream merchants create correlated observations.
* **Coverage/account:** UK PriceRunner and idealo; business registration/payment, with idealo enabled on request (E5).
* **Automation/storage/history/derived:** automation verified; saved content has an own-purpose unlimited-time right, but derived-index rights are not explicit (E5).
* **Display/attribution/commercial/redistribution:** internal business use is the plausible licensed use; publication/presentation/dissemination is expressly restricted unless amended (E5).
* **Identifiers/data quality:** GTIN query supported; no guaranteed MPN/GTIN population. Data may be 15 minutes/24 hours old and requires plausibility checks (E5).
* **VAT/delivery/stock:** source-dependent and not normalised in cited docs; require field-by-field specification and destination/VAT rules.
* **Rate/stability:** paid credits, asynchronous jobs and source-specific max-age; idealo credit cost changed on 1 August 2026 and source requires support enablement (E5).
* **Rights:** **Auto VP (after CR) / Store VP for own purpose (after CR) / Derive U-CR / Private-display U-CR / Public-display VR / Commercial VP for own-purpose business use (after CR) / Redistribute VR**.
* **Phase status:** **best private-analysis technical route, but no-go until derived-index confirmation and provenance warranty**.

### UK-4 Amazon.co.uk PA API

* **Stable source/access:** Amazon Associates PA API/Creators API; approved Associates site and credentials (E1).
* **Independence:** one marketplace/retailer ecosystem; seller mix and Amazon ownership make it a single-source observation.
* **Coverage/account:** Amazon.co.uk; Associates acceptance and API qualification required.
* **Automation/storage/history/derived:** API calls allowed for affiliate use; non-image content cache capped at 24 hours; ASIN alone may persist. Index derivation is unaddressed (E1).
* **Display/attribution/commercial/redistribution:** commercial affiliate display permitted only to send users/sales to Amazon, with timestamps/disclaimers and comparison-format rules; redistribution forbidden (E1).
* **Identifiers/data quality:** ASIN stable within Amazon, not equivalent to manufacturer MPN/GTIN. Offer/seller/condition matching and 32GB kit/bundle filtering remain necessary.
* **VAT/delivery/stock:** price/availability are time-sensitive; delivery and VAT can vary with buyer, seller and location. Policy mandates freshness disclosure, not comparability.
* **Rate/stability:** specification limits apply; Amazon can change/deprecate/republish API/feed (E1).
* **Rights:** **Auto VP (after CR, affiliate purpose) / Store VR beyond 24h / Derive U / Private-display U / Public-display VP conditionally / Commercial VP conditionally / Redistribute VR**.
* **Phase status:** **no-go for historical index; optional live affiliate comparator only**.

### UK-5 eBay Browse API

* **Stable source/access:** eBay Browse API; developer/OAuth account (E6).
* **Independence:** single marketplace; substantial seller-level heterogeneity.
* **Coverage/account:** eBay UK marketplace; developer programme agreement required.
* **Automation/storage/history/derived/display/commercial/redistribution:** technically automatable, but no authoritative licence text was retrievable; rights unresolved (E6).
* **Identifiers/data quality:** seller-supplied; filter condition, listing format, quantity, kit composition, location and business/private seller.
* **VAT/delivery/stock:** destination/seller/listing-specific; compare landed VAT-inclusive new-buy-it-now offers only.
* **Rate/stability:** quotas and restricted Buy API access may apply; confirm current production eligibility/SLA.
* **Rights:** **Auto CR / Store U-CR / Derive U-CR / Private-display U-CR / Public-display U-CR / Commercial U-CR / Redistribute U-CR**.
* **Phase status:** **secondary signal; no-go pending terms**.

## Candidate matrix — Germany

### DE-1 billiger.de / solute Portal Partner API/exports

* **Stable source/access:** solute API/exports through a signed Portal Partner cooperation agreement (E4).
* **Independence:** broad multi-shop comparison provider, but offers originate with connected online shops and must be reproduced unchanged.
* **Coverage/account:** Germany-focused; 100m+ product records and 2,000+ shops advertised; contact and contract required (E4).
* **Automation/storage/history/derived:** API/export automation allowed; raw retention beyond 24 hours expressly prohibited. Only click-performance statistics, not price-index derivation, are expressly mentioned (E4).
* **Display/attribution/commercial/redistribution:** own agreed portal display allowed only complete/unchanged with shop, price, base price, clickout and tracking; third-party transfer needs prior written consent (E4).
* **Identifiers/data quality:** records are “standardized and prepared”, but no cited public data dictionary guarantees GTIN/MPN for DDR5.
* **VAT/delivery/stock:** availability/price changes must be reflected immediately, but no cited public definition proves VAT inclusion, destination delivery or stock normalisation.
* **Rate/stability:** no uninterrupted/timely/error-free guarantee; API definitions/exports may change or be deleted (E4).
* **Rights:** **Auto VP (after CR) / Store VR beyond 24h / Derive U-CR / Private-display U-CR / Public-display VP conditionally / Commercial VP conditionally / Redistribute VR absent written consent**.
* **Phase status:** **best German breadth, explicit historical-retention blocker; no-go without bespoke amendment**.

### DE-2 PriceAPI (idealo, Geizhals, billiger, Amazon, eBay routes)

* **Stable source/access:** paid PriceAPI business account; idealo enabled on request; API jobs return structured files (E5).
* **Independence:** one vendor exposes multiple named sources, but these are not independent licences or necessarily independent shop observations. De-duplicate retailer/product/offer across routes.
* **Coverage/account:** idealo Germany is explicit; source index lists German-relevant Geizhals and billiger routes. Business registration/payment required (E5).
* **Automation/storage/history/derived:** automated and own-purpose saved-content retention are supported; idealo offers price histories. Derived-index ownership/use remains unaddressed (E5).
* **Display/attribution/commercial/redistribution:** private business use is supported in principle; publishing/showing/disseminating provider content is restricted without amendment (E5).
* **Identifiers/data quality:** GTIN query supported; MPN/GTIN return population not guaranteed; stale-data windows and plausibility obligation apply (E5).
* **VAT/delivery/stock:** source-specific; no cited normalisation guarantee. Require German VAT-inclusive (`inkl. MwSt.`), delivery-to-Germany and immediately available semantics.
* **Rate/stability:** credit-priced, asynchronous, per-source enablement/max-age; upstream layout/source changes are an added dependency.
* **Rights:** **Auto VP (after CR) / Store VP for own purpose (after CR) / Derive U-CR / Private-display U-CR / Public-display VR / Commercial VP for own-purpose business use (after CR) / Redistribute VR**.
* **Phase status:** **preferred private technical route only after derived-data and upstream-rights warranty**.

### DE-3 Awin product feeds with German DDR5 retailers

* **Stable source/access:** Awin AG advertiser feeds/feed list; account and programme approvals (E2).
* **Independence:** multi-advertiser network but merchant-supplied and programme-conditional.
* **Coverage/account:** German contracting entity/programmes exist; current public materials do not establish which DDR5 retailers/feeds are available. Each advertiser may refuse/remove access (E2).
* **Automation/storage/history/derived:** cron automation documented; historical evidence and index use not explicit; licences end and materials must be removed on termination (E2).
* **Display/attribution/commercial/redistribution:** approved affiliate comparison display is within stated use, without modification; other purpose/disclosure is prohibited (E2).
* **Identifiers/data quality:** MPN/model/EAN, currency, delivery and stock are often supplied, but EAN is unvalidated and stock semantics weak (E2 supplement).
* **VAT/delivery/stock:** fields may exist, but VAT-inclusive German consumer pricing and destination-specific delivery must be verified per advertiser.
* **Rate/stability:** feed update endpoint helps; peak requests may fail; advertiser/Awin terms can change quickly (E2).
* **Rights:** **Auto VP (after CR) / Store U-CR / Derive U-CR / Private-display U-CR / Public-display VP (after CR, affiliate purpose) / Commercial VP (after CR) / Redistribute VR**.
* **Phase status:** **useful retailer-diversification route, not a rights-complete index source**.

### DE-4 PriceRunner commercial API (cross-European enquiry)

* **Stable source/access:** PriceRunner negotiated API; Germany is listed as a comparison country, but the UK sales page does not prove German API parity (E3).
* **Independence:** multi-shop provider, merchant/public inputs, Klarna ownership.
* **Coverage/account:** German availability, shop count, history depth and endpoint must be confirmed directly; contract required.
* **Automation/storage/history/derived:** real-time, historical and analytical uses advertised generally; exact German package and downstream rights require contract (E3).
* **Display/attribution/commercial/redistribution:** no public API licence; all contract-dependent. Website scraping is expressly prohibited (E3).
* **Identifiers/data quality:** matching advertised, but no public GTIN/MPN field/population guarantee; accuracy disclaimed.
* **VAT/delivery/stock:** unresolved; obtain German data dictionary and semantics.
* **Rate/stability:** SLA, limits, refresh and versioning unresolved.
* **Rights:** **Auto CR / Store CR / Derive CR / Private-display CR / Public-display CR / Commercial CR / Redistribute CR**.
* **Phase status:** **credible enquiry, not yet a verified German feed**.

### DE-5 Amazon.de PA API

* **Stable source/access:** German marketplace content through the applicable Amazon Associates PA API/affiliate-site licence referenced by E1; German Associates approval required.
* **Independence:** single marketplace/retailer ecosystem.
* **Coverage/account:** Amazon.de; account and qualification required.
* **Automation/storage/history/derived:** affiliate API use permitted; price content retention beyond 24 hours restricted; derivation unresolved (E1).
* **Display/attribution/commercial/redistribution:** conditional affiliate display with timestamp/disclaimer and Amazon traffic purpose; redistribution forbidden (E1).
* **Identifiers/data quality:** ASIN-centric; validate MPN/GTIN, kits, seller, condition and imports.
* **VAT/delivery/stock:** German displayed price may include VAT but seller/delivery/buyer context varies; use a fixed German delivery location and validate landed price.
* **Rate/stability:** specification limits; deprecation/change rights reserved (E1).
* **Rights:** **Auto VP (after CR) / Store VR beyond 24h / Derive U / Private-display U / Public-display VP conditionally / Commercial VP conditionally / Redistribute VR**.
* **Phase status:** **no-go for history; optional live comparator**.

### DE-6 eBay Browse API

* **Stable source/access:** eBay Browse API for German marketplace context; developer/OAuth account (E6).
* **Independence:** one marketplace; mixed seller/listing characteristics.
* **Coverage/account:** eBay Germany; production programme acceptance required.
* **Automation/storage/history/derived/display/commercial/redistribution:** API is technically structured, but rights were not verified because eBay blocked unauthenticated retrieval of its developer terms (E6).
* **Identifiers/data quality:** seller-supplied and incomplete; strict new/fixed-price/32GB-kit/location/business-seller filtering required.
* **VAT/delivery/stock:** seller and destination dependent; marketplace VAT/import treatment can vary.
* **Rate/stability:** quotas/eligibility/SLA unresolved.
* **Rights:** **Auto CR / Store U-CR / Derive U-CR / Private-display U-CR / Public-display U-CR / Commercial U-CR / Redistribute U-CR**.
* **Phase status:** **secondary signal; no-go pending terms**.

## Considered but not advanced as direct consumer-price sources

* **idealo Partner Web Service 2.0** (https://idealo.github.io/partner-web-service/docs/v2/ — *Partner Web Service API Documentation*, idealo): this is a merchant integration route for sending/managing a partner’s offers, not a documented licence to retrieve the comparison database. idealo consumer-data access remains credible via a negotiated idealo licence or PriceAPI, not by repurposing PWS.
* **Geizhals “APIs” found in third-party plugins/unofficial projects:** no current first-party publisher/API licence authorising automated retrieval, retention and index derivation was found without an account. Public pages or third-party wrappers are not permission. Ask Geizhals directly for a commercial data/export licence.
* **Retailer-specific feeds:** Awin/other affiliate networks can expose individual retailers, but programme availability and terms are normally visible only after account/application. No retailer was counted as a present source merely because a public affiliate landing page or shopping page existed. Ask named retailers for direct CSV/API/licensed price export rather than scrape.
* **Google Merchant Center / Content API:** this is for merchants managing their own listings, not a licence to download competitors’ Shopping observations. Third-party Google Shopping extraction vendors need an express downstream-rights warranty.

## Direct vendor questions (must be answered in writing)

Ask every shortlisted vendor, separately for UK and Germany:

1. Does the licence permit automated collection at the proposed cadence for **market research/index construction**, not only affiliate click generation or repricing?
2. May we retain each raw observation (offer URL/ID, timestamp, retailer/seller, MPN, GTIN, price, VAT, delivery, stock and evidence payload) indefinitely for audit? What must be deleted on termination?
3. May we calculate, store and commercially use historical derived statistics/indices? Do they become our data, and may they survive termination?
4. May raw observations or only aggregated indices be displayed (a) internally, (b) to paying customers, and (c) on a public page? Required attribution, timestamps, logos, backlinks, click tracking and minimum aggregation?
5. Is redistribution/API delivery of raw rows forbidden? Is redistribution of non-reversible aggregates permitted? Define minimum cell count/noise rules.
6. Does the vendor warrant it has the necessary rights from every retailer/marketplace/upstream source for our use, and provide IP/database-right indemnity? Name all upstream sources and collection methods.
7. Supply the current data dictionary and 90-day field-completeness rates for **GTIN/EAN, manufacturer MPN, brand, exact capacity, module count, speed, ECC/buffered status and condition** in the DDR5 category.
8. Is price VAT-inclusive for a consumer? Is VAT amount/rate explicit? Are marketplace and cross-border sellers treated consistently?
9. Is delivery a separate field and calculated to a fixed UK/German postcode, or a minimum/unknown value? Are membership/free-threshold costs excluded? Can landed price be obtained?
10. Define stock: in stock now, orderable, preorder, marketplace quantity, lead time; provide timestamp and stale/offline deletion semantics.
11. Provide refresh cadence, source-level observation timestamp, historical backfill depth, revision policy, rate limits, SLA, version/deprecation notice and export reproducibility.
12. May sources be combined with competing datasets, de-duplicated and transformed? Are offer name/price/link required to remain unchanged?
13. List all DDR5 retailers represented now, source overlap across feeds, paid-placement bias and shop inclusion/removal history.
14. Confirm territorial rights independently for `GB` and `DE`; do not rely on a pan-European brand contract unless both territories and local marketplace data are named.

## Recommended contracting acceptance criteria

A source is **go** only if the executed contract explicitly grants: (1) automated access; (2) indefinite raw-evidence retention; (3) creation, ownership and post-termination retention of derived indices; (4) internal commercial use; (5) the intended public/paying-customer display mode; (6) necessary attribution rules; (7) source/upstream database-right warranty; and (8) workable tax, delivery, stock, identifier and SLA definitions. A restriction on raw redistribution is acceptable for Phase 1; a restriction on publishing non-reversible aggregate indices is not acceptable if public publication is planned.

## Regional assessment (0–5)

Weights requested: rights 30%, source breadth 20%, identifiers 15%, tax/delivery comparability 15%, stability 10%, relevance 10%. Scores reflect the **best credible portfolio available for diligence**, not a licence already acquired.

### United Kingdom

| Dimension | Score | Weight | Contribution | Rationale |
|---|---:|---:|---:|---|
| Rights | 1.8 | 30% | 0.540 | Every useful route requires a contract; Amazon/solute-style feeds restrict history, and PriceRunner downstream rights are unpublished. |
| Source breadth | 4.2 | 20% | 0.840 | Strong PriceRunner panel plus Awin, Amazon, eBay and PriceAPI routes. |
| Identifiers | 3.3 | 15% | 0.495 | GTIN/MPN supported by some routes but often seller/merchant supplied and unvalidated. |
| Tax/delivery comparability | 2.7 | 15% | 0.405 | VAT/destination delivery semantics are not documented consistently; marketplace complexity. |
| Stability | 3.2 | 10% | 0.320 | Mature APIs/providers, but programme removals, credit changes, quotas and deprecations. |
| DDR5 relevance | 4.0 | 10% | 0.400 | Good electronics retailer/marketplace coverage, subject to exact-feed confirmation. |
| **Weighted score** |  |  | **3.000 / 5** | `0.30×1.8 + 0.20×4.2 + 0.15×3.3 + 0.15×2.7 + 0.10×3.2 + 0.10×4.0` |

**Go/no-go:** **NO-GO now.** Rights is a hard gate despite the 3.00 score. Open contract discussions with PriceRunner and PriceAPI; run no production collection until one grants the complete acceptance criteria.

### Germany

| Dimension | Score | Weight | Contribution | Rationale |
|---|---:|---:|---:|---|
| Rights | 1.9 | 30% | 0.570 | billiger expressly blocks >24h retention; PriceAPI derivation/publication unclear; every route needs contract. |
| Source breadth | 4.5 | 20% | 0.900 | billiger 2,000+ shops plus idealo/Geizhals/Awin/marketplaces via contract routes. |
| Identifiers | 3.7 | 15% | 0.555 | Stronger GTIN/EAN culture and PriceAPI GTIN lookup, but completeness/warranty unresolved. |
| Tax/delivery comparability | 3.2 | 15% | 0.480 | German consumer VAT convention helps, but delivery/import/marketplace semantics still require normalisation. |
| Stability | 3.3 | 10% | 0.330 | Mature providers, offset by API/source changes, no SLA and programme volatility. |
| DDR5 relevance | 4.3 | 10% | 0.430 | Price-comparison ecosystem is highly relevant to PC components and retailer breadth. |
| **Weighted score** |  |  | **3.265 / 5 (3.27 rounded)** | `0.30×1.9 + 0.20×4.5 + 0.15×3.7 + 0.15×3.2 + 0.10×3.3 + 0.10×4.3` |

**Go/no-go:** **NO-GO now.** The explicit 24-hour solute limit and absent derived-data grants are fatal. Negotiate with PriceAPI and solute/billiger for an index-specific licence; ask PriceRunner whether its German commercial API is genuinely available.

## Suggested next diligence order (no unauthorised mutation)

1. Send the direct questions to **PriceRunner** (UK first, Germany separately) and request sample contract/data dictionary.
2. Send them to **PriceAPI**, adding a request for upstream-source rights warranty and a derived-data/publication addendum.
3. Ask **solute/billiger.de** for a bespoke amendment permitting indefinite raw retention and transformed aggregate index publication; without it, reject.
4. Identify current UK/German DDR5 retailer programmes in **Awin** only after account creation is separately authorised; collect programme terms before feed access.
5. Obtain the current **eBay Developer Agreement** through an authorised channel and assess it before any production key/application.
6. Treat Amazon only as a live affiliate comparator unless Amazon grants an additional written historical-data licence.
