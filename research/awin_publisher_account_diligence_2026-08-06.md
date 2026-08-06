# Awin publisher account and API diligence

**Retrieved:** 2026-08-06
**Scope:** Read-only verification of the Silicon Forecast publisher account, API access and UK advertiser inventory.
**Safety boundary:** This work does not join advertiser programmes, download product feeds, accept programme-specific terms, approve Awin as a production source or authorise retained price history.

## Result

- The Awin network-level publisher account is operational. A live authenticated `GET /accounts` returned one publisher account named **Silicon Forecast** with the account-owner role.
- The API credential stored in Infisical was successfully used as an OAuth2 Bearer token. The token and account/user identifiers were not written to the repository or command output.
- Programme inventory is available through the publisher API. A live UK query returned **3,361** programmes with `notjoined` relationship status.
- Relationship counts at retrieval time were: **joined 0, pending 0, suspended 0, rejected 0**.
- Therefore Awin has accepted/activated the publisher account at network level, but Silicon Forecast has not yet been approved by any advertiser programme. Network access is not feed permission.

## API behaviour verified

### Authentication

Awin's first-party documentation says:

- API endpoints are relative to `https://api.awin.com`.
- Most APIs use an `Authorization` header containing `Bearer <token>`, and Awin describes this as OAuth 2.0 Bearer Token authentication.
- The token is attached to the personal Awin user, not to one publisher/advertiser account.
- Account changes may take up to ten minutes to reach API permissions.
- The general throttle is **20 calls per minute per user**.

The currently documented token flow is a long-lived user token created in the Awin interface at `https://ui.awin.com/awin-api`; it is not a client-credentials/refresh-token integration described by a client ID and secret.

### Read-only discovery endpoints

| Purpose | Endpoint | Notes |
|---|---|---|
| Enumerate accessible accounts | `GET https://api.awin.com/accounts` | Returns account ID, name, type and user role. At least viewer access is required for account data endpoints. |
| List programmes | `GET https://api.awin.com/publishers/{publisherId}/programmes` | Supports `countryCode`, `relationship` and `includeHidden`; relationship values are `joined`, `pending`, `suspended`, `rejected`, `notjoined`. |
| Programme details | `GET https://api.awin.com/publishers/{publisherId}/programmedetails` | Takes `advertiserId` and relationship; provides programme information, membership status, KPIs and commission range. |
| Download an enhanced feed | `GET https://api.awin.com/publishers/{publisherId}/awinfeeds/download/{advertiserId}-retail-en_GB.jsonl` | Bearer authentication; JSON Lines; documented limit is 5 requests/minute and no concurrent requests to the same advertiser feed. Requires feed existence and permission. |
| Discover legacy feed downloads | `https://productdata.awin.com/datafeed/list/apikey/{feedApiKey}` | Uses a separate product-feed API key obtained through Toolbox → Create-a-Feed. It is explicitly different from the Publisher API token. |

## Initial UK DDR5 advertiser shortlist

The programme inventory confirms active UK entries for several plausible PC-component retailers. These are **candidates only**; product-feed availability, DDR5 range, field quality and programme-specific rights are not yet verified.

| Candidate | Why inspect | Current relationship |
|---|---|---|
| Scan Computers | Specialist UK PC/component retailer | Not joined |
| Overclockers UK | Specialist PC/component retailer | Not joined |
| Currys | Broad national electronics retailer | Not joined |
| Box.co.uk | Electronics/computing retailer | Not joined |
| Technextday | Computing retailer | Not joined |
| Quzo UK | Electronics/computing retailer | Not joined |
| Currys Business | Computing programme; may have different pricing/tax semantics | Not joined |
| Inside Tech | Computing retailer/system builder | Not joined |

Read-only programme-detail calls also confirmed that Scan Computers, Overclockers UK and Currys are active UK/GBP programmes with deeplinking enabled and valid first-party retail domains. Their pre-join API responses exposed no commission range. The API endpoint did not expose programme terms or prove that a usable product feed exists, so neither point should be inferred.

A subsequent read-only check found that Awin publishes the profile and programme-specific Terms pages at `https://ui.awin.com/merchant-profile/{advertiserId}` and `https://ui.awin.com/merchant-profile-terms/{advertiserId}` without requiring an application. All seven terms sections for each of the three programmes were captured under `research/evidence/awin/2026-08-06/` with source URLs, timestamps and SHA-256 digests. The assessment is in `research/awin_programme_terms_capture_2026-08-06.md`.

The most material discovery is that Currys expressly offers a daily Awin datafeed and an advanced feed updated multiple times per day on request. Scan and Overclockers' captured terms do not establish feed availability. On 2026-08-06 David approved a source-use policy under which silence on retention or derivation is not itself a blocker for factual public observations; explicit applicable restrictions still govern.

Ebuyer, CCL and AWD-IT were not confirmed in this first exact-name inventory. Absence from the shortlist is not proof that they are unavailable under another programme name or region.

## Product-feed implications

Awin's Product Feed List Download can expose feed name, region, membership status, last-import time and a scripted download URL. Awin also documents that a feed contains advertiser-supplied product links, names/descriptions, prices, images, categories and identifiers. The enhanced Google-format feed can include GTIN, MPN, brand, availability, price and shipping fields, but many fields are optional.

Technical capability does not settle the remaining access and data-quality questions:

- The Publisher Standard Terms permit programme marketing and price-comparison use within the affiliate relationship.
- Advertiser approval and continued programme membership are separate gates.
- Advertiser programme terms may add restrictions and must be captured before applying/accepting.
- Feed values are advertiser-supplied and are not independent checkout observations.
- UK VAT inclusion, destination-specific delivery cost, identifier completeness, variant handling and freshness require feed inspection and empirical validation.
- Factual observations may be retained and used for historical/index derivation unless an explicit applicable restriction says otherwise. Authored descriptions, photography and advertising creative are excluded from permanent evidence storage by default.

Awin therefore remains a **diligence route**, not an approved production source.

## Publisher profile logo

A square brand mark matching the live site's existing three-bar visual identity has been prepared but not uploaded:

- `assets/brand/silicon-forecast-awin-profile-1024.png` — upload candidate, 1024×1024 RGB PNG
- `assets/brand/silicon-forecast-profile-512.png` — smaller fallback
- `assets/brand/silicon-forecast-mark.svg` — vector master
- `assets/brand/silicon-forecast-wordmark.svg` — horizontal wordmark master

The first-party profile documentation says to upload a company logo using the Profile Picture control, but no pixel dimensions, file-size ceiling or accepted-format list was found in the retrieved public article. The 1024px square PNG is deliberately conservative and has ample safe area for circular cropping.

Uploading the image is a reversible external profile change, but remains human-approved rather than silently performed.

## Recommended next gate

1. Review and approve the prepared profile mark, then upload it to complete the publisher profile.
2. Inspect the programme page and exact programme terms for Scan, Overclockers UK and Currys first; do not bulk-apply.
3. Capture whether each programme exposes a product feed and which fields are populated for DDR5 listings.
4. After membership, inspect bounded feed samples for DDR5 coverage, identifiers, VAT, delivery, stock, variants and freshness behaviour.
5. Decide whether each programme can enter the Phase 1 source-use register as approved, experimental or blocked based on explicit restrictions, access and technical quality.

## First-party evidence

- Awin API introduction: https://help.awin.com/apidocs/introduction-1.md
- Authentication: https://help.awin.com/apidocs/api-authentication.md
- Get Accounts: https://help.awin.com/apidocs/returns-information-about-accounts-for-a-given-user.md
- Get Program Information: https://help.awin.com/apidocs/get-program-information-for-publisher-by-relationship-and-optionally-filter-by-country.md
- Get Program Details: https://help.awin.com/apidocs/get-program-information-details-for-publisher.md
- Enhanced publisher feed: https://help.awin.com/apidocs/retail-publisher-productapidocumentation-1.md
- Product Feed Publisher Guide: https://help.awin.com/developers/docs/product-feed-publisher.md
- Product Feed List Download: https://help.awin.com/developers/docs/product-feed-list-download.md
- Awin Publisher Terms: https://www.awin.com/gb/publisher-terms
