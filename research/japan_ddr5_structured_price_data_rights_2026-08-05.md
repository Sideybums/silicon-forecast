# Japan: lawful structured price-data options for a 32GB DDR5 retail-price index

**Research date:** 5 August 2026
**Scope:** private commercial collection and calculation initially; possible later public/commercial display. No account creation, payment, contract acceptance, retail-page scraping or external mutation was performed.
**Important:** this is a sourcing and contract screen, not legal advice. Technical accessibility, public pages and `robots.txt` are not permission.

## Status method

Rights dimensions are **AC** automated collection, **RR** raw/evidence retention, **DH** permanent derived history, **PD** private display, **PC** public/commercial aggregate display and **RD** source-data redistribution.

- **VP — verified permission:** the cited first-party text expressly permits the stated use within its conditions.
- **VR — verified restriction:** the cited first-party text expressly conflicts with the use.
- **CR — contract required:** a credible paid, account-gated or bespoke route exists, but the necessary right is not publicly granted.
- **U — unknown:** the reviewed first-party material does not answer the question.

## Executive conclusion

Japan has unusually useful product identifiers and several structured routes, but none of the reviewed public licences clears permanent commercial price-history construction. Rakuten and Yahoo! Shopping technically expose marketplace products yet materially restrict commercial or private analytical reuse. Amazon expressly restricts aggregation, price tracking and retention. Kakaku.com prohibits commercial reuse under its public terms but offers a Data Compass enquiry route. ValueCommerce supports approved affiliate price-comparison display without granting permanent history. **BCN Ranking is the strongest diligence target:** it explicitly covers PC memory, aggregates daily POS data by JAN and offers downloadable analysis, but its customer data licence, automated delivery rights and publication rights are not public.

**Current decision: NO-GO.** Japan becomes a conditional candidate only after a signed BCN, Kakaku or equivalent data agreement expressly grants automated delivery, indefinite evidence retention, permanent derived indices, internal use, publication of non-reconstructable aggregates and post-termination survival.

## Comparison matrix

| Source / route | Coverage and data | Main rights evidence | Rights AC / RR / DH / PD / PC / RD | Phase status |
|---|---|---|---|---|
| **Rakuten Ichiba Item Search API** | One marketplace with many shops. Current API returns shop/item ID, price, tax flag, coarse postage and binary availability; no dedicated JAN or MPN output is documented. | API use is conditional on Rakuten terms. Terms prohibit non-affiliate income unless expressly permitted, use in an environment accessible only to specified people, and uses/copies/alterations outside designated purposes [J1][J2]. | **VR / U / U / VR / VR / VR** for the intended commercial index. Express written permission could supersede the restriction. | No-go absent a bespoke licence. |
| **Yahoo! JAPAN Shopping Web Services** | One marketplace/database with multiple stores. Product Search v3 exposes JAN, tax-inclusive state, coarse free-shipping classification and boolean stock; no documented MPN or numeric landed-delivery field. | Common terms prohibit use beyond the service purpose and unapproved profit-oriented activity; developer use requires Client ID, attribution and compliance with guidelines [J3–J7]. | **VR / U / U / VR / VR / VR** for the proposed commercial history. Affiliate product display is conditionally permitted through ValueCommerce, not index construction. | No-go absent written LINE Yahoo approval. |
| **Amazon.co.jp Creators API** | One marketplace; ASIN plus EAN/UPC and item-part-number fields may be available by category. Offers include price, seller, condition, points and stock state, but no verified tax basis or landed shipping amount. | Amazon prohibits aggregation/analysis/repurposing without prior written approval, price tracking without separate agreement, stores non-image content for only 24 hours and prohibits redistribution [J8–J10]. | **VR / VR / VR / VR / VR / VR** for index use under standard terms. | No-go; affiliate display is a different, narrow purpose. |
| **Kakaku.com Data Compass / bespoke data agreement** | Potential multi-shop comparison route. Public Data Compass enquiry exists, but no public schema, identifier guarantees, tax/delivery semantics, SLA or customer licence was found. | Public terms restrict the service to private noncommercial use and prohibit commercial use, copying, modification, publication, distribution and storage without prior consent [J11][J12]. | **CR / CR / CR / CR / CR / CR** for a negotiated route; default website use is restricted. | High-priority enquiry, not permission. |
| **ValueCommerce Affiliate Product API** | Participating advertiser feeds; API explicitly supports comparing the same product across advertisers. May include JAN, model code, price/sale price, coarse postage and stock. Programme and advertiser approval required. | Terms constrain use to programme purposes, restrict transfer/sublicensing, and require current advertising materials to cease after campaign end [J13–J15]. | **VP after CR / U / U / U / VP after CR for affiliate display / VR**. A standalone aggregate index is unresolved, not permitted by implication. | Supplementary lead only with written archival/index rights. |
| **BCN Ranking Data Service** | Japan-wide POS panel covering digital/PC categories; official category list includes PC expansion **memory**. Daily sales quantity, value and average unit price are aggregated by JAN. Expert supports Excel export and free processing; up to three years is advertised in the tool. | No public customer data licence, API entitlement, retention clause, publication clause or redistribution clause was found. Customer contract controls all intended rights [J16–J19]. | **CR / CR / CR / CR / CR / CR**. | Strongest DDR5-specific procurement target. |
| **NIQ/GfK Japan technology and durables intelligence** | Japan-wide statistically expanded POS panel for appliance/IT retailers. Public materials establish channel sales and price measurement, but do not confirm standalone memory-module coverage or identifiers. | Website terms state that a client service agreement controls; public content cannot be copied or distributed without consent [J20–J23]. | **CR / CR / CR / CR / CR / CR**. | Enterprise fallback if DDR5 category and identifiers are confirmed. |

## Candidate details

### Rakuten Ichiba Item Search API

The current API is versioned `2026-07-01`, requires Rakuten membership, developer registration, application ID and access key, and documents HTTP 429 for excessive requests [J1]. It is not a general commercial data licence.

Key Japanese terms evidence [J2]:

- 「楽天アフィリエイト以外の方法で収入を得ること（当社が明示的に許可した場合を除く）」 — “Earning income through use of the Web Services by a method other than Rakuten Affiliate, except where Rakuten expressly permits it.”
- 「特定の人のみがアクセスできる環境でウェブサービスを使用すること。（当社が明示的に許可した場合を除く）」 — “Using the Web Services in an environment accessible only to specified persons, except where expressly permitted.”
- 「当社が別途定める目的以外に使用し…複製または改変をすること」 — using information outside separately designated purposes, or copying/altering it outside designated terms, is prohibited.
- 「仕様の全部または一部をいつでも変更することができる」 — “Rakuten may change all or part of the specifications at any time.”

Data semantics [J1]:

- `itemCode` is a marketplace identifier in `shop:1234` form, not JAN/MPN.
- `itemPrice` and minimum/maximum prices are documented.
- `taxFlag`: `0` tax included; `1` tax excluded. No tax amount/rate.
- `postageFlag`: postage included/free versus separate, without an amount.
- `availability`: binary sale possible/not possible, without quantity or fulfilment detail.

### Yahoo! JAPAN Shopping Web Services

Product Search v3 is technically attractive: it supports JAN search and returns JAN, price, tax-inclusive state, seller, shipping condition and stock boolean [J3][J4]. It requires a Yahoo! JAPAN ID, registered application and Client ID; the product API does not require per-user OAuth. The documented operational ceiling is approximately one query per second [J3].

Key common-terms evidence [J5]:

- 「予定している利用態様を超えて利用（複製、送信、転載、改変を含みます。）をしてはなりません。」 — “Content must not be used beyond the contemplated manner, including reproduction, transmission, republication or modification.”
- 「当社サービスやそれらを構成するデータを、その提供目的を超えて利用することができません。」 — “Services and their constituent data may not be used beyond their purpose of provision.”
- 「営業…その他営利を目的とする行為（当社の認めたものを除きます。）」 — unapproved business or other profit-oriented activity is prohibited.
- 「提供の継続性を…保証していません。」 — continuity is not warranted.

All API sites/apps must show Yahoo attribution [J6]. The affiliate route requires ValueCommerce registration [J7]; it clears approved promotional use only, not permanent historical analytics.

Data gaps:

- No documented MPN; seller item code is not a manufacturer identifier.
- Shipping is only unset/free/conditionally free, not a destination-specific amount.
- Stock is boolean, with no quantity/back-order/timestamp guarantee.
- Multiple stores remain dependent on one Yahoo platform and policy surface.

### Amazon.co.jp Creators API

Amazon's Japanese policy states [J8]:

- 「事前の書面による明確な承諾なしに…プロダクト広告コンテンツを集約、分析、抽出または別目的で使用」してはならない — without prior explicit written approval, Product Advertising Content may not be aggregated, analysed, extracted or repurposed.
- 「別途合意しない限り…価格のトラッキングおよび/または価格のアラート」不可 — price tracking/alerts are prohibited unless separately agreed.
- Non-image Product Advertising Content may be cached for only 24 hours; individual ASINs may persist only until licence termination.
- Redistribution, sublicensing and transfer are prohibited.

Creators API has replaced deprecated PA-API 5 [J9]. ItemInfo documents EAN/UPC and `ItemPartNumber`, but field presence varies by locale/category and JAN/MPN completeness is not guaranteed [J10]. OffersV2 provides price, seller, condition, points and availability status, while several shipping-related fields are unavailable. The API warns that a returned price uses a default in-marketplace address and may differ from a specific customer's price.

### Kakaku.com Data Compass

Kakaku.com's default terms say [J11]:

- 「本サービスはお客様の私的かつ非営利目的でのご利用に限定」 — the service is limited to private, noncommercial use.
- Unless prior consent is given, commercial activity and preparation for commercial use are prohibited.
- Content may not be reproduced, edited, modified, published, transmitted, distributed, sold, provided or stored for such reuse without permission.

A first-party Data Compass enquiry form exists [J12], making a bespoke data agreement credible. The public page does not grant any data right or disclose API/feed availability. Request a sample DDR5 data dictionary, retailer panel, field-completeness report and proposed licence before scoring this as an approved source.

### ValueCommerce Affiliate Product API

The API says participating advertisers' product data can be retrieved and explicitly lists price comparison across advertisers as a use case [J13]. Registration, site review, advertiser affiliation and token are required. The schema may include JAN, merchant product/model codes, current/sale price, binary postage and coarse stock [J13].

The programme terms constrain use to programme purposes and prohibit transfer or sublicensing without consent [J14]. When a campaign ends, advertising images/text and related content must cease without delay. Thus current affiliate display can be lawful after approval, but historical audit/index rights and survival after termination remain unknown. It is not a permanent dataset by osmosis.

### BCN Ranking Data Service

BCN says it collects POS data from Japanese electronics retailers and e-commerce sites, covers around 150 digital/PC categories, provides daily sales quantity/value/average unit price, and aggregates by JAN [J16][J17]. Official lists explicitly include expansion **memory** [J18][J19]. Expert-plan results can be exported to Excel for free processing, but this functional capability is not a perpetual data licence.

Important methodological mismatch: BCN observes realised POS transactions and average selling prices, not retailer shelf offers. It may support a better sales-weighted transaction-price index, but it cannot silently be mixed with advertised offer prices. Tax basis, online/offline split, retailer panel/weights, exact DDR5 attributes, corrections and publication rights require written answers.

Publicly advertised monthly pricing starts at ¥100,000 for Mini, ¥200,000 for Value and ¥310,000 for Expert [J16]. Any enquiry, trial or spend requires David's explicit approval.

### NIQ/GfK Japan

NIQ/GfK describes a Japan-wide POS network for technology/durables and channel sales/price intelligence [J20–J22]. A Japan report uses tax-exclusive average prices, showing that the data can measure transaction prices, but no public evidence confirms a standalone DRAM module category or JAN/MPN access [J22]. The website terms explicitly defer to the customer service agreement [J23]. This is credible enterprise diligence, not a cleared source.

## Required vendor questions

1. Does the licence expressly permit market-index construction rather than only affiliate traffic, repricing or internal category management?
2. Can raw rows and policy-compliant evidence records be retained indefinitely, including after termination, for audit?
3. Can permanent, non-reconstructable derived indices be owned, stored, published and commercially exploited?
4. What internal, paying-customer and public display modes are allowed, with what attribution and delay?
5. Which raw and aggregate redistribution forms are prohibited?
6. Does the vendor warrant upstream retailer/database rights and provide appropriate indemnity?
7. Provide DDR5 field completeness for JAN/GTIN, manufacturer MPN, capacity, module count, speed, timings, condition, seller and channel.
8. Define whether price includes Japanese consumption tax and how points, coupons, member prices and rebates are represented.
9. Provide numeric delivery to a fixed Japanese postcode, or confirm that landed price cannot be derived.
10. Define stock/orderability, observation timestamp, source refresh, corrections, restatements and stale removal.
11. Supply retailer/panel membership, independence, online/offline split, weighting, source churn and historical continuity.
12. Provide SLA, rate limits, deprecation notice, schema versions and historical survival rights.

## Regional assessment (0–5)

| Dimension | Weight | Score | Contribution | Basis |
|---|---:|---:|---:|---|
| Rights | 30% | 1.5 | 0.450 | All viable uses need bespoke permission; marketplace APIs expressly conflict with commercial history and Amazon restricts retention/analysis. |
| Source breadth | 20% | 3.8 | 0.760 | Rakuten, Yahoo, Amazon, Kakaku, affiliate and POS-panel routes exist, though platform/panel overlap reduces independence. |
| Identifiers | 15% | 3.8 | 0.570 | JAN is strong in Yahoo, ValueCommerce and BCN; Rakuten/Amazon/Kakaku completeness and manufacturer MPN remain inconsistent. |
| Tax/delivery comparability | 15% | 2.8 | 0.420 | Tax-inclusive flags and Japanese conventions help, but numeric destination delivery and points/discount semantics are weak. |
| Stability | 10% | 3.1 | 0.310 | Mature platforms and enterprise panels exist; public APIs can change without SLA and licensed panel/change terms are unknown. |
| DDR5 relevance | 10% | 4.2 | 0.420 | BCN explicitly includes memory and the major marketplaces carry DDR5, subject to exact category/identifier verification. |
| **Total** | **100%** |  | **2.930 / 5 (2.93)** | Weighted arithmetic. |

**Score is not permission. Decision: NO-GO now.** The best first enquiry is BCN because DDR5 memory and JAN-level daily transaction data are explicitly evidenced. Kakaku Data Compass is second. Both require a human-approved commercial enquiry and an index-specific contract before any collection.

## Authoritative first-party evidence

All retrieved 5 August 2026.

- **[J1] Rakuten Group, 「楽天商品検索API (version:2026-07-01)」.**
  https://webservice.rakuten.co.jp/documentation/ichiba-item-search
- **[J2] Rakuten Group, 「楽天ウェブサービス規約」.**
  https://webservice.rakuten.co.jp/guide/rule
- **[J3] LINE Yahoo, 「ショッピング - Yahoo!デベロッパーネットワーク」.**
  https://developer.yahoo.co.jp/webapi/shopping/
- **[J4] LINE Yahoo, 「商品検索（v3）」.**
  https://developer.yahoo.co.jp/webapi/shopping/v3/itemsearch.html
- **[J5] LINE Yahoo, 「LINEヤフー共通利用規約」.**
  https://www.lycorp.co.jp/ja/company/terms/
- **[J6] LINE Yahoo, 「クレジット表示」.**
  https://developer.yahoo.co.jp/attribution/
- **[J7] LINE Yahoo, 「アフィリエイトプログラム」.**
  https://developer.yahoo.co.jp/webapi/shopping/affiliate.html
- **[J8] Amazon Associates, 「アソシエイト・プログラム・ポリシー」.**
  https://affiliate.amazon.co.jp/help/operating/policies
- **[J9] Amazon Associates, “PA-API 5 Deprecation Notice”.**
  https://affiliate.amazon.co.jp/creatorsapi/docs/en-us/paapiv5-deprecation
- **[J10] Amazon Associates, Creators API ItemInfo, OffersV2 and GetItems documentation.**
  https://affiliate.amazon.co.jp/creatorsapi/docs/en-us/api-reference/resources/item-info
  https://affiliate.amazon.co.jp/creatorsapi/docs/en-us/api-reference/resources/offersV2
  https://affiliate.amazon.co.jp/creatorsapi/docs/en-us/api-reference/operations/get-items
- **[J11] 株式会社カカクコム, 「価格.com利用規約」.**
  https://kakaku.com/terms/kiyaku.html
- **[J12] 株式会社カカクコム, 「価格.com Data Compassに関するお問い合わせ」.**
  https://help.kakaku.com/contact/kkcdatacompass.html
- **[J13] ValueCommerce, 「商品APIリファレンス（アフィリエイトサイト向け）」.**
  https://pub-docs.valuecommerce.ne.jp/docs/as-63-item-api/
- **[J14] ValueCommerce, 「アフィリエイトサイト運営者利用規約」.**
  https://www.valuecommerce.ne.jp/st_affiliate/terms.html
- **[J15] ValueCommerce, 「バリューコマース アフィリエイトAPIのご紹介」.**
  https://www.valuecommerce.ne.jp/feature/webservice.html
- **[J16] BCN Inc., 「BCNランキング・データサービス」.**
  https://data.bcnranking.com/
- **[J17] BCN Inc., 「マーケティング事業」.**
  https://www.bcn.co.jp/intro/markting/
- **[J18] BCN Inc., Expert plan category list, March 2025.**
  https://data.bcnranking.com/assets/pdf/expert_items.pdf
- **[J19] BCN Inc., Value/Mini category list, June 2025.**
  https://data.bcnranking.com/assets/pdf/value_items.pdf
- **[J20] NIQ/GfK, 「テクノロジー・耐久消費財」.**
  https://nielseniq.com/global/ja/industries/tech-and-durables/
- **[J21] NIQ/GfK, 「市場測定」.**
  https://nielseniq.com/global/ja/solutions/market-measurement/
- **[J22] NIQ/GfK Japan, 「2024年 家電・IT市場動向」, 20 February 2025.**
  https://nielseniq.com/global/ja/insights/report/2025/0220-mi/
- **[J23] NielsenIQ, “Terms of use”.**
  https://nielseniq.com/global/en/legal/terms-of-use/
