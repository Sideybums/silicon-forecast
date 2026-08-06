# Silicon Forecast

Silicon Forecast is an independent UK project building evidence-backed PC-component price history.

This repository currently contains:

- the product and technical source briefs;
- the governed methodology and source-rights research;
- a public pre-launch publisher-review website; and
- no live retailer feeds or production price index.

## Public website

The website is intentionally honest about its status. Its chart contains synthetic demonstration values and is not a live price comparison or purchasing recommendation.

Routes include:

- `/` — project overview and demonstration chart;
- `/price-history/` — chart explanation and methodology outline;
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

## Deployment

The canonical deployment target is Cloudflare Workers Static Assets. Cloudflare's Git build must use:

- build command: `npm run build`;
- deploy command: `npm run deploy`;
- output/assets directory: `out` (declared in `wrangler.jsonc`); and
- no `NEXT_PUBLIC_BASE_PATH` environment variable.

Do not select Cloudflare's OpenNext/SSR preset: this application intentionally uses Next.js static export and does not produce a `.next/standalone` server bundle.

`npm run deploy:dry-run` builds the site and verifies Wrangler can package the exported assets without making an external change.

`worker.mjs` enforces HTTP-to-HTTPS redirection and adds baseline security headers before serving the static assets.

GitHub Pages remains a temporary fallback through `.github/workflows/deploy-pages.yml`; its `/silicon-forecast` base path is set only inside that workflow.

The public site and custom domain are live through Cloudflare Workers. `hello@siliconforecast.com` is active through Cloudflare Email Routing and was verified end to end on 6 August 2026. Before accepting affiliate-network or advertiser terms:

1. capture the exact terms presented in the authenticated account flow;
2. re-read the privacy and affiliate disclosures against the actual hosting/tracking configuration;
3. treat each advertiser application and feed permission as a separate rights decision; and
4. retain network names only in non-visible ownership-verification metadata unless a live commercial relationship requires public disclosure.

Do not add analytics, affiliate tracking, live offers or claims of complete market coverage without updating the disclosures and passing the project approval gates.
