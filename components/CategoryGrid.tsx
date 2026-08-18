import Link from "next/link";
import { components } from "@/lib/components-registry";
import { categoryViewFor, offersFor } from "@/lib/public-data";

export function CategoryGrid() {
  return (
    <div className="category-board">
      <div className="category-head">
        <span>Category</span>
        <span>Research scope</span>
        <span>Status</span>
      </div>
      {components.map((entry, index) => {
        const view = categoryViewFor(entry);
        const status = offersFor(entry.dataset) ? "Observed price history" : view.state === "public" ? "Public series" : view.state === "withheld" ? "Active research · numbers withheld" : "Not collecting";
        return (
          <Link className="category-row" href={`/categories/${entry.slug}/`} key={entry.slug} data-programme={entry.programme}>
            <span className="category-index">{String(index + 1).padStart(2, "0")}</span>
            <strong>{entry.shortName}</strong>
            <span>{entry.summary}</span>
            <em data-status={view.state}>{status}</em>
            <span aria-hidden="true">→</span>
          </Link>
        );
      })}
    </div>
  );
}
