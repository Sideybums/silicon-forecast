import assert from "node:assert/strict"; import {readFileSync,globSync} from "node:fs"; import test from "node:test";
const source = globSync(["app/**/*.tsx", "components/**/*.tsx", "lib/**/*.ts"])
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
test("Awin verification and honest application status",()=>{assert.match(source,/Awin publisher verification/);assert.match(source,/applying to (work with|establish) affiliate/i);assert.doesNotMatch(source,/Affiliate partnerships provided through Awin/)});
test("demonstration cannot be mistaken for live data",()=>{assert.match(source,/Every value above is synthetic/);assert.match(source,/No live prices/i);assert.match(source,/does not yet compare current retailer offers/i)});
test("required publisher routes exist",()=>{for(const route of ["about","contact","privacy","affiliate-disclosure","price-history"]){assert.ok(readFileSync(`app/${route}/page.tsx`,`utf8`).length>300)}});
test("no tracking package",()=>assert.doesNotMatch(readFileSync("package.json","utf8"),/google-analytics|gtag|plausible|posthog|segment|facebook-pixel/i));
test("Cloudflare deploys the static export without OpenNext",()=>{
  const config=readFileSync("wrangler.jsonc","utf8");
  assert.match(config,/"directory"\s*:\s*"\.\/out"/);
  assert.doesNotMatch(config,/opennext/i);
  const pkg=JSON.parse(readFileSync("package.json","utf8"));
  assert.equal(pkg.scripts.deploy,"wrangler deploy");
});
