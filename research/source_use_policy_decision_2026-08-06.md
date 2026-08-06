# Source-use policy decision

**Decision date:** 2026-08-06
**Decision owner:** David Sidebottom
**Scope:** Silicon Forecast factual retail-offer observations and derived price/index history
**Status:** Approved project operating interpretation; not legal advice

## Decision

Silicon Forecast will not require a bespoke affirmative permission grant merely to retain publicly observable factual offer data or use it to calculate historical prices and derived indices.

For project purposes, factual observations include:

- retailer and canonical product identifiers;
- observed price and currency;
- observation time and source URL;
- VAT and delivery facts;
- availability/stock statements;
- manufacturer, model, MPN, GTIN/EAN, capacity, speed, kit and variant attributes; and
- hashes and provenance required to reproduce the evidence chain.

Where applicable terms are silent, these factual observations may be retained immutably, used after an offer changes, and used to create permanent historical/index outputs. Source diligence will look for explicit applicable restrictions rather than demand affirmative wording for every analytical use.

## Important distinction

The project will not describe retailer material as “public domain” merely because it is publicly accessible. Public access and public-domain status are different things.

The approved policy separates factual observations from authored or creative material:

- Product photography, logos, advertising creative and substantial authored descriptions are excluded from permanent evidence storage by default.
- Evidence records should retain factual fields, timestamps, source URLs and checksums, plus only the minimum title/specification text needed for conservative product identification.
- Live creative supplied through an affiliate programme must follow that programme's display, alteration, freshness and takedown rules.

## Rules that still apply

1. Explicit contractual restrictions govern the adapter or content to which they apply. Silence is not a blocker; an actual conflicting term is.
2. Affiliate programme membership still governs feed access, tracking, commission, current-offer promotion and advertiser relationship status.
3. Current offers must not be represented using stale historical observations. Current and historical displays require separate freshness states.
4. VAT, delivery, stock, MPN/GTIN and variant semantics must be validated as data-quality and methodology inputs. They are not permission requests.
5. Collection must be bounded, observable and respectful of documented technical limits. No access-control circumvention is permitted.
6. Raw-data redistribution remains outside the MVP. Derived/public outputs remain separately human-gated.
7. Complaints, takedowns or newly discovered explicit restrictions trigger review and fail-closed handling rather than silent continuation.

## UK legal caution retained by the project

This operating interpretation is deliberately less conservative than the project's original permission matrix, but it does not assume that every public webpage can be copied wholesale.

The Copyright and Rights in Databases Regulations 1997 define extraction as permanent or temporary transfer of database contents and re-utilisation as making contents available to the public. Regulation 16 states that extracting or re-utilising all or a substantial part may infringe database right, and that repeated and systematic extraction of insubstantial parts may amount to extraction of a substantial part:

- https://www.legislation.gov.uk/uksi/1997/3032/regulation/12
- https://www.legislation.gov.uk/uksi/1997/3032/regulation/16

The Copyright, Designs and Patents Act 1988 recognises copyright in original literary and artistic works and can protect original database selection/arrangement:

- https://www.legislation.gov.uk/ukpga/1988/48/section/1
- https://www.legislation.gov.uk/ukpga/1988/48/section/3A

These cautions support the factual/minimal evidence model and explicit-restriction review. They do not reinstate a blanket requirement to obtain bespoke permission whenever factual public prices are observed or retained.

## Consequence for Awin diligence

Currys, Scan Computers and Overclockers UK no longer remain blocked solely because their terms do not expressly mention permanent historical retention or derived indices.

They remain subject to:

- separate human approval before each programme application;
- advertiser acceptance and actual feed availability;
- captured programme restrictions;
- technical validation of DDR5 coverage and fields;
- freshness, attribution and affiliate-link handling; and
- methodology and production-activation approval.

Currys is the strongest first application candidate because its programme explicitly recognises comparison engines and offers daily plus higher-frequency feeds.
