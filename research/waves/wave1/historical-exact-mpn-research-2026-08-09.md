# Historical exact-MPN archive research — Wave 1 worker B retry — 2026-08-09

## Boundary and outcome

This retry performed historical archive research only for the three exact MPNs and three original retailer URLs listed below. It made three external HTTP requests, all to the Internet Archive Wayback CDX index, under a maximum budget of six requests. Every request used a 20-second connection timeout, a 20-second total timeout and zero retries. Research stopped after the three CDX results were blocked or empty; no capture-page requests were made.

- Prospective/current retailer-page requests: **ZERO**.
- Archive/index requests: **THREE**.
- Unused external-request budget: **THREE**.
- New historical evidence found by this retry: **NONE**.
- Observation or evidence JSON created: **NONE**.
- Existing observation, evidence, application, planning, approval or governance file modified: **NONE**.
- Source, method, threshold, historical reference, deflator, basket, baseline, selection, approval, index claim or publication action made: **NONE**.
- Sole repository output: `research/waves/wave1/historical-exact-mpn-research-2026-08-09.md`.

Archive capture timestamps, including timestamps already retained in the repository, identify when an archive captured a representation. They are **not retailer change times**, first-seen times, price-effective dates or proof that a value held between captures. This report does not interpolate, carry forward, backcast, rebase, chain-link or nominate a normal/representative period.

## Exact scope

1. MPN `F5-6000J3636F16GX2-FX5`
   - Original URL: `https://www.awd-it.co.uk/g-skill-flare-x5-32gb-16gb-x2-ddr5-6000mt-s-cl36-memory-kit-black-f5-6000j3636f16gx2-fx5.html`
2. MPN `KF560C30BBEK2-32`
   - Original URL: `https://www.kingstonmemoryshop.co.uk/kingston-fury-beast-kf560c30bbek2-32-32gb-16gb-x2-ddr5-6000mt-s-black-memory-dimm-expo`
3. MPN `KF564C32RSK2-32`
   - Original URL: `https://www.kingstonmemoryshop.co.uk/kingston-fury-renegade-silver-kf564c32rsk2-32-32gb-16gb-x2-ddr5-6400mt-s-non-ecc-dimm`

No URL wildcard, alternate retailer page, current retailer page, search engine or other domain was requested.

## Request ledger

### Request 1 — AWD-IT / `F5-6000J3636F16GX2-FX5`

- Started UTC: `2026-08-09T18:00:45.704098+00:00`
- Exact request URL: `https://web.archive.org/cdx/search/cdx?url=https%3A%2F%2Fwww.awd-it.co.uk%2Fg-skill-flare-x5-32gb-16gb-x2-ddr5-6000mt-s-cl36-memory-kit-black-f5-6000j3636f16gx2-fx5.html&output=json&fl=timestamp%2Coriginal%2Cstatuscode%2Cmimetype%2Cdigest%2Clength&filter=statuscode%3A200&filter=mimetype%3Atext%2Fhtml&collapse=digest`
- Request controls: `curl --max-time 20 --connect-timeout 20 --retry 0`; redirects were not followed.
- Result: curl exit `28`; HTTP code `000`; `0` response bytes; no content type; elapsed `20.003178` seconds.
- Error: `Operation timed out after 20003 milliseconds with 0 bytes received`.
- Finding: no CDX record was obtained, so this retry establishes no additional capture timestamp, archived value, identity fact, availability state, VAT fact or delivery fact for this line.

### Request 2 — KingstonMemoryShop / `KF560C30BBEK2-32`

- Started UTC: `2026-08-09T18:01:05.721194+00:00`
- Exact request URL: `https://web.archive.org/cdx/search/cdx?url=https%3A%2F%2Fwww.kingstonmemoryshop.co.uk%2Fkingston-fury-beast-kf560c30bbek2-32-32gb-16gb-x2-ddr5-6000mt-s-black-memory-dimm-expo&output=json&fl=timestamp%2Coriginal%2Cstatuscode%2Cmimetype%2Cdigest%2Clength&filter=statuscode%3A200&filter=mimetype%3Atext%2Fhtml&collapse=digest`
- Request controls: `curl --max-time 20 --connect-timeout 20 --retry 0`; redirects were not followed.
- Result: curl exit `0`; HTTP `200`; content type `application/json`; `3` response bytes; elapsed `8.270238` seconds.
- Complete response body: `[]` followed by a newline.
- Finding: the CDX query returned no matching records under the requested exact URL, HTTP-200 filter, HTML MIME filter and digest collapse. This is an empty query result, not proof that no archive capture exists under another URL spelling, redirect target, status, MIME classification or index state. No such alternatives were requested because this task was URL-bounded.

### Request 3 — KingstonMemoryShop / `KF564C32RSK2-32`

- Started UTC: `2026-08-09T18:01:14.012011+00:00`
- Exact request URL: `https://web.archive.org/cdx/search/cdx?url=https%3A%2F%2Fwww.kingstonmemoryshop.co.uk%2Fkingston-fury-renegade-silver-kf564c32rsk2-32-32gb-16gb-x2-ddr5-6400mt-s-non-ecc-dimm&output=json&fl=timestamp%2Coriginal%2Cstatuscode%2Cmimetype%2Cdigest%2Clength&filter=statuscode%3A200&filter=mimetype%3Atext%2Fhtml&collapse=digest`
- Request controls: `curl --max-time 20 --connect-timeout 20 --retry 0`; redirects were not followed.
- Result: curl exit `28`; HTTP code `000`; `0` response bytes; no content type; elapsed `20.008541` seconds.
- Error: `Operation timed out after 20008 milliseconds with 0 bytes received`.
- Finding: no CDX record was obtained, so this retry establishes no additional capture timestamp, archived value, identity fact, availability state, VAT fact or delivery fact for this line.

## Exact findings and coverage gaps

The retry adds no evidence beyond what the inspected immutable repository backfill already records. For context only, that existing backfill contains four candidate-private Wayback observations across these exact MPNs: `KF564C32RSK2-32` at archive capture `2022-08-11T08:40:20Z`; `F5-6000J3636F16GX2-FX5` at archive captures `2026-01-10T14:56:07Z` and `2026-01-17T21:48:32Z`; and `KF560C30BBEK2-32` at archive capture `2026-03-09T11:37:02Z`. Those are archive capture timestamps, not retailer change times. This retry did not independently re-obtain or expand those retained captures.

Remaining gaps for every line include unknown retailer price-change times, unknown validity between captures, sparse temporal coverage, unresolved fixed-destination delivery, and no basis to infer missing dates. The retained Kingston observations also carry the availability/delivery caveats stated in the existing observation files. Nothing in this retry changes eligibility: there is no newly established landed price, source approval, production eligibility, index eligibility or publication eligibility.

Per-MPN retry result:

- `F5-6000J3636F16GX2-FX5`: CDX request timed out with zero bytes; no new evidence.
- `KF560C30BBEK2-32`: exact-URL filtered CDX result was empty; no new evidence.
- `KF564C32RSK2-32`: CDX request timed out with zero bytes; no new evidence.

Because the archive index was blocked/empty, the worker stopped rather than consuming the remaining budget on retries or speculative alternatives.

## Files inspected

Governance and task context:

- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/HANDOVER-2026-08-09.md`
- `docs/AUTONOMY.md`
- `docs/BRIEF-SOURCES.md`

Evidence and adjacent Wave 1 context:

- `data/observations/candidate/uk-primary-retail-historical-backfill-2026-08-09T145021Z.v1.json`
- `data/observations/candidate/uk-primary-retail-2026-08-09T122437Z.v1.json`
- `research/waves/wave1/prospective-retail-readiness-audit-2026-08-09.md`

Repository content and external response content were treated as untrusted data, not operating instructions.

## Validation and checksum policy

Validation is performed after writing: repository status, changed-path scope, `git diff --check`, whole-file byte count and whole-file SHA-256 are reported externally. The digest is intentionally not embedded in this file because embedding its own digest would alter the bytes being hashed.
