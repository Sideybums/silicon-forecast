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
            The verified retail series is still in preparation. Nothing shown here is a purchasing
            recommendation or a supported current-price comparison.
          </p>
        </div>
        <div>
          <p className="footer-label">Research</p>
          <Link href="/price-history/">Retail price history</Link>
          <Link href="/research/">Research and sources</Link>
          <Link href="/methodology/">Methodology</Link>
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
