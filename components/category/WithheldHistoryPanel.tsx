import Link from "next/link";
import type { ComponentEntry } from "@/lib/components-registry";

export function WithheldHistoryPanel({ entry }: { entry: ComponentEntry }) {
  return (
    <section className="retail-history-panel" aria-labelledby={`${entry.slug}-history-title`}>
      <div className="panel-heading">
        <div>
          <p className="section-label">Price history workspace</p>
          <h2 id={`${entry.slug}-history-title`}>A real chart belongs here only when the evidence supports it.</h2>
        </div>
        <span className="history-range">Public plot withheld</span>
      </div>

      <div className="withheld-plot" role="img" aria-labelledby={`${entry.slug}-plot-title ${entry.slug}-plot-description`}>
        <span id={`${entry.slug}-plot-title`} className="sr-only">Withheld {entry.shortName} history plot</span>
        <span id={`${entry.slug}-plot-description`} className="sr-only">
          No scale, points or trend are shown because no numerical series has been approved for public release.
        </span>
        <div className="withheld-plot-stamp" aria-hidden="true">
          <span>Research workspace</span>
          <strong>No publishable index point exists.</strong>
          <p>No invented baseline. No filled gaps. No implied trend.</p>
        </div>
      </div>

      <div className="history-diagnostics">
        <div>
          <span>Identity</span>
          <strong>Exact products only</strong>
        </div>
        <div>
          <span>Missing evidence</span>
          <strong>Shown as gaps</strong>
        </div>
        <div>
          <span>Release state</span>
          <strong>No public series released</strong>
        </div>
      </div>

      <div className="history-panel-footer">
        <p>When released, this area is designed to carry dated category movement, explicit gaps and separately reviewed context.</p>
        <Link href="/methodology/">See what must be resolved →</Link>
      </div>
    </section>
  );
}
