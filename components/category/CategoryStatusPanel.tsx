import Link from "next/link";
import type { ComponentEntry } from "@/lib/components-registry";
import type { CategoryDataView } from "@/lib/public-data";

export function CategoryStatusPanel({ entry, view, showWorkspaceLink = true }: { entry: ComponentEntry; view: CategoryDataView; showWorkspaceLink?: boolean }) {
  const candidate = view.state === "withheld";
  const publicSeries = view.state === "public";

  return (
    <section className="retail-status-panel" aria-labelledby="programme-status-title">
      <div className="panel-heading">
        <div>
          <p className="section-label">Programme status</p>
          <h2 id="programme-status-title">
            {publicSeries ? "A supported public series is available." : candidate ? "Research programme active. No public series released." : "This category is not being collected yet."}
          </h2>
        </div>
        <span className="status-badge">
          {publicSeries ? "Public series" : candidate ? "Research preview" : "Not collecting"}
        </span>
      </div>
      <div className="retail-status-grid">
        <div>
          <span>Category</span>
          <strong>{entry.shortName}</strong>
        </div>
        <div>
          <span>Research scope</span>
          <strong>{entry.scopeNote}</strong>
        </div>
        <div>
          <span>Numerical output</span>
          <strong>{publicSeries ? "Released" : candidate ? "Withheld" : "None"}</strong>
        </div>
        <div>
          <span>Buying links</span>
          <strong>None published</strong>
        </div>
      </div>
      {candidate ? (
        <p className="status-explainer">
          Public price history will appear here only when a supported release exists. Until then, this page describes the research scope and the standard the output must meet without exposing working data.
        </p>
      ) : null}
      <div className="status-actions">
        {showWorkspaceLink ? <Link href={`/price-history/${entry.slug}/`}>Open the {entry.shortName} research workspace →</Link> : null}
        <Link href="/methodology/">Read the publication standard →</Link>
      </div>
    </section>
  );
}
