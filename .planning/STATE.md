# Project State

## Project Reference

See `.planning/PROJECT.md` (updated 2026-08-05).

**Core value:** Produce one lawful, accurate and reproducible regional component-price index whose every value can be traced to immutable source observations.
**Current focus:** Await advertiser decisions while building candidate-only Phase 2 foundations; production and publication remain locked

## Status

- Project initialised from the supplied product plan and technical specification.
- No production data/index application exists yet; only the approved static pre-launch publisher-review site is implemented.
- Phase 1 research compared 26 candidate access routes across the US, UK, Germany and Japan using first-party evidence retrieved on 2026-08-05.
- A source-use evidence template and register distinguish technical access, applicable terms, explicit restrictions, evidence handling, display and redistribution.
- The UK is selected as the first **diligence region only**; no production region or production source is approved.
- Methodology `SF-GB-DDR5-32-UDIMM-OFFER` v0.1 is an executable draft with 20 proposed thresholds, all locked pending human approval.
- External publish, spend, production mutation, source approval and methodology-change locks remain on.
- David explicitly approved a public promotional pre-launch website for publisher-network review. This approval covers only static project, demonstration and policy content; it does not approve publication of live offers, index values, forecasts or retailer claims.
- PriceRunner is no longer the initial diligence route because its paid model does not fit the bootstrapped stage. The current order is Awin first, Webgains second and CJ Affiliate only if it materially improves lawful coverage.
- The static pre-launch site is live at `https://siliconforecast.com`, deployed from GitHub through Cloudflare Workers; `www` and plaintext HTTP permanently redirect to the HTTPS apex domain.
- The affiliate disclosure is network-neutral. Non-visible page metadata names Awin, Webgains and CJ Affiliate solely for publisher-ownership verification and explicitly claims no approval, endorsement or partnership.
- `hello@siliconforecast.com` is operational through Cloudflare Email Routing to David's verified destination inbox. Public MX and SPF records, the exact forwarding rule and real inbound delivery were verified on 2026-08-06.
- Awin's live `GET /accounts` API now verifies an operational Silicon Forecast publisher account with account-owner access. The OAuth2 Bearer credential is stored in Infisical and was exercised without exposing it.
- A live UK programme inventory returned 3,361 not-joined programmes and no joined, pending, suspended or rejected relationships. Network-level acceptance is therefore verified, but no advertiser or product feed is approved yet.
- Initial active UK candidates include Scan Computers, Overclockers UK, Currys, Box.co.uk, Technextday and Quzo UK. Each remains a separate human-gated programme application and technical/source-use review.
- Awin's public programme profiles and all seven programme-specific terms sections for Scan Computers, Overclockers UK and Currys were captured on 2026-08-06 with raw HTML and SHA-256 manifests. Currys expressly offers a daily Awin product feed and a higher-frequency advanced feed on request; Scan and Overclockers' captured terms do not establish feed availability.
- David approved the operating interpretation that publicly observable factual offer data may be retained and used for historical/index derivation without seeking bespoke permission where applicable terms are silent. Explicit restrictions still govern; authored descriptions, photography and advertising creative are excluded from permanent evidence storage by default.
- VAT, delivery, MPN/GTIN, variant and stock semantics are methodology/data-quality questions rather than permission questions.
- Currys was selected as the first application because it expressly supports comparison engines and daily/higher-frequency feeds. David approved submission, the application was sent on 2026-08-06 under the `Content` promotion type and Awin now shows `Pending Approval`.
- A square Silicon Forecast profile mark and vector masters are prepared under `assets/brand/`; David is handling the profile upload separately.
- The horizontal wordmark exports were corrected to a tight 1092×396 canvas with balanced 24 px artwork margins. Opaque, alpha-PNG and tightened SVG masters are bundled in `assets/brand/silicon-forecast-logo-pack.zip`.
- A first candidate-only Phase 2 PostgreSQL foundation now exists in `db/migrations/0001_foundation.sql`. It seeds GB as non-public, keeps the methodology draft inactive, creates append-only catalogue/governance records and permits no enabled workers or unlock events.
- Seven global controls are seeded locked: external publication, spend, production mutation, methodology change, source approval, production activation and editorial activation.
- `docs/EDITORIAL-INTELLIGENCE-DESIGN.md` records the dormant news/event workflow, evidence model, human-review states, hostile-source controls and later activation gates. It authorises no live collection, scheduling, public analysis, forecast or recommendation.
- `npm run check:full` now verifies lint, 25 site, worker, catalogue, evidence, review-transition and fixture tests, the static production build, and a disposable PostgreSQL 16 migration/integration test pinned by image digest.
- A four-product candidate DDR5 catalogue now exists in `data/catalogue/ddr5-32gb-seed.v1.json`, covering exact Kingston and G.SKILL MPNs. Four minimal factual evidence extracts are checksum-pinned; full authored pages are not retained, and unstable or mismatched candidate pages were rejected rather than inferred.
- `data/fixtures/listing-matches.v1.json` contains 20 labelled positive, negative, abstention and unsupported examples. Product identity is kept separate from index eligibility and auto-confirmation remains locked.
- David completed human review of all four catalogue products and all 20 listing labels on 2026-08-06. The approval is captured additively in `data/reviews/ddr5-32gb-seed-review-2026-08-06.json` for fixture use only; the original candidate inputs remain unchanged and no production, methodology, baseline, automatic-match or publication gate was unlocked.
- The candidate catalogue still renders into PostgreSQL as draft-only records during disposable integration tests. Applying reviewed database revisions and least-privilege human approval functions remains later Phase 2 work.

## Current Phase

Phase 1 — Source and Methodology Gate is **evidence-complete but access/methodology-blocked**. The source-use interpretation is human-approved, but no advertiser programme/feed is joined or technically validated and the deterministic methodology thresholds remain unapproved. A bounded Phase 2 foundation slice is proceeding in parallel using candidate/fixture state only; Phase 2 is not complete and no Phase 1 gate has been bypassed.

## Decision

- Selected diligence region: United Kingdom.
- Approved production region: none.
- Production collection/index: no-go.
- Public/commercial price or index display: no-go; static pre-launch project information is the approved exception.
- First diligence target: authorised UK affiliate publisher feeds, beginning with Awin and then Webgains; CJ Affiliate is an optional supplement.
- Source-use posture: factual public offer observations may be retained and used in derived history unless an explicit applicable restriction says otherwise. Affiliate/feed access terms, attribution, freshness and current-offer presentation still govern.
- Public promotional site: approved for publisher-network legitimacy review, provided it remains visibly pre-launch and uses no live or purportedly current prices.
- Germany is the quantitative fallback if the UK continuation test fails; its higher score does not override solute/billiger.de's explicit 24-hour retention conflict.

## Blockers

- SRC-02 is not met: no three-source approved portfolio or approved reduced-source experimental designation exists.
- Currys programme approval and feed access are pending; no Awin advertiser programme has yet granted feed access to Silicon Forecast.
- VAT inclusion, numeric delivery to the fixed UK destination, source overlap and identifier completeness require feed inspection and empirical validation.
- Advertiser-programme applications, programme-term acceptance, profile publication and spend require explicit human approval.
- Awin's publisher OAuth token does not provide the separate legacy product-feed API key; feed existence, access and field quality remain unverified until programme membership advances.
- Methodology thresholds and production activation remain unapproved.

## Next Action

Wait for advertiser decisions. If an Awin programme is accepted, inspect its available feeds with bounded read-only samples and validate DDR5 coverage, VAT-inclusive prices, delivery, identifiers, variants, stock and freshness. In parallel, extend exact first-party manufacturer coverage conservatively and implement least-privilege database/control-plane conventions, including additive reviewed catalogue revisions derived from the approved fixture review. Live news gathering and market analysis remain dormant until their later activation gates; production ingestion and all public price/index/editorial publication remain locked.

## Safety Note

The completed Phase 1 work and parallel foundation slice are Tier 1/Tier 2 research, documentation, fixture data and local/test infrastructure. David separately approved the Currys programme application and acceptance of its captured terms; that application is now pending. No production-source activation, live news collection, spend, methodology change or public price/index/editorial publication is authorised.

---
*State created: 2026-08-05*
*Last updated: 2026-08-06 after David's additive human approval of the candidate catalogue and labelled fixture set*
