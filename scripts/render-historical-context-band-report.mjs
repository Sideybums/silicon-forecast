// Renders a private, local-only HTML view of the candidate observed-price
// envelope and its evidence scatter. This is a research artefact: it is not
// published, not linked from the public site, and approves nothing.
import { writeFileSync } from "node:fs";
import {
  ELIGIBLE_TRANCHES,
  VAT_RESOLUTION_FILE,
  applyVatResolutions,
  buildEnvelopeFromRepository,
  loadJson,
  normaliseObservation,
  quarterIdForTimestamp,
} from "../lib/historical-observed-price-envelope.mjs";

const root = new URL("../", import.meta.url);
const envelope = buildEnvelopeFromRepository(root);

const records = [];
for (const tranche of ELIGIBLE_TRANCHES) {
  const parsed = loadJson(new URL(`data/observations/candidate/${tranche.file}`, root));
  for (const raw of parsed.observations) {
    records.push(normaliseObservation(raw, { sourceFile: tranche.file, captureKind: tranche.captureKind }));
  }
}
const resolution = loadJson(new URL(VAT_RESOLUTION_FILE, root));
const observations = applyVatResolutions(records, resolution.resolutions, resolution.resolution_id);

const pounds = (minor) => (minor / 100).toFixed(2);
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const periods = envelope.periods;
const observed = periods.filter((p) => p.state === "observed");
const maxMinor = Math.max(...observed.map((p) => p.high.amount_minor));
const scale = (minor) => (minor / maxMinor) * 100;

// A period whose evidence comes from a single seller cannot distinguish a
// market move from a change in which shelf was sampled. Flag it explicitly.
const thin = (p) => p.state === "observed" && (p.distinct_seller_count < 2 || p.observation_count < 3);

const columns = periods
  .map((p) => {
    if (p.state !== "observed") {
      return `<div class="col gap"><div class="track"><div class="nodata">no evidence</div></div><div class="label">${p.period_id}</div></div>`;
    }
    const dots = observations
      .filter((o) => quarterIdForTimestamp(o.observed_at) === p.period_id)
      .map((o) => `<i style="bottom:${scale(o.amount_minor)}%" title="${escape(o.mpn)} — ${escape(o.seller_display_name)} — £${pounds(o.amount_minor)}"></i>`)
      .join("");
    const bottom = scale(p.low.amount_minor);
    const height = Math.max(scale(p.high.amount_minor) - bottom, 0.6);
    return `<div class="col${thin(p) ? " thin" : ""}">
      <div class="track">
        <div class="band" style="bottom:${bottom}%;height:${height}%"></div>
        <div class="dots">${dots}</div>
        <div class="hi" style="bottom:${scale(p.high.amount_minor)}%">£${pounds(p.high.amount_minor)}</div>
        <div class="lo" style="bottom:${bottom}%">£${pounds(p.low.amount_minor)}</div>
      </div>
      <div class="label">${p.period_id}<span class="n">n=${p.observation_count} · ${p.distinct_mpn_count} MPN · ${p.distinct_seller_count} seller${p.distinct_seller_count === 1 ? "" : "s"}${thin(p) ? " ⚠" : ""}</span></div>
    </div>`;
  })
  .join("");

const rows = observed
  .map(
    (p) => `<tr${thin(p) ? ' class="warn"' : ""}>
      <td>${p.period_id}</td><td class="num">£${pounds(p.low.amount_minor)}</td><td class="num">£${pounds(p.high.amount_minor)}</td>
      <td class="num">${p.observation_count}</td><td class="num">${p.distinct_mpn_count}</td><td class="num">${p.distinct_seller_count}</td>
      <td class="mono">${escape(p.low.mpn)} <span class="muted">@ ${escape(p.low.seller)}</span></td>
      <td class="mono">${escape(p.high.mpn)} <span class="muted">@ ${escape(p.high.seller)}</span></td>
    </tr>`,
  )
  .join("");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Silicon Forecast — candidate observed-price envelope (private)</title>
<style>
:root{color-scheme:light dark;--bg:#fbfbfa;--fg:#1a1a19;--mut:#6b6b66;--line:#e0e0dc;--band:#3d6b8e;--dot:#c2703d;--warn:#a8541f;--warnbg:#fdf6ef}
@media(prefers-color-scheme:dark){:root{--bg:#16161a;--fg:#e8e8e4;--mut:#9a9a94;--line:#2e2e34;--band:#6fa3cc;--dot:#e0925c;--warn:#e0a06a;--warnbg:#241c14}}
*{box-sizing:border-box}body{margin:0;padding:2rem 1.5rem 4rem;background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,-apple-system,system-ui,sans-serif}
.wrap{max-width:1180px;margin:0 auto}h1{font-size:1.45rem;margin:0 0 .3rem;letter-spacing:-.01em}
.sub{color:var(--mut);margin:0 0 1.4rem;font-size:.92rem}
.note{border-left:3px solid var(--warn);background:var(--warnbg);padding:.85rem 1rem;margin:0 0 1.6rem;font-size:.9rem;border-radius:0 4px 4px 0}
.note b{color:var(--warn)}
.chart{display:flex;gap:3px;height:340px;align-items:flex-end;border-bottom:1px solid var(--line);padding-bottom:0;overflow-x:auto}
.col{flex:1;min-width:44px;display:flex;flex-direction:column;height:100%}
.track{position:relative;flex:1;border-left:1px dotted transparent}
.band{position:absolute;left:22%;right:22%;background:var(--band);opacity:.34;border-radius:2px}
.col.thin .band{opacity:.16;background:repeating-linear-gradient(45deg,var(--band),var(--band) 3px,transparent 3px,transparent 6px)}
.dots i{position:absolute;left:50%;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:var(--dot);opacity:.9}
.hi,.lo{position:absolute;left:0;right:0;text-align:center;font-size:9.5px;color:var(--mut);white-space:nowrap}
.hi{transform:translateY(-115%)}.lo{transform:translateY(115%)}
.nodata{position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:9px;color:var(--mut);opacity:.5;writing-mode:vertical-rl;height:100%;display:flex;align-items:center;justify-content:center}
.label{padding-top:.45rem;text-align:center;font-size:10px;color:var(--mut);white-space:nowrap}
.label .n{display:block;font-size:8.5px;opacity:.75}
.col.gap .label{opacity:.45}
table{border-collapse:collapse;width:100%;margin-top:2.2rem;font-size:.88rem}
th,td{padding:.42rem .6rem;border-bottom:1px solid var(--line);text-align:left}
th{font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}
td.num{text-align:right;font-variant-numeric:tabular-nums}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.79rem}
.muted{color:var(--mut)}tr.warn{background:var(--warnbg)}
.legend{display:flex;gap:1.3rem;margin-top:1rem;font-size:.82rem;color:var(--mut);flex-wrap:wrap}
.key{display:inline-block;width:11px;height:11px;border-radius:2px;vertical-align:-1px;margin-right:.35rem}
footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--mut);font-size:.82rem}
</style></head><body><div class="wrap">
<h1>Candidate observed-price envelope — UK 32GB (2×16GB) DDR5</h1>
<p class="sub">${observed.length} of ${periods.length} quarters have evidence · ${observed.reduce((a, p) => a + p.observation_count, 0)} observations · all VAT-resolved · generated ${new Date().toISOString().slice(0, 10)}</p>

<div class="note"><b>This chart is not a price history and must not be read as one.</b> Under the ruling recorded in <code>data/reviews/product-tier-comparability-ruling-2026-08-10.json</code>, different product tiers must not be compared. These observations do not yet carry a tier, so every band below spans entry-tier and enthusiast-tier kits together. Movement between quarters therefore reflects <em>which products happened to be archived</em> at least as much as any change in the market. 2021-Q4 (£185.99, entry-tier Crucial DDR5-4800) against 2022-Q1 (£569.99, halo-tier G.Skill DDR5-6000 CL36) is the clearest case: both prices are verified correct, and the apparent 3× rise between them did not happen. Until tier is carried on every observation, treat this as a <em>coverage and integrity</em> artefact — it shows what evidence exists and where the gaps are, nothing more.</div>
<div class="note"><b>What the band is.</b> The lowest and highest price actually observed in each quarter — not an average, not an index. No central tendency is calculated because that would require an approved methodology this project does not have. Quarters marked ⚠ (hatched) rest on a single seller or fewer than three observations.</div>

<div class="chart">${columns}</div>
<div class="legend">
  <span><span class="key" style="background:var(--band);opacity:.34"></span>observed low–high range</span>
  <span><span class="key" style="background:var(--dot);border-radius:50%"></span>individual observation</span>
  <span>⚠ single-seller or fewer than 3 observations</span>
  <span>empty column = no evidence retained (a real gap, never interpolated)</span>
</div>

<table><thead><tr><th>Quarter</th><th class="num">Low</th><th class="num">High</th><th class="num">Obs</th><th class="num">MPNs</th><th class="num">Sellers</th><th>Low driven by</th><th>High driven by</th></tr></thead><tbody>${rows}</tbody></table>

<footer>Private candidate research artefact. No source, methodology, basket, reference period, deflator, aggregation rule or publication is approved. Archive capture timestamps are not retailer price-change times. Every point traces to an immutable observation in <code>data/observations/candidate/</code>.</footer>
</div></body></html>`;

const target = new URL("research/reports/historical-context-band-2026-08-10.html", root);
writeFileSync(target, html);
process.stdout.write(`wrote ${target.pathname}\n`);
