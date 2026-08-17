# Silicon Forecast

Silicon Forecast is an independent UK project building evidence-backed PC-component price history.

This repository currently contains:

- the product and technical source briefs;
- governed source-rights, methodology and provenance research;
- a public observation-first RAM website;
- a checksum-bound release containing qualifying dated UK primary-retail observations for exact MPNs;
- a candidate-only PostgreSQL/control-plane foundation; and
- no public aggregate price index, forecast, recommendation or automated editorial feed.

## Public website

The website publishes a deliberately narrow factual preview: dated, VAT-inclusive item-price observations for qualifying exact-MPN 32GB DDR5 kits, their evidence links and sparse raw histories. It does not claim live-market completeness, rank retailers, recommend purchases or expose an aggregate index.

Routes include:

- `/` — project overview and current research status;
- `/price-history/` — tracking status, verified-history empty state, qualification rules and release gates;
- `/categories/{ram,gpu,cpu,ssd}/` — category status pages;
- `/about/`;
- `/contact/`;
- `/privacy/`; and
- `/affiliate-disclosure/`.

## Local development

Requirements: Node.js 22 or later.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run check
```

This runs ESLint, the publisher-claim tests, TypeScript and the static production export.

To include the candidate database foundation test, with Docker running:

```bash
npm run check:full
```

This starts a disposable PostgreSQL 16 container, applies migrations `0001_foundation.sql` through `0003_candidate_primary_retail_persistence.sql`, exercises the additive catalogue review and candidate primary-retail persistence constraints, then removes the container. It uses fixture-only credentials and makes no production connection.

## Deployment

The canonical deployment target is Cloudflare Workers Static Assets. Cloudflare's Git build must use:

- build command: `npm run build`;
- deploy command: `npm run deploy`;
- output/assets directory: `out` (declared in `wrangler.jsonc`); and
- no `NEXT_PUBLIC_BASE_PATH` environment variable.

Do not select Cloudflare's OpenNext/SSR preset: this application intentionally uses Next.js static export and does not produce a `.next/standalone` server bundle.

`npm run deploy` validates the human approval record, exact policy, manifest, public payload and reviewed deployment-surface digest before invoking Wrangler. Any bound change fails closed and requires a new approval. `npm run deploy:dry-run` builds the site and verifies Wrangler can package the exported assets without making an external change.

`worker.mjs` enforces HTTP-to-HTTPS redirection and adds baseline security headers before serving the static assets.

GitHub Pages remains a temporary fallback through `.github/workflows/deploy-pages.yml`; its `/silicon-forecast` base path is set only inside that workflow.

The public site and custom domain are live through Cloudflare Workers. `hello@siliconforecast.com` is active through Cloudflare Email Routing and was verified end to end on 6 August 2026. Before accepting affiliate-network or advertiser terms:

1. capture the exact terms presented in the authenticated account flow;
2. re-read the privacy and affiliate disclosures against the actual hosting/tracking configuration;
3. treat each advertiser application and feed permission as a separate rights decision; and
4. retain network names only in non-visible ownership-verification metadata unless a live commercial relationship requires public disclosure.

Do not add analytics, paid affiliate tracking, unsupported sources or claims of complete market coverage without updating the disclosures and passing the project approval gates. Dated factual offers remain distinct from any future aggregate index or recommendation.
