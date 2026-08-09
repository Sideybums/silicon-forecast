import assert from "node:assert/strict"; import {readFileSync,globSync} from "node:fs"; import test from "node:test";
const source = globSync(["app/**/*.tsx", "components/**/*.tsx", "lib/**/*.ts"])
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
test("affiliate verification is network-neutral and honest",()=>{
  assert.match(source,/affiliate-network-verification/);
  for(const network of ["Awin","Webgains","CJ Affiliate"]){assert.match(source,new RegExp(network));}
  assert.match(source,/multiple affiliate networks/i);
  assert.doesNotMatch(source,/<h2>Awin status<\/h2>/);
  assert.doesNotMatch(source,/Affiliate partnerships provided through/i);
});
test("public frontend is retail-first and does not expose deferred channels",()=>{
  const publicSource=globSync(["app/**/*.tsx","components/**/*.tsx","lib/site.ts"])
    .map((file)=>readFileSync(file,"utf8"))
    .join("\n");
  const home=readFileSync("app/page.tsx","utf8");
  const disclosure=readFileSync("app/affiliate-disclosure/page.tsx","utf8");
  assert.match(home,/Primary retail only/);
  assert.match(home,/Retail series in preparation/);
  assert.match(disclosure,/No outbound product links are currently published/i);
  assert.doesNotMatch(publicSource,/marketplace|second-hand|resale/i);
  assert.doesNotMatch(publicSource,/ObservedPriceBoard|MarketChannelCharts/);
});
test("price history has four visually distinct retail sections and an honest collection-start state",()=>{
  const priceHistory=readFileSync("app/price-history/page.tsx","utf8");
  for(const section of ["Retail tracking status","Retail price history","What qualifies as retail","Release gates"]){
    assert.match(priceHistory,new RegExp(section,"i"));
  }
  for(const className of ["retail-status-panel","retail-history-panel","retail-methodology-panel","retail-release-panel"]){
    assert.match(priceHistory,new RegExp(`className=\\"[^\\"]*${className}`));
  }
  assert.match(priceHistory,/Collection started\. The index has not\./);
  assert.match(priceHistory,/No publishable index point exists/);
  assert.match(priceHistory,/index scale begins only after the basket and baseline receive methodology approval/i);
  assert.match(priceHistory,/Primary retail only/);
  assert.match(priceHistory,/<svg[\s\S]*collection-chart-title[\s\S]*<\/svg>/);
  assert.doesNotMatch(priceHistory,/>110<|>100<|>90<|Base 100 · Daily · GBP/);
  assert.doesNotMatch(priceHistory,/<circle|<path|trend/i);
  assert.doesNotMatch(priceHistory,/\["[^"]+",\s*"Pending"/);
  assert.match(priceHistory,/VAT-inclusive landed price/);
  assert.match(priceHistory,/Retailer-owned stock/);
  assert.doesNotMatch(priceHistory,/synthetic|demo series|asking price/i);
});
test("collection-start chart and diagnostics have explicit desktop and mobile structure",()=>{
  const css=readFileSync("app/globals.css","utf8");
  assert.match(css,/\.history-diagnostics\{[^}]*grid-template-columns:repeat\(3,1fr\)/);
  assert.match(css,/@media\(max-width:650px\)[^{]*\{[^}]*[\s\S]*?\.history-diagnostics\{grid-template-columns:1fr\}/);
  assert.match(css,/\.collection-chart-shell\{[^}]*min-height:25rem[^}]*overflow:hidden/);
  assert.match(css,/\.collection-empty-message\{[^}]*width:min\(34rem,calc\(100% - 10rem\)\)/);
  assert.match(css,/@media\(max-width:650px\)[\s\S]*\.collection-empty-message\{[^}]*width:calc\(100% - 5\.5rem\)/);
});
test("research notes explain evidence-first context for future index movements",()=>{
  const research=readFileSync("app/research/page.tsx","utf8");
  assert.match(research,/Research and market notes/);
  assert.match(research,/movement first, explanation second/i);
  assert.match(research,/does not prove causation/i);
  assert.match(research,/supporting\s+and\s+contradictory evidence/i);
  assert.match(research,/Retail evidence first/);
  assert.match(research,/No movement note is published yet/);
});
test("required publisher routes exist",()=>{for(const route of ["about","contact","privacy","affiliate-disclosure","price-history","research"]){assert.ok(readFileSync(`app/${route}/page.tsx`,`utf8`).length>300)}});
test("project email is operational",()=>{
  const contact=readFileSync("app/contact/page.tsx","utf8");
  assert.match(contact,/active project address/i);
  assert.doesNotMatch(contact,/will become active|must be purchased|non-working contact route/i);
});
test("no tracking package",()=>assert.doesNotMatch(readFileSync("package.json","utf8"),/google-analytics|gtag|plausible|posthog|segment|facebook-pixel/i));
test("Cloudflare deploys the static export without OpenNext",()=>{
  const config=readFileSync("wrangler.jsonc","utf8");
  assert.match(config,/"directory"\s*:\s*"\.\/out"/);
  assert.doesNotMatch(config,/opennext/i);
  assert.match(config,/"pattern"\s*:\s*"siliconforecast\.com"/);
  assert.match(config,/"pattern"\s*:\s*"www\.siliconforecast\.com"/);
  assert.match(config,/"custom_domain"\s*:\s*true/);
  const pkg=JSON.parse(readFileSync("package.json","utf8"));
  assert.equal(pkg.scripts.deploy,"wrangler deploy");
});
