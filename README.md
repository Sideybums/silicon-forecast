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

Requirements: Node.js 20.9 or later.

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

Pushes to `main` deploy the static export to GitHub Pages through `.github/workflows/deploy-pages.yml`. The temporary Pages base path is configured as `/silicon-forecast`.

Before an affiliate-network application is submitted:

1. purchase and connect `siliconforecast.com`;
2. activate and test `hello@siliconforecast.com`;
3. attach the custom domain to the host;
4. verify HTTPS and every public route; and
5. re-read the privacy and affiliate disclosures against the actual hosting/tracking configuration.

Do not add analytics, affiliate tracking, live offers or claims of complete market coverage without updating the disclosures and passing the project approval gates.
