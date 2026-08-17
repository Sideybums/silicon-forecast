import Link from "next/link";
import { site } from "@/lib/site";

const links = [
  ["/categories/ram/", "RAM"],
  ["/price-history/", "Price history"],
  ["/research/", "Research"],
  ["/methodology/", "Methodology"],
  ["/about", "About"],
  ["/contact", "Contact"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="status-strip">
        <div className="shell status-inner">
          <span className="status-light" />
          {site.status}
          <span className="status-detail">UK DDR5 observed prices public · aggregate index withheld</span>
        </div>
      </div>
      <div className="shell nav-row">
        <Link className="brand" href="/" aria-label="Silicon Forecast home">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            Silicon
            <br />
            Forecast
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
