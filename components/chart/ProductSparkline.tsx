import type { Product } from "@/lib/public-data";
import { formatPermilleChange } from "@/lib/public-data";
import { bounds, calendarMonthRuns, monthOffset, monthSpan, path, plotArea, xFor, yFor } from "./geometry";

const SPARK = { width: 320, height: 72 } as const;
const SPARK_PADDING = { top: 8, right: 6, bottom: 8, left: 6 } as const;

/** How far behind the dataset a product must fall before it is called out. */
const STALE_AFTER_MONTHS = 3;

export type MonthDomain = { first: string; last: string };

/**
 * The full span of months the dataset covers, across every product in it.
 *
 * Every sparkline drawn from the same dataset shares this, so two boxes side by
 * side are comparable in time as well as in shape.
 */
export function monthDomain(products: readonly Product[]): MonthDomain | undefined {
  const first = products.map((p) => p.first_month).filter((m): m is string => Boolean(m)).sort();
  const last = products.map((p) => p.last_month).filter((m): m is string => Boolean(m)).sort();
  if (!first.length || !last.length) return undefined;
  return { first: first[0], last: last[last.length - 1] };
}

/**
 * A product's movement relative to its own first observed month.
 *
 * There is no y axis and no level, because the series carries none: 1000
 * permille is the month we first saw the product, and everything after is a
 * ratio to it.
 *
 * The x axis is the *dataset's* full observed span, not the product's own. This
 * matters more than it sounds. Drawing every product across the full width made
 * a product last seen in early 2025 look exactly like one still being observed
 * today, so a series that stopped before the market moved read as a product
 * whose price had fallen and stayed down. It had not: we simply stopped seeing
 * it. On a shared axis that series visibly occupies only part of the box and the
 * unobserved stretch is shaded, which is the true statement.
 *
 * The domain is optional only so the component still draws something sane for a
 * caller holding one product and no dataset to place it in. Every caller in the
 * site passes one.
 */
export function ProductSparkline({
  product,
  label = true,
  domain,
}: {
  product: Product;
  label?: boolean;
  domain?: MonthDomain;
}) {
  const values = product.points.map((p) => p.relative_permille);
  const { min, max } = bounds(values, 0.18);
  const area = plotArea(SPARK, SPARK_PADDING);
  const runs = calendarMonthRuns(product.points.map((point) => ({ month: point.month, value: point.relative_permille })));
  const baseline = yFor(1000, min, max, area);

  // Without a domain the product is alone on the page and its own span is the
  // only honest axis. With one, every sparkline beside it shares the same axis.
  const slots = domain ? monthSpan(domain.first, domain.last) : values.length;
  const slotFor = (i: number) =>
    domain ? monthOffset(product.points[i].month, domain.first) : i;

  const endsEarly = Boolean(domain && product.last_month && product.last_month < domain.last);
  const startsLate = Boolean(domain && product.first_month && product.first_month > domain.first);

  // The shaded stretch is drawn whenever there is one, because it is simply
  // proportional truth. The written warning is held back until the gap is big
  // enough to change how the line should be read — flagging a product last seen
  // one month ago would spend the reader's attention on nothing and make them
  // ignore the flag on a product that stopped eighteen months ago.
  const monthsBehind =
    domain && product.last_month ? monthOffset(domain.last, product.last_month) : 0;
  const isStale = monthsBehind >= STALE_AFTER_MONTHS;

  return (
    <div className="product-sparkline" data-ends-early={isStale ? "true" : undefined}>
      <svg
        viewBox={`0 0 ${SPARK.width} ${SPARK.height}`}
        role="img"
        aria-label={
          domain
            ? `${product.mpn}: ${formatPermilleChange(product.change_permille)} between ${product.first_month} and ${product.last_month}, drawn on the full ${domain.first} to ${domain.last} span`
            : `${product.mpn}: ${formatPermilleChange(product.change_permille)} since ${product.first_month}`
        }
        preserveAspectRatio="none"
      >
        {/* Where the product started, so a line above or below it reads
            immediately as dearer or cheaper than when we first saw it. */}
        <line className="spark-baseline" x1={area.left} x2={area.right} y1={baseline} y2={baseline} />

        {/* The stretch of the shared span in which this product was never
            observed, marked rather than left as innocent white space. */}
        {domain && startsLate ? (
          <rect
            className="spark-unobserved"
            x={area.left}
            y={area.top}
            width={Math.max(0, xFor(slotFor(0), slots, area) - area.left)}
            height={area.height}
          />
        ) : null}
        {domain && endsEarly ? (
          <rect
            className="spark-unobserved"
            x={xFor(slotFor(values.length - 1), slots, area)}
            y={area.top}
            width={Math.max(0, area.right - xFor(slotFor(values.length - 1), slots, area))}
            height={area.height}
          />
        ) : null}

        {runs.map((run) => (
          <path
            key={run[0]}
            className="spark-line"
            d={path(run.map((i) => ({ x: xFor(slotFor(i), slots, area), y: yFor(values[i] as number, min, max, area) })))}
          />
        ))}
      </svg>
      {label ? (
        <p className="product-sparkline-label">
          <span className={(product.change_permille ?? 0) > 0 ? "is-higher" : (product.change_permille ?? 0) < 0 ? "is-lower" : ""}>
            {formatPermilleChange(product.change_permille)}
          </span>{" "}
          {product.first_month} to {product.last_month}
          {isStale ? (
            <em className="spark-stale">
              nothing observed after {product.last_month} — {monthsBehind} months before the data ends
            </em>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
