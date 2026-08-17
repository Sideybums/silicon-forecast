import type { ComponentEntry } from "@/lib/components-registry";

export function ComparisonConsiderations({ entry }: { entry: ComponentEntry }) {
  return (
    <section className="considerations" aria-labelledby={`${entry.slug}-comparison-title`}>
      <p className="eyebrow">Comparison discipline</p>
      <h2 id={`${entry.slug}-comparison-title`} className="visually-contained-title">
        What has to match before two observations can be compared.
      </h2>
      <div>
        {entry.considerations.map((value, index) => (
          <article key={value}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
