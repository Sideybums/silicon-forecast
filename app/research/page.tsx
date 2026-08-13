import type { Metadata } from "next";
import Link from "next/link";
import { EventList } from "@/components/chart/EventLine";
import { trackedComponents } from "@/lib/components-registry";
import { eventsFor } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Research and sources",
  description:
    "Every article and piece of research the Silicon Forecast event line points at, with full attribution, plus the count of price movements that have no reviewed explanation.",
};

// The sources surface.
//
// This page exists to make the site's use of other people's work inspectable in
// one place: who wrote it, who published it, and a link straight to the
// original. It also carries the number that keeps the whole feature honest —
// how many measured movements nobody has researched yet. A page that listed only
// the explained ones would flatter the work.
export default function Page() {
  const datasets = trackedComponents.map((entry) => ({ entry, events: eventsFor(entry.dataset) }));
  const markerCount = datasets.reduce((total, { events }) => total + (events?.markers.length ?? 0), 0);
  const unexplained = datasets.reduce((total, { events }) => total + (events?.unexplained_movement_count ?? 0), 0);
  const measured = datasets.reduce((total, { events }) => total + (events?.movement_count ?? 0), 0);

  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">Research and sources</p>
        <h1>Movement first, explanation second.</h1>
        <p>
          A price movement is measured before anyone goes looking for a reason, and a reason is never inferred from
          whichever headline happened to be nearby. Timing alone does not prove causation, and nothing on this site
          claims otherwise.
        </p>
      </header>

      <section className="research-readiness" aria-labelledby="research-state-title">
        <div>
          <p className="section-label">Where the research stands</p>
          <h2 id="research-state-title">
            {markerCount === 0
              ? "No movement has a reviewed explanation yet."
              : `${markerCount} source${markerCount === 1 ? "" : "s"} reviewed so far.`}
          </h2>
          <p>
            {measured} price movements have been measured across the tracked datasets. {unexplained} of them have no
            reviewed explanation. That number is published deliberately: an event line with nothing on it and no count
            beside it would imply there was nothing to explain.
          </p>
        </div>
        <dl>
          <div>
            <dt>Movements measured</dt>
            <dd>{measured}</dd>
          </div>
          <div>
            <dt>With a reviewed source</dt>
            <dd>{measured - unexplained}</dd>
          </div>
          <div>
            <dt>Unexplained</dt>
            <dd>{unexplained}</dd>
          </div>
        </dl>
      </section>

      {datasets.map(({ entry, events }) =>
        events ? (
          <section className="method-panel" key={entry.slug} aria-labelledby={`sources-${entry.slug}`}>
            <div className="panel-heading">
              <div>
                <p className="section-label">{entry.name}</p>
                <h2 id={`sources-${entry.slug}`}>Sources on the {entry.shortName} event line.</h2>
              </div>
              <Link href={`/price-history/${entry.slug}/`}>See the series →</Link>
            </div>
            <EventList events={events} />
          </section>
        ) : null,
      )}

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
            <p>The retained prices, coverage state and calculated movement are reported first, and are not revised to fit a story.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Possible explanation</h3>
            <p>Primary announcements and credible reporting are tested against timing and scope before a marker is placed.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Counterevidence</h3>
            <p>Alternative causes and contradictory reporting are retained rather than tidied away, including supporting and contradictory evidence for the same move.</p>
          </article>
        </div>
      </section>

      <section className="research-workflow" aria-labelledby="research-workflow-title">
        <div>
          <p className="section-label">Credit</p>
          <h2 id="research-workflow-title">The work belongs to whoever did it.</h2>
          <p>
            Every marker names the article, its author — or states plainly that the publisher named none — and the
            publisher, and links to the original. No article body is quoted and no images are reproduced. If you want to
            know what a source said, the link takes you to the people who said it.
          </p>
        </div>
        <ol className="research-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Detect</strong>
              <p>A replayable retail movement or coverage anomaly appears first.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Investigate</strong>
              <p>Search primary announcements, credible reporting and counterevidence.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Separate</strong>
              <p>Facts, temporal association and contributory hypotheses receive different labels.</p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <strong>Review</strong>
              <p>A person approves the exact record and its causal wording before a marker exists at all.</p>
            </div>
          </li>
        </ol>
      </section>

      <div className="page-nav-note">
        <p>How a marker is placed, and what it is not allowed to say.</p>
        <Link href="/methodology/">Read the methodology →</Link>
      </div>
    </div>
  );
}
