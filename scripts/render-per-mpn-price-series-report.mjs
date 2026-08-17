// Renders the private per-product price view: one line per exact MPN, each
// point the median across the retailers holding that part in that month, with
// a hover breakdown showing every contributing retailer price.
//
// This is a research artefact. It is not published, not linked from the public
// site, and approves nothing.
import { writeFileSync } from "node:fs";
import { buildSeriesFromRepository } from "../lib/per-mpn-price-series.mjs";

const root = new URL("../", import.meta.url);

// Everything with at least two months is carried into the page so the filters
// can widen; the interface opens on the stricter, more defensible default.
const series = buildSeriesFromRepository(root, { minMonths: 2, minSellers: 1 });

const allMonths = [...new Set(series.flatMap((s) => s.points.map((p) => p.month)))].sort();
const observedPoints = series.flatMap((s) => s.points.filter((p) => p.state === "observed"));
const multiSellerPoints = observedPoints.filter((p) => p.seller_count >= 2);
const sellers = [...new Set(observedPoints.flatMap((p) => p.contributors.map((c) => c.seller_display_name)))].sort();

// Only what the page draws, keeping the embedded payload small.
const payload = {
  months: allMonths,
  sellers,
  series: series.map((s) => ({
    mpn: s.mpn,
    speed: s.speed_mts,
    months: s.month_count,
    sellerCount: s.seller_count,
    multiSellerMonths: s.multi_seller_month_count,
    points: s.points
      .filter((p) => p.state === "observed")
      .map((p) => ({
        m: p.month,
        v: p.median_minor,
        n: p.seller_count,
        lo: p.low_minor,
        hi: p.high_minor,
        c: p.contributors.map((c) => [c.seller_display_name, c.amount_minor, c.capture_count]),
        x: p.excluded_contributors.map((c) => [c.seller_display_name, c.amount_minor, c.exclusion_reason]),
      })),
  })),
};

const speeds = [...new Set(series.map((s) => s.speed_mts))].filter((s) => s !== null).sort((a, b) => a - b);

// Embedded JSON must not be able to close the script element early.
const json = JSON.stringify(payload).replace(/</gu, "\\u003c");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Silicon Forecast — per-product price series (private)</title>
<style>
:root{--paper:#f2efe7;--raised:#fbfaf6;--ink:#171a18;--muted:#59615d;--rule:#c8c8bd;--rule2:#8b908b;--amber:#c46616;--amber-dark:#94501a;--amber-soft:#f0d2ad;--blue:#356a78;
--display:"Arial Narrow","Avenir Next Condensed","Roboto Condensed",sans-serif;--body:"Avenir Next","Segoe UI",system-ui,sans-serif;--mono:"SFMono-Regular",Consolas,"Liberation Mono",monospace}
*{box-sizing:border-box}
body{margin:0;padding:2.5rem 1.5rem 5rem;background:var(--paper);color:var(--ink);font-family:var(--body);line-height:1.55}
.shell{width:min(100%,84rem);margin-inline:auto}
h1,h2,h3{font-family:var(--display);letter-spacing:-.025em;line-height:.98;margin-top:0}
h1{font-size:clamp(2.2rem,5vw,3.6rem);margin-bottom:.6rem}
.eyebrow{margin:0 0 .8rem;font:700 .68rem/1.2 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--amber-dark)}
.lede{color:var(--muted);max-width:64ch;margin:0 0 2rem}
.notice{border:1px solid var(--rule2);border-left:6px solid var(--blue);background:var(--raised);padding:1rem 1.2rem;margin-bottom:1rem;display:grid;grid-template-columns:190px 1fr;gap:1rem;font-size:.88rem}
.notice.warning{border-left-color:var(--amber);background:#f0e5d4}
.notice strong{font:700 .68rem/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.notice p{margin:0;color:var(--muted)}
.controls{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:2rem 0 1rem;padding-bottom:1rem;border-bottom:1px solid var(--rule2)}
.controls .lbl{font:700 .62rem/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-right:.3rem}
button.chip{min-height:2.1rem;padding:.45rem .7rem;border:1px solid var(--ink);background:transparent;color:var(--ink);font:700 .66rem/1 var(--mono);letter-spacing:.05em;text-transform:uppercase;cursor:pointer}
button.chip:hover{background:var(--amber-soft)}
button.chip[aria-pressed=true]{background:var(--ink);color:var(--paper)}
.layout{display:grid;grid-template-columns:19rem minmax(0,1fr);gap:1.5rem;align-items:start}
.picker{border:1px solid var(--ink);background:var(--raised);max-height:38rem;overflow-y:auto}
.picker-head{position:sticky;top:0;padding:.7rem .9rem;background:var(--ink);color:var(--paper);font:700 .62rem/1 var(--mono);letter-spacing:.07em;text-transform:uppercase;z-index:2}
.picker button{display:block;width:100%;text-align:left;padding:.6rem .9rem;border:0;border-bottom:1px solid var(--rule);background:transparent;cursor:pointer;font-family:var(--body)}
.picker button:hover{background:var(--amber-soft)}
.picker button[aria-current=true]{background:var(--ink);color:var(--paper)}
.picker .mpn{display:block;font:700 .78rem/1.2 var(--mono);word-break:break-all}
.picker .meta{display:block;margin-top:.2rem;font:.66rem/1.3 var(--mono);color:var(--muted)}
.picker button[aria-current=true] .meta{color:#b6bcb8}
.panel{position:relative;border:2px solid var(--ink);background:var(--raised);box-shadow:10px 10px 0 var(--amber-soft)}
.panel-head{padding:1.4rem 1.5rem;border-bottom:1px solid var(--ink);display:flex;justify-content:space-between;align-items:flex-end;gap:1.5rem;flex-wrap:wrap}
.panel-head h2{margin:0;font-size:clamp(1.4rem,3vw,2.1rem);word-break:break-all}
.panel-head .sub{margin:.35rem 0 0;color:var(--muted);font:.72rem/1.4 var(--mono)}
.stat{text-align:right;font:.66rem/1.4 var(--mono);color:var(--muted);white-space:nowrap}
.stat b{display:block;font:800 1.5rem/1 var(--display);color:var(--ink)}
.chartwrap{position:relative;padding:1rem 1rem .4rem}
svg{display:block;width:100%;height:26rem;overflow:visible}
.grid line{stroke:var(--rule);stroke-width:1}
.axis{fill:var(--muted);font:10px var(--mono)}
.seg{fill:none;stroke:var(--amber);stroke-width:2.5;vector-effect:non-scaling-stroke}
.seg.gap{stroke:var(--rule2);stroke-width:1.5;stroke-dasharray:4 4}
.rng{stroke:var(--amber-dark);stroke-width:1;opacity:.5}
.pt{fill:var(--raised);stroke:var(--amber);stroke-width:2.5;cursor:pointer}
.pt.solo{fill:var(--raised);stroke:var(--rule2)}
.pt:hover,.pt.on{fill:var(--amber);stroke:var(--ink)}
.hit{fill:transparent;cursor:pointer}
/* The hover breakdown: sharp corners and an offset ink shadow, matching the
   site's panels rather than a generic rounded tooltip. */
.pop{position:absolute;z-index:9;min-width:16rem;max-width:22rem;border:1px solid var(--ink);background:var(--raised);box-shadow:8px 8px 0 var(--ink);padding:0;pointer-events:none;opacity:0;transition:opacity .09s ease}
.pop.show{opacity:1}
.pop header{padding:.55rem .75rem;background:var(--ink);color:var(--paper);display:flex;justify-content:space-between;gap:1rem;align-items:baseline}
.pop header span{font:700 .62rem/1 var(--mono);letter-spacing:.07em;text-transform:uppercase;color:var(--amber-soft)}
.pop header b{font:800 1.25rem/1 var(--display)}
.pop .rows{padding:.5rem .75rem .6rem}
.pop .row{display:flex;justify-content:space-between;gap:1.2rem;padding:.3rem 0;border-bottom:1px solid var(--rule);font:.74rem/1.3 var(--mono)}
.pop .row:last-child{border-bottom:0}
.pop .row.ex{color:var(--muted);text-decoration:line-through}
.pop .row b{font-weight:700}
.pop .foot{padding:.45rem .75rem;border-top:1px solid var(--ink);background:#e8e3d8;font:.64rem/1.35 var(--mono);color:var(--muted)}
.pop .foot.solo{background:#f0e5d4;color:var(--amber-dark)}
.legend{display:flex;flex-wrap:wrap;gap:1.2rem;padding:.8rem 1.5rem;border-top:1px solid var(--rule);font:.66rem/1.4 var(--mono);color:var(--muted)}
.legend i{display:inline-block;width:.7rem;height:.7rem;border:2px solid var(--amber);background:var(--raised);vertical-align:-1px;margin-right:.35rem}
.legend i.solo{border-color:var(--rule2)}
.legend i.dash{width:1.4rem;height:0;border:0;border-top:2px dashed var(--rule2)}
footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--rule2);color:var(--muted);font-size:.8rem;max-width:80ch}
@media(max-width:900px){.layout{grid-template-columns:1fr}.picker{max-height:16rem}.notice{grid-template-columns:1fr}}
</style></head><body><div class="shell">

<p class="eyebrow">Private research artefact — not published</p>
<h1>Per-product price series</h1>
<p class="lede">One line per exact manufacturer part number. Each point is the median of what the retailers we hold were asking for that same part in that calendar month. Hover any point to see every retailer price behind it.</p>

<div class="notice"><strong>What a point is</strong><p>The median across <em>distinct retailers</em> for one exact MPN in one month. A retailer captured several times in a month counts once, using its own median for that month, so retailers are not weighted by how often the archive happened to crawl them. Only VAT-inclusive prices form the median; anything whose VAT basis was never established is shown struck through and excluded rather than mixed in. Prices are never converted between VAT bases.</p></div>
<div class="notice warning"><strong>What it is not</strong><p>This is not an index and nothing here is aggregated across products. Points marked in grey rest on a single retailer and are not a market median. Months with no capture are left empty and joined by a dashed line — never interpolated. Archive capture timestamps are not retailer price-change times. No source, methodology, basket, aggregation rule or publication is approved.</p></div>

<div class="controls">
  <span class="lbl">Speed</span>
  <button class="chip" data-speed="all" aria-pressed="true">All</button>
  ${speeds.map((s) => `<button class="chip" data-speed="${s}" aria-pressed="false">${s}</button>`).join("")}
  <button class="chip" data-speed="unknown" aria-pressed="false">Unread</button>
  <span class="lbl" style="margin-left:1.2rem">Coverage</span>
  <button class="chip" id="fDepth" aria-pressed="true">6+ months</button>
  <button class="chip" id="fMulti" aria-pressed="true">2+ retailers</button>
</div>

<div class="layout">
  <div class="picker"><div class="picker-head" id="pickCount">products</div><div id="pickList"></div></div>
  <div class="panel">
    <div class="panel-head">
      <div><h2 id="pMpn">—</h2><p class="sub" id="pSub">—</p></div>
      <div class="stat" id="pStat"></div>
    </div>
    <div class="chartwrap"><svg id="chart" viewBox="0 0 1000 420" preserveAspectRatio="none" role="img" aria-label="Price series"></svg><div class="pop" id="pop"></div></div>
    <div class="legend">
      <span><i></i>median across 2+ retailers</span>
      <span><i class="solo"></i>single retailer only — not a market median</span>
      <span><i class="dash"></i>gap in evidence, never interpolated</span>
      <span>vertical bar = spread between contributing retailers</span>
    </div>
  </div>
</div>

<footer>Private candidate research artefact generated ${new Date().toISOString().slice(0, 10)}. Every point traces to immutable observations in <code>data/observations/candidate/</code> and their evidence ledgers. The median across retailers is an aggregation rule applied at the operator's direction for this private view only; it is not approved for any index, publication or public claim.</footer>
</div>
<script id="data" type="application/json">${json}</script>
<script>
const DATA = JSON.parse(document.getElementById("data").textContent);
const money = (m) => "£" + (m / 100).toFixed(2);
const monthLabel = (m) => { const [y, mo] = m.split("-"); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+mo - 1] + " " + y; };
const monthIndex = (m) => (+m.slice(0, 4)) * 12 + (+m.slice(5, 7)) - 1;

let speed = "all", depth = true, multi = true, current = null;

function visible() {
  return DATA.series.filter((s) => {
    if (speed === "unknown" && s.speed !== null) return false;
    if (speed !== "all" && speed !== "unknown" && s.speed !== +speed) return false;
    if (depth && s.months < 6) return false;
    if (multi && s.sellerCount < 2) return false;
    return true;
  });
}

function renderPicker() {
  const list = visible();
  document.getElementById("pickCount").textContent = list.length + " product" + (list.length === 1 ? "" : "s");
  const host = document.getElementById("pickList");
  host.innerHTML = "";
  if (!list.length) {
    host.innerHTML = '<div style="padding:1rem;color:var(--muted);font:.75rem var(--mono)">No product matches these filters.</div>';
    draw(null);
    return;
  }
  if (!current || !list.some((s) => s.mpn === current.mpn)) current = list[0];
  for (const s of list) {
    const b = document.createElement("button");
    b.setAttribute("aria-current", s.mpn === current.mpn ? "true" : "false");
    b.innerHTML = '<span class="mpn"></span><span class="meta"></span>';
    b.querySelector(".mpn").textContent = s.mpn;
    b.querySelector(".meta").textContent =
      s.months + " months · " + s.sellerCount + " retailer" + (s.sellerCount === 1 ? "" : "s") +
      (s.speed ? " · " + s.speed + " MT/s" : "") + " · " + s.multiSellerMonths + " multi";
    b.onclick = () => { current = s; renderPicker(); };
    host.appendChild(b);
  }
  draw(current);
}

function draw(s) {
  const svg = document.getElementById("chart");
  const pop = document.getElementById("pop");
  pop.classList.remove("show");
  svg.innerHTML = "";
  document.getElementById("pMpn").textContent = s ? s.mpn : "—";
  document.getElementById("pSub").textContent = s
    ? (s.speed ? s.speed + " MT/s (read from the part number, for grouping only) · " : "") +
      s.points.length + " months · " + s.sellerCount + " retailers · " + s.multiSellerMonths + " months with 2+ retailers"
    : "—";
  document.getElementById("pStat").innerHTML = "";
  if (!s || !s.points.length) return;

  const W = 1000, H = 420, L = 62, R = 18, T = 22, B = 46;
  const pts = s.points;
  const idx = pts.map((p) => monthIndex(p.m));
  const minI = Math.min(...idx), maxI = Math.max(...idx);
  const span = Math.max(maxI - minI, 1);
  const lows = pts.map((p) => p.lo), highs = pts.map((p) => p.hi);
  let lo = Math.min(...lows), hi = Math.max(...highs);
  const pad = Math.max((hi - lo) * 0.15, 500);
  lo = Math.max(0, lo - pad); hi = hi + pad;
  const X = (m) => L + ((monthIndex(m) - minI) / span) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ns = "http://www.w3.org/2000/svg";
  const el = (n, a) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

  const last = pts[pts.length - 1], first = pts[0];
  const chg = ((last.v - first.v) / first.v) * 100;
  document.getElementById("pStat").innerHTML =
    "<b>" + money(last.v) + "</b>" + monthLabel(last.m) +
    "<br>" + (chg >= 0 ? "+" : "") + chg.toFixed(1) + "% since " + monthLabel(first.m);

  // Horizontal grid and value axis.
  const g = el("g", { class: "grid" });
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4, y = Y(v);
    g.appendChild(el("line", { x1: L, x2: W - R, y1: y, y2: y }));
    const t = el("text", { x: L - 8, y: y + 3, class: "axis", "text-anchor": "end" });
    t.textContent = "£" + Math.round(v / 100);
    g.appendChild(t);
  }
  svg.appendChild(g);

  // Time axis: first, last and a few interior months.
  const ticks = new Set([0, pts.length - 1]);
  for (let k = 1; k < 4; k++) ticks.add(Math.round((k * (pts.length - 1)) / 4));
  for (const i of [...ticks].sort((a, b) => a - b)) {
    const t = el("text", { x: X(pts[i].m), y: H - B + 18, class: "axis", "text-anchor": "middle" });
    t.textContent = monthLabel(pts[i].m);
    svg.appendChild(t);
  }

  // The line breaks wherever a month is missing. A dashed connector spans the
  // gap so the series stays readable without implying observed continuity.
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const contiguous = monthIndex(b.m) - monthIndex(a.m) === 1;
    svg.appendChild(el("line", {
      x1: X(a.m), y1: Y(a.v), x2: X(b.m), y2: Y(b.v),
      class: "seg" + (contiguous ? "" : " gap"),
    }));
  }

  // Spread between contributing retailers, drawn only where there is more
  // than one, so a single-retailer point cannot look like a range.
  for (const p of pts) {
    if (p.n < 2) continue;
    svg.appendChild(el("line", { x1: X(p.m), x2: X(p.m), y1: Y(p.lo), y2: Y(p.hi), class: "rng" }));
  }

  for (const p of pts) {
    const c = el("circle", { cx: X(p.m), cy: Y(p.v), r: 4.5, class: "pt" + (p.n < 2 ? " solo" : "") });
    const hit = el("circle", { cx: X(p.m), cy: Y(p.v), r: 15, class: "hit" });
    const show = () => {
      document.querySelectorAll(".pt.on").forEach((n) => n.classList.remove("on"));
      c.classList.add("on");
      showPop(p, X(p.m), Y(p.v));
    };
    hit.addEventListener("mouseenter", show);
    hit.addEventListener("click", show);
    hit.addEventListener("focus", show);
    svg.appendChild(c);
    svg.appendChild(hit);
  }
  svg.addEventListener("mouseleave", () => {
    pop.classList.remove("show");
    document.querySelectorAll(".pt.on").forEach((n) => n.classList.remove("on"));
  });
}

function showPop(p, px, py) {
  const pop = document.getElementById("pop");
  const wrap = pop.parentElement;
  const rows = p.c.map(([seller, amt, caps]) =>
    '<div class="row"><span>' + seller + (caps > 1 ? ' <span style="opacity:.6">×' + caps + "</span>" : "") + "</span><b>" + money(amt) + "</b></div>",
  ).join("") + p.x.map(([seller, amt]) =>
    '<div class="row ex"><span>' + seller + "</span><b>" + money(amt) + "</b></div>",
  ).join("");

  const foot = p.n >= 2
    ? '<div class="foot">Median of ' + p.n + " retailers · spread " + money(p.lo) + "–" + money(p.hi) + "</div>"
    : '<div class="foot solo">Single retailer — not a market median</div>';

  pop.innerHTML =
    "<header><span>" + monthLabel(p.m) + "</span><b>" + money(p.v) + "</b></header>" +
    '<div class="rows">' + rows + "</div>" + foot;
  pop.classList.add("show");

  // Position against the rendered SVG box, and flip before overflowing it.
  const svg = document.getElementById("chart");
  const box = svg.getBoundingClientRect();
  const wb = wrap.getBoundingClientRect();
  const sx = (px / 1000) * box.width + (box.left - wb.left);
  const sy = (py / 420) * box.height + (box.top - wb.top);
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let x = sx + 18, y = sy - ph / 2;
  if (x + pw > wb.width - 4) x = sx - pw - 18;
  if (y < 4) y = 4;
  if (y + ph > wb.height - 4) y = wb.height - ph - 4;
  pop.style.left = Math.max(4, x) + "px";
  pop.style.top = y + "px";
}

for (const b of document.querySelectorAll("[data-speed]")) {
  b.onclick = () => {
    speed = b.dataset.speed;
    document.querySelectorAll("[data-speed]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    renderPicker();
  };
}
const toggle = (id, get, set) => {
  const b = document.getElementById(id);
  b.onclick = () => { set(!get()); b.setAttribute("aria-pressed", String(get())); renderPicker(); };
};
toggle("fDepth", () => depth, (v) => { depth = v; });
toggle("fMulti", () => multi, (v) => { multi = v; });

renderPicker();
</script>
</body></html>`;

const target = new URL("research/reports/per-mpn-price-series-2026-08-12.html", root);
writeFileSync(target, html);

process.stdout.write(`wrote ${target.pathname}\n`);
process.stdout.write(`series carried:        ${series.length}\n`);
process.stdout.write(`default view (6+ months, 2+ retailers): ${series.filter((s) => s.month_count >= 6 && s.seller_count >= 2).length}\n`);
process.stdout.write(`observed points:       ${observedPoints.length}\n`);
process.stdout.write(`points with 2+ sellers:${multiSellerPoints.length}\n`);
process.stdout.write(`retailers represented: ${sellers.join(", ")}\n`);
process.stdout.write(`month range:           ${allMonths[0]} .. ${allMonths.at(-1)}\n`);
