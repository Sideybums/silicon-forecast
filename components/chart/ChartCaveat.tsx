import type { IndexDataset } from "@/lib/public-data";

// Rendered inside every chart figure, never passed as an option.
//
// The number on this chart is unweighted, unapproved, and stops where the
// evidence stops. A reader who sees the line without those three facts has been
// given a misleading impression, so the disclosure travels with the chart
// rather than living somewhere a page author might forget to include.
export function ChartCaveat({ dataset }: { dataset: IndexDataset }) {
  const p = dataset.parameters_public;
  return (
    <div className="chart-caveat">
      <dl>
        <div>
          <dt>How it is built</dt>
          <dd>
            Each quarter is compared with the one before it using only the products present in both, so a change in
            which products are on sale cannot move the line.
          </dd>
        </div>
        <div>
          <dt>Weighting</dt>
          <dd>Every product counts equally. No sales volumes exist for any UK retailer, so no weighted alternative is available.</dd>
        </div>
        <div>
          <dt>Gaps</dt>
          <dd>Where too few products carry across, the line stops rather than bridging the gap. Nothing is estimated or filled in.</dd>
        </div>
      </dl>
      {p.approved ? null : (
        <p className="chart-caveat-unapproved">
          This is a research figure, not an approved statistic. Its parameters were chosen by the operator and no
          methodology, source or publication has been approved.
        </p>
      )}
    </div>
  );
}
