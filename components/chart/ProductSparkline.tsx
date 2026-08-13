import type { Product } from "@/lib/public-data";
import { formatPermilleChange } from "@/lib/public-data";
import { bounds, contiguousRuns, path, plotArea, xFor, yFor } from "./geometry";

const SPARK = { width: 320, height: 72 } as const;
const SPARK_PADDING = { top: 8, right: 6, bottom: 8, left: 6 } as const;

/**
 * A product's movement relative to its own first observed month.
 *
 * There is no y axis and no level, because the series carries none: 1000
 * permille is the month we first saw the product, and everything after is a
 * ratio to it. Two sparklines are comparable in shape, not in height.
 */
export function ProductSparkline({ product, label = true }: { product: Product; label?: boolean }) {
  const values = product.points.map((p) => p.relative_permille);
  const { min, max } = bounds(values, 0.18);
  const area = plotArea(SPARK, SPARK_PADDING);
  const runs = contiguousRuns(values);
  const baseline = yFor(1000, min, max, area);

  return (
    <div className="product-sparkline">
      <svg
        viewBox={`0 0 ${SPARK.width} ${SPARK.height}`}
        role="img"
        aria-label={`${product.mpn}: ${formatPermilleChange(product.change_permille)} since ${product.first_month}`}
        preserveAspectRatio="none"
      >
        {/* Where the product started, so a line above or below it reads
            immediately as dearer or cheaper than when we first saw it. */}
        <line className="spark-baseline" x1={area.left} x2={area.right} y1={baseline} y2={baseline} />
        {runs.map((run) => (
          <path
            key={run[0]}
            className="spark-line"
            d={path(run.map((i) => ({ x: xFor(i, values.length, area), y: yFor(values[i] as number, min, max, area) })))}
          />
        ))}
      </svg>
      {label ? (
        <p className="product-sparkline-label">
          <span className={(product.change_permille ?? 0) > 0 ? "is-higher" : (product.change_permille ?? 0) < 0 ? "is-lower" : ""}>
            {formatPermilleChange(product.change_permille)}
          </span>{" "}
          since {product.first_month}
        </p>
      ) : null}
    </div>
  );
}
