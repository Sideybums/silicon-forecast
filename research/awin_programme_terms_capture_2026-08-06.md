# Awin programme-terms capture: UK component-retailer candidates

**Retrieved:** 2026-08-06
**Programmes:** Scan Computers (15473), Overclockers UK (28821), Currys (1599)
**Scope:** Read-only capture and assessment of each programme's public Awin profile and programme-specific terms.
**Safety boundary:** No application was submitted, no terms were accepted and no programme relationship was created.

## Capture method and evidence

Awin exposes the current programme profiles and programme-specific terms through public first-party pages. No authenticated UI interaction was required:

- Scan Computers profile: https://ui.awin.com/merchant-profile/15473
- Scan Computers terms: https://ui.awin.com/merchant-profile-terms/15473
- Overclockers UK profile: https://ui.awin.com/merchant-profile/28821
- Overclockers UK terms: https://ui.awin.com/merchant-profile-terms/28821
- Currys profile: https://ui.awin.com/merchant-profile/1599
- Currys terms: https://ui.awin.com/merchant-profile-terms/1599

Seven first-party terms pages were captured for each programme: General, PPC, Transactions, Branding, Notice Periods, Publishers and De-Duplication. All 21 requests returned HTTP 200. Raw HTML snapshots and a SHA-256 manifest are stored under:

`research/evidence/awin/2026-08-06/`

The manifest records source URL, retrieval timestamp, HTTP status, content type, byte count and SHA-256 digest for every capture. These snapshots are retrieval-time evidence; Awin or the advertiser may change the live terms later.

## Project-owner source-use decision

On 2026-08-06 David approved the following operating interpretation for Silicon Forecast:

- Publicly observable factual offer data — prices, timestamps, stock statements, identifiers, VAT/delivery facts and product attributes — may be collected, retained and used to calculate historical prices and indices without seeking bespoke permission for each analytical use.
- Source review is intended to identify **explicit applicable restrictions**, not to require an affirmative grant for every use where the terms are silent.
- Awin and advertiser terms still govern access to their feeds, affiliate attribution, current-offer presentation, advertising activity and use of supplied creative material.
- VAT, delivery, MPN/GTIN, variant and stock questions are data-quality and methodology questions, not permission questions.
- Public availability is not described as “public domain” in the project documentation. Product photography and authored descriptions may carry copyright, so the default evidence model stores factual fields, source URLs, timestamps, checksums and only the minimum text necessary for identification rather than maintaining a reusable creative-asset library.

This is a human-approved source-rights risk decision, not a representation that every public page or feed is free of database, copyright or contractual restrictions. An explicit conflicting term still blocks or constrains the relevant adapter.

## Decision summary

| Programme | Price/index workflow fit | Feed evidence | Explicit restriction/operational gap | Diligence assessment |
|---|---|---|---|---|
| Scan Computers | Content and community publishers are allowed. Search, discount-code and several other promotional types are marked unavailable. | Feed availability is not established by the captured terms. | Use Awin-supplied marketing materials as directed; honour takedown and brand/PPC restrictions. | Suitable application candidate once David approves the application; verify feed availability and fields after access. |
| Overclockers UK | Content and community publishers are allowed. Search is allowed, but CSS publishers are expressly excluded and Google Shopping activity is prohibited. | Feed availability is not established by the captured terms. | Do not operate as CSS/Google Shopping, bid on brand terms or direct-link from PPC. | Suitable application candidate for an editorial comparison/index site once David approves the application. |
| Currys | Content, community and search publishers are allowed. The profile explicitly assigns rates to Comparison Engine and CSS publisher types, although CSS activity requires separate sign-off. | Strongest technical evidence: a daily Awin datafeed is offered; an advanced feed updated multiple times per day is available on request. Publishers must make every effort to display current pricing. | Historical observations must not be presented as current offers; CSS, PPC, creative and brand restrictions remain applicable. | Strongest first application candidate; verify feed fields and build freshness controls after access. |

## Scan Computers

### Material terms captured

- The displayed General Terms are labelled **August 2018**.
- The programme requires compliance with Awin's Standard Terms plus Scan-specific terms.
- Content, community, cashback and loyalty publishers are marked as allowed.
- Search/PPC, discount-code, email, behavioural-retargeting and media-broker promotional types are marked as unavailable in the structured Publisher policy.
- Affiliates must use marketing materials supplied through Awin unless Scan approves specific creative.
- Scan may require advertising material to be removed immediately.
- Scan brand terms and variants may not be used without prior approval.
- Brand bidding and direct PPC linking are prohibited; restricted terms include `scan`, `3xs` and `scan.co.uk`.
- Voucher codes may only be promoted when supplied or directly approved through authorised channels.
- Standard commission is stated as 1%, with 0% possible for designated no-margin products.
- Structured transaction terms state that the commissionable transaction value excludes VAT but includes delivery charges. This describes commission calculation, not the tax or delivery semantics of feed prices.
- The structured terms say programme changes, possible website downtime and commission reductions may be notified with seven days' notice where applicable.
- The programme de-duplicates against price comparison and several other channels. This affects attribution rather than the validity of retaining factual historical observations.

### Silicon Forecast implication

Scan's terms do not prohibit ordinary editorial/content comparison or historical analysis. Product-feed availability remains unknown. The evidence model should preserve prices and other factual fields while avoiding unnecessary permanent copying of Scan's authored descriptions, photography or advertising creative.

**Status:** suitable application candidate; production activation awaits programme membership, feed discovery and technical validation rather than a bespoke historical-retention grant.

## Overclockers UK

### Material terms captured

- Content, community, cashback, discount-code, email, loyalty, search, behavioural-retargeting and media-broker publishers are marked as allowed.
- The Publisher policy states: **“We do not work with CSS publishers via the affiliate program.”**
- The General terms prohibit Google Shopping activity using Overclockers UK products and name.
- PPC may be permitted generally, but direct linking, brand bidding, brand variants/misspellings and brand-plus-discount terms are prohibited.
- The advertiser must be referred to as **Overclockers UK** in customer-facing material.
- Overclockers-related domains/subdomains are prohibited; correctly spelt brand terms may appear after the publisher's own domain path.
- Unauthorised or expired voucher-code promotion can result in zero commission or suspension.
- The profile advertises up to 2% commission and a 30-day attribution period.
- Structured transaction terms state that the commissionable value excludes VAT and delivery but includes credit-card fees. Again, this does not establish feed-price semantics.
- The structured terms give seven days' notice for programme-term changes and possible website downtime.
- The programme de-duplicates against price comparison and several other channels.

### Silicon Forecast implication

Silicon Forecast is not proposing Google Shopping ads or a Google Comparison Shopping Service, so the CSS/Shopping prohibition does not disqualify the proposed editorial comparison/index workflow. Product-feed availability and field quality remain unknown and should be checked after access.

**Status:** suitable application candidate; production activation awaits programme membership, feed discovery and technical validation.

## Currys

### Material terms captured

- Content, community, cashback, discount-code, email, loyalty and search publishers are marked as allowed.
- The profile's commission table explicitly includes **Comparison Engine** publishers at 2% and **Comparison Shopping Services (CSS)** at 2.5%, subject to classification and current programme policy.
- CSS campaign rights require explicit Currys approval and are described as currently exclusive to another affiliate. This relates to paid Google Shopping/CSS activity, not necessarily an editorial comparison engine.
- Paid search requires prior approval. Direct linking, brand bidding and use of Currys/legacy brand terms are prohibited; Currys terms require relevant negative keywords.
- Display advertising and creatives require approval. Awin creative must not be altered or hard-coded.
- Currys provides a **daily Awin datafeed** and says an advanced feed updated at multiple intervals during the day is available on request.
- Publishers must make every effort to maintain Currys' most current pricing in promotions.
- The profile states commissions are calculated excluding VAT, delivery, service and extended-warranty charges. That is a commission rule and does not prove whether consumer-facing feed prices include VAT.
- Transactions are validated after dispatch and the 30-day returns period; untracked and declined-transaction queries have 90-day windows.
- No buy-now-pay-later/credit-solution publishers are accepted.
- Voucher codes must come through the programme or have written permission.
- Affiliate content must be ASA-compliant; the captured General terms state that content must be labelled `#Ad`.
- Structured terms provide 14 days' notice for programme changes, possible downtime and commission reductions where applicable.
- The programme de-duplicates against price comparison and several other channels.

### Silicon Forecast implication

Currys provides the clearest evidence that both comparison-engine publishers and regularly updated product feeds are contemplated. Current offers must remain fresh and correctly linked; separately labelled historical observations and derived charts may be retained under the approved project interpretation unless an explicit applicable restriction is identified.

**Status:** strongest first application candidate; production activation awaits programme membership and feed validation.

## Remaining operational questions

The following are access, quality and implementation questions rather than requests for bespoke permission to retain public facts:

1. Which programmes expose a product feed after membership, and through which Awin interface?
2. Does the feed populate VAT-inclusive consumer prices, delivery, MPN, GTIN/EAN, stock and variant fields reliably enough for the methodology?
3. How frequently is each feed updated, and how should stale or withdrawn current offers fail closed?
4. Which factual fields must be captured from a retailer page when the feed is incomplete?
5. Which advertiser creative or authored material is unnecessary and should be excluded from permanent evidence storage?
6. What attribution, affiliate-link, advertising-disclosure, correction and takedown controls are required for live offer presentation?

An explicit contractual or legal restriction still governs where present. Silence is no longer treated as an automatic blocker to retaining factual observations or calculating derived history.

## Recommended next action

Apply to Currys first once David approves that external action, followed by Scan Computers and Overclockers UK. After acceptance, inspect feed availability, field population and freshness behaviour using bounded read-only samples. Preserve factual observations and provenance; keep live current-offer presentation separate from clearly dated historical evidence.
