import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Research and market notes",
  description: "Evidence-backed research that investigates possible explanations for verified UK retail price movements.",
};

export default function Page() {
  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">Research and market notes</p>
        <h1>Movement first, explanation second.</h1>
        <p>
          Silicon Forecast will use manufacturer announcements, supply-chain research and credible
          reporting to investigate verified retail index swings. Research may support, qualify or
          contradict an explanation; timing alone does not prove causation.
        </p>
      </header>

      <section className="research-readiness" aria-labelledby="research-readiness-title">
        <div>
          <p className="section-label">Retail evidence first</p>
          <h2 id="research-readiness-title">No movement note is published yet.</h2>
          <p>
            A useful explanation needs a reproducible retail movement to explain. Until that series
            exists, we will document the research method rather than reverse-engineer a story from
            whichever headline happens to be nearby.
          </p>
        </div>
        <dl>
          <div><dt>Retail time series</dt><dd>Pending</dd></div>
          <div><dt>Verified movement</dt><dd>Pending</dd></div>
          <div><dt>Published causal note</dt><dd>None</dd></div>
        </dl>
      </section>

      <section className="research-principles" aria-labelledby="research-principles-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">Editorial boundary</p>
            <h2 id="research-principles-title">Evidence can support a claim. It cannot create the number.</h2>
          </div>
        </div>
        <div className="research-principle-grid">
          <article>
            <span>01</span>
            <h3>Observed fact</h3>
            <p>The retained prices, coverage state and calculated movement are reported first.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Possible explanation</h3>
            <p>Primary announcements and credible research are tested against timing and scope.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Counterevidence</h3>
            <p>Alternative causes and contradictory reporting are retained rather than tidied away.</p>
          </article>
        </div>
      </section>

      <section className="research-workflow" aria-labelledby="research-workflow-title">
        <div>
          <p className="section-label">Evidence workflow</p>
          <h2 id="research-workflow-title">How a future swing earns an explanation.</h2>
          <p>
            Notes preserve sources, uncertainty, alternative explanations and supporting and
            contradictory evidence. Commercial relationships never decide what counts as an explanation.
          </p>
        </div>
        <ol className="research-steps">
          <li><span>01</span><div><strong>Detect</strong><p>A replayable retail movement or coverage anomaly appears first.</p></div></li>
          <li><span>02</span><div><strong>Investigate</strong><p>Search primary announcements, credible reporting and counterevidence.</p></div></li>
          <li><span>03</span><div><strong>Separate</strong><p>Facts, temporal association and contributory hypotheses receive different labels.</p></div></li>
          <li><span>04</span><div><strong>Review</strong><p>A human approves the exact note and causal wording before publication.</p></div></li>
        </ol>
      </section>

      <div className="research-next-link">
        <p>First we need the retail line.</p>
        <Link href="/price-history">Review the retail release gates →</Link>
      </div>
    </div>
  );
}
