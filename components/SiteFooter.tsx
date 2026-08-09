import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <p className="footer-brand">Silicon Forecast</p>
          <p>PC component prices, observed over time.</p>
          <p className="fine-print">
            Dated research observations are not live comparisons, supported index values or
            purchasing recommendations.
          </p>
        </div>
        <div>
          <p className="footer-label">Research</p>
          <Link href="/price-history">Observed prices</Link>
          <Link href="/research">Market notes</Link>
          <Link href="/about">About the project</Link>
        </div>
        <div>
          <p className="footer-label">Policies</p>
          <Link href="/privacy">Privacy &amp; cookies</Link>
          <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
          <Link href="/contact">Contact</Link>
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
        </div>
      </div>
      <div className="shell footer-base">
        <span>© 2026 Silicon Forecast</span>
        <span>Independent UK research project · Public research preview</span>
      </div>
    </footer>
  );
}
