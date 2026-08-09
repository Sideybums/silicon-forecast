# Price Channel and Condition Taxonomy

Status: draft research design; no production or publication authority

## Purpose

Silicon Forecast must not combine primary retail, third-party marketplace asking prices and used transaction prices into one undifferentiated index. They describe different markets, include different risks and answer different questions.

Channel and condition are separate dimensions. The platform hosting an offer is not necessarily the seller.

## Channel classes

| Code | Meaning | Operational rule |
| --- | --- | --- |
| `DIRECT` | Manufacturer direct | Manufacturer or brand is seller and merchant of record. |
| `PRIMARY_RETAIL` | Retailer's own new inventory | Established retailer is seller and merchant of record. Authorisation status is recorded separately rather than assumed. |
| `MARKETPLACE_PRO` | Professional third-party marketplace seller | Business seller uses Amazon, eBay, OnBuy or another marketplace. Marketplace fulfilment does not make the platform the seller. |
| `RECOMMERCE` | Professional used/refurbished reseller | Business principally offering used, graded, open-box or refurbished goods, such as CeX. |
| `P2P` | Private resale | Private seller or peer-to-peer transaction. |

Record manufacturer authorisation independently as `confirmed`, `unverified`, `not_authorised` or `not_applicable`.

## Condition classes

| Code | Meaning |
| --- | --- |
| `NEW_SEALED` | Explicitly factory-new and sealed/unopened. |
| `NEW_OTHER` | Claimed unused but packaging, completeness or normal retail presentation differs. |
| `OPEN_BOX` | Opened or returned, not represented as refurbished. |
| `REFURB_MANUFACTURER` | Refurbished by the manufacturer or an attributable authorised refurbisher. |
| `REFURB_SELLER` | Refurbished or graded by the seller. |
| `USED_WORKING` | Previously used and explicitly represented as working/tested. |
| `USED_UNTESTED` | Used but functionality is not established. |
| `PARTS_FAULTY` | Faulty, incomplete or sold for parts. |
| `UNKNOWN` | Evidence is insufficient or contradictory. |

Retain the source's raw condition wording. A condition claim is evidence from the seller, not independent proof.

## Offer basis

Every observation must say what the price represents:

- `ASK`: currently advertised asking price;
- `SOLD`: completed transaction price;
- `TRADE_IN`: professional reseller's purchase offer;
- `RRP`: manufacturer recommended price, not a live offer.

Asking and completed-sale prices must never be pooled.

## Proposed analytical series

### 1. Primary new retail

The headline supply-side series.

Include:

- `DIRECT` or `PRIMARY_RETAIL`;
- `NEW_SEALED`;
- exact product identity;
- purchasable stock;
- VAT-inclusive landed price to the fixed UK destination.

Keep authority-unverified retailers visible as a quality dimension. Do not silently replace an unavailable exact product with a marketplace residual offer.

### 2. Marketplace new

A separate asking-price series for professional third-party sellers.

Use it to measure:

- residual inventory;
- scarcity pricing;
- import dependence;
- seller concentration;
- divergence from primary retail.

Marketplace asking prices do not enter the primary retail index. “Fulfilled by Amazon” does not mean “sold by Amazon”.

### 3. Professional recommerce

A separate used/open-box/refurbished asking-price series for businesses such as CeX.

Record:

- condition/grade;
- warranty provider and duration where stated;
- stock and delivery;
- exact MPN confidence;
- both sale price and trade-in price where available.

CeX-style generic catalogue entries without exact MPN evidence may support category-level research but not an exact-product series.

### 4. Private resale

A transaction-led used series, primarily from completed eBay sales where lawful and technically supportable.

Prefer `SOLD` evidence. Active listings are asking prices and belong in a separate measure.

Exclude:

- unsold ended listings;
- bundles, incomplete kits and mixed modules;
- faulty or untested stock from the working-used series;
- listings without adequate product identity;
- prices hidden by accepted best offers unless the actual transaction value is available;
- collection-only or non-UK offers unless separately classified.

## Minimum observation fields

- canonical product key and expected MPN;
- observed MPN and match status;
- platform and seller of record;
- channel class and authorisation status;
- raw and classified condition;
- offer basis (`ASK`, `SOLD`, `TRADE_IN` or `RRP`);
- item price, mandatory delivery, unavoidable fees and landed price;
- VAT status;
- stock/purchasability state;
- seller location and import-charge status;
- observation timestamp and source URL;
- classification confidence and exclusion reasons.

## Reporting rules

Each reported statistic must expose:

- series/channel and condition;
- observation and seller counts;
- exact-identity coverage;
- observation window;
- landed-price treatment;
- asking versus sold basis;
- exclusions and missing-data rate.

A combined “all channels” number may be shown only as descriptive distribution data. It must not be labelled as the primary retail index.

## Current Amazon snapshot interpretation

The 2026-08-06 Amazon UK candidate snapshot consists entirely of professional third-party marketplace asking prices, not Amazon-retail observations. One offer is cross-border, one lacks exact MPN evidence and the remaining offers have unresolved VAT and/or delivery treatment. They are useful marketplace/scarcity observations but are not eligible for the primary retail series.

This document is a draft research classification. Activating any production source, methodology or public series remains human-gated.
