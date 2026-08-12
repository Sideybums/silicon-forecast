// Renders the private view of the matched-model index: the chained level, the
// evidence behind each link, and the points at which the chain stops.
//
// Research artefact. Not published, not linked from the public site, approves
// nothing.
import { writeFileSync } from "node:fs";
import { INDEX_PARAMETERS, buildIndexFromRepository } from "../lib/matched-model-index.mjs";

const root = new URL("../", import.meta.url);
const index = buildIndexFromRepository(root);
const observed = index.periods.filter((p) => p.state === "observed");
const suppressed = index.periods.filter((p) => p.state !== "observed");

const esc = (s) => String(s).replace(/[&<>"]/gu, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const json = JSON.stringify({ observed, suppressed, parameters: INDEX_PARAMETERS }).replace(/</gu, "\\u003c");

const peak = observed.reduce((a, p) => (p.index_value > a.index_value ? p : a));
const trough = observed.reduce((a, p) => (p.index_value < a.index_value ? p : a));
const latest = observed.at(-1);

const rows = index.periods
  .map((p) => {
    if (p.state !== "observed") {
      return `<tr class="sup"><td class="mono">${esc(p.period_id)}</td><td colspan="6">chain stops — only ${p.matched_product_count} matched product${p.matched_product_count === 1 ? "" : "s"}, below the floor of ${INDEX_PARAMETERS.minimum_matched_products_per_link}</td><td class="num">${p.distinct_products_in_period}</td></tr>`;
    }
    const pct = p.link === null ? null : (p.link - 1) * 100;
    return `<tr${p.reference_period ? ' class="base"' : ""}>
      <td class="mono">${esc(p.period_id)}${p.reference_period ? " <span class='tag'>base</span>" : ""}</td>
      <td class="num strong">${p.index_value.toFixed(1)}</td>
      <td class="num">${p.link === null ? "—" : p.link.toFixed(4)}</td>
      <td class="num${pct !== null && pct > 0 ? " up" : pct !== null && pct < 0 ? " down" : ""}">${pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}</td>
      <td class="num">${p.matched_product_count ?? "—"}</td>
      <td class="num">${p.relative_min === null ? "—" : p.relative_min.toFixed(2)}</td>
      <td class="num">${p.relative_max === null ? "—" : p.relative_max.toFixed(2)}</td>
      <td class="num">${p.distinct_products_in_period}</td>
    </tr>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Silicon Forecast — matched-model index (private)</title>
<style>
:root{--paper:#f2efe7;--raised:#fbfaf6;--ink:#171a18;--muted:#59615d;--rule:#c8c8bd;--rule2:#8b908b;--amber:#c46616;--amber-dark:#94501a;--amber-soft:#f0d2ad;--blue:#356a78;
--display:"Arial Narrow","Avenir Next Condensed","Roboto Condensed",sans-serif;--body:"Avenir Next","Segoe UI",system-ui,sans-serif;--mono:"SFMono-Regular",Consolas,"Liberation Mono",monospace}
*{box-sizing:border-box}
body{margin:0;padding:2.5rem 1.5rem 5rem;background:var(--paper);color:var(--ink);font-family:var(--body);line-height:1.55}
.shell{width:min(100%,78rem);margin-inline:auto}
h1,h2{font-family:var(--display);letter-spacing:-.025em;line-height:.98;margin-top:0}
h1{font-size:clamp(2.4rem,6vw,4.2rem);margin-bottom:.5rem}
h2{font-size:1.6rem;margin:0 0 1rem}
.eyebrow{margin:0 0 .8rem;font:700 .68rem/1.2 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--amber-dark)}
.lede{color:var(--muted);max-width:62ch;margin:0 0 2rem}
.headline{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--ink);background:var(--raised);margin-bottom:1.5rem}
.headline div{padding:1.2rem 1.3rem;border-right:1px solid var(--rule2)}
.headline div:last-child{border-right:0}
.headline span{display:block;margin-bottom:1.4rem;font:700 .6rem/1.2 var(--mono);letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.headline strong{display:block;font:800 2rem/1 var(--display)}
.headline em{display:block;margin-top:.3rem;font:.66rem/1.3 var(--mono);color:var(--muted);font-style:normal}
.panel{position:relative;border:2px solid var(--ink);background:var(--raised);box-shadow:10px 10px 0 var(--amber-soft);margin-bottom:2rem}
.panel-head{padding:1.3rem 1.5rem;border-bottom:1px solid var(--ink)}
.panel-head p{margin:.3rem 0 0;color:var(--muted);font:.72rem/1.4 var(--mono)}
.chartwrap{position:relative;padding:1rem 1rem .4rem}
svg{display:block;width:100%;height:24rem;overflow:visible}
.grid line{stroke:var(--rule);stroke-width:1}
.axis{fill:var(--muted);font:10px var(--mono)}
.baseline{stroke:var(--rule2);stroke-width:1;stroke-dasharray:5 5}
.seg{fill:none;stroke:var(--amber);stroke-width:3;vector-effect:non-scaling-stroke}
.area{fill:rgb(196 102 22/10%)}
.pt{fill:var(--raised);stroke:var(--amber);stroke-width:2.5;cursor:pointer}
.pt.base{fill:var(--ink);stroke:var(--ink)}
.pt:hover,.pt.on{fill:var(--amber);stroke:var(--ink)}
.hit{fill:transparent;cursor:pointer}
.pop{position:absolute;z-index:9;min-width:15rem;border:1px solid var(--ink);background:var(--raised);box-shadow:8px 8px 0 var(--ink);pointer-events:none;opacity:0;transition:opacity .09s}
.pop.show{opacity:1}
.pop header{padding:.55rem .75rem;background:var(--ink);color:var(--paper);display:flex;justify-content:space-between;gap:1rem;align-items:baseline}
.pop header span{font:700 .62rem/1 var(--mono);letter-spacing:.07em;text-transform:uppercase;color:var(--amber-soft)}
.pop header b{font:800 1.3rem/1 var(--display)}
.pop .rows{padding:.5rem .75rem .6rem}
.pop .row{display:flex;justify-content:space-between;gap:1.2rem;padding:.28rem 0;border-bottom:1px solid var(--rule);font:.73rem/1.3 var(--mono)}
.pop .row:last-child{border-bottom:0}
.pop .foot{padding:.45rem .75rem;border-top:1px solid var(--ink);background:#e8e3d8;font:.63rem/1.35 var(--mono);color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:.86rem;background:var(--raised)}
th,td{padding:.5rem .7rem;border-bottom:1px solid var(--rule);text-align:left}
th{font:700 .62rem/1.2 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--ink)}
td.num{text-align:right;font-variant-numeric:tabular-nums;font-family:var(--mono);font-size:.8rem}
td.strong{font-weight:700}
td.mono{font-family:var(--mono);font-size:.8rem}
tr.base{background:#efe7d9}
tr.sup td{color:var(--amber-dark);background:#f0e5d4;font-size:.8rem}
.tag{font:700 .55rem var(--mono);text-transform:uppercase;background:var(--ink);color:var(--paper);padding:.1rem .3rem}
.up{color:var(--amber-dark)}.down{color:var(--blue)}
.notice{border:1px solid var(--rule2);border-left:6px solid var(--blue);background:var(--raised);padding:1rem 1.2rem;margin-bottom:1rem;display:grid;grid-template-columns:200px 1fr;gap:1rem;font-size:.88rem}
.notice.warning{border-left-color:var(--amber);background:#f0e5d4}
.notice strong{font:700 .66rem/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.notice p{margin:0;color:var(--muted)}
.params{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--rule2);background:var(--raised);margin:1.5rem 0}
.params div{padding:.9rem 1.1rem;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.params span{display:block;font:700 .58rem/1.2 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem}
.params strong{font:700 .82rem/1.3 var(--mono)}
footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--rule2);color:var(--muted);font-size:.8rem;max-width:82ch}
@media(max-width:900px){.headline,.params{grid-template-columns:1fr 1fr}.notice{grid-template-columns:1fr}}
</style></head><body><div class="shell">

<p class="eyebrow">Private research artefact — not published, not approved</p>
<h1>UK 32GB DDR5 matched-model index</h1>
<p class="lede">A chained price index built only from products observed in both of two consecutive quarters, so that a change in which products we happen to observe cannot move the number. ${INDEX_PARAMETERS.reference_period} = ${INDEX_PARAMETERS.reference_value}.</p>

<div class="headline">
  <div><span>Latest — ${esc(latest.period_id)}</span><strong>${latest.index_value.toFixed(1)}</strong><em>${latest.matched_product_count} matched products</em></div>
  <div><span>Peak — ${esc(peak.period_id)}</span><strong>${peak.index_value.toFixed(1)}</strong><em>${(peak.index_value / 100).toFixed(2)}× the base period</em></div>
  <div><span>Trough — ${esc(trough.period_id)}</span><strong>${trough.index_value.toFixed(1)}</strong><em>cheapest quarter on record</em></div>
  <div><span>Latest vs trough</span><strong>${(latest.index_value / trough.index_value).toFixed(2)}×</strong><em>${esc(trough.period_id)} → ${esc(latest.period_id)}</em></div>
</div>

<div class="notice"><strong>Why matched-model</strong><p>Each quarter-to-quarter link is a geometric mean of price ratios taken over the products present in <em>both</em> quarters. A product entering or leaving the sample contributes nothing, so composition cannot move the index. This is also why clock speed needs no adjustment: every comparison is a product against itself, so speed never enters a comparison and cannot distort the result.</p></div>
<div class="notice warning"><strong>Limits</strong><p>Every product counts equally — no sales volumes exist for any UK retailer, so no weighted formula is available. The chain stops where matched evidence falls below the floor rather than bridging a gap. Archive capture timestamps are not retailer price-change times. Nothing here is an approved index: no source, methodology, basket, reference period or publication has been approved, and no public claim rests on these figures.</p></div>

<div class="panel">
  <div class="panel-head"><h2>Index level</h2><p>${observed.length} quarters chained · ${esc(observed[0].period_id)} → ${esc(latest.period_id)} · hover a point for the evidence behind it</p></div>
  <div class="chartwrap"><svg id="chart" viewBox="0 0 1000 400" preserveAspectRatio="none"></svg><div class="pop" id="pop"></div></div>
</div>

<h2>Every period, and every link's evidence</h2>
<table>
<thead><tr><th>Quarter</th><th class="num">Index</th><th class="num">Link</th><th class="num">Change</th><th class="num">Matched</th><th class="num">Min ratio</th><th class="num">Max ratio</th><th class="num">Products seen</th></tr></thead>
<tbody>${rows}</tbody></table>

<div class="params">
  <div><span>Formula</span><strong>Jevons — geometric mean of price relatives</strong></div>
  <div><span>Frequency</span><strong>${esc(INDEX_PARAMETERS.frequency)}</strong></div>
  <div><span>Reference period</span><strong>${esc(INDEX_PARAMETERS.reference_period)} = ${INDEX_PARAMETERS.reference_value}</strong></div>
  <div><span>Evidence floor</span><strong>${INDEX_PARAMETERS.minimum_matched_products_per_link} matched products per link</strong></div>
  <div><span>Weighting</span><strong>Unweighted — equal product weight</strong></div>
  <div><span>Gap policy</span><strong>Stop the chain; never bridge</strong></div>
</div>

<footer>Private candidate research artefact generated ${new Date().toISOString().slice(0, 10)}. Parameters were selected by the operator and are recorded in <code>lib/matched-model-index.mjs</code>. Every index level traces through the per-product series to immutable observations in <code>data/observations/candidate/</code> and their evidence ledgers. The derivation is pinned by a byte-compared golden fixture at <code>data/fixtures/matched-model-index.v1.json</code>.</footer>
</div>
<script id="data" type="application/json">${json}</script>
<script>
const D = JSON.parse(document.getElementById("data").textContent);
const pts = D.observed;
const svg = document.getElementById("chart");
const pop = document.getElementById("pop");
const ns = "http://www.w3.org/2000/svg";
const el = (n, a) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

const W = 1000, H = 400, L = 58, R = 20, T = 24, B = 44;
const lo = 0, hi = Math.max(...pts.map((p) => p.index_value)) * 1.12;
const X = (i) => L + (i / Math.max(pts.length - 1, 1)) * (W - L - R);
const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);

const g = el("g", { class: "grid" });
for (let i = 0; i <= 4; i++) {
  const v = lo + ((hi - lo) * i) / 4, y = Y(v);
  g.appendChild(el("line", { x1: L, x2: W - R, y1: y, y2: y }));
  const t = el("text", { x: L - 8, y: y + 3, class: "axis", "text-anchor": "end" });
  t.textContent = Math.round(v);
  g.appendChild(t);
}
svg.appendChild(g);

// The reference level, marked so the base is readable at a glance.
svg.appendChild(el("line", { x1: L, x2: W - R, y1: Y(100), y2: Y(100), class: "baseline" }));

let d = "";
pts.forEach((p, i) => { d += (i ? " L" : "M") + X(i) + " " + Y(p.index_value); });
svg.appendChild(el("path", { d: d + " L" + X(pts.length - 1) + " " + Y(lo) + " L" + X(0) + " " + Y(lo) + " Z", class: "area" }));
svg.appendChild(el("path", { d, class: "seg" }));

pts.forEach((p, i) => {
  const t = el("text", { x: X(i), y: H - B + 18, class: "axis", "text-anchor": "middle" });
  t.textContent = p.period_id;
  svg.appendChild(t);
  const c = el("circle", { cx: X(i), cy: Y(p.index_value), r: 5, class: "pt" + (p.reference_period ? " base" : "") });
  const hit = el("circle", { cx: X(i), cy: Y(p.index_value), r: 16, class: "hit" });
  const show = () => {
    document.querySelectorAll(".pt.on").forEach((n) => n.classList.remove("on"));
    c.classList.add("on");
    const pct = p.link === null ? null : (p.link - 1) * 100;
    pop.innerHTML =
      "<header><span>" + p.period_id + "</span><b>" + p.index_value.toFixed(1) + "</b></header><div class='rows'>" +
      (p.reference_period
        ? "<div class='row'><span>Reference period</span><b>= 100</b></div>"
        : "<div class='row'><span>Link</span><b>" + p.link.toFixed(4) + "</b></div>" +
          "<div class='row'><span>Change</span><b>" + (pct > 0 ? "+" : "") + pct.toFixed(1) + "%</b></div>" +
          "<div class='row'><span>Matched products</span><b>" + p.matched_product_count + "</b></div>" +
          "<div class='row'><span>Ratio range</span><b>" + p.relative_min.toFixed(2) + "–" + p.relative_max.toFixed(2) + "</b></div>" +
          "<div class='row'><span>Median ratio</span><b>" + p.relative_median.toFixed(2) + "</b></div>") +
      "</div><div class='foot'>" + p.distinct_products_in_period + " distinct products observed this quarter</div>";
    pop.classList.add("show");
    const box = svg.getBoundingClientRect(), wb = pop.parentElement.getBoundingClientRect();
    const sx = (X(i) / W) * box.width + (box.left - wb.left);
    const sy = (Y(p.index_value) / H) * box.height + (box.top - wb.top);
    let x = sx + 18, y = sy - pop.offsetHeight / 2;
    if (x + pop.offsetWidth > wb.width - 4) x = sx - pop.offsetWidth - 18;
    y = Math.max(4, Math.min(y, wb.height - pop.offsetHeight - 4));
    pop.style.left = Math.max(4, x) + "px";
    pop.style.top = y + "px";
  };
  hit.addEventListener("mouseenter", show);
  hit.addEventListener("click", show);
  svg.appendChild(c);
  svg.appendChild(hit);
});
svg.addEventListener("mouseleave", () => {
  pop.classList.remove("show");
  document.querySelectorAll(".pt.on").forEach((n) => n.classList.remove("on"));
});
</script>
</body></html>`;

const target = new URL("research/reports/matched-model-index-2026-08-12.html", root);
writeFileSync(target, html);
process.stdout.write(`wrote ${target.pathname}\n`);
process.stdout.write(`chain: ${observed[0].period_id} -> ${latest.period_id} (${observed.length} quarters)\n`);
process.stdout.write(`latest ${latest.index_value} · peak ${peak.index_value} (${peak.period_id}) · trough ${trough.index_value} (${trough.period_id})\n`);
process.stdout.write(`suppressed periods: ${suppressed.map((p) => `${p.period_id}(n=${p.matched_product_count})`).join(", ") || "none"}\n`);
