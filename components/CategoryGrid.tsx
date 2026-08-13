import Link from "next/link";
import { components } from "@/lib/components-registry";

// The one place the category board is drawn.
//
// It maps over the registry rather than a hardcoded list, so a category gains a
// dataset — and starts pointing at real data — by changing one field in
// lib/components-registry.ts and nothing else.
export function CategoryGrid() {
  return (
    <div className="category-board">
      <div className="category-head">
        <span>Category</span>
        <span>Coverage</span>
        <span>Status</span>
      </div>
      {components.map((entry, i) => (
        <Link className="category-row" href={`/price-history/${entry.slug}/`} key={entry.slug}>
          <span className="category-index">{String(i + 1).padStart(2, "0")}</span>
          <strong>{entry.shortName}</strong>
          <span>{entry.summary}</span>
          <em data-status={entry.dataset ? "tracking" : "planned"}>
            {entry.dataset ? entry.scopeNote : "No observations collected"}
          </em>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  );
}
